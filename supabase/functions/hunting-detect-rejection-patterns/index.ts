import { createClient } from 'npm:@supabase/supabase-js@2';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReqBody {
  job_id: string;
  min_pattern_count?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

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

    const { job_id, min_pattern_count = 5 }: ReqBody = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ success: false, error: 'job_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get job + rejections
    const { data: job } = await supabase
      .from('recruitment_jobs')
      .select('id, account_id, title, description, requirements, icp_packages')
      .eq('id', job_id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ success: false, error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: rejections } = await supabase
      .from('recruitment_hunting_rejection_patterns')
      .select('reason_category, reason_detail, profile_signals')
      .eq('job_id', job_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!rejections || rejections.length < min_pattern_count) {
      return new Response(JSON.stringify({
        success: true,
        suggestions: [],
        message: `Apenas ${rejections?.length || 0} rejeições. Mínimo: ${min_pattern_count}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY ausente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ask LLM to analyze patterns
    const systemPrompt = `Você analisa padrões de rejeição de candidatos hunting e sugere ajustes no ICP (Ideal Candidate Profile) da vaga. Seja conservador: só sugira mudança quando o padrão for estatisticamente claro (≥3 ocorrências do mesmo tipo). Devolva sugestões via tool call.`;

    const userPrompt = `## Vaga
${JSON.stringify({ title: job.title, requirements: (job.requirements || '').slice(0, 800), icp: job.icp_packages }, null, 2)}

## ${rejections.length} rejeições recentes
${JSON.stringify(rejections, null, 2)}

Identifique padrões e sugira ajustes concretos no ICP.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_icp_changes',
            description: 'Sugestões de ajuste no ICP',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      suggestion_type: { type: 'string', enum: ['add_mandatory_skill', 'add_negative_keyword', 'adjust_seniority', 'adjust_experience', 'add_industry', 'other'] },
                      field_path: { type: 'string' },
                      suggested_value: { type: 'string' },
                      rationale: { type: 'string' },
                      evidence_count: { type: 'number' },
                    },
                    required: ['suggestion_type', 'suggested_value', 'rationale', 'evidence_count'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['suggestions'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_icp_changes' } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('[rejection-patterns] AI error', aiResp.status, t);
      return new Response(JSON.stringify({ success: false, error: 'Falha IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResp.json();
    await consumeAICredits({
      supabase,
      accountId: job.account_id,
      model: 'google/gemini-2.5-flash',
      aiData,
      referenceType: 'hunting_detect_rejection_patterns',
      referenceId: job_id,
    }).catch((e) => console.error('[billing] rejection-patterns error', e));
    const tc = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ success: true, suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const args = JSON.parse(tc.function.arguments);
    const suggestions = (args.suggestions || []).filter((s: any) => (s.evidence_count || 0) >= 3);

    // Persist as pending suggestions (deduping by suggestion_type+field_path+value)
    let inserted = 0;
    for (const s of suggestions) {
      const { data: existing } = await supabase
        .from('recruitment_hunting_icp_suggestions')
        .select('id')
        .eq('job_id', job_id)
        .eq('suggestion_type', s.suggestion_type)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) continue;

      const { error } = await supabase
        .from('recruitment_hunting_icp_suggestions')
        .insert({
          account_id: job.account_id,
          job_id,
          suggestion_type: s.suggestion_type,
          field_path: s.field_path || null,
          suggested_value: s.suggested_value,
          rationale: s.rationale,
          evidence: { count: s.evidence_count, source: 'rejection_patterns' },
        });
      if (!error) inserted++;
    }

    return new Response(JSON.stringify({ success: true, suggestions, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[rejection-patterns] Unexpected', e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
