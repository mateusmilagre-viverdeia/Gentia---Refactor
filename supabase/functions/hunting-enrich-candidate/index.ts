import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { result_id, account_id } = await req.json();

    if (!result_id || !account_id) {
      return new Response(JSON.stringify({ error: 'result_id and account_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the hunting result
    const { data: result, error: resultError } = await supabase
      .from('recruitment_hunting_results')
      .select(`
        *, 
        recruitment_hunting_searches(
          job_id,
          recruitment_jobs(
            title, location, 
            job_description_id,
            job_descriptions(required_skills, desired_skills, responsibilities),
            recruitment_icp_profiles(icp_data)
          )
        )
      `)
      .eq('id', result_id)
      .eq('account_id', account_id)
      .single();

    if (resultError || !result) {
      return new Response(JSON.stringify({ error: 'Result not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidateData = result.extracted_data || {};
    const job = result.recruitment_hunting_searches?.recruitment_jobs;
    const jd = job?.job_descriptions;
    const icp = job?.recruitment_icp_profiles?.[0]?.icp_data;

    const candidateContext = `
Nome: ${candidateData.name || result.candidate_name || 'Desconhecido'}
Cargo Atual: ${candidateData.title || 'N/A'}
Empresa: ${candidateData.company || 'N/A'}
Localização: ${candidateData.location || 'N/A'}
Skills: ${(candidateData.skills || []).join(', ') || 'N/A'}
Experiência: ${candidateData.experience_years || 'N/A'} anos
Score de Match: ${result.match_score || result.hunting_score || 'N/A'}%
Match Reasoning: ${result.match_reasoning || 'N/A'}
Resumo do Perfil: ${candidateData.summary || candidateData.bio || 'N/A'}
    `.trim();

    const jobContext = `
Vaga: ${job?.title || 'N/A'}
Localização: ${job?.location || 'N/A'}
Skills Obrigatórias: ${(jd?.required_skills || []).join(', ') || 'N/A'}
Skills Desejáveis: ${(jd?.desired_skills || []).join(', ') || 'N/A'}
Responsabilidades: ${(jd?.responsibilities || []).join(', ') || 'N/A'}
    `.trim();

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um analista de recrutamento sênior. Gere insights estruturados sobre um candidato comparando seu perfil com a vaga.

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "executive_summary": "Resumo executivo de 2-3 frases sobre o candidato",
  "strengths": ["Ponto forte 1 vs ICP", "Ponto forte 2"],
  "weaknesses": ["Ponto fraco 1 vs ICP", "Ponto fraco 2"],
  "approach_angles": ["Gancho 1 para abordagem", "Gancho 2"],
  "red_flags": ["Red flag 1 se houver"],
  "salary_estimate": {
    "range_min": 8000,
    "range_max": 15000,
    "currency": "BRL",
    "confidence": "medium",
    "reasoning": "Baseado em..."
  },
  "cultural_fit_notes": "Observações sobre fit cultural",
  "recommended_next_steps": ["Passo 1", "Passo 2"]
}`;

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `CANDIDATO:\n${candidateContext}\n\nVAGA:\n${jobContext}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    await consumeAICredits({
      supabase,
      accountId: account_id,
      model: 'google/gemini-2.5-flash-lite',
      aiData: aiResponse,
      referenceType: 'hunting_enrich_candidate',
      referenceId: result_id,
    }).catch((e) => console.error('[billing] enrich-candidate error', e));
    const rawContent = aiResponse.choices?.[0]?.message?.content || '';

    let insights;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      insights = {
        executive_summary: rawContent,
        strengths: [],
        weaknesses: [],
        approach_angles: [],
        red_flags: [],
        salary_estimate: null,
        cultural_fit_notes: '',
        recommended_next_steps: [],
      };
    }

    // Save insights
    const { error: updateError } = await supabase
      .from('recruitment_hunting_results')
      .update({ ai_insights: insights } as any)
      .eq('id', result_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return new Response(JSON.stringify({ success: true, insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
