import { createClient } from 'npm:@supabase/supabase-js@2';
import { consumeAICredits, accumulateUsage } from '../_shared/ai-credit-consumption.ts';
import { buildDiscoveryPackage, mapSeniorityToApollo } from '../_shared/icp-packages.ts';
import { logAIExecution } from '../_shared/ai-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutonomousSearchRequest {
  job_id: string;
  account_id: string;
  max_results?: number;
  use_apollo?: boolean;
}

// Apollo People Search helper
async function searchApollo(apiKey: string, icp: any, job: any, maxResults: number): Promise<any[]> {
  try {
    const discovery = buildDiscoveryPackage(icp);

    const body: any = {
      per_page: Math.min(maxResults, 25),
      page: 1,
    };

    // Use title_variations + target_title + role (all merged by discovery package)
    if (discovery.person_titles.length > 0) body.person_titles = discovery.person_titles;
    if (discovery.person_locations.length > 0) body.person_locations = discovery.person_locations;
    if (discovery.target_companies.length > 0) {
      const domains = discovery.target_companies.filter((c: string) => c.includes('.'));
      const names = discovery.target_companies.filter((c: string) => !c.includes('.'));
      if (domains.length > 0) body.organization_domains = domains;
      if (names.length > 0) body.q_organization_name = names.join(' OR ');
    }
    // Use keywords + mandatory_skills as contextual q_keywords
    const keywordParts: string[] = [];
    if (icp?.mandatory_skills?.length > 0) keywordParts.push(...icp.mandatory_skills.slice(0, 5));
    if (keywordParts.length > 0) body.q_keywords = keywordParts.join(' ');

    if (discovery.seniority_apollo.length > 0) body.person_seniorities = discovery.seniority_apollo;

    // NEW: Company size filter
    if (discovery.company_size_ranges.length > 0) {
      body.organization_num_employees_ranges = discovery.company_size_ranges;
    }

    // NEW: Excluded current titles
    if (discovery.excluded_current_titles.length > 0) {
      body.person_not_titles = discovery.excluded_current_titles;
    }

    console.log('[autonomous-search] Apollo search body:', JSON.stringify(body));

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[autonomous-search] Apollo API error [${response.status}]:`, errText);
      return [];
    }

    const data = await response.json();
    const people = data.people || [];
    console.log(`[autonomous-search] Apollo returned ${people.length} people`);
    return people;
  } catch (err) {
    console.error('[autonomous-search] Apollo search error:', err);
    return [];
  }
}

// Apollo People Match (enrich) helper
async function enrichWithApollo(apiKey: string, name: string, company?: string, linkedinUrl?: string): Promise<any | null> {
  try {
    const body: any = {};
    if (linkedinUrl) {
      body.linkedin_url = linkedinUrl;
    } else {
      if (name) body.name = name;
      if (company) body.organization_name = company;
    }

    const response = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.person) return null;

    return {
      email: data.person.email,
      phone: data.person.phone_numbers?.[0]?.sanitized_number || null,
      seniority: data.person.seniority,
      title: data.person.title,
      company: data.person.organization?.name,
      linkedin_url: data.person.linkedin_url,
      twitter_url: data.person.twitter_url || null,
      github_url: data.person.github_url || null,
      facebook_url: data.person.facebook_url || null,
      personal_website: data.person.personal_emails?.[0] ? null : (data.person.website_url || null),
      enriched_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[autonomous-search] Apollo enrich error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { job_id, account_id, max_results = 10, use_apollo = false }: AutonomousSearchRequest = await req.json();

    if (!job_id || !account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'job_id and account_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('recruitment_jobs')
      .select('id, title, description, location, department, job_description_id')
      .eq('id', job_id)
      .eq('account_id', account_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job description details if available
    let jobDescriptionDetails: any = null;
    if (job.job_description_id) {
      const { data: jd } = await supabase
        .from('job_descriptions')
        .select('required_skills, desired_skills, responsibilities, requirements')
        .eq('id', job.job_description_id)
        .single();
      jobDescriptionDetails = jd;
    }

    // 2. Fetch ICP if exists
    const { data: icp } = await supabase
      .from('job_icps')
      .select('*')
      .eq('job_id', job_id)
      .eq('is_active', true)
      .maybeSingle();

    console.log(`[autonomous-search] Job: ${job.title}, ICP: ${icp ? 'yes' : 'no'}`);

    const minHuntingScore = icp?.min_hunting_score ?? 50;

    // 3. Create search record
    const jobSnapshot = {
      title: job.title,
      description: job.description,
      location: job.location,
      department: job.department,
      required_skills: jobDescriptionDetails?.required_skills,
      desired_skills: jobDescriptionDetails?.desired_skills,
      responsibilities: jobDescriptionDetails?.responsibilities,
      requirements: jobDescriptionDetails?.requirements,
      icp: icp ? {
        role: icp.role,
        seniority: icp.seniority,
        mandatory_skills: icp.mandatory_skills,
        nice_to_have: icp.nice_to_have,
        target_title: icp.target_title,
        target_companies: icp.target_companies,
        target_locations: icp.target_locations,
        keywords: icp.keywords,
        negative_keywords: icp.negative_keywords,
        deal_breakers: icp.deal_breakers,
        experience_years_min: icp.experience_years_min,
        experience_years_max: icp.experience_years_max,
        culture_traits_required: icp.culture_traits_required,
        min_hunting_score: icp.min_hunting_score,
        industry_preferences: icp.industry_preferences,
      } : null,
    };

    const { data: search, error: searchError } = await supabase
      .from('recruitment_hunting_searches')
      .insert({
        account_id,
        job_id,
        query: `[Autônomo] ${job.title}`,
        sources: ['linkedin'],
        filters: {},
        status: 'running',
        results_count: 0,
        autonomous: true,
        job_description_snapshot: jobSnapshot,
      })
      .select()
      .single();

    if (searchError || !search) {
      console.error('[autonomous-search] Failed to create search:', searchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao criar busca' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generate multiple intelligent search queries via AI with tool calling
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      await supabase.from('recruitment_hunting_searches').update({ status: 'failed', error_message: 'LOVABLE_API_KEY not configured' }).eq('id', search.id);
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const discoveryPkg = icp ? buildDiscoveryPackage(icp) : null;

    const icpContext = icp ? `
ICP DO CANDIDATO IDEAL:
- Cargo alvo: ${icp.target_title || icp.role || 'N/A'}
- Variações de título: ${JSON.stringify(discoveryPkg?.person_titles || [])}
- Senioridade: ${icp.seniority || 'N/A'}
- Skills obrigatórias: ${JSON.stringify(icp.mandatory_skills || [])}
- Skills desejáveis: ${JSON.stringify(icp.nice_to_have || [])}
- Empresas alvo: ${JSON.stringify(icp.target_companies || [])}
- Localizações alvo: ${JSON.stringify(icp.target_locations || [])}
- Keywords extras: ${JSON.stringify(icp.keywords || [])}
- Negative keywords (EXCLUIR): ${JSON.stringify(icp.negative_keywords || [])}
- Setores preferidos: ${JSON.stringify(icp.industry_preferences || [])}
- Experiência: ${icp.experience_years_min ?? '?'} a ${icp.experience_years_max ?? '?'} anos
` : '';

    const queryPrompt = `Gere queries de busca otimizadas para encontrar candidatos no LinkedIn para esta vaga.

VAGA: ${job.title}
Descrição: ${job.description || 'N/A'}
Localização: ${job.location || 'Brasil'}
${jobDescriptionDetails?.required_skills ? `Skills obrigatórias da JD: ${JSON.stringify(jobDescriptionDetails.required_skills)}` : ''}
${jobDescriptionDetails?.desired_skills ? `Skills desejáveis da JD: ${JSON.stringify(jobDescriptionDetails.desired_skills)}` : ''}
${icpContext}

REGRAS:
- Gere 3 queries variadas para cobrir nomenclaturas diferentes do mesmo cargo
- Cada query deve usar site:linkedin.com/in
- Use operadores de busca (OR, aspas) para melhor resultado
- Se houver empresas alvo, inclua uma query específica para elas
- Se houver negative_keywords, use operador "-" para excluí-las
- Máximo 200 caracteres por query`;

    const queryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em recrutamento e sourcing de candidatos.' },
          { role: 'user', content: queryPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_search_queries',
            description: 'Retorna múltiplas queries de busca otimizadas para LinkedIn',
            parameters: {
              type: 'object',
              properties: {
                queries: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de 3 queries de busca otimizadas (sem incluir site:linkedin.com/in, isso será adicionado automaticamente)',
                },
                reasoning: {
                  type: 'string',
                  description: 'Breve explicação da estratégia de busca',
                },
              },
              required: ['queries', 'reasoning'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_search_queries' } },
      }),
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('[autonomous-search] AI query generation failed:', errorText);
      await supabase.from('recruitment_hunting_searches').update({ status: 'failed', error_message: 'AI query generation failed' }).eq('id', search.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao gerar query de busca' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryData = await queryResponse.json();
    let accumulatedUsage = accumulateUsage({ prompt_tokens: 0, completion_tokens: 0 }, queryData);

    // Extract queries from tool call response
    let searchQueries: string[] = [];
    try {
      const toolCall = queryData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        searchQueries = (parsed.queries || []).map((q: string) => `site:linkedin.com/in ${q}`);
        console.log(`[autonomous-search] AI reasoning: ${parsed.reasoning}`);
      }
    } catch (e) {
      console.error('[autonomous-search] Failed to parse tool call, falling back to single query');
    }

    // Fallback if tool calling failed
    if (searchQueries.length === 0) {
      const fallbackContent = queryData.choices?.[0]?.message?.content?.trim();
      searchQueries = [`site:linkedin.com/in ${fallbackContent || `${job.title} ${job.location || 'Brasil'}`}`];
    }

    console.log(`[autonomous-search] Generated ${searchQueries.length} queries:`, searchQueries);

    // Update search with generated queries
    await supabase.from('recruitment_hunting_searches').update({ 
      query: `[Autônomo] ${searchQueries.length} queries`,
      filters: { queries: searchQueries },
    }).eq('id', search.id);

    // 5. Search via Firecrawl with ALL queries
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      await supabase.from('recruitment_hunting_searches').update({ status: 'failed', error_message: 'FIRECRAWL_API_KEY not configured' }).eq('id', search.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute all queries and collect unique results
    const allResults: Map<string, any> = new Map();
    const resultsPerQuery = Math.ceil(max_results / searchQueries.length);

    for (const query of searchQueries) {
      try {
        console.log(`[autonomous-search] Executing query: ${query}`);
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: Math.min(resultsPerQuery, 20),
            lang: 'pt-BR',
            country: 'BR',
            scrapeOptions: { formats: ['markdown'] },
          }),
        });

        const firecrawlData = await firecrawlResponse.json();
        if (firecrawlResponse.ok && firecrawlData.success && firecrawlData.data) {
          for (const result of firecrawlData.data) {
            if (result.url && result.url.includes('linkedin.com/in/') && !allResults.has(result.url)) {
              allResults.set(result.url, result);
            }
          }
        } else {
          console.warn(`[autonomous-search] Query failed: ${query}`, firecrawlData.error);
        }
      } catch (err) {
        console.error(`[autonomous-search] Error executing query: ${query}`, err);
      }
    }

    // 5.1 Apollo People Search (if enabled)
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const apolloPeopleData: Map<string, any> = new Map(); // keyed by linkedin URL

    if (use_apollo && apolloApiKey) {
      console.log('[autonomous-search] Running Apollo People Search...');
      const apolloPeople = await searchApollo(apolloApiKey, icp, job, max_results);

      for (const person of apolloPeople) {
        const linkedinUrl = person.linkedin_url;
        if (!linkedinUrl || !linkedinUrl.includes('linkedin.com/in/')) continue;
        if (allResults.has(linkedinUrl)) {
          // Already found via Firecrawl — store Apollo data for enrichment
          apolloPeopleData.set(linkedinUrl, person);
          continue;
        }
        // Add as new result
        allResults.set(linkedinUrl, {
          url: linkedinUrl,
          title: `${person.name} - ${person.title || ''} at ${person.organization?.name || ''}`,
          description: person.headline || '',
          markdown: '',
          _apollo_source: true,
        });
        apolloPeopleData.set(linkedinUrl, person);
      }
      console.log(`[autonomous-search] Apollo added ${apolloPeople.length} people, total unique: ${allResults.size}`);
    } else if (use_apollo && !apolloApiKey) {
      console.warn('[autonomous-search] use_apollo=true but APOLLO_API_KEY not configured');
    }

    const searchResults = Array.from(allResults.values());
    console.log(`[autonomous-search] Found ${searchResults.length} unique results across all sources`);

    if (searchResults.length === 0) {
      await supabase.from('recruitment_hunting_searches').update({ status: 'completed', results_count: 0, completed_at: new Date().toISOString() }).eq('id', search.id);
      return new Response(
        JSON.stringify({ success: true, search_id: search.id, results_count: 0, message: 'Nenhum perfil encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5.5 Deduplication: check existing URLs in hunting results
    const existingUrls = new Set<string>();
    const urlsToCheck = searchResults.map(r => r.url).filter(Boolean);
    if (urlsToCheck.length > 0) {
      const { data: existingResults } = await supabase
        .from('recruitment_hunting_results')
        .select('source_url')
        .in('source_url', urlsToCheck);
      if (existingResults) {
        existingResults.forEach(r => existingUrls.add(r.source_url));
      }
    }

    // 6. For each result, score with structured ICP breakdown
    const savedResults: any[] = [];
    const skippedDuplicates: string[] = [];
    const skippedLowScore: string[] = [];

    // Build ICP context for scoring prompt
    const icpScoringContext = icp ? `
PERFIL IDEAL DO CANDIDATO (ICP):
- Cargo alvo: ${icp.target_title || icp.role}
- Senioridade: ${icp.seniority}
- Skills OBRIGATÓRIAS (peso 40%): ${JSON.stringify(icp.mandatory_skills || [])}
- Skills desejáveis (peso 20%): ${JSON.stringify(icp.nice_to_have || [])}
- Experiência desejada: ${icp.experience_years_min ?? '?'} a ${icp.experience_years_max ?? '?'} anos (peso 20%)
- Traços culturais necessários: ${JSON.stringify(icp.culture_traits_required || [])} (peso 20%)
- Deal breakers (DESQUALIFICADORES): ${JSON.stringify(icp.deal_breakers || [])}
- Empresas alvo: ${JSON.stringify(icp.target_companies || [])}
- Setores preferidos: ${JSON.stringify(icp.industry_preferences || [])}
- Localizações preferidas: ${JSON.stringify(icp.target_locations || [])}
` : `
VAGA:
- Título: ${job.title}
- Descrição: ${job.description || 'N/A'}
- Localização: ${job.location || 'Brasil'}
${jobDescriptionDetails?.required_skills ? `- Skills obrigatórias: ${JSON.stringify(jobDescriptionDetails.required_skills)}` : ''}
${jobDescriptionDetails?.desired_skills ? `- Skills desejáveis: ${JSON.stringify(jobDescriptionDetails.desired_skills)}` : ''}
`;

    for (const result of searchResults) {
      const url = result.url;
      if (!url || !url.includes('linkedin.com/in/')) continue;

      // Skip duplicates
      if (existingUrls.has(url)) {
        skippedDuplicates.push(url);
        console.log(`[autonomous-search] Skipping duplicate: ${url}`);
        continue;
      }

      try {
        const markdown = result.markdown || '';
        const title = result.title || '';
        const description = result.description || '';

        // Use AI with tool calling for structured scoring
        const scorePrompt = `Analise este perfil de candidato e avalie o match com o perfil ideal.

${icpScoringContext}

PERFIL DO CANDIDATO:
URL: ${url}
Título: ${title}
Descrição: ${description}
Conteúdo: ${markdown.substring(0, 3000)}

INSTRUÇÕES DE SCORING:
- mandatory_skills_match (peso 40%): % das skills obrigatórias que o candidato possui
- nice_to_have_match (peso 20%): % das skills desejáveis que o candidato possui
- experience_fit (peso 20%): quão bem a experiência se encaixa (anos, senioridade, empresas relevantes)
- culture_fit (peso 20%): traços culturais detectados vs requeridos
- total_score: média ponderada (40/20/20/20)
- Se detectar deal_breakers, marque em deal_breaker_flags e reduza o total_score drasticamente`;

        const scoreResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um especialista em recrutamento. Analise perfis de candidatos e avalie o match estruturado contra o ICP.' },
              { role: 'user', content: scorePrompt },
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'score_candidate',
                description: 'Retorna o scoring estruturado do candidato contra o ICP',
                parameters: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome completo do candidato' },
                    current_title: { type: 'string', description: 'Cargo atual' },
                    current_company: { type: 'string', description: 'Empresa atual' },
                    location: { type: 'string', description: 'Localização' },
                    skills: { type: 'array', items: { type: 'string' }, description: 'Skills detectadas' },
                    experience_summary: { type: 'string', description: 'Resumo breve da experiência' },
                    mandatory_skills_match: { type: 'number', description: 'Score 0-100 para skills obrigatórias' },
                    nice_to_have_match: { type: 'number', description: 'Score 0-100 para skills desejáveis' },
                    experience_fit: { type: 'number', description: 'Score 0-100 para fit de experiência' },
                    culture_fit: { type: 'number', description: 'Score 0-100 para fit cultural' },
                    total_score: { type: 'number', description: 'Score total ponderado 0-100' },
                    matched_mandatory: { type: 'array', items: { type: 'string' }, description: 'Skills obrigatórias que o candidato possui' },
                    missed_mandatory: { type: 'array', items: { type: 'string' }, description: 'Skills obrigatórias que faltam' },
                    matched_nice_to_have: { type: 'array', items: { type: 'string' }, description: 'Skills desejáveis que possui' },
                    experience_years_detected: { type: 'number', description: 'Anos de experiência detectados' },
                    culture_traits_detected: { type: 'array', items: { type: 'string' }, description: 'Traços culturais detectados' },
                    deal_breaker_flags: { type: 'array', items: { type: 'string' }, description: 'Deal breakers detectados' },
                    match_reasoning: { type: 'string', description: 'Explicação de 2-3 frases sobre o match' },
                  },
                  required: ['name', 'current_title', 'total_score', 'mandatory_skills_match', 'nice_to_have_match', 'experience_fit', 'culture_fit', 'matched_mandatory', 'missed_mandatory', 'deal_breaker_flags', 'match_reasoning'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'score_candidate' } },
          }),
        });

        if (!scoreResponse.ok) {
          console.error(`[autonomous-search] AI scoring failed for ${url}`);
          continue;
        }

        const scoreData = await scoreResponse.json();
        accumulatedUsage = accumulateUsage(accumulatedUsage, scoreData);

        let analysis: any = {};
        try {
          const toolCall = scoreData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            analysis = JSON.parse(toolCall.function.arguments);
          } else {
            // Fallback: try to parse content as JSON
            const content = scoreData.choices?.[0]?.message?.content || '{}';
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(cleanContent);
          }
        } catch (e) {
          console.error(`[autonomous-search] Failed to parse AI response for ${url}`);
          continue;
        }

        const totalScore = Math.min(100, Math.max(0, analysis.total_score || 0));
        const hasDealBreakers = (analysis.deal_breaker_flags || []).length > 0;

        // Filter by min_hunting_score
        if (totalScore < minHuntingScore && !hasDealBreakers) {
          skippedLowScore.push(`${analysis.name || url} (score: ${totalScore})`);
          console.log(`[autonomous-search] Skipping low score (${totalScore} < ${minHuntingScore}): ${url}`);
          continue;
        }

        // Determine status based on deal breakers
        const resultStatus = hasDealBreakers ? 'rejected' : 'pending';

        // Build structured score breakdown
        const scoreBreakdown = {
          mandatory_skills_match: analysis.mandatory_skills_match ?? 0,
          nice_to_have_match: analysis.nice_to_have_match ?? 0,
          experience_fit: analysis.experience_fit ?? 0,
          culture_fit: analysis.culture_fit ?? 0,
          total_score: totalScore,
          details: {
            matched_mandatory: analysis.matched_mandatory || [],
            missed_mandatory: analysis.missed_mandatory || [],
            matched_nice_to_have: analysis.matched_nice_to_have || [],
            experience_years_detected: analysis.experience_years_detected ?? null,
            culture_traits_detected: analysis.culture_traits_detected || [],
            deal_breaker_flags: analysis.deal_breaker_flags || [],
          },
        };

        // Merge Apollo data if available
        const apolloPerson = apolloPeopleData.get(url);
        let apolloEnrichment: any = null;
        if (apolloPerson) {
          apolloEnrichment = {
            email: apolloPerson.email,
            phone: apolloPerson.phone_numbers?.[0]?.sanitized_number || null,
            seniority: apolloPerson.seniority,
            title: apolloPerson.title,
            company: apolloPerson.organization?.name,
            enriched_at: new Date().toISOString(),
          };
        }

        // Auto-enrich via Apollo Match for high-score candidates without Apollo data
        if (!apolloEnrichment && apolloApiKey && totalScore >= deepScrapeThreshold && !hasDealBreakers) {
          const enriched = await enrichWithApollo(apolloApiKey, analysis.name, analysis.current_company, url);
          if (enriched) {
            apolloEnrichment = enriched;
            console.log(`[autonomous-search] Apollo enriched ${url}: email=${enriched.email}`);
          }
        }

        const deepScrapeThreshold2 = icp?.min_hunting_score ? Math.max(icp.min_hunting_score, 70) : 70;

        // Save result with structured data
        const { data: savedResult, error: saveError } = await supabase
          .from('recruitment_hunting_results')
          .insert({
            search_id: search.id,
            source: 'linkedin',
            source_url: url,
            extracted_data: {
              name: analysis.name || title,
              title: analysis.current_title,
              company: analysis.current_company,
              location: analysis.location,
              skills: analysis.skills || [],
              summary: analysis.experience_summary,
              markdown: markdown.substring(0, 2000),
              scraped_at: new Date().toISOString(),
              score_breakdown: scoreBreakdown,
              ...(apolloEnrichment ? { apollo_enrichment: apolloEnrichment } : {}),
              source_origin: apolloPeopleData.has(url) ? 'apollo+firecrawl' : 'firecrawl',
              social_links: {
                linkedin: apolloEnrichment?.linkedin_url || url,
                twitter: apolloEnrichment?.twitter_url || undefined,
                github: apolloEnrichment?.github_url || undefined,
                website: apolloEnrichment?.personal_website || undefined,
              },
            },
            match_score: totalScore,
            match_reasoning: analysis.match_reasoning || '',
            autonomous: true,
            status: resultStatus,
          })
          .select()
          .single();

        if (saveError) {
          console.error(`[autonomous-search] Failed to save result for ${url}:`, saveError);
        } else {
          savedResults.push(savedResult);
          existingUrls.add(url);

          // Auto deep scrape for high-score results
          if (totalScore >= deepScrapeThreshold2 && !hasDealBreakers && savedResult?.id) {
            try {
              console.log(`[autonomous-search] Triggering deep scrape for ${url} (score: ${totalScore})`);
              const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/hunting-scrape-profile`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ result_id: savedResult.id, url }),
              });
              if (scrapeResponse.ok) {
                console.log(`[autonomous-search] Deep scrape triggered for ${url}`);
              } else {
                console.warn(`[autonomous-search] Deep scrape failed for ${url}: ${scrapeResponse.status}`);
              }
            } catch (scrapeErr) {
              console.warn(`[autonomous-search] Deep scrape error for ${url}:`, scrapeErr);
            }

            // Trigger cross-match for high-score candidates
            try {
              console.log(`[autonomous-search] Triggering cross-match for ${url} (score: ${totalScore})`);
              fetch(`${supabaseUrl}/functions/v1/hunting-cross-match`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ result_id: savedResult.id, account_id }),
              }).catch(err => console.warn(`[autonomous-search] Cross-match fire-and-forget error:`, err));
            } catch (crossErr) {
              console.warn(`[autonomous-search] Cross-match trigger error:`, crossErr);
            }
          }
        }
      } catch (err) {
        console.error(`[autonomous-search] Error processing ${url}:`, err);
      }
    }

    // 6.5 Consume AI credits
    await consumeAICredits({
      supabase,
      accountId: account_id,
      aiData: { usage: accumulatedUsage },
      model: 'google/gemini-2.5-flash',
      referenceId: search.id,
      referenceType: 'hunting_autonomous_search',
      description: `Busca autônoma: ${job.title} (${savedResults.length} perfis salvos, ${skippedDuplicates.length} duplicatas, ${skippedLowScore.length} score baixo)`,
      userId: null,
    });

    // 7. Update search status
    await supabase.from('recruitment_hunting_searches').update({
      status: 'completed',
      results_count: savedResults.length,
      completed_at: new Date().toISOString(),
    }).eq('id', search.id);

    // Log AI execution summary
    await logAIExecution(supabase, {
      accountId: account_id,
      functionName: 'hunting-autonomous-search',
      operation: 'discovery',
      model: 'google/gemini-2.5-flash',
      status: 'success',
      outputSummary: {
        saved: savedResults.length,
        duplicates: skippedDuplicates.length,
        low_score: skippedLowScore.length,
        queries: searchQueries.length,
      },
      tokensUsed: accumulatedUsage.total_tokens || undefined,
      metadata: { search_id: search.id, job_id: job.id, job_title: job.title },
    });

    console.log(`[autonomous-search] Completed. Saved ${savedResults.length}, skipped ${skippedDuplicates.length} duplicates, ${skippedLowScore.length} low score.`);

    return new Response(
      JSON.stringify({
        success: true,
        search_id: search.id,
        results_count: savedResults.length,
        queries_used: searchQueries.length,
        skipped_duplicates: skippedDuplicates.length,
        skipped_low_score: skippedLowScore.length,
        min_hunting_score: minHuntingScore,
        results: savedResults.map(r => ({
          id: r.id,
          name: r.extracted_data?.name,
          match_score: r.match_score,
          match_reasoning: r.match_reasoning,
          status: r.status,
          score_breakdown: r.extracted_data?.score_breakdown,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[autonomous-search] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
