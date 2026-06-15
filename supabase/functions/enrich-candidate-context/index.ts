import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichRequest {
  candidate_id: string;
  account_id: string;
  raw_text: string;
  source_type: string;
}

const SYSTEM_PROMPT = `Você é um especialista em análise de carreiras profissionais. Dado o texto do currículo/perfil de um candidato, produza uma "narrativa de carreira" estruturada em português que capture:

1. **Trajetória profissional**: progressão de cargos, transições de indústria, padrões de crescimento
2. **Nível de senioridade implícito**: junior, pleno, sênior, especialista, liderança, C-level
3. **Habilidades implícitas**: competências que não estão listadas explicitamente mas são inferidas pela experiência (ex: gestão de equipe implica liderança, comunicação, delegação)
4. **Contexto de indústria**: setores em que atuou, tamanho de empresas, tipo de ambiente (startup vs corporação)
5. **Perfil comportamental inferido**: orientação a resultados, perfil analítico, criativo, executor, etc.
6. **Pontos fortes diferenciadores**: o que torna este candidato único vs. outros com background similar

Formato de saída: texto corrido, rico em contexto semântico, otimizado para gerar embeddings de alta qualidade. NÃO use bullet points. Escreva como uma narrativa profissional densa de 200-400 palavras.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { candidate_id, account_id, raw_text, source_type }: EnrichRequest = await req.json();

    if (!candidate_id || !account_id || !raw_text) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const model = await getConfiguredModel('enrich_candidate_context', 'google/gemini-3-flash-preview');

    console.log(`🧠 Enriching context for candidate ${candidate_id} with model ${model}`);

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analise o seguinte perfil/currículo e produza a narrativa de carreira:\n\n${raw_text.slice(0, 8000)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const enrichedContext = data.choices?.[0]?.message?.content;

    if (!enrichedContext) throw new Error('Empty AI response');

    // Consume credits
    if (account_id) {
      await consumeAICredits({
        supabase,
        accountId: account_id,
        aiData: data,
        model,
        referenceId: candidate_id,
        referenceType: 'candidate_enrich',
        description: 'Enriquecimento de contexto de candidato',
      });
    }

    // Save enriched context to candidate_embeddings
    const { error: updateError } = await supabase
      .from('candidate_embeddings')
      .update({
        enriched_context: enrichedContext,
        enrichment_status: 'completed',
        metadata: {
          enrichment_model: model,
          enriched_at: new Date().toISOString(),
          raw_text_length: raw_text.length,
          enriched_text_length: enrichedContext.length,
        },
      })
      .eq('candidate_id', candidate_id)
      .eq('source_type', source_type || 'resume');

    if (updateError) {
      console.warn('Failed to update embedding record:', updateError.message);
    }

    console.log(`✅ Context enriched for candidate ${candidate_id} (${enrichedContext.length} chars)`);

    return new Response(JSON.stringify({
      success: true,
      enriched_context: enrichedContext,
      model_used: model,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error enriching context:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
