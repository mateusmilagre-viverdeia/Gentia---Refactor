import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { buildScoringPackage } from '../_shared/icp-packages.ts';
import { logAIExecution, extractTokensFromResponse } from '../_shared/ai-logger.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  result_id: string;
  url: string;
  search_filters?: {
    location?: string;
    locationCity?: string;
    locationState?: string;
    locationRadius?: number;
    target_locations?: string[];
    workModel?: string;
    languages?: string[];
    softSkills?: string[];
    salaryMin?: number;
    salaryMax?: number;
    seniority?: string;
    industry?: string;
  };
  apollo_data?: {
    email?: string;
    title?: string;
    organization_name?: string;
    seniority?: string;
    name?: string;
    phone?: string;
    linkedin_url?: string;
    organization_industry?: string;
    organization_employees?: number;
    current_role_start_date?: string;
  };
}

// ============== LINKEDIN DATA VALIDATION ==============

function isValidLinkedInData(data: any): boolean {
  if (!data) return false;
  if (data.blocked || data.login_required) return false;
  const hasName = data.name || data.fullName;
  const hasTitle = data.title || data.headline;
  const hasExperience = (data.experiences?.length > 0) || data.experience_years;
  return !!(hasName && (hasTitle || hasExperience));
}

// ============== APIFY LINKEDIN SCRAPING (Dev Fusion) ==============

async function scrapeWithApifyLinkedIn(url: string, apiToken: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const actorId = 'dev_fusion~LinkedIn-Profile-Scraper';
  console.log(`[hunting-scrape] Using Apify (${actorId}) for LinkedIn:`, url);
  
  const profileUrl = url.includes('http') ? url : `https://${url}`;
  
  try {
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrls: [profileUrl] }),
      }
    );

    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      const errorMsg = errorData.error?.message || 'Failed to start actor';
      // Detect quota exceeded
      if (errorMsg.includes('usage hard limit') || errorMsg.includes('limit exceeded')) {
        return { success: false, error: 'APIFY_QUOTA_EXCEEDED' };
      }
      return { success: false, error: `Apify error: ${errorMsg}` };
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    if (!runId) return { success: false, error: 'Failed to get run ID from Apify' };

    // Poll for completion (max 120 seconds)
    let attempts = 0;
    const maxAttempts = 60;
    let runStatus = 'RUNNING';

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.data?.status;
        // Check for quota exceeded in run status
        if (runStatus === 'FAILED') {
          const exitMsg = statusData.data?.exitMessage || '';
          if (exitMsg.includes('usage hard limit') || exitMsg.includes('limit exceeded')) {
            return { success: false, error: 'APIFY_QUOTA_EXCEEDED' };
          }
        }
      }
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') {
      return { success: false, error: `Actor run ${runStatus === 'RUNNING' ? 'timed out' : 'failed'}: ${runStatus}` };
    }

    const datasetResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
    if (!datasetResponse.ok) return { success: false, error: 'Failed to fetch results from Apify' };

    const items = await datasetResponse.json();
    if (!items || items.length === 0) return { success: false, error: 'No profile data found' };

    const rawProfile = items[0];
    console.log('[hunting-scrape] Dev Fusion RAW KEYS:', Object.keys(rawProfile).join(', '));

    // === DEV FUSION FIELD MAPPING ===
    const name = rawProfile.fullName || rawProfile.name || 
      (rawProfile.firstName && rawProfile.lastName ? `${rawProfile.firstName} ${rawProfile.lastName}` : null) || 'Unknown';
    const title = rawProfile.headline || rawProfile.title || rawProfile.occupation || null;
    const experiencesRaw = rawProfile.experiences || rawProfile.experience || rawProfile.positions || [];
    const company = experiencesRaw[0]?.company || experiencesRaw[0]?.companyName || rawProfile.company || null;
    const location = rawProfile.addressWithoutCountry || rawProfile.addressWithCountry || rawProfile.jobLocation || rawProfile.location || rawProfile.geoLocation || rawProfile.addressLocality || null;
    const summary = rawProfile.summary || rawProfile.about || rawProfile.description || null;

    let skills: string[] = [];
    if (Array.isArray(rawProfile.skills)) {
      skills = rawProfile.skills.map((s: any) => typeof s === 'string' ? s : (s.title || s.name || ''))
        .filter((s: string) => s && s.length > 0 && s.length < 100);
    }

    const educationRaw = rawProfile.educations || rawProfile.education || rawProfile.schools || [];
    const education = educationRaw.map((edu: any) => ({
      school: edu.university || edu.schoolName || edu.school || edu.name || '',
      degree: edu.degree || edu.degreeName || '',
      field: edu.fieldOfStudy || edu.field || '',
    }));

    const mappedExperiences = experiencesRaw.map((exp: any) => ({
      title: exp.title || exp.position || exp.jobTitle || '',
      company: exp.company || exp.companyName || '',
      duration: exp.duration || exp.timePeriod || exp.dateRange || '',
      description: exp.description || exp.summary || '',
    }));

    const languagesRaw = rawProfile.languages || [];
    const languages = Array.isArray(languagesRaw) 
      ? languagesRaw.map((l: any) => typeof l === 'string' ? l : (l.name || l.language || ''))
      : [];

    const certificationsRaw = rawProfile.certifications || rawProfile.certificates || [];
    const certList = Array.isArray(certificationsRaw) 
      ? certificationsRaw.map((c: any) => typeof c === 'string' ? c : (c.name || c.title || ''))
      : [];

    const email = rawProfile.email || null;
    const phone = rawProfile.phone || rawProfile.phoneNumber || null;

    return {
      success: true,
      data: {
        name, title, company, location, summary, email, phone, skills,
        experience_years: estimateExperienceYears(experiencesRaw),
        experiences: mappedExperiences, education, languages, certifications: certList,
        posts: [],
        source: 'apify_devfusion_linkedin',
        scraped_at: new Date().toISOString(),
        source_url: profileUrl,
      }
    };
  } catch (error) {
    console.error('[hunting-scrape] Apify LinkedIn error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Apify LinkedIn scrape failed' };
  }
}

function estimateExperienceYears(experiences: any[]): number | null {
  if (!experiences || experiences.length === 0) return null;
  let totalMonths = 0;
  for (const exp of experiences) {
    if (exp.duration) {
      const years = exp.duration.match(/(\d+)\s*(?:year|ano)/i);
      const months = exp.duration.match(/(\d+)\s*(?:month|mês|mes)/i);
      if (years) totalMonths += parseInt(years[1]) * 12;
      if (months) totalMonths += parseInt(months[1]);
    }
  }
  return totalMonths > 0 ? Math.round(totalMonths / 12) : null;
}

// ============== FIRECRAWL SCRAPING (non-LinkedIn only) ==============

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('[hunting-scrape] Using Firecrawl for:', url);
  
  const isGitHub = url.includes('github.com');
  let extractionPrompt = isGitHub
    ? `Extract: name, bio, location, skills (from repos and bio), company, projects (top 3), followers. Return JSON.`
    : `Extract: name, title, company, location, skills (array), summary, email, experience_years. Return JSON.`;

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown', { type: 'json', prompt: extractionPrompt }], onlyMainContent: true, waitFor: 2000 }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Firecrawl request failed' };

    return {
      success: true,
      data: {
        ...data.data?.json,
        markdown: data.data?.markdown?.substring(0, 2000),
        posts: [],
        source: 'firecrawl',
        scraped_at: new Date().toISOString(),
        source_url: url,
      }
    };
  } catch (error) {
    console.error('[hunting-scrape] Firecrawl error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Firecrawl scrape failed' };
  }
}

// ============== SKILL PARSER ==============
// Parses poorly formatted JD skills (single text blocks) into individual items

function parseSkillsList(skills: string[]): string[] {
  const parsed: string[] = [];
  for (const raw of skills) {
    // Split by common delimiters: dash bullets, semicolons, numbered lists, pipe
    const items = raw
      .split(/(?:\s*[-–•]\s+|\s*;\s*|\s*\|\s*|\s*\d+\.\s+)/)
      .map(s => s.replace(/^[\s:]+|[\s:]+$/g, '').trim())
      .filter(s => s.length >= 2 && s.length <= 100);
    
    if (items.length > 1) {
      parsed.push(...items);
    } else {
      // Try comma separation, but only if result items are short (likely individual skills)
      const commaItems = raw.split(',').map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 60);
      if (commaItems.length > 1 && commaItems.every(s => s.split(/\s+/).length <= 6)) {
        parsed.push(...commaItems);
      } else if (raw.trim().length > 0) {
        parsed.push(raw.trim());
      }
    }
  }
  // Deduplicate
  return [...new Set(parsed)];
}

// ============== MAIN HANDLER ==============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const apifyApiToken = Deno.env.get('APIFY_API_TOKEN');
    const lovableApiKey = "direct";

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: ScrapeRequest = await req.json();
    const { result_id, url, search_filters, apollo_data } = body;

    if (!result_id || !url) {
      return new Response(JSON.stringify({ success: false, error: 'result_id e url são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[hunting-scrape] Scraping profile: ${url}`);

    // Fetch hunting result → search → job → JD (include existing scores to preserve)
    const { data: huntingResult } = await supabase
      .from('recruitment_hunting_results')
      .select('search_id, match_score, score_breakdown, extracted_data')
      .eq('id', result_id)
      .single();

    if (!huntingResult) {
      return new Response(JSON.stringify({ success: false, error: 'Resultado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: search } = await supabase
      .from('recruitment_hunting_searches')
      .select('job_id, icp_id, filters, min_score, account_id')
      .eq('id', huntingResult.search_id)
      .single();

    // Fetch JD fields for scoring — ICP takes priority, JD as fallback
    let jdRequiredSkills: string[] = [];
    let jdDesiredSkills: string[] = [];
    let jobLocation: string | null = null;
    let icpData: any = null;

    if (search?.job_id) {
      // 1. Try to fetch ICP first (source of truth when available)
      if (search.icp_id) {
        const { data: icp } = await supabase
          .from('job_icps')
          .select('*')
          .eq('id', search.icp_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (icp) {
          icpData = icp;
          jdRequiredSkills = parseSkillsList(icp.mandatory_skills || []);
          jdDesiredSkills = parseSkillsList(icp.nice_to_have || []);
          console.log(`[hunting-scrape] ICP loaded: ${jdRequiredSkills.length} required, ${jdDesiredSkills.length} desired`);
        }
      }

      const { data: jobData } = await supabase
        .from('recruitment_jobs')
        .select('location, job_description_id')
        .eq('id', search.job_id)
        .maybeSingle();
      
      jobLocation = jobData?.location || search_filters?.location || null;
      
      // 2. Fallback to JD if ICP didn't provide skills
      if (jobData?.job_description_id && (jdRequiredSkills.length === 0 || jdDesiredSkills.length === 0)) {
        const { data: jdData } = await supabase
          .from('job_descriptions')
          .select('required_skills, desired_skills')
          .eq('id', jobData.job_description_id)
          .maybeSingle();
        if (jdData) {
          if (jdRequiredSkills.length === 0) {
            jdRequiredSkills = parseSkillsList(jdData.required_skills || []);
          }
          if (jdDesiredSkills.length === 0) {
            jdDesiredSkills = parseSkillsList(jdData.desired_skills || []);
          }
          console.log(`[hunting-scrape] JD fallback loaded: ${jdRequiredSkills.length} required, ${jdDesiredSkills.length} desired (preserved ICP data where available)`);
        }
      }
    }

    // ============== SCRAPING ==============
    const isLinkedIn = url.includes('linkedin.com/in/') || url.includes('linkedin.com/pub/');
    let scrapeResult: { success: boolean; data?: any; error?: string } | undefined;

    if (isLinkedIn) {
      // LinkedIn: Apify only (Firecrawl doesn't support LinkedIn anymore)
      if (apifyApiToken) {
        scrapeResult = await scrapeWithApifyLinkedIn(url, apifyApiToken);
      }
      
      // Apollo fallback if scraping failed
      if ((!scrapeResult || !scrapeResult.success || !isValidLinkedInData(scrapeResult?.data)) && apollo_data && (apollo_data.title || apollo_data.name)) {
        console.log('[hunting-scrape] Building profile from Apollo data fallback');
        scrapeResult = {
          success: true,
          data: {
            name: apollo_data.name || 'Unknown',
            title: apollo_data.title || null,
            company: apollo_data.organization_name || null,
            location: null,
            summary: null,
            email: apollo_data.email || null,
            skills: [],
            experience_years: null,
            experiences: apollo_data.title && apollo_data.organization_name ? [{
              title: apollo_data.title,
              company: apollo_data.organization_name,
              duration: apollo_data.current_role_start_date ? `since ${apollo_data.current_role_start_date}` : '',
              description: '',
            }] : [],
            education: [], languages: [], certifications: [], posts: [],
            source: 'apollo_fallback',
            scraped_at: new Date().toISOString(),
            source_url: url,
          }
        };
      }
      
      if (!scrapeResult || !scrapeResult.success) {
        const errorMsg = scrapeResult?.error || 'LinkedIn scraping requer APIFY_API_TOKEN.';
        // Propagate quota error clearly
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: errorMsg === 'APIFY_QUOTA_EXCEEDED' ? 429 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (firecrawlApiKey) {
      scrapeResult = await scrapeWithFirecrawl(url, firecrawlApiKey);
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Nenhum scraper configurado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!scrapeResult || !scrapeResult.success) {
      return new Response(JSON.stringify({ success: false, error: scrapeResult?.error || 'Erro ao extrair dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const extractedData = scrapeResult.data;
    console.log('[hunting-scrape] Successfully scraped via:', extractedData.source);

    // Merge Apollo data
    if (apollo_data) {
      extractedData.apollo_data = apollo_data;
      if (!extractedData.email && apollo_data.email) extractedData.email = apollo_data.email;
      if (!extractedData.title && apollo_data.title) extractedData.title = apollo_data.title;
      if (!extractedData.company && apollo_data.organization_name) extractedData.company = apollo_data.organization_name;
      if (!extractedData.name && apollo_data.name) extractedData.name = apollo_data.name;
    }

    // ============== CALCULATE MATCH SCORE (JD-based, 3 pillars) ==============
    let matchScore = 50;
    let scoreBreakdown: any = null;
    const hasJdSkills = jdRequiredSkills.length > 0 || jdDesiredSkills.length > 0;

    const scoringStartTime = Date.now();
    if (hasJdSkills && lovableApiKey) {
      try {
        console.log('[hunting-scrape] Calculating JD-based match score...');
        
        // Build clean profile object for AI (remove noise)
        const profileForAI = {
          name: extractedData.name,
          title: extractedData.title,
          company: extractedData.company,
          location: extractedData.location,
          summary: extractedData.summary?.substring(0, 500),
          experience_years: extractedData.experience_years,
          skills: extractedData.skills?.slice(0, 30),
          experiences: extractedData.experiences?.slice(0, 5)?.map((e: any) => ({
            title: e.title, company: e.company, duration: e.duration, description: e.description?.substring(0, 200)
          })),
          education: extractedData.education?.slice(0, 3),
          languages: extractedData.languages || [],
          certifications: extractedData.certifications || [],
        };

        const scoreResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: (() => {
                  const scoring = icpData ? buildScoringPackage(icpData) : null;
                  return `Você é um avaliador de recrutamento. Compare o perfil do candidato com os requisitos da vaga.

TAREFA:
Para cada skill/requisito obrigatório e desejável, avalie:
- has_skill: true/false — se o candidato possui essa competência
- evidence: justificativa curta baseada no perfil

Para localização:
- 100 = mesma cidade
- 80 = região metropolitana (até 50km)  
- 50 = mesmo estado
- 20 = estado diferente
- 40 = localização desconhecida

${scoring?.deal_breakers?.length ? `DEAL BREAKERS (se detectado, marque deal_breaker_detected = true e o score total DEVE ser ≤ 10):
${scoring.deal_breakers.map((db: string) => `- ${db}`).join('\n')}` : ''}

${scoring?.seniority ? `SENIORIDADE ESPERADA: ${scoring.seniority}
- Avalie se a experiência do candidato é compatível com o nível ${scoring.seniority}.` : ''}

${scoring?.experience_years_min || scoring?.experience_years_max ? `FAIXA DE EXPERIÊNCIA: ${scoring.experience_years_min || 0}-${scoring.experience_years_max || '∞'} anos` : ''}

${scoring?.culture_traits_required?.length ? `TRAÇOS CULTURAIS REQUERIDOS (avalie se o perfil do candidato demonstra estes traços):
${scoring.culture_traits_required.map((t: string) => `- ${t}`).join('\n')}
Candidatos que demonstram estes traços devem receber bônus no score de fit cultural.` : ''}

${scoring?.work_context ? `CONTEXTO DE TRABALHO: ${scoring.work_context}
- Se a vaga é presencial/híbrida e o candidato está em localização incompatível, penalize o location_score.
- Se a vaga é remota, localização tem peso menor.` : ''}

${scoring?.industry_preferences?.length ? `SETORES PREFERIDOS: ${scoring.industry_preferences.join(', ')}
- Candidatos vindos destes setores recebem bônus contextual.` : ''}

${scoring?.learned_patterns ? `PADRÕES APRENDIDOS DE CANDIDATOS APROVADOS:
${scoring.learned_patterns.common_skills?.length ? `- Skills frequentes nos aprovados: ${scoring.learned_patterns.common_skills.map((s: any) => s.skill).join(', ')}` : ''}
${scoring.learned_patterns.cultural_traits?.length ? `- Traits culturais dos aprovados: ${scoring.learned_patterns.cultural_traits.map((t: any) => t.trait).join(', ')}` : ''}
${scoring.learned_patterns.disc_dominant_profiles?.length ? `- Perfis DISC dominantes: ${scoring.learned_patterns.disc_dominant_profiles.map((p: any) => `${p.profile}(${p.percentage}%)`).join(', ')}` : ''}
${scoring.learned_patterns.insights?.length ? `- Insights: ${scoring.learned_patterns.insights.join('; ')}` : ''}
Dê BÔNUS de +5-10 pontos para candidatos que exibem padrões similares aos aprovados.` : ''}

Seja objetivo e baseado em evidências do perfil. Cada requisito deve ser avaliado individualmente.`;
                })()
              },
              {
                role: 'user',
                content: `REQUISITOS OBRIGATÓRIOS:
${jdRequiredSkills.map((s, i) => `${i+1}. ${s}`).join('\n') || 'Nenhum'}

REQUISITOS DESEJÁVEIS:
${jdDesiredSkills.map((s, i) => `${i+1}. ${s}`).join('\n') || 'Nenhum'}

LOCALIZAÇÃO DA VAGA: ${jobLocation || 'Não especificada'}

PERFIL DO CANDIDATO:
${JSON.stringify(profileForAI, null, 2)}`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'evaluate_candidate_match',
                description: 'Evaluate candidate match against job requirements',
                parameters: {
                  type: 'object',
                  properties: {
                    required_skills_evaluation: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          skill: { type: 'string' },
                          has_skill: { type: 'boolean' },
                          evidence: { type: 'string' }
                        },
                        required: ['skill', 'has_skill', 'evidence'],
                        additionalProperties: false
                      }
                    },
                    desired_skills_evaluation: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          skill: { type: 'string' },
                          has_skill: { type: 'boolean' },
                          evidence: { type: 'string' }
                        },
                        required: ['skill', 'has_skill', 'evidence'],
                        additionalProperties: false
                      }
                    },
                    location_evaluation: {
                      type: 'object',
                      properties: {
                        job_location: { type: 'string' },
                        candidate_location: { type: 'string' },
                        score: { type: 'integer', minimum: 0, maximum: 100 },
                        reasoning: { type: 'string' }
                      },
                      required: ['job_location', 'candidate_location', 'score', 'reasoning'],
                      additionalProperties: false
                    },
                    deal_breaker_detected: {
                      type: 'boolean',
                      description: 'True if any deal breaker was detected in the candidate profile'
                    }
                  },
                  required: ['required_skills_evaluation', 'desired_skills_evaluation', 'location_evaluation', 'deal_breaker_detected'],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'evaluate_candidate_match' } }
          }),
        });

        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json();
          const toolCall = scoreData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const evaluation = JSON.parse(toolCall.function.arguments);
            
            const reqEvals = evaluation.required_skills_evaluation || [];
            const desEvals = evaluation.desired_skills_evaluation || [];
            const locEval = evaluation.location_evaluation || { score: 40 };
            
            const requiredScore = reqEvals.length > 0
              ? Math.round((reqEvals.filter((e: any) => e.has_skill).length / reqEvals.length) * 100)
              : 50;
            const desiredScore = desEvals.length > 0
              ? Math.round((desEvals.filter((e: any) => e.has_skill).length / desEvals.length) * 100)
              : 50;
            const locationScoreVal = locEval.score ?? 40;

            // Use ICP scoring_weights if available, otherwise defaults
            const weights = icpData?.scoring_weights || { required: 0.5, desired: 0.3, experience: 0, culture: 0 };
            const wReq = weights.required || 0.5;
            const wDes = weights.desired || 0.3;
            const wLoc = 1 - wReq - wDes; // remaining weight goes to location
            
            matchScore = Math.round(
              (requiredScore * wReq) + (desiredScore * wDes) + (locationScoreVal * Math.max(wLoc, 0))
            );
            
            // Apply deal breaker penalty
            if (evaluation.deal_breaker_detected) {
              console.log(`[hunting-scrape] Deal breaker detected! Capping score at 10`);
              matchScore = Math.min(matchScore, 10);
            }

            scoreBreakdown = {
              required_skills_evaluation: reqEvals,
              desired_skills_evaluation: desEvals,
              location_evaluation: locEval,
              required_score: requiredScore,
              desired_score: desiredScore,
              location_score: locationScoreVal,
              total_score: matchScore,
            };

            console.log(`[hunting-scrape] Match score: ${matchScore} (req=${requiredScore}, des=${desiredScore}, loc=${locationScoreVal})`);

            // Log AI execution
            if (search?.account_id) {
              await logAIExecution(supabase, {
                accountId: search.account_id,
                functionName: 'hunting-scrape-profile',
                operation: 'scoring',
                model: 'google/gemini-2.5-flash',
                inputSummary: { required_skills: jdRequiredSkills.length, desired_skills: jdDesiredSkills.length, candidate: extractedData.name },
                outputSummary: { match_score: matchScore, required_score: requiredScore, desired_score: desiredScore, deal_breaker: evaluation.deal_breaker_detected },
                status: 'success',
                durationMs: Date.now() - scoringStartTime,
                tokensUsed: extractTokensFromResponse(scoreData),
                metadata: { result_id, job_id: search.job_id },
              });
              await consumeAICredits({
                supabase, accountId: search.account_id, aiData: scoreData,
                model: 'google/gemini-2.5-flash',
                referenceType: 'hunting_scrape_profile', referenceId: result_id,
                description: `Scoring perfil ${extractedData.name || result_id}`,
              });
            }
          }
        } else {
          console.error('[hunting-scrape] AI scoring failed, using text-match fallback');
          const fallback = calculateFallbackBreakdown(extractedData, jdRequiredSkills, jdDesiredSkills, jobLocation);
          matchScore = fallback.score;
          scoreBreakdown = fallback.breakdown;

          // Log fallback
          if (search?.account_id) {
            await logAIExecution(supabase, {
              accountId: search.account_id,
              functionName: 'hunting-scrape-profile',
              operation: 'scoring',
              model: 'google/gemini-2.5-flash',
              status: 'fallback',
              errorMessage: 'AI scoring failed, used text-match fallback',
              durationMs: Date.now() - scoringStartTime,
              metadata: { result_id, job_id: search.job_id },
            });
          }
        }
      } catch (scoreError) {
        console.error('[hunting-scrape] Error calculating score:', scoreError);
        const fallback = calculateFallbackBreakdown(extractedData, jdRequiredSkills, jdDesiredSkills, jobLocation);
        matchScore = fallback.score;
        scoreBreakdown = fallback.breakdown;

        // Log error
        if (search?.account_id) {
          await logAIExecution(supabase, {
            accountId: search.account_id,
            functionName: 'hunting-scrape-profile',
            operation: 'scoring',
            model: 'google/gemini-2.5-flash',
            status: 'error',
            errorMessage: scoreError instanceof Error ? scoreError.message : 'Unknown scoring error',
            durationMs: Date.now() - scoringStartTime,
            metadata: { result_id, job_id: search?.job_id },
          });
        }
      }
    } else {
      // No JD skills available — use simple heuristic
      const fallback = calculateFallbackBreakdown(extractedData, jdRequiredSkills, jdDesiredSkills, jobLocation);
      matchScore = fallback.score;
      scoreBreakdown = fallback.breakdown;
      console.log(`[hunting-scrape] No JD skills, fallback score: ${matchScore}`);
    }

    // ============== PRESERVE EXISTING SCORES IF NEW ONES ARE WORSE ==============
    const existingScore = huntingResult.match_score;
    const existingBreakdown = huntingResult.score_breakdown || 
      (huntingResult.extracted_data as any)?.score_breakdown || null;

    // If we have no AI breakdown (fallback) and existing data has a better score, preserve it
    const isNewScoreFromAI = scoreBreakdown?.required_skills_evaluation?.some?.((e: any) => e.evidence?.length > 10);
    
    let finalScore = matchScore;
    let finalBreakdown = scoreBreakdown;

    if (!isNewScoreFromAI && existingScore != null && existingScore > matchScore) {
      console.log(`[hunting-scrape] Preserving existing score ${existingScore} over fallback ${matchScore}`);
      finalScore = existingScore;
    }

    if (!isNewScoreFromAI && existingBreakdown && !scoreBreakdown?.required_skills_evaluation?.length) {
      console.log('[hunting-scrape] Preserving existing breakdown');
      finalBreakdown = existingBreakdown;
    }

    // ============== SAVE RESULT ==============
    const { error: updateError } = await supabase
      .from('recruitment_hunting_results')
      .update({
        extracted_data: extractedData,
        match_score: finalScore,
        score_breakdown: finalBreakdown,
        status: 'reviewed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', result_id);

    if (updateError) {
      console.error('[hunting-scrape] Error updating result:', updateError);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao salvar dados extraídos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
        match_score: finalScore,
        score_breakdown: finalBreakdown,
        scraper_used: extractedData.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hunting-scrape] Unexpected error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ============== TEXT-MATCH FALLBACK BREAKDOWN ==============
// Generates a basic score_breakdown by comparing candidate skills/experiences against JD requirements

function calculateFallbackBreakdown(
  extractedData: any,
  jdRequiredSkills: string[],
  jdDesiredSkills: string[],
  jobLocation: string | null
): { score: number; breakdown: any } {
  const candidateText = buildCandidateText(extractedData);

  // Evaluate required skills via text matching
  const reqEvals = jdRequiredSkills.map(skill => {
    const found = textMatchSkill(skill, candidateText);
    return { skill, has_skill: found, evidence: found ? 'Mencionado no perfil (match textual)' : 'Não encontrado no perfil' };
  });

  // Evaluate desired skills via text matching
  const desEvals = jdDesiredSkills.map(skill => {
    const found = textMatchSkill(skill, candidateText);
    return { skill, has_skill: found, evidence: found ? 'Mencionado no perfil (match textual)' : 'Não encontrado no perfil' };
  });

  const requiredScore = reqEvals.length > 0
    ? Math.round((reqEvals.filter(e => e.has_skill).length / reqEvals.length) * 100)
    : 50;
  const desiredScore = desEvals.length > 0
    ? Math.round((desEvals.filter(e => e.has_skill).length / desEvals.length) * 100)
    : 50;

  // Location: simple text comparison
  let locationScore = 40; // default: unknown
  let locReasoning = 'Localização não avaliada (fallback)';
  if (jobLocation && extractedData.location) {
    const jobLoc = jobLocation.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const candLoc = extractedData.location.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc)) {
      locationScore = 100;
      locReasoning = 'Mesma localização detectada';
    } else {
      // Check state-level match (last word usually is state/country)
      const jobParts = jobLoc.split(/[,\s]+/).filter(Boolean);
      const candParts = candLoc.split(/[,\s]+/).filter(Boolean);
      const commonParts = jobParts.filter(p => candParts.includes(p));
      if (commonParts.length > 0) {
        locationScore = 60;
        locReasoning = `Região parcialmente compatível: ${commonParts.join(', ')}`;
      }
    }
  }

  const totalScore = Math.round(requiredScore * 0.5 + desiredScore * 0.3 + locationScore * 0.2);

  // If no JD skills at all, fall back to completeness heuristic
  const finalScore = (jdRequiredSkills.length === 0 && jdDesiredSkills.length === 0)
    ? calculateSimpleScore(extractedData)
    : totalScore;

  return {
    score: finalScore,
    breakdown: {
      required_skills_evaluation: reqEvals,
      desired_skills_evaluation: desEvals,
      location_evaluation: {
        job_location: jobLocation || 'Não especificada',
        candidate_location: extractedData.location || 'Não detectada',
        score: locationScore,
        reasoning: locReasoning,
      },
      required_score: requiredScore,
      desired_score: desiredScore,
      location_score: locationScore,
      total_score: finalScore,
      scoring_method: 'text_match_fallback',
    }
  };
}

function buildCandidateText(data: any): string {
  const parts: string[] = [];
  if (data.title) parts.push(data.title);
  if (data.summary) parts.push(data.summary);
  if (Array.isArray(data.skills)) parts.push(data.skills.join(' '));
  if (Array.isArray(data.experiences)) {
    for (const exp of data.experiences) {
      if (exp.title) parts.push(exp.title);
      if (exp.description) parts.push(exp.description);
      if (exp.company) parts.push(exp.company);
    }
  }
  if (Array.isArray(data.certifications)) parts.push(data.certifications.join(' '));
  return parts.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function textMatchSkill(skill: string, candidateText: string): boolean {
  const normalized = skill.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Direct match
  if (candidateText.includes(normalized)) return true;
  // Match individual significant words (3+ chars)
  const words = normalized.split(/\s+/).filter(w => w.length >= 3);
  if (words.length > 1) {
    const matchedWords = words.filter(w => candidateText.includes(w));
    return matchedWords.length >= Math.ceil(words.length * 0.6);
  }
  return false;
}

function calculateSimpleScore(extractedData: any): number {
  let score = 50;
  if (extractedData.name) score += 10;
  if (extractedData.title || extractedData.bio) score += 10;
  if (extractedData.skills?.length > 0) score += 15;
  if (extractedData.experience_years > 3) score += 10;
  if (extractedData.email) score += 5;
  return Math.min(score, 100);
}
