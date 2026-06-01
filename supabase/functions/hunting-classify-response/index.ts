import { createClient } from 'npm:@supabase/supabase-js@2';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const { candidate_phone, message, approach_id } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If approach_id provided, get context directly
    let approach: any = null;
    let huntingResult: any = null;
    let jobTitle = '';

    if (approach_id) {
      const { data } = await supabase
        .from('recruitment_hunting_approaches')
        .select('*, recruitment_hunting_results(id, account_id, extracted_data, search_id)')
        .eq('id', approach_id)
        .single();
      approach = data;
      huntingResult = data?.recruitment_hunting_results;
    } else if (candidate_phone) {
      // Find the most recent approach for this phone number
      const { data: results } = await supabase
        .from('recruitment_hunting_results')
        .select('id, extracted_data, search_id, account_id')
        .or(`extracted_data->>phone.eq.${candidate_phone},extracted_data->apollo_data->>phone.eq.${candidate_phone}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (results?.length) {
        huntingResult = results[0];
        const { data: approachData } = await supabase
          .from('recruitment_hunting_approaches')
          .select('*')
          .eq('result_id', huntingResult.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        approach = approachData;
      }
    }

    // Classify the response using AI
    const classifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Você é um classificador de respostas de candidatos em processos de recrutamento.',
          },
          {
            role: 'user',
            content: `Classifique a resposta do candidato em uma das categorias:
- interessado: demonstra interesse em ouvir mais sobre a oportunidade
- nao_interessado: recusa ou não tem interesse no momento
- duvida: tem pergunta específica antes de decidir
- fora_contexto: mensagem não relacionada à vaga

Resposta do candidato: "${message}"

Retorne APENAS o JSON:
{ "classificacao": "string", "motivo": "string" }`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_response',
              description: 'Classify a candidate response',
              parameters: {
                type: 'object',
                properties: {
                  classificacao: {
                    type: 'string',
                    enum: ['interessado', 'nao_interessado', 'duvida', 'fora_contexto'],
                  },
                  motivo: { type: 'string' },
                },
                required: ['classificacao', 'motivo'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'classify_response' } },
      }),
    });

    let classification = { classificacao: 'fora_contexto', motivo: 'Não foi possível classificar' };

    if (classifyResponse.ok) {
      const aiData = await classifyResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          classification = JSON.parse(toolCall.function.arguments);
        } catch {
          // Try raw content
          const content = aiData.choices?.[0]?.message?.content || '';
          const match = content.match(/\{[^}]+\}/);
          if (match) {
            classification = JSON.parse(match[0]);
          }
        }
      }
      if (huntingResult?.account_id) {
        await consumeAICredits({
          supabase,
          accountId: huntingResult.account_id,
          model: 'google/gemini-2.5-flash-lite',
          aiData,
          referenceType: 'hunting_classify_response',
          referenceId: approach?.id || huntingResult.id,
        }).catch((e) => console.error('[billing] classify error', e));
      }
    }

    console.log(`[classify-response] Classification: ${classification.classificacao} — ${classification.motivo}`);

    // Update pipeline_stage based on classification
    if (huntingResult) {
      const stageMap: Record<string, string> = {
        'interessado': 'respondeu_positivo',
        'nao_interessado': 'respondeu_negativo',
        'duvida': 'abordado', // Keep in approached stage
        'fora_contexto': 'abordado',
      };

      const newStage = stageMap[classification.classificacao] || 'abordado';

      await supabase
        .from('recruitment_hunting_results')
        .update({
          status: classification.classificacao === 'interessado' ? 'shortlisted' : 
                  classification.classificacao === 'nao_interessado' ? 'rejected' : 'reviewed',
          recruiter_notes: `[IA] ${classification.classificacao}: ${classification.motivo}`,
        } as any)
        .eq('id', huntingResult.id);
    }

    // Record the received message as an approach log
    if (approach) {
      await supabase
        .from('recruitment_hunting_approaches')
        .update({
          response_classification: classification.classificacao,
          response_received_at: new Date().toISOString(),
        } as any)
        .eq('id', approach.id);
    }

    // Generate auto-reply for "duvida" classification
    let autoReply: string | null = null;
    if (classification.classificacao === 'duvida' && huntingResult) {
      const candidateName = huntingResult.extracted_data?.name || 'candidato';
      
      const replyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'Você é um consultor de recrutamento profissional e cordial.',
            },
            {
              role: 'user',
              content: `O candidato ${candidateName} respondeu com uma dúvida: "${message}"

Responda de forma breve, profissional e calorosa (máximo 3 linhas).
Se não souber a resposta exata, diga que vai verificar e retorna em breve.
Escreva apenas a mensagem, sem aspas, sem explicações.`,
            },
          ],
        }),
      });

      if (replyResponse.ok) {
        const replyData = await replyResponse.json();
        autoReply = replyData.choices?.[0]?.message?.content?.trim() || null;
        if (huntingResult?.account_id) {
          await consumeAICredits({
            supabase,
            accountId: huntingResult.account_id,
            model: 'google/gemini-2.5-flash-lite',
            aiData: replyData,
            referenceType: 'hunting_classify_auto_reply',
            referenceId: approach?.id || huntingResult.id,
          }).catch((e) => console.error('[billing] auto_reply error', e));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        classification: classification.classificacao,
        reason: classification.motivo,
        auto_reply: autoReply,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[classify-response] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
