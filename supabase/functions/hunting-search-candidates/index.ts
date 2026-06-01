import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchFilters {
  location?: string;
  seniority?: string;
  skills?: string[];
  niceToHaveSkills?: string[];
  targetCompanies?: string[];
  negativeKeywords?: string[];
  experienceMin?: number;
  experienceMax?: number;
  industry?: string;
  titleVariations?: string[];
  salaryMin?: number;
  salaryMax?: number;
  workModel?: string;
  languages?: string[];
  softSkills?: string[];
}

interface SearchRequest {
  account_id: string;
  job_id?: string;
  query: string;
  sources?: string[];
  max_results?: number;
  offset?: number;
  existing_search_id?: string;
  filters?: SearchFilters;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firecrawl não configurado. Conecte o Firecrawl nas configurações do projeto.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchRequest = await req.json();
    const { 
      account_id, job_id, query, 
      sources = ['linkedin', 'github'], 
      max_results = 10,
      offset = 0,
      existing_search_id,
      filters = {} 
    } = body;

    if (!account_id || !query) {
      return new Response(
        JSON.stringify({ success: false, error: 'account_id e query são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[hunting-search] Starting search: "${query}" for account ${account_id}, max_results=${max_results}`);

    // Fetch ICP for job if job_id provided
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
        console.log(`[hunting-search] Using ICP: ${icpData.role} (${icpData.seniority})`);
      }
    }

    // Build enriched query using ICP if available
    // IMPORTANT: keep query short (max ~80 chars after site:) for Firecrawl/Google to return results
    let enrichedQuery = query;
    
    if (icp?.search_keywords?.length > 0) {
      // Use ICP search keywords — take only short ones
      const shortKeywords = (icp.search_keywords as string[])
        .filter((k: string) => k.length <= 30 && k.split(/\s+/).length <= 3)
        .slice(0, 5);
      enrichedQuery = shortKeywords.length > 0 ? shortKeywords.join(' ') : query;
      console.log(`[hunting-search] Using ICP keywords: ${enrichedQuery}`);
    } else {
      // Use manual filters to enrich query
      if (filters.location) enrichedQuery += ` ${filters.location}`;
      if (filters.seniority) enrichedQuery += ` ${filters.seniority}`;
      if (filters.skills?.length) {
        const shortSkills = filters.skills
          .filter(s => s.length <= 30 && s.split(/\s+/).length <= 3)
          .slice(0, 4);
        if (shortSkills.length > 0) enrichedQuery += ` ${shortSkills.join(' ')}`;
      }
      if (filters.industry) enrichedQuery += ` ${filters.industry}`;
    }

    // Append negative keywords as exclusion operators
    if (filters.negativeKeywords?.length) {
      const negTerms = filters.negativeKeywords.slice(0, 5).map(k => `-${k}`).join(' ');
      enrichedQuery += ` ${negTerms}`;
    }

    // Truncate to max 120 chars to prevent overly specific queries
    if (enrichedQuery.length > 120) {
      enrichedQuery = enrichedQuery.substring(0, 120).replace(/\s\S*$/, '');
      console.log(`[hunting-search] Query truncated to: "${enrichedQuery}"`);
    }

    // Determine per-source limit
    const searchSources = icp?.target_sources || sources;
    const perSourceLimit = Math.max(3, Math.ceil(max_results / searchSources.length));

    // Create or reuse search record
    let searchId = existing_search_id;

    if (!searchId) {
      const { data: searchRecord, error: insertError } = await supabase
        .from('recruitment_hunting_searches')
        .insert({
          account_id,
          job_id,
          icp_id: icpId,
          query,
          sources: searchSources,
          filters,
          status: 'running',
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[hunting-search] Error creating search record:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar busca' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      searchId = searchRecord.id;
    } else {
      // Update existing search status
      await supabase
        .from('recruitment_hunting_searches')
        .update({ status: 'running' })
        .eq('id', searchId);
    }

    const results: any[] = [];

    // Build search queries with title variations support
    const searchQueries: { source: string; searchQuery: string }[] = [];
    const titleVariations: string[] = (filters as any).titleVariations || [];

    // Build title OR query for broader matching
    function buildTitleQuery(title: string, variations: string[]): string {
      if (!variations || variations.length === 0) return title;
      const allTitles = [title, ...variations].slice(0, 6);
      return '(' + allTitles.map(t => `"${t}"`).join(' OR ') + ')';
    }
    const titleQuery = buildTitleQuery(query, titleVariations);

    if (searchSources.includes('linkedin')) {
      searchQueries.push({
        source: 'linkedin',
        searchQuery: `site:linkedin.com/in ${titleQuery}`,
      });
    }

    if (searchSources.includes('github')) {
      searchQueries.push({
        source: 'github',
        searchQuery: `site:github.com ${titleQuery} developer`,
      });
    }

    if (searchSources.includes('portfolio')) {
      searchQueries.push({
        source: 'portfolio',
        searchQuery: `${titleQuery} portfolio developer`,
      });
    }

    // Build extra queries for target companies — split into groups of 3
    if (filters.targetCompanies?.length && searchSources.includes('linkedin')) {
      const companies = filters.targetCompanies;
      for (let i = 0; i < companies.length; i += 3) {
        const group = companies.slice(i, i + 3);
        const companiesStr = group.map(c => `"${c}"`).join(' OR ');
        searchQueries.push({
          source: 'linkedin',
          searchQuery: `site:linkedin.com/in ${query} (${companiesStr})`,
        });
      }
    }

    // Industry-specific query
    if (filters.industry && searchSources.includes('linkedin')) {
      searchQueries.push({
        source: 'linkedin',
        searchQuery: `site:linkedin.com/in ${query} "${filters.industry}"`,
      });
    }

    // Fetch existing URLs to deduplicate
    let existingUrls = new Set<string>();
    if (existing_search_id) {
      const { data: existingResults } = await supabase
        .from('recruitment_hunting_results')
        .select('source_url')
        .eq('search_id', existing_search_id);
      if (existingResults) {
        existingUrls = new Set(existingResults.map(r => r.source_url).filter(Boolean));
      }
    }

    // Execute searches in parallel
    const apiErrors: string[] = [];

    const searchPromises = searchQueries.map(async ({ source, searchQuery }) => {
      try {
        console.log(`[hunting-search] Searching ${source}: "${searchQuery}" (limit: ${perSourceLimit})`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: perSourceLimit,
            lang: 'pt',
            country: 'br',
          }),
        });

        const data = await response.json();

        // Enhanced logging: capture full response details
        console.log(`[hunting-search] Firecrawl response for ${source}:`, JSON.stringify({
          httpStatus: response.status,
          success: data.success,
          dataLength: data.data?.length ?? 'N/A',
          error: data.error ?? null,
          warning: data.warning ?? null,
          keys: Object.keys(data),
        }));

        if (!response.ok) {
          const errorMsg = `Firecrawl ${source}: HTTP ${response.status} - ${data.error || JSON.stringify(data)}`;
          console.error(`[hunting-search] ${errorMsg}`);
          apiErrors.push(errorMsg);
          return [];
        }

        if (!data.success && data.error) {
          const errorMsg = `Firecrawl ${source}: ${data.error}`;
          console.error(`[hunting-search] ${errorMsg}`);
          apiErrors.push(errorMsg);
          return [];
        }

        const items = data.data || [];
        console.log(`[hunting-search] Found ${items.length} results for ${source}`);

        if (items.length === 0) {
          console.warn(`[hunting-search] Zero results from Firecrawl for ${source}. Query may be too restrictive or API has no matches.`);
        }

        return items
          .filter((item: any) => !existingUrls.has(item.url))
          .map((item: any) => ({
            source,
            source_url: item.url,
            extracted_data: {
              title: item.title,
              description: item.description,
              url: item.url,
            },
          }));
      } catch (error) {
        const errorMsg = `Firecrawl ${source}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[hunting-search] ${errorMsg}`);
        apiErrors.push(errorMsg);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    
    // Flatten and deduplicate results by URL
    const seenUrls = new Set<string>();
    for (const sourceResults of searchResults) {
      for (const r of sourceResults) {
        if (r.source_url && !seenUrls.has(r.source_url)) {
          seenUrls.add(r.source_url);
          results.push(r);
        }
      }
    }

    // Limit total results to max_results
    const limitedResults = results.slice(0, max_results);

    console.log(`[hunting-search] Total unique results: ${limitedResults.length} (from ${results.length} raw)`);

    // Insert results into database
    if (limitedResults.length > 0) {
      const resultsToInsert = limitedResults.map(r => ({
        search_id: searchId,
        source: r.source,
        source_url: r.source_url,
        extracted_data: r.extracted_data,
        status: 'pending',
      }));

      const { error: resultsError } = await supabase
        .from('recruitment_hunting_results')
        .insert(resultsToInsert);

      if (resultsError) {
        console.error('[hunting-search] Error inserting results:', resultsError);
      }
    }

    // Get total results count (existing + new)
    const { count: totalCount } = await supabase
      .from('recruitment_hunting_results')
      .select('*', { count: 'exact', head: true })
      .eq('search_id', searchId);

    // Determine final status based on results and errors
    let finalStatus = 'completed';
    let errorMessage: string | null = null;

    if (apiErrors.length > 0 && limitedResults.length === 0) {
      finalStatus = 'failed';
      errorMessage = apiErrors.join('; ');
      console.error(`[hunting-search] Search failed — all sources returned errors: ${errorMessage}`);
    } else if (apiErrors.length > 0) {
      finalStatus = 'completed';
      errorMessage = `Partial: ${apiErrors.join('; ')}`;
      console.warn(`[hunting-search] Search completed with partial errors: ${errorMessage}`);
    } else if (limitedResults.length === 0) {
      console.warn(`[hunting-search] Search completed but zero results. Query may need adjustment.`);
    }

    // --- Dynamic credit consumption (post-execution) ---
    let creditsConsumed = 0;
    const apiCallsMade = searchQueries.length;

    if (limitedResults.length > 0 && finalStatus !== 'failed') {
      // Formula: max((apiCalls * 0.004 * 5.65 * 1.5) / 1.39, 0.1)
      const costUSD = apiCallsMade * 0.004;
      creditsConsumed = Math.max((costUSD * 5.65 * 1.5) / 1.39, 0.1);
      creditsConsumed = Math.round(creditsConsumed * 100) / 100;

      console.log(`[hunting-search] Debiting ${creditsConsumed} credits (${apiCallsMade} API calls)`);

      try {
        const creditResponse = await fetch(`${supabaseUrl}/functions/v1/credits-consume`, {
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
            reference_type: 'hunting_search',
            description: `Busca hunting: ${query.substring(0, 50)} (${limitedResults.length} resultados)`,
          }),
        });

        const creditResult = await creditResponse.json();
        if (!creditResult.success) {
          console.error('[hunting-search] Credit debit failed:', creditResult.message || creditResult.error);
        } else {
          console.log(`[hunting-search] Credits debited: ${creditsConsumed} (balance: ${creditResult.balance_after})`);
        }
      } catch (creditErr) {
        console.error('[hunting-search] Credit debit exception:', creditErr);
      }
    } else {
      console.log(`[hunting-search] No credits debited (results: ${limitedResults.length}, status: ${finalStatus})`);
    }

    // Update search record with results count and error info
    await supabase
      .from('recruitment_hunting_searches')
      .update({
        status: finalStatus,
        results_count: totalCount || limitedResults.length,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', searchId);

    return new Response(
      JSON.stringify({
        success: true,
        search_id: searchId,
        results_count: limitedResults.length,
        total_results: totalCount || limitedResults.length,
        status: finalStatus,
        error_message: errorMessage,
        credits_consumed: creditsConsumed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hunting-search] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
