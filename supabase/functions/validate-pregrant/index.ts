import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("validate-pregrant");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePregrantRequest {
  token: string;
}

function maskCnpj(digits: string) {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length !== 14) return "***";
  return `${d.slice(0, 2)}.***.***/****-${d.slice(12, 14)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: ValidatePregrantRequest = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ valid: false, message: "Token não fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: pregrant, error } = await supabaseAdmin
      .from("pre_client_grants")
      .select("id, cnpj_digits, expires_at, free_seats, permission_template_id, revoked_at, claimed_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !pregrant) {
      return new Response(JSON.stringify({ valid: false, message: "Link não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pregrant.revoked_at) {
      return new Response(JSON.stringify({ valid: false, message: "Link revogado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pregrant.claimed_at) {
      return new Response(JSON.stringify({ valid: false, message: "Este link já foi utilizado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(pregrant.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "Este link expirou" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("cnpj_digits", pregrant.cnpj_digits)
      .maybeSingle();

    const { data: tpl } = pregrant.permission_template_id
      ? await supabaseAdmin
          .from("permission_templates")
          .select("id, name")
          .eq("id", pregrant.permission_template_id)
          .maybeSingle()
      : { data: null };

    return new Response(
      JSON.stringify({
        valid: true,
        pregrant_id: pregrant.id,
        expires_at: pregrant.expires_at,
        free_seats: pregrant.free_seats,
        masked_cnpj: maskCnpj(pregrant.cnpj_digits),
        company: company ? { id: company.id, name: company.name } : null,
        permission_template: tpl ? { id: tpl.id, name: tpl.name } : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log.error("Unexpected error", e);
    return new Response(JSON.stringify({ valid: false, message: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
