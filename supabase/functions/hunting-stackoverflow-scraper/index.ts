// Searches Stack Exchange (Stack Overflow) users by tag/location and inserts as hunting results.
// Uses public Stack Exchange API 2.3 — no key required for low volume.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  search_id: string;
  account_id: string;
  tags: string[];          // e.g. ['react','typescript']
  min_reputation?: number; // default 1000
  max_results?: number;    // default 20
  location?: string;       // optional client-side filter
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const seKey = Deno.env.get('STACKEXCHANGE_KEY'); // optional

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

    const body: SearchRequest = await req.json();
    if (!body.search_id || !body.account_id || !body.tags?.length) {
      return new Response(JSON.stringify({ error: 'search_id, account_id e tags são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const maxResults = Math.min(body.max_results ?? 20, 50);
    const minRep = body.min_reputation ?? 1000;

    // Use top answerers for first tag (good proxy for active expert)
    const primaryTag = encodeURIComponent(body.tags[0]);
    const keyParam = seKey ? `&key=${encodeURIComponent(seKey)}` : '';
    const url = `https://api.stackexchange.com/2.3/tags/${primaryTag}/top-answerers/all_time?site=stackoverflow&pagesize=${maxResults}${keyParam}`;

    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Stack Exchange ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const items: any[] = data.items || [];

    const inserted: any[] = [];
    for (const item of items) {
      const u = item.user;
      if (!u || u.user_type === 'does_not_exist') continue;
      if (u.reputation && u.reputation < minRep) continue;
      if (body.location && u.location && !u.location.toLowerCase().includes(body.location.toLowerCase())) continue;

      const extracted = {
        fullName: u.display_name,
        headline: `Top answerer in ${body.tags[0]}`,
        location: u.location || body.location || '',
        profileUrl: u.link,
        profilePicture: u.profile_image,
        currentCompany: '',
        currentTitle: '',
        skills: body.tags,
        experiences: [],
        education: [],
        posts: [],
        reputation: u.reputation,
        answerCount: item.post_count,
        score: item.score,
        soUserId: u.user_id,
      };

      const { data: row, error } = await supabase
        .from('recruitment_hunting_results')
        .insert({
          search_id: body.search_id,
          source: 'stackoverflow',
          source_url: u.link,
          extracted_data: extracted,
          status: 'pending',
          pipeline_stage: 'found',
          score_source: 'preview',
        })
        .select('id')
        .single();

      if (!error && row) inserted.push({ id: row.id, name: u.display_name });
    }

    return new Response(JSON.stringify({
      success: true,
      total_found: items.length,
      inserted: inserted.length,
      results: inserted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[hunting-stackoverflow-scraper] error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
