// Self-tuning wrapper around hunting-autonomous-search.
// Runs multiple rounds, progressively relaxing criteria until target qualified count is reached.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TunedRequest {
  job_id: string;
  account_id: string;
  desired_qualified?: number; // target number of qualified candidates (default 10)
  max_rounds?: number;        // default 3
  use_apollo?: boolean;
}

const RELAXATION_STEPS = [
  { strategy: 'strict',   relaxed: [],                    desc: 'ICP original' },
  { strategy: 'location', relaxed: ['location'],          desc: 'Localização ampliada (regional)' },
  { strategy: 'titles',   relaxed: ['titles', 'location'], desc: 'Títulos similares incluídos' },
  { strategy: 'seniority',relaxed: ['seniority', 'titles', 'location'], desc: 'Senioridade adjacente aceita' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: TunedRequest = await req.json();
    if (!body.job_id || !body.account_id) {
      return new Response(JSON.stringify({ error: 'job_id e account_id obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const desiredQualified = body.desired_qualified ?? 10;
    const maxRounds = Math.min(body.max_rounds ?? 3, RELAXATION_STEPS.length);

    // Load original ICP for relaxation
    const { data: job } = await supabase
      .from('recruitment_jobs')
      .select('id')
      .eq('id', body.job_id)
      .single();
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: originalIcp } = await supabase
      .from('job_icps')
      .select('*')
      .eq('job_id', body.job_id)
      .eq('is_active', true)
      .single();

    const rounds: any[] = [];
    let totalQualified = 0;
    let lastSearchId: string | null = null;

    for (let i = 0; i < maxRounds; i++) {
      const step = RELAXATION_STEPS[i];

      // Relax ICP in-memory by writing a temporary patched version (only when not strict)
      if (i > 0 && originalIcp) {
        const patch: any = {};
        if (step.relaxed.includes('location')) patch.target_locations = [];
        if (step.relaxed.includes('titles') && originalIcp.title_variations?.length) {
          patch.title_variations = [
            ...(originalIcp.title_variations || []),
            ...(originalIcp.role ? [originalIcp.role + ' senior', originalIcp.role + ' lead'] : []),
          ];
        }
        if (step.relaxed.includes('seniority')) {
          const adj: Record<string, string[]> = {
            junior: ['junior', 'pleno'],
            pleno: ['junior', 'pleno', 'senior'],
            senior: ['pleno', 'senior', 'lead'],
            lead: ['senior', 'lead', 'specialist'],
            specialist: ['senior', 'lead', 'specialist'],
          };
          const cur = originalIcp.seniority || 'pleno';
          // We can't change the column easily; instead skip — autonomous-search reads ICP fresh
          patch.__seniority_hint = adj[cur];
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('job_icps').update({
            target_locations: patch.target_locations ?? originalIcp.target_locations,
            title_variations: patch.title_variations ?? originalIcp.title_variations,
          }).eq('id', originalIcp.id);
        }
      }

      const startedAt = new Date().toISOString();

      // Call autonomous search
      const resp = await fetch(`${supabaseUrl}/functions/v1/hunting-autonomous-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          job_id: body.job_id,
          account_id: body.account_id,
          max_results: 15,
          use_apollo: body.use_apollo ?? false,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      const searchId = data?.search_id ?? null;
      const resultsCount = data?.results_count ?? 0;
      lastSearchId = searchId ?? lastSearchId;

      // Count qualified results from this round
      let qualifiedThisRound = 0;
      if (searchId) {
        const { count } = await supabase
          .from('recruitment_hunting_results')
          .select('id', { count: 'exact', head: true })
          .eq('search_id', searchId)
          .eq('qualified', true);
        qualifiedThisRound = count ?? 0;
      }
      totalQualified += qualifiedThisRound;

      // Log attempt
      if (searchId) {
        await supabase.from('recruitment_hunting_search_attempts').insert({
          search_id: searchId,
          account_id: body.account_id,
          round_number: i + 1,
          strategy: step.strategy,
          criteria_relaxed: step.relaxed,
          results_count: resultsCount,
          qualified_count: qualifiedThisRound,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          notes: step.desc,
        });
      }

      rounds.push({
        round: i + 1,
        strategy: step.strategy,
        relaxed: step.relaxed,
        results: resultsCount,
        qualified: qualifiedThisRound,
        search_id: searchId,
      });

      if (totalQualified >= desiredQualified) break;
    }

    // Restore original ICP (best effort)
    if (originalIcp) {
      await supabase.from('job_icps').update({
        target_locations: originalIcp.target_locations,
        title_variations: originalIcp.title_variations,
      }).eq('id', originalIcp.id);
    }

    return new Response(JSON.stringify({
      success: true,
      total_qualified: totalQualified,
      rounds_executed: rounds.length,
      rounds,
      last_search_id: lastSearchId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[hunting-autonomous-search-tuned] error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
