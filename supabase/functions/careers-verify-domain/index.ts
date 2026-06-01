// Edge Function: careers-verify-domain
// Verifica CNAME do domínio personalizado. Auth.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_CNAME = "careers.gentia.tech";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { page_id, custom_domain } = await req.json();
    if (!page_id || !custom_domain) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DNS over HTTPS via Google
    const domain = custom_domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`, {
      headers: { Accept: "application/dns-json" },
    });
    const dnsData = await dnsRes.json();
    const cnameAnswer = (dnsData.Answer || []).find((a: any) => a.type === 5);
    const resolvedCname = cnameAnswer?.data?.replace(/\.$/, "").toLowerCase() || null;
    const verified = resolvedCname === TARGET_CNAME;

    // Atualiza página (RLS aplicada via JWT)
    const { error: updErr } = await supabase
      .from("client_career_pages")
      .update({
        custom_domain: domain,
        custom_domain_cname: resolvedCname,
        custom_domain_verified: verified,
      })
      .eq("id", page_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      verified,
      target_cname: TARGET_CNAME,
      resolved_cname: resolvedCname,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[careers-verify-domain] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
