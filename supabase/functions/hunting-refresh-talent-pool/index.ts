// Re-scrapes hunting results' LinkedIn profiles to detect intent signals
// (job change, open-to-work, promotion, activity spike) and logs them.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface RefreshRequest {
  account_id?: string;
  hunting_result_ids?: string[];
  max_profiles?: number;
  only_stale_days?: number; // re-check only profiles last refreshed > N days ago
}

type Signal = {
  signal_type: string;
  signal_strength: number;
  evidence: Record<string, unknown>;
};

function detectSignals(prev: any, current: any): Signal[] {
  const signals: Signal[] = [];
  if (!prev || !current) return signals;

  const prevTitle = (prev.currentTitle || prev.headline || '').toString().toLowerCase();
  const curTitle = (current.currentTitle || current.headline || '').toString().toLowerCase();
  const prevCompany = (prev.currentCompany || '').toString().toLowerCase();
  const curCompany = (current.currentCompany || '').toString().toLowerCase();

  // Open to work signal
  const otwHints = ['open to work', '#opentowork', 'aberto a oportunidades', 'looking for', 'em busca de'];
  const headline = (current.headline || '').toString().toLowerCase();
  const summary = (current.summary || '').toString().toLowerCase();
  if (otwHints.some(h => headline.includes(h) || summary.includes(h))) {
    signals.push({
      signal_type: 'open_to_work',
      signal_strength: 90,
      evidence: { source: 'headline_or_summary' },
    });
  }

  // Job change
  if (prevCompany && curCompany && prevCompany !== curCompany) {
    signals.push({
      signal_type: 'job_change',
      signal_strength: 80,
      evidence: { from: prevCompany, to: curCompany },
    });
  }

  // Promotion (same company, new title)
  if (prevCompany && curCompany && prevCompany === curCompany && prevTitle && curTitle && prevTitle !== curTitle) {
    signals.push({
      signal_type: 'promotion',
      signal_strength: 60,
      evidence: { from: prevTitle, to: curTitle },
    });
  }

  // Activity spike (posts count increased significantly)
  const prevPosts = Array.isArray(prev.posts) ? prev.posts.length : 0;
  const curPosts = Array.isArray(current.posts) ? current.posts.length : 0;
  if (curPosts > prevPosts + 3) {
    signals.push({
      signal_type: 'activity_spike',
      signal_strength: 50,
      evidence: { previous_posts: prevPosts, current_posts: curPosts },
    });
  }

  // New skill
  const prevSkills: string[] = Array.isArray(prev.skills) ? prev.skills : [];
  const curSkills: string[] = Array.isArray(current.skills) ? current.skills : [];
  const newSkills = curSkills.filter(s => !prevSkills.includes(s));
  if (newSkills.length >= 2) {
    signals.push({
      signal_type: 'new_skill',
      signal_strength: 40,
      evidence: { new_skills: newSkills.slice(0, 5) },
    });
  }

  return signals;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    const supabase = createClient(supabaseUrl, serviceKey);

    // Allow either authenticated user or cron secret
    const cronHeader = req.headers.get('x-cron-secret');
    const isCron = cronHeader && cronSecret && cronHeader === cronSecret;

    let userId: string | null = null;
    if (!isCron) {
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
      userId = user.id;
    }

    const body: RefreshRequest = await req.json().catch(() => ({}));
    const maxProfiles = Math.min(body.max_profiles ?? 30, 100);
    const staleDays = body.only_stale_days ?? 30;

    // Build query
    let query = supabase
      .from('recruitment_hunting_results')
      .select('id, source_url, source, extracted_data, last_refreshed_at, search_id, recruitment_hunting_searches!inner(account_id)')
      .eq('source', 'linkedin')
      .not('source_url', 'is', null)
      .limit(maxProfiles);

    if (body.hunting_result_ids?.length) {
      query = query.in('id', body.hunting_result_ids);
    } else {
      const cutoff = new Date(Date.now() - staleDays * 24 * 3600 * 1000).toISOString();
      query = query.or(`last_refreshed_at.is.null,last_refreshed_at.lt.${cutoff}`);
    }

    if (body.account_id) {
      query = query.eq('recruitment_hunting_searches.account_id', body.account_id);
    }

    const { data: results, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ success: true, refreshed: 0, signals_detected: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let refreshedCount = 0;
    let totalSignals = 0;
    const errors: string[] = [];

    for (const result of results) {
      try {
        const accountId = (result as any).recruitment_hunting_searches?.account_id;
        if (!accountId) continue;

        // Re-scrape via apify-linkedin
        const scrapeRes = await fetch(`${supabaseUrl}/functions/v1/apify-linkedin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ url: result.source_url, includePosts: true }),
        });

        if (!scrapeRes.ok) {
          errors.push(`scrape failed for ${result.id}`);
          continue;
        }

        const scrapeData = await scrapeRes.json();
        if (!scrapeData?.success || !scrapeData?.data) continue;

        const current = scrapeData.data;
        const prev = result.extracted_data || {};
        const signals = detectSignals(prev, current);

        const intentScore = signals.reduce((acc, s) => Math.max(acc, s.signal_strength), 0);

        // Persist signals
        if (signals.length > 0) {
          const rows = signals.map(s => ({
            account_id: accountId,
            hunting_result_id: result.id,
            signal_type: s.signal_type,
            signal_strength: s.signal_strength,
            evidence: s.evidence,
            source: 'refresh',
          }));
          await supabase.from('recruitment_hunting_intent_signals').insert(rows);
          totalSignals += signals.length;
        }

        // Update result snapshot + intent
        await supabase
          .from('recruitment_hunting_results')
          .update({
            extracted_data: { ...prev, ...current },
            intent_signals: signals,
            intent_score: intentScore,
            intent_detected_at: signals.length > 0 ? new Date().toISOString() : null,
            last_refreshed_at: new Date().toISOString(),
          })
          .eq('id', result.id);

        refreshedCount++;
      } catch (err) {
        errors.push(`${result.id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      refreshed: refreshedCount,
      signals_detected: totalSignals,
      errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[hunting-refresh-talent-pool] error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
