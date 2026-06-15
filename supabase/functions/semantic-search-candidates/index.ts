import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  account_id: string;
  job_id?: string; // Optional: filter by candidates for specific job
  threshold?: number; // Default 0.6
  limit?: number; // Default 20
  exclude_candidate_ids?: string[]; // Exclude specific candidates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      query, 
      account_id, 
      job_id,
      threshold = 0.6, 
      limit = 20,
      exclude_candidate_ids = []
    }: SearchRequest = await req.json();

    if (!query || !account_id) {
      return new Response(JSON.stringify({ error: 'Missing query or account_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Semantic search for: "${query.slice(0, 100)}..." in account ${account_id}`);

    // Generate embedding for the search query
    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const embeddingResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/text-embedding-004',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      if (embeddingResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }

    // Bill embedding tokens
    const embedTokens = embeddingData.usage?.prompt_tokens
      ?? embeddingData.usage?.total_tokens
      ?? Math.ceil(query.length / 4);
    await consumeAICredits({
      supabase: supabaseClient,
      accountId: account_id,
      aiData: { usage: { prompt_tokens: embedTokens, completion_tokens: 0 } },
      model: 'google/text-embedding-004',
      referenceId: job_id || null,
      referenceType: 'semantic_search_query',
      description: `Busca semântica de candidatos`,
      userId: user.id,
    });

    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Call the search function
    const { data: searchResults, error: searchError } = await supabaseClient
      .rpc('search_similar_candidates', {
        query_embedding: embeddingString,
        p_account_id: account_id,
        match_threshold: threshold,
        match_count: limit + exclude_candidate_ids.length, // Get extra to account for exclusions
      });

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }

    // Filter out excluded candidates
    let filteredResults = searchResults || [];
    if (exclude_candidate_ids.length > 0) {
      filteredResults = filteredResults.filter(
        (r: { candidate_id: string }) => !exclude_candidate_ids.includes(r.candidate_id)
      );
    }

    // Limit results
    filteredResults = filteredResults.slice(0, limit);

    // Get candidate details for the results
    const candidateIds = filteredResults.map((r: { candidate_id: string }) => r.candidate_id);
    
    if (candidateIds.length === 0) {
      return new Response(JSON.stringify({ 
        candidates: [],
        total: 0,
        query_processed: query,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch candidate details
    let candidateQuery = supabaseClient
      .from('recruitment_candidates')
      .select(`
        id,
        name,
        email,
        phone,
        source,
        tags,
        created_at,
        recruitment_applications (
          id,
          job_id,
          stage,
          status,
          recruitment_jobs (
            id,
            title
          )
        )
      `)
      .in('id', candidateIds);

    // If job_id is provided, filter to only candidates who applied to that job
    if (job_id) {
      candidateQuery = candidateQuery.eq('recruitment_applications.job_id', job_id);
    }

    const { data: candidates, error: candidatesError } = await candidateQuery;

    if (candidatesError) {
      console.error('Candidates fetch error:', candidatesError);
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    // Merge similarity scores with candidate data
    const resultsWithScores = candidates?.map(candidate => {
      const scoreData = filteredResults.find(
        (r: { candidate_id: string }) => r.candidate_id === candidate.id
      );
      return {
        ...candidate,
        similarity_score: scoreData?.similarity || 0,
        source_type: scoreData?.source_type || 'unknown',
      };
    }).sort((a, b) => b.similarity_score - a.similarity_score) || [];

    console.log(`Found ${resultsWithScores.length} candidates matching query`);

    return new Response(JSON.stringify({ 
      candidates: resultsWithScores,
      total: resultsWithScores.length,
      query_processed: query,
      threshold_used: threshold,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in semantic-search-candidates:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
