import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const baseUrl = Deno.env.get('PUBLIC_BASE_URL') || 'https://gentia.tech';

    // Fetch active public jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('recruitment_jobs')
      .select('id, published_at, updated_at')
      .eq('status', 'active')
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(1000);

    if (jobsError) {
      console.error('[sitemap] Error fetching jobs:', jobsError);
    }

    // Fetch published career pages
    const { data: careerPages, error: careerError } = await supabase
      .from('careers_page_settings')
      .select('account_id, updated_at')
      .eq('is_published', true);

    if (careerError) {
      console.error('[sitemap] Error fetching career pages:', careerError);
    }

    // Get company slugs for career pages
    const accountIds = (careerPages || []).map((c: { account_id: string }) => c.account_id);
    let companyMap = new Map<string, string>();
    if (accountIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, slug')
        .in('id', accountIds);
      (companies || []).forEach((c: { id: string; slug: string | null }) => {
        if (c.slug) companyMap.set(c.id, c.slug);
      });
    }

    const urls: string[] = [];

    // Career pages
    for (const page of (careerPages || [])) {
      const slug = companyMap.get(page.account_id);
      if (slug) {
        const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        urls.push(`  <url>
    <loc>${baseUrl}/careers/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
      }
    }

    // Job pages
    for (const job of (jobs || [])) {
      const lastmod = (job.updated_at || job.published_at) 
        ? new Date(job.updated_at || job.published_at).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];
      urls.push(`  <url>
    <loc>${baseUrl}/vagas/${job.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    console.log(`[sitemap] Generated sitemap with ${urls.length} URLs`);

    return new Response(sitemap, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[sitemap] Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 500, headers: corsHeaders }
    );
  }
});
