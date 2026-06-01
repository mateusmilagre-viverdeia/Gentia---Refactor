// Edge Function: careers-sitemap
// Retorna XML sitemap das vagas abertas. Público.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim();
    if (!slug) {
      return new Response("slug required", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: page } = await supabase
      .from("client_career_pages")
      .select("id, client_id, slug, custom_domain, custom_domain_verified, updated_at")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!page) {
      return new Response("not found", { status: 404, headers: corsHeaders });
    }

    const { data: jobs } = await supabase
      .from("recruitment_jobs")
      .select("id, updated_at, created_at")
      .eq("cliente_id", page.client_id)
      .eq("status", "active");

    const baseUrl = page.custom_domain && page.custom_domain_verified
      ? `https://${page.custom_domain}`
      : `https://gentia.tech/c/${page.slug}`;

    const homePath = page.custom_domain && page.custom_domain_verified ? "/" : "";

    const entries = [
      `<url><loc>${baseUrl}${homePath}</loc><lastmod>${page.updated_at}</lastmod><changefreq>daily</changefreq></url>`,
      ...(jobs || []).map((j) =>
        `<url><loc>${baseUrl}${homePath}/vagas/${j.id}</loc><lastmod>${j.updated_at || j.created_at}</lastmod></url>`
      ),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (e: any) {
    console.error("[careers-sitemap] error:", e);
    return new Response(`error: ${e.message}`, { status: 500, headers: corsHeaders });
  }
});
