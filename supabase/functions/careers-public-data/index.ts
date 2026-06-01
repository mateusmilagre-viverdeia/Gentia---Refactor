// Edge Function: careers-public-data
// Retorna config da página de carreiras + vagas abertas do cliente. Público.
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
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Buscar página
    const { data: page, error: pageErr } = await supabase
      .from("client_career_pages")
      .select("*, clientes_consultoria(razao_social, nome_fantasia, setor, site)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (pageErr) throw pageErr;
    if (!page) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar vagas abertas do cliente
    const { data: jobs, error: jobsErr } = await supabase
      .from("recruitment_jobs")
      .select("id, title, description, location, work_modality, work_regime, department, budget_min, budget_max, hide_salary, created_at")
      .eq("cliente_id", page.client_id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (jobsErr) throw jobsErr;

    // Buscar nome da consultoria (account)
    const { data: consultancy } = await supabase
      .from("companies")
      .select("name")
      .eq("id", page.account_id)
      .maybeSingle();

    // Incrementar views sem bloquear a resposta pública
    try {
      await supabase.rpc("increment_career_page_views", { _slug: slug });
    } catch {
      // contador auxiliar, não deve quebrar a página pública
    }

    return new Response(JSON.stringify({
      page,
      jobs: jobs || [],
      consultancy_name: consultancy?.name || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[careers-public-data] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
