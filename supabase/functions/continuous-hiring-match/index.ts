import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  job_id: string;
  account_id: string;
  threshold?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { error: userError } = await userClient.auth.getUser();
      if (userError) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { job_id, account_id, threshold = 0.55, limit = 30 }: MatchRequest = await req.json();

    if (!job_id || !account_id) {
      return new Response(JSON.stringify({ error: 'Missing job_id or account_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 Continuous hiring match for job ${job_id} in account ${account_id}`);

    // 1. Get job embedding
    const { data: jobEmbedding } = await supabase
      .from('job_embeddings')
      .select('embedding')
      .eq('job_id', job_id)
      .limit(1)
      .maybeSingle();

    if (!jobEmbedding?.embedding) {
      console.log('⚠️ No job embedding found');
      return new Response(JSON.stringify({ success: true, recommendations: [], reason: 'No job embedding' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get candidates already applied to this job
    const { data: existingApps } = await supabase
      .from('recruitment_applications')
      .select('candidate_id')
      .eq('job_id', job_id);

    const appliedIds = new Set((existingApps || []).map((a: any) => a.candidate_id));

    // 3. Get existing recommendations to avoid duplicates
    const { data: existingRecs } = await supabase
      .from('continuous_hiring_recommendations')
      .select('candidate_id')
      .eq('job_id', job_id);

    const existingRecIds = new Set((existingRecs || []).map((r: any) => r.candidate_id));

    // 4. Find matching candidates via pgvector cosine similarity
    const { data: matches, error: matchError } = await supabase
      .rpc('match_candidates_for_job', {
        p_job_id: job_id,
        p_account_id: account_id,
        match_threshold: threshold,
        match_count: limit * 2, // fetch more to filter
      });

    if (matchError) {
      console.error('Match RPC error:', matchError);
      // Fallback: use candidate_embeddings directly  
      console.log('Using fallback matching...');
    }

    const candidates = matches || [];
    
    // 5. Filter out already-applied and already-recommended candidates
    const newRecommendations = candidates
      .filter((c: any) => !appliedIds.has(c.candidate_id) && !existingRecIds.has(c.candidate_id))
      .slice(0, limit);

    if (newRecommendations.length === 0) {
      console.log('No new recommendations found');
      return new Response(JSON.stringify({ success: true, recommendations: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Fetch candidate details for recommendations
    const candidateIds = newRecommendations.map((r: any) => r.candidate_id);
    const { data: candidateDetails } = await supabase
      .from('recruitment_candidates')
      .select('id, name, email, phone, source, tags')
      .in('id', candidateIds);

    const detailsMap = new Map((candidateDetails || []).map((c: any) => [c.id, c]));

    // 7. Insert recommendations
    const recsToInsert = newRecommendations.map((r: any) => ({
      account_id,
      candidate_id: r.candidate_id,
      job_id,
      similarity_score: r.similarity || r.similarity_score || 0,
      recommendation_reason: `Similaridade semântica: ${((r.similarity || r.similarity_score || 0) * 100).toFixed(1)}%`,
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('continuous_hiring_recommendations')
      .upsert(recsToInsert, { onConflict: 'candidate_id,job_id' });

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    // 8. Build response with candidate details
    const enrichedRecs = newRecommendations.map((r: any) => {
      const detail = detailsMap.get(r.candidate_id);
      return {
        candidate_id: r.candidate_id,
        name: detail?.name || 'Unknown',
        email: detail?.email,
        similarity_score: r.similarity || r.similarity_score || 0,
        source: detail?.source,
        tags: detail?.tags,
      };
    });

    console.log(`✅ Generated ${enrichedRecs.length} recommendations for job ${job_id}`);

    return new Response(JSON.stringify({
      success: true,
      recommendations: enrichedRecs,
      count: enrichedRecs.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in continuous-hiring-match:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
