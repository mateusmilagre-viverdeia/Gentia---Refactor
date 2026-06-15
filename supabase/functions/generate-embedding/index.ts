import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  text: string;
  entity_type: 'candidate' | 'job';
  entity_id: string;
  source_type: string;
  account_id: string;
}

// Generate MD5 hash for content deduplication
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { text, entity_type, entity_id, source_type, account_id }: EmbeddingRequest = await req.json();

    if (!text || !entity_type || !entity_id || !source_type || !account_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate content hash to check if we need to regenerate
    const contentHash = await generateHash(text);

    // Check if embedding already exists with same hash
    const tableName = entity_type === 'candidate' ? 'candidate_embeddings' : 'job_embeddings';
    const idColumn = entity_type === 'candidate' ? 'candidate_id' : 'job_id';

    const { data: existing } = await supabaseClient
      .from(tableName)
      .select('id, content_hash')
      .eq(idColumn, entity_id)
      .eq('source_type', source_type)
      .single();

    if (existing?.content_hash === contentHash) {
      console.log(`Embedding already up-to-date for ${entity_type} ${entity_id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Embedding already up-to-date',
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enrich context for candidates before embedding
    let textForEmbedding = text;
    if (entity_type === 'candidate') {
      try {
        console.log('🧠 Attempting career context enrichment...');
        const enrichResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-candidate-context`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate_id: entity_id,
            account_id,
            raw_text: text,
            source_type,
          }),
        });

        if (enrichResponse.ok) {
          const enrichData = await enrichResponse.json();
          if (enrichData.enriched_context) {
            // Use enriched context + original text for richer embedding
            textForEmbedding = `${enrichData.enriched_context}\n\n---\n\n${text}`;
            console.log('✅ Using enriched context for embedding');
          }
        } else {
          console.warn('⚠️ Enrichment failed, using raw text');
        }
      } catch (enrichError) {
        console.warn('⚠️ Enrichment error, using raw text:', enrichError);
      }
    }

    // Generate embedding using Lovable AI (Gemini)
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
        input: textForEmbedding.slice(0, 8000), // Limit text length
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      
      if (embeddingResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response');
    }

    // Bill embedding tokens. Gateway returns usage.prompt_tokens or usage.total_tokens.
    const embedTokens = embeddingData.usage?.prompt_tokens
      ?? embeddingData.usage?.total_tokens
      ?? Math.ceil(textForEmbedding.length / 4);
    await consumeAICredits({
      supabase: supabaseClient,
      accountId: account_id,
      aiData: { usage: { prompt_tokens: embedTokens, completion_tokens: 0 } },
      model: 'google/text-embedding-004',
      referenceId: entity_id,
      referenceType: `embedding_${entity_type}`,
      description: `Embedding ${entity_type} (${source_type})`,
      userId: null,
    });

    // Format embedding as pgvector expects: [0.1, 0.2, ...]
    const embeddingString = `[${embedding.join(',')}]`;

    // Upsert the embedding
    const upsertData = {
      [idColumn]: entity_id,
      account_id,
      source_type,
      content_text: text.slice(0, 10000), // Store first 10k chars for reference
      content_hash: contentHash,
      embedding: embeddingString,
      metadata: {
        text_length: text.length,
        generated_at: new Date().toISOString(),
      },
    };

    const { error: upsertError } = await supabaseClient
      .from(tableName)
      .upsert(upsertData, {
        onConflict: `${idColumn},source_type`,
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error(`Failed to save embedding: ${upsertError.message}`);
    }

    console.log(`Generated embedding for ${entity_type} ${entity_id} (${source_type})`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Embedding generated and saved',
      dimensions: embedding.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-embedding:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
