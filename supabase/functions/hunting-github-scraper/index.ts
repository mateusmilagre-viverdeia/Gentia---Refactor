// Searches GitHub users by skills/location/keywords and inserts as hunting results.
// Uses GitHub public REST API (optional GITHUB_TOKEN for higher rate limit).
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  search_id: string;
  account_id: string;
  skills?: string[];
  location?: string;
  language?: string;
  min_followers?: number;
  max_results?: number;
}

async function ghFetch(url: string, token?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gentia-hunting',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ghToken = Deno.env.get('GITHUB_TOKEN'); // optional

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
    if (!body.search_id || !body.account_id) {
      return new Response(JSON.stringify({ error: 'search_id e account_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const maxResults = Math.min(body.max_results ?? 20, 50);

    // Build GitHub user search query
    const qParts: string[] = ['type:user'];
    if (body.location) qParts.push(`location:"${body.location}"`);
    if (body.language) qParts.push(`language:${body.language}`);
    if (body.min_followers) qParts.push(`followers:>=${body.min_followers}`);
    if (body.skills?.length) {
      // GitHub's user search doesn't have a "skills" qualifier — use keyword in bio/repos
      qParts.push(body.skills.slice(0, 3).join(' '));
    }
    const q = encodeURIComponent(qParts.join(' '));
    const searchUrl = `https://api.github.com/search/users?q=${q}&per_page=${maxResults}`;

    const searchData = await ghFetch(searchUrl, ghToken);
    const items: any[] = searchData.items || [];

    const inserted: any[] = [];
    for (const u of items) {
      try {
        // Enrich with user details (top 1-2 calls per profile)
        const details = await ghFetch(u.url, ghToken).catch(() => null);
        const reposData = await ghFetch(`${u.url}/repos?sort=updated&per_page=10`, ghToken).catch(() => []);
        const repos: any[] = Array.isArray(reposData) ? reposData : [];

        const languages = new Set<string>();
        const topics = new Set<string>();
        for (const r of repos) {
          if (r.language) languages.add(r.language);
          if (Array.isArray(r.topics)) r.topics.forEach((t: string) => topics.add(t));
        }

        const extracted = {
          fullName: details?.name || u.login,
          headline: details?.bio || '',
          location: details?.location || body.location || '',
          profileUrl: u.html_url,
          profilePicture: u.avatar_url,
          currentCompany: details?.company || '',
          currentTitle: '',
          skills: [...languages, ...topics].slice(0, 20),
          experiences: repos.slice(0, 5).map(r => ({
            title: r.name,
            company: 'GitHub',
            description: r.description || '',
            stars: r.stargazers_count,
            language: r.language,
            updated: r.updated_at,
          })),
          education: [],
          posts: [],
          followersCount: details?.followers || 0,
          publicRepos: details?.public_repos || 0,
          githubLogin: u.login,
        };

        const { data: row, error: insertErr } = await supabase
          .from('recruitment_hunting_results')
          .insert({
            search_id: body.search_id,
            source: 'github',
            source_url: u.html_url,
            extracted_data: extracted,
            status: 'pending',
            pipeline_stage: 'found',
            score_source: 'preview',
          })
          .select('id')
          .single();

        if (!insertErr && row) inserted.push({ id: row.id, login: u.login });
      } catch (err) {
        console.error('[hunting-github-scraper] enrich error:', err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_found: items.length,
      inserted: inserted.length,
      results: inserted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[hunting-github-scraper] error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
