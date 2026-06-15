import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';
import { logAIExecution, extractTokensFromResponse } from '../_shared/ai-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GenerateICPRequest {
  job_id: string;
  regenerate?: boolean;
  recalibrate?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = "direct";

    if (!lovableApiKey) {
      console.error('[generate-job-icp] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GenerateICPRequest = await req.json();
    const { job_id, regenerate = false, recalibrate = false } = body;

    if (!job_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'job_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-job-icp] Generating ICP for job: ${job_id}, regenerate: ${regenerate}, recalibrate: ${recalibrate}`);

    // Fetch recruitment job
    const { data: job, error: jobError } = await supabase
      .from('recruitment_jobs')
      .select('id, account_id, title, description, location, job_description_id')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      console.error('[generate-job-icp] Job not found:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job description if exists
    let jd: any = null;
    if (job.job_description_id) {
      const { data: jdData } = await supabase
        .from('job_descriptions')
        .select('title, mission, responsibilities, required_skills, desired_skills, behavioral_competencies, indicators, development, benefits')
        .eq('id', job.job_description_id)
        .maybeSingle();
      jd = jdData;
    }

    // Check if ICP already exists (only when not regenerating/recalibrating)
    if (!regenerate && !recalibrate) {
      const { data: existingICP } = await supabase
        .from('job_icps')
        .select('*')
        .eq('job_id', job_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingICP) {
        console.log('[generate-job-icp] ICP already exists, returning existing');
        return new Response(
          JSON.stringify({ success: true, icp: existingICP, existing: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build context from job description
    const contextParts = [
      `Título: ${jd?.title || job.title}`,
      jd?.mission ? `Missão: ${jd.mission}` : '',
      jd?.responsibilities?.length ? `Responsabilidades: ${jd.responsibilities.join(', ')}` : '',
      jd?.required_skills?.length ? `Skills Obrigatórias: ${jd.required_skills.join(', ')}` : '',
      jd?.desired_skills?.length ? `Skills Desejáveis: ${jd.desired_skills.join(', ')}` : '',
      jd?.behavioral_competencies?.length ? `Competências Comportamentais: ${jd.behavioral_competencies.join(', ')}` : '',
      jd?.indicators?.length ? `Indicadores: ${jd.indicators.join(', ')}` : '',
      job.location ? `Localização: ${job.location}` : '',
      
    ].filter(Boolean).join('\n');

    // ===== FETCH APPROVED CANDIDATES DATA + PERFORMANCE =====
    let approvedCandidatesContext = '';
    let approvedCount = 0;
    let performanceContext = '';

    try {
      // Find candidates who completed ALL stages successfully for this job
      // 1. Get culture interview sessions completed
      const { data: cultureSessions } = await supabase
        .from('culture_interview_sessions')
        .select('id, candidate_id, overall_score, cultural_fit_score')
        .eq('job_id', job_id)
        .eq('status', 'completed')
        .not('overall_score', 'is', null);

      // 2. Get DISC sessions completed
      const { data: discSessions } = await supabase
        .from('candidate_disc_sessions')
        .select('candidate_id, candidate_disc_results(primary_profile, secondary_profile, d_normalized, i_normalized, s_normalized, c_normalized)')
        .eq('job_id', job_id)
        .eq('status', 'completed');

      // 3. Get technical interview sessions completed
      const { data: techSessions } = await supabase
        .from('technical_interview_sessions')
        .select('id, candidate_id, overall_score')
        .eq('job_id', job_id)
        .eq('status', 'completed')
        .not('overall_score', 'is', null);

      // Find candidates that completed ALL 3 stages
      const cultureIds = new Set((cultureSessions || []).map(s => s.candidate_id));
      const discIds = new Set((discSessions || []).map(s => s.candidate_id));
      const techIds = new Set((techSessions || []).map(s => s.candidate_id));

      const approvedCandidateIds = [...cultureIds].filter(id => discIds.has(id) && techIds.has(id));
      approvedCount = approvedCandidateIds.length;

      if (approvedCount > 0) {
        console.log(`[generate-job-icp] Found ${approvedCount} approved candidates for pattern analysis`);

        // Aggregate DISC profiles
        const discProfiles: Record<string, number> = {};
        const discScores: { d: number[]; i: number[]; s: number[]; c: number[] } = { d: [], i: [], s: [], c: [] };
        
        for (const session of (discSessions || [])) {
          if (approvedCandidateIds.includes(session.candidate_id)) {
            const result = (session as any).candidate_disc_results;
            if (result) {
              const r = Array.isArray(result) ? result[0] : result;
              if (r?.primary_profile) {
                discProfiles[r.primary_profile] = (discProfiles[r.primary_profile] || 0) + 1;
              }
              if (r?.d_normalized != null) {
                discScores.d.push(r.d_normalized);
                discScores.i.push(r.i_normalized);
                discScores.s.push(r.s_normalized);
                discScores.c.push(r.c_normalized);
              }
            }
          }
        }

        // Aggregate culture scores AND culture criteria traits
        const cultureScores: number[] = [];
        const cultureTraitsMap: Record<string, number> = {};
        
        for (const session of (cultureSessions || [])) {
          if (approvedCandidateIds.includes(session.candidate_id) && session.overall_score) {
            cultureScores.push(session.overall_score);
          }
        }

        // Fetch culture criteria evaluations for approved candidates' sessions
        const approvedCultureSessionIds = (cultureSessions || [])
          .filter(s => approvedCandidateIds.includes(s.candidate_id))
          .map(s => (s as any).id);

        if (approvedCultureSessionIds.length > 0) {
          const { data: criteriaEvals } = await supabase
            .from('culture_interview_criteria_evaluations')
            .select('criterion_name, score')
            .in('session_id', approvedCultureSessionIds)
            .gte('score', 70); // Only strong traits

          if (criteriaEvals) {
            for (const ev of criteriaEvals) {
              cultureTraitsMap[ev.criterion_name] = (cultureTraitsMap[ev.criterion_name] || 0) + 1;
            }
          }
        }

        // Aggregate tech scores AND tech skills
        const techScores: number[] = [];
        const techSkillsMap: Record<string, number> = {};

        for (const session of (techSessions || [])) {
          if (approvedCandidateIds.includes(session.candidate_id) && session.overall_score) {
            techScores.push(session.overall_score);
          }
        }

        // Fetch tech skill evaluations for approved candidates
        const approvedTechSessionIds = (techSessions || [])
          .filter(s => approvedCandidateIds.includes(s.candidate_id))
          .map(s => (s as any).id);

        if (approvedTechSessionIds.length > 0) {
          const { data: techResponses } = await supabase
            .from('technical_interview_responses')
            .select('skill_name, score')
            .in('session_id', approvedTechSessionIds)
            .gte('score', 60); // Skills where they scored well

          if (techResponses) {
            for (const tr of techResponses) {
              techSkillsMap[tr.skill_name] = (techSkillsMap[tr.skill_name] || 0) + 1;
            }
          }
        }

        // Build context string
        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

        approvedCandidatesContext = `\n\n=== DADOS DE ${approvedCount} CANDIDATOS APROVADOS (todas as etapas concluídas) ===\n`;
        
        if (Object.keys(discProfiles).length > 0) {
          const profileEntries = Object.entries(discProfiles)
            .sort(([, a], [, b]) => b - a)
            .map(([profile, count]) => `${profile}: ${Math.round((count / approvedCount) * 100)}%`);
          approvedCandidatesContext += `Perfis DISC dominantes: ${profileEntries.join(', ')}\n`;
          approvedCandidatesContext += `Médias DISC: D=${avg(discScores.d)}, I=${avg(discScores.i)}, S=${avg(discScores.s)}, C=${avg(discScores.c)}\n`;
        }

        if (cultureScores.length > 0) {
          approvedCandidatesContext += `Score cultural médio: ${avg(cultureScores)}%\n`;
        }

        if (Object.keys(cultureTraitsMap).length > 0) {
          const traitEntries = Object.entries(cultureTraitsMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([trait, count]) => `${trait} (${Math.round((count / approvedCount) * 100)}%)`);
          approvedCandidatesContext += `Traits culturais fortes: ${traitEntries.join(', ')}\n`;
        }

        if (techScores.length > 0) {
          approvedCandidatesContext += `Score técnico médio: ${avg(techScores)}%\n`;
        }

        if (Object.keys(techSkillsMap).length > 0) {
          const skillEntries = Object.entries(techSkillsMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => `${skill} (${Math.round((count / approvedCount) * 100)}%)`);
          approvedCandidatesContext += `Skills técnicos validados: ${skillEntries.join(', ')}\n`;
        }

        // ===== FETCH PERFORMANCE REVIEWS FOR APPROVED CANDIDATES =====
        try {
          const { data: perfReviews } = await supabase
            .from('hire_performance_reviews')
            .select('candidate_id, performance_score, retention_status, review_period')
            .eq('job_id', job_id)
            .in('candidate_id', approvedCandidateIds);

          if (perfReviews && perfReviews.length > 0) {
            const avgPerf = Math.round(perfReviews.reduce((sum: number, r: any) => sum + r.performance_score, 0) / perfReviews.length);
            const retainedCount = perfReviews.filter((r: any) => r.retention_status === 'active').length;
            const retentionRate = Math.round((retainedCount / perfReviews.length) * 100);

            performanceContext = `\n=== DADOS DE PERFORMANCE PÓS-CONTRATAÇÃO ===\n`;
            performanceContext += `Avaliações registradas: ${perfReviews.length}\n`;
            performanceContext += `Performance média: ${avgPerf}/10\n`;
            performanceContext += `Taxa de retenção: ${retentionRate}%\n`;

            // Find which candidates had highest performance to weight their patterns more
            const highPerformers = perfReviews.filter((r: any) => r.performance_score >= 8);
            if (highPerformers.length > 0) {
              performanceContext += `Candidatos com performance ≥8: ${highPerformers.length} (dê MAIS PESO aos padrões destes)\n`;
            }

            approvedCandidatesContext += performanceContext;
          }
        } catch (perfErr) {
          console.error('[generate-job-icp] Error fetching performance data:', perfErr);
        }
      }
    } catch (err) {
      console.error('[generate-job-icp] Error fetching approved candidates:', err);
      // Continue without approved candidates data
    }

    console.log('[generate-job-icp] Context built, calling AI...');

    // Build system prompt based on whether we have approved candidates data
    const systemPrompt = `Você é um especialista em recrutamento. Sua tarefa é analisar uma descrição de cargo e extrair um ICP (Ideal Candidate Profile) estruturado para orientar buscas de hunting e triagem automatizada.

${approvedCount > 0 ? `IMPORTANTE: Você também receberá dados de ${approvedCount} candidatos que foram APROVADOS em todas as etapas do funil (cultural, DISC e técnica). Use esses dados para identificar PADRÕES reais de sucesso e incorporar no ICP. Os padrões dos aprovados devem ter PESO MAIOR que a descrição da vaga na sua análise.

Gere também um campo "learned_patterns" com os padrões identificados dos candidatos aprovados.` : ''}

O ICP deve ser preciso, objetivo e executável por um sistema de IA. Não use linguagem de marketing.

REGRAS:
- seniority deve ser exatamente: "junior", "pleno", "senior", "lead" ou "specialist"
- communication_style deve ser: "direto", "colaborativo" ou "formal"
- work_context deve ser: "remoto", "hibrido" ou "presencial"
- mandatory_skills: máximo 5 skills críticas
- nice_to_have: máximo 5 skills desejáveis
- deal_breakers: características que desqualificam o candidato
- search_keywords: termos otimizados para busca em LinkedIn/GitHub

CAMPOS ESTRATÉGICOS DE HUNTING (gere OBRIGATORIAMENTE):
- title_variations: 5-8 títulos equivalentes no mercado (PT e EN), ex: para "Gerente de Growth" → ["Growth Manager", "Head de Growth", "Growth Lead", "Gerente de Aquisição"]
- target_title: título otimizado para busca em LinkedIn (mais provável de encontrar no perfil)
- target_companies: 10-15 empresas REAIS do Brasil onde esse perfil provavelmente trabalha hoje, baseado no setor e porte da empresa contratante
- target_locations: localizações geográficas relevantes baseadas no work_context e localização da vaga
- negative_keywords: termos que indicam perfil ERRADO para essa vaga (ex: "estagiário", "freelancer", "intern")
- industry_preferences: setores/indústrias prioritários para busca
- salary_range_min e salary_range_max: estimativa salarial de mercado em R$ (valor mensal) para esse cargo e senioridade no Brasil

CAMPOS PRÉ-COMPUTADOS PARA INTEGRAÇÕES:
- linkedin_boolean_query: query booleana otimizada para LinkedIn Sales Navigator, ex: '("Growth Manager" OR "Head de Growth") AND ("SaaS" OR "Fintech") NOT "estagiário"'
- apollo_filters_json: objeto JSON com filtros prontos para a API Apollo: { person_titles: [...], person_seniorities: [...], person_locations: [...], q_keywords: "..." }
- sales_navigator_url: URL completa e válida do LinkedIn Sales Navigator para busca direta. Formato: https://www.linkedin.com/sales/search/people?query=(filters:List((type:CURRENT_TITLE,values:List(...)),(type:REGION,values:List(...)))). Construa com base nos títulos, localização, senioridade e empresas-alvo.
- scoring_weights: pesos personalizados para o scoring: { required: 0.4, desired: 0.2, experience: 0.2, culture: 0.2 } — ajuste baseado na natureza da vaga (se técnica, aumente required; se cultural, aumente culture)

Responda APENAS com JSON válido.`;

    const userPrompt = `Analise esta descrição de cargo e extraia o ICP estruturado:

${contextParts}
${approvedCandidatesContext}

Retorne o ICP no seguinte formato JSON:
{
  "role": "título normalizado em português",
  "seniority": "junior|pleno|senior|lead|specialist",
  "mandatory_skills": ["skill1", "skill2", "skill3"],
  "nice_to_have": ["skill1", "skill2"],
  "experience_years_min": número ou null,
  "experience_years_max": número ou null,
  "culture_traits_required": ["traço1", "traço2"],
  "deal_breakers": ["critério1", "critério2"],
  "communication_style": "direto|colaborativo|formal",
  "work_context": "remoto|hibrido|presencial",
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "title_variations": ["variação1 PT", "variação2 EN", "variação3", ...],
  "target_title": "título otimizado para busca LinkedIn",
  "target_companies": ["Empresa1", "Empresa2", ...],
  "target_locations": ["São Paulo, SP", "Rio de Janeiro, RJ"],
  "negative_keywords": ["estagiário", "freelancer"],
  "industry_preferences": ["Tecnologia", "SaaS"],
  "salary_range_min": número ou null,
  "salary_range_max": número ou null,
  "linkedin_boolean_query": "(\\"Growth Manager\\" OR \\"Head de Growth\\") AND (\\"SaaS\\" OR \\"Fintech\\") NOT \\"estagiário\\"",
  "apollo_filters_json": { "person_titles": [...], "person_seniorities": [...], "person_locations": [...], "q_keywords": "..." },
  "sales_navigator_url": "https://www.linkedin.com/sales/search/people?query=(filters:List((type:CURRENT_TITLE,values:List(...)),(type:REGION,values:List(...))))",
  "scoring_weights": { "required": 0.4, "desired": 0.2, "experience": 0.2, "culture": 0.2 }${approvedCount > 0 ? `,
  "learned_patterns": {
    "disc_dominant_profiles": [{"profile": "D|I|S|C", "percentage": número}],
    "common_skills": [{"skill": "nome", "frequency": número}],
    "experience_range": {"min": número, "max": número, "avg": número},
    "cultural_traits": [{"trait": "nome", "frequency": número}],
    "insights": ["insight sobre padrão identificado 1", "insight 2"]
  }` : ''}
}`;

    // Build tool parameters - add learned_patterns if we have approved candidates
    const toolProperties: Record<string, any> = {
      role: { type: 'string', description: 'Normalized job title in Portuguese' },
      seniority: { type: 'string', enum: ['junior', 'pleno', 'senior', 'lead', 'specialist'] },
      mandatory_skills: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      nice_to_have: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      experience_years_min: { type: 'integer', nullable: true },
      experience_years_max: { type: 'integer', nullable: true },
      culture_traits_required: { type: 'array', items: { type: 'string' } },
      deal_breakers: { type: 'array', items: { type: 'string' } },
      communication_style: { type: 'string', enum: ['direto', 'colaborativo', 'formal'] },
      work_context: { type: 'string', enum: ['remoto', 'hibrido', 'presencial'] },
      search_keywords: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      title_variations: { type: 'array', items: { type: 'string' }, description: '5-8 equivalent job titles in PT and EN' },
      target_title: { type: 'string', description: 'Optimized job title for LinkedIn search' },
      target_companies: { type: 'array', items: { type: 'string' }, description: '10-15 real companies where this profile likely works' },
      target_locations: { type: 'array', items: { type: 'string' }, description: 'Relevant geographic locations' },
      negative_keywords: { type: 'array', items: { type: 'string' }, description: 'Terms that indicate wrong profile' },
      industry_preferences: { type: 'array', items: { type: 'string' }, description: 'Priority industries/sectors' },
      salary_range_min: { type: 'integer', nullable: true, description: 'Estimated minimum monthly salary in BRL' },
      salary_range_max: { type: 'integer', nullable: true, description: 'Estimated maximum monthly salary in BRL' },
      linkedin_boolean_query: { type: 'string', description: 'Boolean query optimized for LinkedIn Sales Navigator' },
      apollo_filters_json: { 
        type: 'object', 
        properties: {
          person_titles: { type: 'array', items: { type: 'string' } },
          person_seniorities: { type: 'array', items: { type: 'string' } },
          person_locations: { type: 'array', items: { type: 'string' } },
          q_keywords: { type: 'string' },
        },
        description: 'Pre-computed filters for Apollo API' 
      },
      sales_navigator_url: { type: 'string', description: 'Full LinkedIn Sales Navigator search URL built from ICP filters' },
      scoring_weights: {
        type: 'object',
        properties: {
          required: { type: 'number' },
          desired: { type: 'number' },
          experience: { type: 'number' },
          culture: { type: 'number' },
        },
        description: 'Custom scoring weights for this job. Must sum to 1.0'
      },
    };

    if (approvedCount > 0) {
      toolProperties.learned_patterns = {
        type: 'object',
        properties: {
          disc_dominant_profiles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                profile: { type: 'string' },
                percentage: { type: 'number' },
              },
            },
          },
          common_skills: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                skill: { type: 'string' },
                frequency: { type: 'number' },
              },
            },
          },
          experience_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
            },
          },
          cultural_traits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                trait: { type: 'string' },
                frequency: { type: 'number' },
              },
            },
          },
          insights: { type: 'array', items: { type: 'string' } },
        },
      };
    }

    // Call Lovable AI to generate ICP
    const icpGenStartTime = Date.now();
    const modelUsed = await getConfiguredModel("generate-job-icp", "google/gemini-2.5-flash");
    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelUsed,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_icp',
              description: 'Create a structured ICP from job description and approved candidates data',
              parameters: {
                type: 'object',
                properties: toolProperties,
                required: ['role', 'seniority', 'mandatory_skills'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_icp' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-job-icp] AI error:', aiResponse.status, errorText);
      
      // Log error
      if (job.account_id) {
        await logAIExecution(supabase, {
          accountId: job.account_id,
          functionName: 'generate-job-icp',
          operation: 'icp-generation',
          model: modelUsed,
          status: aiResponse.status === 429 ? 'timeout' : 'error',
          errorMessage: `HTTP ${aiResponse.status}: ${errorText.substring(0, 200)}`,
          durationMs: Date.now() - icpGenStartTime,
          metadata: { job_id, job_title: job.title },
        });
      }

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar ICP via IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('[generate-job-icp] AI response received');

    // Log success
    if (job.account_id) {
      await logAIExecution(supabase, {
        accountId: job.account_id,
        functionName: 'generate-job-icp',
        operation: 'icp-generation',
        model: modelUsed,
        status: 'success',
        durationMs: Date.now() - icpGenStartTime,
        tokensUsed: extractTokensFromResponse(aiData),
        outputSummary: { has_tool_call: !!aiData.choices?.[0]?.message?.tool_calls?.[0] },
        metadata: { job_id, job_title: job.title, approved_count: approvedCount },
      });
    }

    // Consume credits
    if (job.account_id) {
      await consumeAICredits({
        supabase,
        accountId: job.account_id,
        aiData,
        model: modelUsed,
        referenceId: job_id,
        referenceType: 'job_icp',
        description: `Geração de ICP - ${job.title}`,
        userId: user.id,
      });
    }

    // Extract ICP from tool call
    let icpData;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        icpData = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback: try to parse from content
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            icpData = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch (parseError) {
      console.error('[generate-job-icp] Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar resposta da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!icpData || !icpData.role || !icpData.seniority) {
      console.error('[generate-job-icp] Invalid ICP data:', icpData);
      return new Response(
        JSON.stringify({ success: false, error: 'ICP inválido gerado pela IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If regenerating/recalibrating, deactivate existing ICP
    if (regenerate || recalibrate) {
      await supabase
        .from('job_icps')
        .update({ is_active: false })
        .eq('job_id', job_id)
        .eq('is_active', true);
    }

    // Insert new ICP
    const { data: newICP, error: insertError } = await supabase
      .from('job_icps')
      .insert({
        job_id,
        account_id: job.account_id,
        role: icpData.role,
        seniority: icpData.seniority,
        mandatory_skills: icpData.mandatory_skills || [],
        nice_to_have: icpData.nice_to_have || [],
        experience_years_min: icpData.experience_years_min,
        experience_years_max: icpData.experience_years_max,
        culture_traits_required: icpData.culture_traits_required || [],
        deal_breakers: icpData.deal_breakers || [],
        communication_style: icpData.communication_style,
        work_context: icpData.work_context || 'presencial',
        search_keywords: icpData.search_keywords || [],
        target_sources: ['linkedin', 'github'],
        confidence_threshold: 60,
        generated_by: 'ai',
        version: (regenerate || recalibrate) ? (await getNextVersion(supabase, job_id)) : 1,
        is_active: true,
        learned_patterns: icpData.learned_patterns || null,
        approved_candidates_count: approvedCount,
        last_calibrated_at: approvedCount > 0 ? new Date().toISOString() : null,
        // Strategic hunting fields
        title_variations: icpData.title_variations || [],
        target_title: icpData.target_title || null,
        target_companies: icpData.target_companies || [],
        target_locations: icpData.target_locations || [],
        negative_keywords: icpData.negative_keywords || [],
        industry_preferences: icpData.industry_preferences || [],
        keywords: icpData.search_keywords || [],
        salary_range_min: icpData.salary_range_min || null,
        salary_range_max: icpData.salary_range_max || null,
        // Pre-computed search configs
        linkedin_boolean_query: icpData.linkedin_boolean_query || null,
        apollo_filters_json: icpData.apollo_filters_json || {},
        sales_navigator_url: icpData.sales_navigator_url || null,
        scoring_weights: icpData.scoring_weights || { required: 0.4, desired: 0.2, experience: 0.2, culture: 0.2 },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-job-icp] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar ICP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-job-icp] ICP created successfully:', newICP.id);

    return new Response(
      JSON.stringify({ success: true, icp: newICP }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-job-icp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getNextVersion(supabase: any, jobId: string): Promise<number> {
  const { data } = await supabase
    .from('job_icps')
    .select('version')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return (data?.version || 0) + 1;
}
