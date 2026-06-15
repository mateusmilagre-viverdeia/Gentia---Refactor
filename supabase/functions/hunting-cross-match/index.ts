import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits, accumulateUsage } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { result_id, account_id } = await req.json();

    if (!result_id || !account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'result_id and account_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get the source result
    const { data: result, error: resultErr } = await supabase
      .from('recruitment_hunting_results')
      .select('id, search_id, extracted_data, match_score')
      .eq('id', result_id)
      .single();

    if (resultErr || !result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Result not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get source job from search
    const { data: sourceSearch } = await supabase
      .from('recruitment_hunting_searches')
      .select('job_id')
      .eq('id', result.search_id)
      .single();

    const sourceJobId = sourceSearch?.job_id;

    // 2. Get all active ICPs for this account (excluding source job)
    let icpQuery = supabase
      .from('job_icps')
      .select('*, recruitment_jobs!inner(id, title, status, account_id)')
      .eq('is_active', true)
      .eq('recruitment_jobs.account_id', account_id)
      .eq('recruitment_jobs.status', 'open');

    const { data: icps } = await icpQuery;

    if (!icps || icps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: 0, message: 'No active ICPs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out source job
    const otherICPs = icps.filter((i: any) => i.job_id !== sourceJobId);

    if (otherICPs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: 0, message: 'No other jobs to match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check existing suggestions to avoid duplicates
    const { data: existingSuggestions } = await supabase
      .from('recruitment_cross_match_suggestions')
      .select('suggested_job_id')
      .eq('source_result_id', result_id);

    const existingJobIds = new Set((existingSuggestions || []).map((s: any) => s.suggested_job_id));

    // 4. Use AI to compare candidate against each ICP
    const lovableApiKey = "direct";
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateProfile = result.extracted_data as any;
    const candidateSkills = candidateProfile?.skills || [];
    const candidateTitle = candidateProfile?.title || '';
    const candidateSummary = candidateProfile?.summary || '';

    const newSuggestions: any[] = [];
    let accumulatedUsageData = { prompt_tokens: 0, completion_tokens: 0 };

    for (const icp of otherICPs) {
      if (existingJobIds.has(icp.job_id)) continue;

      const jobTitle = (icp as any).recruitment_jobs?.title || '';
      const mandatorySkills = icp.mandatory_skills || [];
      const niceToHave = icp.nice_to_have || [];

      // Quick heuristic: check skill overlap before AI call
      const allTargetSkills = [...mandatorySkills, ...niceToHave].map((s: string) => s.toLowerCase());
      const candidateSkillsLower = candidateSkills.map((s: string) => s.toLowerCase());
      const overlap = allTargetSkills.filter((s: string) => candidateSkillsLower.some((cs: string) => cs.includes(s) || s.includes(cs)));
      
      // Skip if less than 30% overlap
      if (allTargetSkills.length > 0 && overlap.length / allTargetSkills.length < 0.3) continue;

      // AI scoring
      const prompt = `Avalie rapidamente se este candidato encaixa nesta vaga diferente.

CANDIDATO:
- Cargo: ${candidateTitle}
- Skills: ${candidateSkills.join(', ')}
- Resumo: ${candidateSummary?.substring(0, 500)}

VAGA ALVO: ${jobTitle}
- Skills obrigatórias: ${mandatorySkills.join(', ')}
- Skills desejáveis: ${niceToHave.join(', ')}
- Senioridade: ${icp.seniority || 'N/A'}

Retorne score 0-100 e razão curta.`;

      try {
        const resp = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'Avalie candidatos para vagas de forma objetiva.' },
              { role: 'user', content: prompt },
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'cross_match_score',
                parameters: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Score 0-100' },
                    reasoning: { type: 'string', description: 'Razão curta (1-2 frases)' },
                  },
                  required: ['score', 'reasoning'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'cross_match_score' } },
          }),
        });

        if (!resp.ok) continue;

        const data = await resp.json();
        accumulatedUsageData = accumulateUsage(accumulatedUsageData, data);

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) continue;

        const parsed = JSON.parse(toolCall.function.arguments);
        const score = Math.min(100, Math.max(0, parsed.score || 0));

        if (score >= 60) {
          const { error: insertError } = await supabase
            .from('recruitment_cross_match_suggestions')
            .insert({
              account_id,
              source_result_id: result_id,
              source_job_id: sourceJobId,
              suggested_job_id: icp.job_id,
              match_score: score,
              reasoning: parsed.reasoning || '',
              status: 'pending',
            });

          if (!insertError) {
            newSuggestions.push({
              job_title: jobTitle,
              score,
              reasoning: parsed.reasoning,
            });
          }
        }
      } catch (err) {
        console.error(`[cross-match] Error scoring against ${jobTitle}:`, err);
      }
    }

    // Consume credits
    if (accumulatedUsageData.prompt_tokens > 0) {
      await consumeAICredits({
        supabase,
        accountId: account_id,
        aiData: { usage: accumulatedUsageData },
        model: 'google/gemini-2.5-flash-lite',
        referenceId: result_id,
        referenceType: 'hunting_cross_match',
        description: `Cross-match: ${newSuggestions.length} sugestões encontradas`,
        userId: null,
      });
    }

    console.log(`[cross-match] Found ${newSuggestions.length} suggestions for result ${result_id}`);

    return new Response(
      JSON.stringify({ success: true, suggestions: newSuggestions.length, details: newSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cross-match] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
