import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RerankRequest {
  search_id: string;
  job_id?: string;
  top_n?: number;
}

const SYSTEM_PROMPT = `Você é um avaliador sênior de hunting de talentos. Recebe o ICP (Ideal Candidate Profile) de uma vaga e perfis de candidatos previamente filtrados por score numérico. Sua função é desempatar e capturar nuances que regras numéricas não pegam (qualidade da trajetória, fit cultural implícito, sinais de risco, alinhamento real com a vaga).

Para CADA candidato retorne:
- final_score (0-100): nota final considerando ICP + JD + perfil
- tier (A | B | C): A=excelente match (≥85), B=match razoável (65-84), C=fraco (<65)
- justification (1 frase, máx 140 chars)
- red_flags (array de strings curtas, vazio se nenhum): ex "trabalhou em concorrente direto", "trajetória estagnada", "perfil incompleto"

Seja rigoroso. Não infle notas. Use C livremente quando o fit for fraco.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = "direct";

    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY ausente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: RerankRequest = await req.json();
    const { search_id, top_n = 30 } = body;
    if (!search_id) {
      return new Response(JSON.stringify({ success: false, error: 'search_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load search + job context
    const { data: search } = await supabase
      .from('recruitment_hunting_searches')
      .select('id, account_id, query, job_id, filters')
      .eq('id', search_id)
      .single();

    if (!search) {
      return new Response(JSON.stringify({ success: false, error: 'Busca não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let jobContext: any = null;
    if (search.job_id) {
      const { data: job } = await supabase
        .from('recruitment_jobs')
        .select('title, description, requirements, level, work_model, location, icp_packages')
        .eq('id', search.job_id)
        .single();
      jobContext = job;
    }

    // Load top N results (excluding low-quality and already evaluated)
    const { data: results } = await supabase
      .from('recruitment_hunting_results')
      .select('id, source_url, extracted_data, match_score, score_breakdown, completeness_score')
      .eq('search_id', search_id)
      .eq('is_low_quality', false)
      .is('llm_evaluated_at', null)
      .order('match_score', { ascending: false, nullsFirst: false })
      .limit(top_n);

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ success: true, evaluated: 0, message: 'Nenhum candidato pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build compact profile representations
    const profilesPayload = results.map((r, i) => {
      const d = r.extracted_data || {};
      return {
        idx: i,
        id: r.id,
        title: d.currentTitle || d.title || d.headline || '',
        company: d.currentCompany || d.company || '',
        headline: d.headline || d.description || '',
        location: d.location || d.city || '',
        experiences: Array.isArray(d.experiences)
          ? d.experiences.slice(0, 5).map((e: any) => `${e.title || ''} @ ${e.company || ''}`).join(' | ')
          : '',
        skills: Array.isArray(d.skills) ? d.skills.slice(0, 12).join(', ')
              : Array.isArray(d.topSkills) ? d.topSkills.slice(0, 12).join(', ') : '',
        summary: (d.summary || d.about || '').slice(0, 400),
        numeric_score: r.match_score,
      };
    });

    const userPrompt = `## ICP / Vaga
${jobContext ? JSON.stringify({
      title: jobContext.title,
      level: jobContext.level,
      location: jobContext.location,
      work_model: jobContext.work_model,
      description: (jobContext.description || '').slice(0, 1500),
      requirements: (jobContext.requirements || '').slice(0, 800),
      icp: jobContext.icp_packages,
    }, null, 2) : `Query original: ${search.query}\nFiltros: ${JSON.stringify(search.filters || {})}`}

## Candidatos para avaliar (${profilesPayload.length})
${JSON.stringify(profilesPayload, null, 2)}

Retorne via tool call \`rerank_candidates\` um array com a avaliação de TODOS os ${profilesPayload.length} candidatos, na mesma ordem de idx.`;

    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'rerank_candidates',
            description: 'Devolve avaliação final dos candidatos',
            parameters: {
              type: 'object',
              properties: {
                evaluations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      idx: { type: 'number' },
                      final_score: { type: 'number' },
                      tier: { type: 'string', enum: ['A', 'B', 'C'] },
                      justification: { type: 'string' },
                      red_flags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['idx', 'final_score', 'tier', 'justification', 'red_flags'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['evaluations'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'rerank_candidates' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[hunting-llm-rerank] AI error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Limite de IA atingido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Créditos de IA esgotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: false, error: 'Falha na IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    await consumeAICredits({
      supabase,
      accountId: search.account_id,
      model: 'google/gemini-2.5-flash',
      aiData,
      referenceType: 'hunting_llm_rerank',
      referenceId: search_id,
    }).catch((e) => console.error('[billing] llm-rerank error', e));
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[hunting-llm-rerank] No tool call returned', aiData);
      return new Response(JSON.stringify({ success: false, error: 'IA não retornou avaliação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const evaluations: any[] = args.evaluations || [];

    // Update each result
    const now = new Date().toISOString();
    let updated = 0;
    for (const ev of evaluations) {
      const result = profilesPayload[ev.idx];
      if (!result) continue;
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({
          final_score_llm: Math.max(0, Math.min(100, Number(ev.final_score) || 0)),
          llm_tier: ev.tier,
          llm_justification: (ev.justification || '').slice(0, 280),
          llm_red_flags: ev.red_flags || [],
          llm_evaluated_at: now,
        })
        .eq('id', result.id);
      if (!error) updated++;
    }

    console.log(`[hunting-llm-rerank] Updated ${updated}/${evaluations.length} results for search ${search_id}`);

    return new Response(JSON.stringify({ success: true, evaluated: updated, total: evaluations.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[hunting-llm-rerank] Unexpected error:', e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
