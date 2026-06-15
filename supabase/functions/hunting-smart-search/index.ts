import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { buildDiscoveryPackage, mapSeniorityToApollo } from '../_shared/icp-packages.ts';
import { logAIExecution } from '../_shared/ai-logger.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartSearchRequest {
  account_id: string;
  job_id?: string;
  query: string;
  sources?: string[];
  desired_count?: number;
  min_score?: number;
  filters?: Record<string, unknown>;
}

// ============== APOLLO PEOPLE SEARCH ==============

interface ApolloCandidate {
  url: string;
  source: string;
  title?: string;
  description?: string;
  apollo_data: {
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

async function searchApolloForSmartSearch(
  apiKey: string,
  query: string,
  filters: any,
  locationFilter: { city?: string; state?: string; radius?: number },
  icp: any,
  limit: number,
): Promise<ApolloCandidate[]> {
  try {
    const body: any = {
      per_page: Math.min(limit, 25),
      page: 1,
    };

    // Use pre-computed apollo_filters_json from ICP if available
    if (icp?.apollo_filters_json && Object.keys(icp.apollo_filters_json).length > 0) {
      const af = icp.apollo_filters_json;
      if (af.person_titles?.length) body.person_titles = af.person_titles;
      if (af.person_seniorities?.length) body.person_seniorities = af.person_seniorities;
      if (af.person_locations?.length) body.person_locations = af.person_locations;
      if (af.q_keywords) body.q_keywords = af.q_keywords;
      console.log(`[smart-search] Using pre-computed Apollo filters from ICP`);
    } else {

    // Use discovery package to merge all title sources (including title_variations)
    const discovery = buildDiscoveryPackage(icp);
    
    // Map person_titles from query + discovery titles (includes title_variations)
    const personTitles: string[] = [];
    if (query) personTitles.push(query);
    if (filters.titleVariations?.length) {
      personTitles.push(...filters.titleVariations.slice(0, 5));
    }
    // Add ICP titles (target_title + role + title_variations) not already present
    for (const t of discovery.person_titles) {
      if (!personTitles.includes(t)) personTitles.push(t);
    }
    if (personTitles.length > 0) body.person_titles = personTitles;

    // Map location
    const locations: string[] = [];
    if (locationFilter.city) {
      const loc = locationFilter.state
        ? `${locationFilter.city}, ${locationFilter.state}`
        : locationFilter.city;
      locations.push(loc);
    }
    for (const tl of discovery.person_locations) {
      if (!locations.includes(tl)) locations.push(tl);
    }
    if (locations.length > 0) body.person_locations = locations;

    // Map seniority (centralized)
    const seniority = filters.seniority || icp?.seniority;
    const mapped = mapSeniorityToApollo(seniority);
    if (mapped.length > 0) body.person_seniorities = mapped;

    // Map target companies
    const companies = filters.targetCompanies?.length ? filters.targetCompanies : discovery.target_companies;
    if (companies.length > 0) {
      const domains = companies.filter((c: string) => c.includes('.'));
      const names = companies.filter((c: string) => !c.includes('.'));
      if (domains.length > 0) body.organization_domains = domains;
      if (names.length > 0) body.q_organization_name = names.join(' OR ');
    }

    // Map skills as contextual keywords
    const skills = filters.skills || icp?.mandatory_skills;
    const keywordParts: string[] = [];
    if (skills?.length) keywordParts.push(...skills.slice(0, 5));
    if (keywordParts.length > 0) body.q_keywords = keywordParts.join(' ');

    // NEW: Company size filter
    if (discovery.company_size_ranges.length > 0) {
      body.organization_num_employees_ranges = discovery.company_size_ranges;
    }

    // NEW: Excluded current titles
    if (discovery.excluded_current_titles.length > 0) {
      body.person_not_titles = discovery.excluded_current_titles;
    }
    
    } // close else for pre-computed apollo_filters

    console.log(`[smart-search] Apollo search body:`, JSON.stringify(body));

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
      console.error(`[smart-search] Apollo API error [${response.status}]:`, errText);
      return [];
    }

    const data = await response.json();
    const people = data.people || [];
    console.log(`[smart-search] Apollo returned ${people.length} people`);

    // Transform to ApolloCandidate format
    return people
      .filter((p: any) => p.linkedin_url && p.linkedin_url.includes('linkedin.com/in/'))
      .map((p: any) => ({
        url: p.linkedin_url,
        source: 'apollo',
        title: `${p.name || ''} - ${p.title || ''} at ${p.organization?.name || ''}`.trim(),
        description: p.headline || '',
        apollo_data: {
          email: p.email,
          title: p.title,
          organization_name: p.organization?.name,
          seniority: p.seniority,
          name: p.name,
          phone: p.phone_numbers?.[0]?.sanitized_number || null,
          linkedin_url: p.linkedin_url,
          organization_industry: p.organization?.industry || null,
          organization_employees: p.organization?.estimated_num_employees || null,
          current_role_start_date: p.employment_history?.[0]?.start_date || null,
        },
      }));
  } catch (err) {
    console.error('[smart-search] Apollo search error:', err);
    return [];
  }
}

const MAX_ROUNDS = 3;
const BATCH_CONCURRENCY = 2;
const OVERSAMPLE_FACTOR = 2;

// Check if search was cancelled by the user
async function isCancelled(supabase: any, searchId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('recruitment_hunting_searches')
      .select('status')
      .eq('id', searchId)
      .single();
    return data?.status === 'cancelled';
  } catch {
    return false;
  }
}

// ============== BRAZILIAN CITIES GEO DATA ==============
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'são paulo': { lat: -23.5505, lng: -46.6333 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'curitiba': { lat: -25.4284, lng: -49.2733 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'salvador': { lat: -12.9714, lng: -38.5124 },
  'brasília': { lat: -15.7975, lng: -47.8919 },
  'brasilia': { lat: -15.7975, lng: -47.8919 },
  'fortaleza': { lat: -3.7172, lng: -38.5433 },
  'recife': { lat: -8.0476, lng: -34.877 },
  'manaus': { lat: -3.119, lng: -60.0217 },
  'belém': { lat: -1.4558, lng: -48.5024 },
  'belem': { lat: -1.4558, lng: -48.5024 },
  'goiânia': { lat: -16.6869, lng: -49.2648 },
  'goiania': { lat: -16.6869, lng: -49.2648 },
  'guarulhos': { lat: -23.4538, lng: -46.5333 },
  'campinas': { lat: -22.9099, lng: -47.0626 },
  'são gonçalo': { lat: -22.8269, lng: -43.0634 },
  'são luís': { lat: -2.5297, lng: -44.2825 },
  'maceió': { lat: -9.6658, lng: -35.7353 },
  'natal': { lat: -5.7945, lng: -35.211 },
  'teresina': { lat: -5.0892, lng: -42.8019 },
  'campo grande': { lat: -20.4697, lng: -54.6201 },
  'florianópolis': { lat: -27.5954, lng: -48.548 },
  'florianopolis': { lat: -27.5954, lng: -48.548 },
  'vitória': { lat: -20.3155, lng: -40.3128 },
  'vitoria': { lat: -20.3155, lng: -40.3128 },
  'londrina': { lat: -23.3103, lng: -51.1628 },
  'joinville': { lat: -26.3045, lng: -48.8487 },
  'santos': { lat: -23.9608, lng: -46.3336 },
  'niterói': { lat: -22.8833, lng: -43.1036 },
  'niteroi': { lat: -22.8833, lng: -43.1036 },
  'osasco': { lat: -23.5325, lng: -46.7917 },
  'santo andré': { lat: -23.6737, lng: -46.5432 },
  'santo andre': { lat: -23.6737, lng: -46.5432 },
  'são bernardo do campo': { lat: -23.6914, lng: -46.5646 },
  'são josé dos campos': { lat: -23.1791, lng: -45.8872 },
  'ribeirão preto': { lat: -21.1704, lng: -47.8103 },
  'ribeirao preto': { lat: -21.1704, lng: -47.8103 },
  'sorocaba': { lat: -23.5015, lng: -47.4526 },
  'piracicaba': { lat: -22.7338, lng: -47.6476 },
  'bauru': { lat: -22.3246, lng: -49.0871 },
  'jundiaí': { lat: -23.1857, lng: -46.8978 },
  'jundiai': { lat: -23.1857, lng: -46.8978 },
  'maringá': { lat: -23.4205, lng: -51.9333 },
  'maringa': { lat: -23.4205, lng: -51.9333 },
  'uberlândia': { lat: -18.9186, lng: -48.2772 },
  'uberlandia': { lat: -18.9186, lng: -48.2772 },
  'juiz de fora': { lat: -21.7642, lng: -43.3503 },
  'cuiabá': { lat: -15.601, lng: -56.0974 },
  'cuiaba': { lat: -15.601, lng: -56.0974 },
  'aracaju': { lat: -10.9091, lng: -37.0677 },
  'joão pessoa': { lat: -7.115, lng: -34.861 },
  'joao pessoa': { lat: -7.115, lng: -34.861 },
  'tauá': { lat: -6.0028, lng: -40.2928 },
  'taua': { lat: -6.0028, lng: -40.2928 },
  'barueri': { lat: -23.5114, lng: -46.8761 },
  'cotia': { lat: -23.6044, lng: -46.9186 },
  'diadema': { lat: -23.6861, lng: -46.6228 },
  'mauá': { lat: -23.6678, lng: -46.4614 },
  'maua': { lat: -23.6678, lng: -46.4614 },
  'carapicuíba': { lat: -23.5224, lng: -46.8356 },
  'carapicuiba': { lat: -23.5224, lng: -46.8356 },
  'taboão da serra': { lat: -23.6019, lng: -46.7583 },
  'guarujá': { lat: -23.9928, lng: -46.2564 },
  'guaruja': { lat: -23.9928, lng: -46.2564 },
  'são caetano do sul': { lat: -23.6229, lng: -46.5503 },
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeCity(city: string): string {
  return city.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*\w{2}$/, '') // remove " - SP"
    .replace(/,\s*\w{2}$/, '') // remove ", SP"
    .trim();
}

function getCityCoords(cityStr: string): { lat: number; lng: number } | null {
  const normalized = normalizeCity(cityStr);
  // Try exact match first
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];
  // Try partial match
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  return null;
}

interface LocationFilter {
  city?: string;
  state?: string;
  radius?: number; // km
  rawLocation?: string; // legacy field
}

function parseLocationFilter(filters: any): LocationFilter {
  const f = filters || {};
  if (f.locationCity) {
    return {
      city: f.locationCity,
      state: f.locationState || '',
      radius: f.locationRadius || 50,
    };
  }
  // Legacy: parse from "location" string like "São Paulo, SP"
  if (f.location) {
    const parts = f.location.split(',').map((p: string) => p.trim());
    return {
      city: parts[0] || '',
      state: parts[1] || '',
      radius: f.locationRadius || 50,
      rawLocation: f.location,
    };
  }
  return {};
}

function isLocationCompatible(candidateLocation: string | null, target: LocationFilter): { compatible: boolean; distance?: number; reason?: string } {
  if (!target.city) return { compatible: true, reason: 'no_filter' };
  if (!candidateLocation) {
    // If radius filter is active (not "any"), penalize unknown locations
    if (target.radius && target.radius > 0) {
      return { compatible: false, reason: 'location_unknown' };
    }
    return { compatible: true, reason: 'location_unknown_no_radius' };
  }

  const targetCoords = getCityCoords(target.city);
  const candidateCoords = getCityCoords(candidateLocation);

  if (!targetCoords || !candidateCoords) {
    // Fallback: string matching
    const normalizedTarget = normalizeCity(target.city);
    const normalizedCandidate = normalizeCity(candidateLocation);
    if (normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate)) {
      return { compatible: true, distance: 0, reason: 'string_match' };
    }
    // If we can't determine, accept but flag
    return { compatible: true, reason: 'coords_unknown' };
  }

  const distance = haversineDistance(targetCoords.lat, targetCoords.lng, candidateCoords.lat, candidateCoords.lng);
  const radius = target.radius || 50;

  return {
    compatible: distance <= radius,
    distance: Math.round(distance),
    reason: distance <= radius ? 'within_radius' : 'outside_radius',
  };
}

// ============== EVABOOT FALLBACK ==============

async function triggerEvabootFallback(
  supabase: any,
  supabaseUrl: string,
  searchId: string,
  query: string,
  titleVariations: string[],
  locationFilter: LocationFilter,
  seniority: string | null,
  targetCompanies: string[],
  evabootApiKey: string,
  precomputedSalesNavUrl?: string,
  accountId?: string,
): Promise<void> {
  try {
    console.log(`[smart-search] Triggering Evaboot search`);

    // Use pre-computed URL from ICP if available
    let salesNavUrl = precomputedSalesNavUrl || '';

    if (salesNavUrl) {
      console.log(`[smart-search] Using pre-computed Sales Navigator URL from ICP`);
    }

    // Generate Sales Navigator URL via Lovable AI only if not pre-computed
    const lovableApiKey = "direct";

    if (!salesNavUrl && lovableApiKey) {
      const allTitles = [query, ...titleVariations].slice(0, 6);
      const locationStr = locationFilter.city
        ? (locationFilter.state ? `${locationFilter.city}, ${locationFilter.state}` : locationFilter.city)
        : 'Brasil';

      const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'Você é um especialista em LinkedIn Sales Navigator. Gere URLs de busca válidas.',
            },
            {
              role: 'user',
              content: `Gere uma URL de busca válida do LinkedIn Sales Navigator com estes critérios:
- Títulos de cargo: ${allTitles.join(', ')}
- Localização: ${locationStr}
${seniority ? `- Senioridade: ${seniority}` : ''}
${targetCompanies.length > 0 ? `- Empresas atuais: ${targetCompanies.join(', ')}` : ''}

A URL deve seguir o formato:
https://www.linkedin.com/sales/search/people?query=(filters:List(...))

Retorne APENAS a URL, sem explicações.`,
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        salesNavUrl = (aiData.choices?.[0]?.message?.content || '').trim();
        console.log(`[smart-search] Generated Sales Navigator URL: ${salesNavUrl.substring(0, 100)}...`);
        if (accountId) {
          await consumeAICredits({
            supabase,
            accountId,
            model: 'google/gemini-2.5-flash-lite',
            aiData,
            referenceType: 'hunting_smart_search_salesnav_url',
            referenceId: searchId,
          }).catch((e) => console.error('[billing] smart-search salesnav error', e));
        }
      }
    }

    if (!salesNavUrl || !salesNavUrl.includes('linkedin.com/sales')) {
      // Fallback: construct a basic Sales Navigator URL
      const allTitles = [query, ...titleVariations].slice(0, 4);
      const titleParam = encodeURIComponent(allTitles.join(','));
      salesNavUrl = `https://www.linkedin.com/sales/search/people?query=(filters:List((type:CURRENT_TITLE,values:List(${titleParam}))))`;
    }

    // Update search record
    await supabase
      .from('recruitment_hunting_searches')
      .update({
        evaboot_status: 'queued',
      } as any)
      .eq('id', searchId);

    // Call Evaboot API
    const searchName = `${query} - Hunting ${new Date().toISOString().split('T')[0]}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/hunting-webhook-evaboot`;

    const evabootResponse = await fetch('https://api.evaboot.com/v1/extractions/url/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${evabootApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkedin_url: salesNavUrl,
        search_name: searchName,
        webhook_url: webhookUrl,
      }),
    });

    if (evabootResponse.ok) {
      const evabootData = await evabootResponse.json();
      const jobId = evabootData.id || evabootData.job_id || evabootData.extraction_id;
      console.log(`[smart-search] Evaboot job created: ${jobId}`);

      await supabase
        .from('recruitment_hunting_searches')
        .update({
          evaboot_job_id: jobId ? String(jobId) : null,
          evaboot_status: 'running',
        } as any)
        .eq('id', searchId);
    } else {
      const errText = await evabootResponse.text();
      console.error(`[smart-search] Evaboot API error [${evabootResponse.status}]:`, errText);
      await supabase
        .from('recruitment_hunting_searches')
        .update({ evaboot_status: 'error' } as any)
        .eq('id', searchId);
    }
  } catch (err) {
    console.error('[smart-search] Evaboot fallback error:', err);
    await supabase
      .from('recruitment_hunting_searches')
      .update({ evaboot_status: 'error' } as any)
      .eq('id', searchId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const evabootApiKey = Deno.env.get('EVABOOT_API_KEY');

    if (!firecrawlApiKey && !apolloApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma fonte de busca configurada (Firecrawl ou Apollo).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
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

    const body: SmartSearchRequest = await req.json();
    const {
      account_id,
      job_id,
      query,
      sources = ['linkedin'],
      desired_count = 10,
      min_score = 70,
      filters = {},
    } = body;

    if (!account_id || !query) {
      return new Response(
        JSON.stringify({ success: false, error: 'account_id e query são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[smart-search] Starting: "${query}" desired=${desired_count} min_score=${min_score}`);

    // Parse location filter
    const locationFilter = parseLocationFilter(filters);
    console.log(`[smart-search] Location filter:`, JSON.stringify(locationFilter));

    // Fetch ICP
    let icp: any = null;
    let icpId: string | null = null;
    if (job_id) {
      const { data: icpData } = await supabase
        .from('job_icps')
        .select('*')
        .eq('job_id', job_id)
        .eq('is_active', true)
        .maybeSingle();
      if (icpData) {
        icp = icpData;
        icpId = icpData.id;
      }
    }
    // Merge ICP fields into filters for downstream use
    const f = filters as any;
    if (icp) {
      if (icp.title_variations?.length && !f.titleVariations?.length) {
        f.titleVariations = icp.title_variations;
      }
      if (icp.negative_keywords?.length && !f.negativeKeywords?.length) {
        f.negativeKeywords = icp.negative_keywords;
      }
      if (icp.target_companies?.length && !f.targetCompanies?.length) {
        f.targetCompanies = icp.target_companies;
      }
      if (icp.industry_preferences?.length && !f.industry) {
        f.industry = icp.industry_preferences[0]; // Use primary industry
      }
    }

    const locationStr = locationFilter.city
      ? (locationFilter.state ? `${locationFilter.city}, ${locationFilter.state}` : locationFilter.city)
      : (f.location || '');

    let enrichedQuery = query;

    if (icp?.search_keywords?.length > 0) {
      const shortKw = (icp.search_keywords as string[])
        .filter((k: string) => k.length <= 30 && k.split(/\s+/).length <= 3)
        .slice(0, 5);
      enrichedQuery = shortKw.length > 0 ? shortKw.join(' ') : query;
      if (locationStr) enrichedQuery += ` ${locationStr}`;
    } else {
      if (locationStr) enrichedQuery += ` ${locationStr}`;
      if (f.seniority) enrichedQuery += ` ${f.seniority}`;
      if (f.skills?.length) {
        const shortSkills = f.skills.filter((s: string) => s.length <= 30).slice(0, 4);
        if (shortSkills.length > 0) enrichedQuery += ` ${shortSkills.join(' ')}`;
      }
    }
    // Negative keywords are now applied in searchUrls() for better control
    if (enrichedQuery.length > 120) {
      enrichedQuery = enrichedQuery.substring(0, 120).replace(/\s\S*$/, '');
    }

    // Create search record
    const { data: searchRecord, error: insertError } = await supabase
      .from('recruitment_hunting_searches')
      .insert({
        account_id,
        job_id,
        icp_id: icpId,
        query,
        sources,
        filters,
        status: 'running',
        created_by: user.id,
        desired_count,
        min_score,
        qualified_count: 0,
        search_rounds: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[smart-search] Error creating search:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar busca' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchId = searchRecord.id;

    // Return immediately with search_id — processing continues in background
    const responsePromise = new Response(
      JSON.stringify({
        success: true,
        search_id: searchId,
        message: 'Busca inteligente iniciada. Acompanhe o progresso em tempo real.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Background processing
    const backgroundWork = (async () => {
      let qualifiedCount = 0;
      let totalScraped = 0;
      let scrapeFailures = 0;
      let allSeenUrls = new Set<string>();
      let round = 0;
      let effectiveRounds = 0; // Only count rounds that had successful scrapes
      // Map of LinkedIn URL -> apollo_data for enrichment
      const apolloDataMap = new Map<string, ApolloCandidate['apollo_data']>();

      try {
        while (qualifiedCount < desired_count && round < MAX_ROUNDS + 2) { // Allow extra rounds for failed ones
          // Cap effective rounds at MAX_ROUNDS
          if (effectiveRounds >= MAX_ROUNDS) {
            console.log(`[smart-search] Max effective rounds (${MAX_ROUNDS}) reached, stopping`);
            break;
          }
          // Check cancellation at start of each round
          if (await isCancelled(supabase, searchId)) {
            console.log(`[smart-search] Search ${searchId} cancelled by user at round start`);
            break;
          }

          round++;
          console.log(`[smart-search] Round ${round}/${MAX_ROUNDS} — qualified: ${qualifiedCount}/${desired_count}`);

          await supabase
            .from('recruitment_hunting_searches')
            .update({ search_rounds: round } as any)
            .eq('id', searchId);

          const batchSize = round === 1
            ? desired_count * OVERSAMPLE_FACTOR
            : Math.max(10, (desired_count - qualifiedCount) * 2);

          // === PARALLEL SEARCH: Apollo + Firecrawl ===
          let urls: UrlInfo[] = [];

          if (round === 1 && apolloApiKey) {
            // Run Apollo and Firecrawl in parallel on first round
            const [apolloResults, firecrawlResults] = await Promise.all([
              searchApolloForSmartSearch(apolloApiKey, query, f, locationFilter, icp, batchSize),
              firecrawlApiKey
                ? searchUrls(enrichedQuery, sources, batchSize, allSeenUrls, firecrawlApiKey, f, query, locationStr)
                : Promise.resolve([]),
            ]);

            console.log(`[smart-search] Round 1 parallel: Apollo=${apolloResults.length}, Firecrawl=${firecrawlResults.length}`);

            // Determine if Sales Navigator should be primary (senior+ roles)
            const icpSeniority = icp?.seniority?.toLowerCase() || '';
            const isSeniorRole = ['senior', 'lead', 'specialist'].includes(icpSeniority);
            const hasIcpSalesNavUrl = !!icp?.sales_navigator_url;

            // Trigger Evaboot: primary for senior roles OR fallback when Apollo < 15
            if (evabootApiKey && (isSeniorRole || apolloResults.length < 15)) {
              const reason = isSeniorRole ? 'senior role (primary channel)' : 'Apollo < 15 results (fallback)';
              console.log(`[smart-search] Triggering Evaboot: ${reason}`);
              triggerEvabootFallback(
                supabase,
                supabaseUrl,
                searchId,
                query,
                (f.titleVariations || []) as string[],
                locationFilter,
                f.seniority || icp?.seniority || null,
                (f.targetCompanies || icp?.target_companies || []) as string[],
                evabootApiKey,
                hasIcpSalesNavUrl ? icp.sales_navigator_url : undefined,
                account_id,
              ).catch(err => console.error('[smart-search] Evaboot trigger error:', err));
            }

            // Store Apollo data for enrichment
            for (const ac of apolloResults) {
              apolloDataMap.set(ac.url, ac.apollo_data);
            }

            // Merge & dedup by LinkedIn URL — Apollo candidates first (higher priority)
            const mergedMap = new Map<string, UrlInfo & { apollo_data?: ApolloCandidate['apollo_data'] }>();

            for (const ac of apolloResults) {
              if (!allSeenUrls.has(ac.url)) {
                mergedMap.set(ac.url, { ...ac, apollo_data: ac.apollo_data });
              }
            }

            for (const fc of firecrawlResults) {
              if (!allSeenUrls.has(fc.url)) {
                if (mergedMap.has(fc.url)) {
                  // Found by both — mark as dual source, keep Apollo data
                  const existing = mergedMap.get(fc.url)!;
                  existing.source = 'apollo+firecrawl';
                } else {
                  mergedMap.set(fc.url, fc);
                }
              }
            }

            urls = Array.from(mergedMap.values());

            // Sort: dual-source first, then apollo, then firecrawl
            urls.sort((a, b) => {
              const priority = (s: string) => s === 'apollo+firecrawl' ? 0 : s === 'apollo' ? 1 : 2;
              return priority(a.source) - priority(b.source);
            });

            // Limit enrichment volume
            const maxEnrich = desired_count * 2;
            if (urls.length > maxEnrich) {
              console.log(`[smart-search] Limiting enrichment from ${urls.length} to ${maxEnrich}`);
              urls = urls.slice(0, maxEnrich);
            }
          } else {
            // Subsequent rounds or no Apollo: Firecrawl only
            if (firecrawlApiKey) {
              urls = await searchUrls(enrichedQuery, sources, batchSize, allSeenUrls, firecrawlApiKey, f, query, locationStr);
            }
          }

          if (urls.length === 0) {
            console.log(`[smart-search] Round ${round}: no new URLs found, stopping`);
            break;
          }

          for (const u of urls) allSeenUrls.add(u.url);
          console.log(`[smart-search] Round ${round}: found ${urls.length} new URLs to scrape`);

          for (let i = 0; i < urls.length && qualifiedCount < desired_count; i += BATCH_CONCURRENCY) {
            // Check cancellation before each batch
            if (await isCancelled(supabase, searchId)) {
              console.log(`[smart-search] Search ${searchId} cancelled by user during batch processing`);
              break;
            }

            const batch = urls.slice(i, i + BATCH_CONCURRENCY);

            const batchResults = await Promise.allSettled(
              batch.map(async (urlInfo: any) => {
                try {
                  // Get apollo_data for this URL if available
                  const urlApolloData = (urlInfo as any).apollo_data || apolloDataMap.get(urlInfo.url) || null;

                  const { data: resultRecord, error: resErr } = await supabase
                    .from('recruitment_hunting_results')
                    .insert({
                      search_id: searchId,
                      source: urlInfo.source,
                      source_url: urlInfo.url,
                      extracted_data: {
                        title: urlInfo.title,
                        description: urlInfo.description,
                        ...(urlApolloData ? { apollo_data: urlApolloData } : {}),
                      },
                      status: 'pending',
                      score_source: 'pending',
                      qualified: false,
                    })
                    .select('id')
                    .single();

                  if (resErr || !resultRecord) {
                    console.error('[smart-search] Error inserting result:', resErr);
                    return null;
                  }

                  // Call hunting-scrape-profile with search_filters + apollo_data
                  const scrapeBody: any = {
                    result_id: resultRecord.id,
                    url: urlInfo.url,
                    search_filters: {
                      location: locationStr,
                      locationCity: locationFilter.city,
                      locationState: locationFilter.state,
                      locationRadius: locationFilter.radius,
                      target_locations: icp?.target_locations || [],
                      workModel: f.workModel || f.work_model || null,
                      languages: f.languages || [],
                      softSkills: f.softSkills || [],
                      salaryMin: f.salaryMin || f.salary_min || null,
                      salaryMax: f.salaryMax || f.salary_max || null,
                      seniority: f.seniority || icp?.seniority || null,
                      industry: f.industry || null,
                    },
                  };

                  // Pass apollo_data for enhanced scoring context
                  if (urlApolloData) {
                    scrapeBody.apollo_data = urlApolloData;
                  }

                  const scrapeResponse = await fetch(
                    `${supabaseUrl}/functions/v1/hunting-scrape-profile`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
                      },
                      body: JSON.stringify(scrapeBody),
                    }
                  );

                  const scrapeData = await scrapeResponse.json();
                  totalScraped++;

                  if (scrapeData.success && scrapeData.match_score != null) {
                    // Post-scrape location validation
                    const candidateLocation = scrapeData.extracted_data?.location;
                    const geoCheck = isLocationCompatible(candidateLocation, locationFilter);
                    
                    let finalScore = scrapeData.match_score;
                    let isQualified = finalScore >= min_score;

                    if (geoCheck.reason === 'location_unknown' && locationFilter.city) {
                      // Unknown location with active filter: penalize 20 points, flag it
                      console.log(`[smart-search] Location unknown for candidate, penalizing 20pts`);
                      finalScore = Math.max(0, finalScore - 20);
                      isQualified = finalScore >= min_score;
                      // Flag in extracted data
                      if (scrapeData.extracted_data) {
                        scrapeData.extracted_data.location_unconfirmed = true;
                      }
                    } else if (!geoCheck.compatible) {
                      console.log(`[smart-search] Location mismatch: "${candidateLocation}" is ${geoCheck.distance}km from ${locationFilter.city} (radius: ${locationFilter.radius}km)`);
                      // Penalize score by 30 points for being outside radius
                      finalScore = Math.max(0, finalScore - 30);
                      isQualified = false;
                    }

                    // Determine final status
                    const finalStatus = isQualified ? 'pending' : 'discarded';

                    await supabase
                      .from('recruitment_hunting_results')
                      .update({
                        score_source: 'deep',
                        qualified: isQualified,
                        match_score: finalScore,
                        status: finalStatus,
                      } as any)
                      .eq('id', resultRecord.id);

                    if (isQualified) {
                      return { qualified: true, score: finalScore, hadScore: true };
                    }
                    return { qualified: false, hadScore: finalScore > 0 };
                  } else {
                    // Scrape failed — keep visible with snippet data, let user retry
                    const snippetTitle = urlInfo.title || '';
                    const snippetName = snippetTitle.split(' - ')[0]?.trim() || snippetTitle.split(' | ')[0]?.trim() || null;
                    const scrapeError = scrapeData?.error || 'Scraping failed';
                    console.log(`[smart-search] Scrape failed for ${urlInfo.url}: ${scrapeError}`);
                    
                    await supabase
                      .from('recruitment_hunting_results')
                      .update({
                        score_source: 'preview',
                        qualified: false,
                        status: 'pending',
                        extracted_data: {
                          ...(urlInfo.title ? { title: urlInfo.title } : {}),
                          ...(urlInfo.description ? { description: urlInfo.description } : {}),
                          name: snippetName,
                          scrape_error: scrapeError,
                          scrape_failed: true,
                        },
                      } as any)
                      .eq('id', resultRecord.id);
                    scrapeFailures++;
                  }
                  return { qualified: false, hadScore: false };
                } catch (err) {
                  console.error('[smart-search] Scrape error:', err);
                  // Keep visible with snippet data instead of discarding
                  try {
                    const snippetTitle = urlInfo.title || '';
                    const snippetName = snippetTitle.split(' - ')[0]?.trim() || snippetTitle.split(' | ')[0]?.trim() || null;
                    await supabase
                      .from('recruitment_hunting_results')
                      .update({
                        score_source: 'preview',
                        qualified: false,
                        status: 'pending',
                        extracted_data: {
                          ...(urlInfo.title ? { title: urlInfo.title } : {}),
                          ...(urlInfo.description ? { description: urlInfo.description } : {}),
                          name: snippetName,
                          scrape_error: err instanceof Error ? err.message : 'Unknown error',
                          scrape_failed: true,
                        },
                      } as any)
                      .eq('id', resultRecord?.id);
                  } catch { /* best effort */ }
                  scrapeFailures++;
                  return { qualified: false, hadScore: false };
                }
              })
            );

            // Track if this round had any successful scrapes with non-zero scores
            let roundHadSuccessfulScrapes = false;

            for (const result of batchResults) {
              if (result.status === 'fulfilled' && result.value?.qualified) {
                qualifiedCount++;
              }
              if (result.status === 'fulfilled' && result.value?.hadScore) {
                roundHadSuccessfulScrapes = true;
              }
            }

            await supabase
              .from('recruitment_hunting_searches')
              .update({ qualified_count: qualifiedCount } as any)
              .eq('id', searchId);

            console.log(`[smart-search] Batch done — qualified: ${qualifiedCount}/${desired_count}, scraped: ${totalScraped}`);
          }

          // Count this as an effective round only if at least one scrape returned a score
          if (totalScraped > 0) {
            // Check if ALL candidates in this round got score 0 (systematic failure)
            const { count: zeroScoreCount } = await supabase
              .from('recruitment_hunting_results')
              .select('*', { count: 'exact', head: true })
              .eq('search_id', searchId)
              .eq('match_score', 0);
            
            const { count: totalRoundResults } = await supabase
              .from('recruitment_hunting_results')
              .select('*', { count: 'exact', head: true })
              .eq('search_id', searchId);

            if (zeroScoreCount === totalRoundResults && (totalRoundResults || 0) > 0) {
              console.log(`[smart-search] ⚠️ Round ${round}: ALL ${totalRoundResults} candidates scored 0 — likely systematic extraction failure. NOT counting as effective round.`);
            } else {
              effectiveRounds++;
            }
          }
        }

        // Check if cancelled — if so, save partial results with cancelled status
        const wasCancelled = await isCancelled(supabase, searchId);

        const { count: totalCount } = await supabase
          .from('recruitment_hunting_results')
          .select('*', { count: 'exact', head: true })
          .eq('search_id', searchId);

        // Credit consumption
        let creditsConsumed = 0;
        if (totalScraped > 0) {
          const searchApiCalls = round;
          const scrapeApiCalls = totalScraped;
          const totalApiCalls = searchApiCalls + scrapeApiCalls;
          const costUSD = totalApiCalls * 0.004;
          creditsConsumed = Math.max((costUSD * 5.65 * 1.5) / 1.39, 0.1);
          creditsConsumed = Math.round(creditsConsumed * 100) / 100;

          try {
            await fetch(`${supabaseUrl}/functions/v1/credits-consume`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
              },
              body: JSON.stringify({
                org_id: account_id,
                feature_key: 'hunting_search',
                credit_type: 'universal',
                amount: creditsConsumed,
                reference_id: searchId,
                reference_type: 'smart_hunting_search',
                description: `Smart Hunting: ${query.substring(0, 50)} (${qualifiedCount} qualificados de ${totalScraped} analisados)`,
              }),
            });
          } catch (creditErr) {
            console.error('[smart-search] Credit error:', creditErr);
          }
        }

        if (wasCancelled) {
          // Keep status as cancelled, just update counts
          await supabase
            .from('recruitment_hunting_searches')
            .update({
              status: 'cancelled',
              results_count: totalCount || 0,
              qualified_count: qualifiedCount,
              search_rounds: round,
              completed_at: new Date().toISOString(),
            })
            .eq('id', searchId);
          console.log(`[smart-search] Cancelled: ${qualifiedCount} qualified from ${totalScraped} scraped in ${round} rounds (partial results saved)`);
        } else {
          await supabase
            .from('recruitment_hunting_searches')
            .update({
              status: 'completed',
              results_count: totalCount || 0,
              qualified_count: qualifiedCount,
              search_rounds: round,
              completed_at: new Date().toISOString(),
            })
            .eq('id', searchId);
          console.log(`[smart-search] Completed: ${qualifiedCount} qualified from ${totalScraped} scraped in ${round} rounds`);

          // Log AI execution summary
          await logAIExecution(supabase, {
            accountId: account_id,
            functionName: 'hunting-smart-search',
            operation: 'discovery',
            status: 'success',
            outputSummary: {
              qualified: qualifiedCount,
              scraped: totalScraped,
              rounds: round,
              failures: scrapeFailures,
              total_results: totalCount || 0,
            },
            metadata: { search_id: searchId, job_id, query: query.substring(0, 100) },
          });
        }

      } catch (err) {
        console.error('[smart-search] Background error:', err);
        await supabase
          .from('recruitment_hunting_searches')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Erro interno',
            search_rounds: round,
          })
          .eq('id', searchId);

        // Log error
        await logAIExecution(supabase, {
          accountId: account_id,
          functionName: 'hunting-smart-search',
          operation: 'discovery',
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          metadata: { search_id: searchId, job_id, query: query.substring(0, 100) },
        });
      } finally {
        // Cleanup: mark any remaining pending/preview results as discarded
        // This prevents orphaned results when the background process is interrupted
        try {
          const { data: orphaned } = await supabase
            .from('recruitment_hunting_results')
            .select('id')
            .eq('search_id', searchId)
            .eq('status', 'pending')
            .in('score_source', ['pending', 'preview']);
          
          if (orphaned && orphaned.length > 0) {
            console.log(`[smart-search] Cleaning up ${orphaned.length} orphaned pending results`);
            await supabase
              .from('recruitment_hunting_results')
              .update({
                status: 'discarded',
                score_source: 'deep',
                qualified: false,
              } as any)
              .eq('search_id', searchId)
              .eq('status', 'pending')
              .in('score_source', ['pending', 'preview']);
          }
        } catch (cleanupErr) {
          console.error('[smart-search] Cleanup error:', cleanupErr);
        }
      }
    })();

    try {
      // @ts-ignore - Deno Deploy specific API
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundWork);
      }
    } catch {
      // fire and forget
    }

    return responsePromise;

  } catch (error) {
    console.error('[smart-search] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============== SEARCH URLS ==============

interface UrlInfo {
  url: string;
  source: string;
  title?: string;
  description?: string;
}

function buildTitleQuery(originalQuery: string, titleVariations: string[]): string {
  if (!titleVariations || titleVariations.length === 0) return `"${originalQuery}"`;
  const allTitles = [originalQuery, ...titleVariations].slice(0, 6);
  return '(' + allTitles.map(t => `"${t}"`).join(' OR ') + ')';
}

function isValidGitHubProfileUrl(url: string): boolean {
  const invalidPatterns = ['/issues/', '/discussions/', '/orgs/', '/pull/', '/blob/', '/tree/', '/wiki/', '/releases/', '/actions/', '/projects/', '/commit/', '/compare/', '/repos/'];
  const lowerUrl = url.toLowerCase();
  return !invalidPatterns.some(p => lowerUrl.includes(p));
}

// ============== PRE-FILTER: TITLE RELEVANCE CHECK ==============
function isTitleRelevant(
  urlTitle: string | undefined,
  urlDescription: string | undefined,
  originalQuery: string,
  titleVariations: string[]
): { relevant: boolean; reason?: string } {
  if (!urlTitle && !urlDescription) return { relevant: true, reason: 'no_snippet' };

  const text = `${urlTitle || ''} ${urlDescription || ''}`.toLowerCase();
  const allTitles = [originalQuery, ...(titleVariations || [])];

  // Normalize for fuzzy matching
  const normalize = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  const normalizedText = normalize(text);

  // Check if any title variation appears in snippet
  for (const title of allTitles) {
    const normalizedTitle = normalize(title);
    // Split title into words and check if most words appear
    const words = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) continue;
    const matchedWords = words.filter(w => normalizedText.includes(w));
    const matchRatio = matchedWords.length / words.length;
    if (matchRatio >= 0.5) return { relevant: true, reason: 'title_match' };
  }

  // Check for obvious mismatches - if the snippet has a clear job title that doesn't match
  const irrelevantPatterns = [
    /desenvolvedor|developer|programador|engineer/i,
    /designer|ux|ui/i,
    /vendedor|sales|comercial/i,
    /motorista|driver/i,
    /estagiário|intern|estágio/i,
  ];

  // Only flag as irrelevant if snippet clearly shows a different role
  // AND none of our target titles match common terms
  const queryLower = originalQuery.toLowerCase();
  const isQueryTech = /desenvolvedor|developer|programador|engineer|tech/i.test(queryLower);
  const isQueryDesign = /designer|ux|ui/i.test(queryLower);
  const isQuerySales = /vendedor|sales|comercial/i.test(queryLower);

  for (const pattern of irrelevantPatterns) {
    if (pattern.test(text)) {
      // Only flag if the query is NOT in this same category
      if (pattern.source.includes('desenvolvedor') && !isQueryTech) {
        return { relevant: false, reason: 'title_mismatch_tech' };
      }
      if (pattern.source.includes('designer') && !isQueryDesign) {
        return { relevant: false, reason: 'title_mismatch_design' };
      }
      if (pattern.source.includes('vendedor') && !isQuerySales) {
        return { relevant: false, reason: 'title_mismatch_sales' };
      }
    }
  }

  return { relevant: true, reason: 'no_clear_mismatch' };
}

async function searchUrls(
  enrichedQuery: string,
  sources: string[],
  limit: number,
  seenUrls: Set<string>,
  firecrawlApiKey: string,
  filters: any,
  originalQuery: string,
  locationStr: string,
): Promise<UrlInfo[]> {
  const perSourceLimit = Math.max(5, Math.ceil(limit / sources.length));
  const queries: { source: string; searchQuery: string }[] = [];
  const titleVariations: string[] = filters.titleVariations || [];
  const titleQuery = buildTitleQuery(originalQuery, titleVariations);
  const locationPart = locationStr ? ` "${locationStr}"` : '';

  if (sources.includes('linkedin')) {
    queries.push({ source: 'linkedin', searchQuery: `site:linkedin.com/in${locationPart} ${titleQuery}` });
  }
  if (sources.includes('github')) {
    queries.push({ source: 'github', searchQuery: `site:github.com ${titleQuery} developer` });
  }
  if (sources.includes('portfolio')) {
    queries.push({ source: 'portfolio', searchQuery: `${titleQuery} portfolio developer` });
  }

  // Target companies queries
  if (filters.targetCompanies?.length && sources.includes('linkedin')) {
    const companies: string[] = filters.targetCompanies;
    for (let i = 0; i < companies.length; i += 3) {
      const group = companies.slice(i, i + 3);
      const companiesStr = group.map((c: string) => `"${c}"`).join(' OR ');
      queries.push({
        source: 'linkedin',
        searchQuery: `site:linkedin.com/in${locationPart} ${originalQuery} (${companiesStr})`,
      });
    }
  }

  // Industry-specific query
  if (filters.industry && sources.includes('linkedin')) {
    queries.push({
      source: 'linkedin',
      searchQuery: `site:linkedin.com/in${locationPart} ${originalQuery} "${filters.industry}"`,
    });
  }

  const results: UrlInfo[] = [];

  const promises = queries.map(async ({ source, searchQuery }) => {
    try {
      let q = searchQuery;
      
      // Add automatic negative operators for LinkedIn to exclude recruiter posts
      if (source === 'linkedin') {
        q += ' -"looking for" -"procurando" -"hiring" -"contratando" -"vaga"';
      }
      
      // Add user-defined negative keywords
      if (filters.negativeKeywords?.length) {
        const negKws = filters.negativeKeywords.slice(0, 3).map((k: string) => `-"${k}"`).join(' ');
        q += ` ${negKws}`;
      }
      
      if (q.length > 150) {
        q = q.substring(0, 150).replace(/\s\S*$/, '');
      }

      console.log(`[smart-search] Query (${source}): ${q}`);

      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: q,
          limit: perSourceLimit,
          lang: 'pt',
          country: 'br',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) return [];

      const titleVariationsLocal: string[] = filters.titleVariations || [];
      
      return (data.data || [])
        .filter((item: any) => {
          if (!item.url || seenUrls.has(item.url)) return false;
          if (source === 'github' && !isValidGitHubProfileUrl(item.url)) {
            console.log(`[smart-search] Filtered out non-profile GitHub URL: ${item.url}`);
            return false;
          }
          // Pre-filter by title relevance before scraping
          const titleCheck = isTitleRelevant(item.title, item.description, originalQuery, titleVariationsLocal);
          if (!titleCheck.relevant) {
            console.log(`[smart-search] Pre-filtered by title (${titleCheck.reason}): ${item.url} — "${item.title}"`);
            return false;
          }
          return true;
        })
        .map((item: any) => ({
          url: item.url,
          source,
          title: item.title,
          description: item.description,
        }));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(promises);
  const seen = new Set<string>();

  for (const batch of allResults) {
    for (const item of batch) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        results.push(item);
      }
    }
  }

  return results.slice(0, limit);
}
