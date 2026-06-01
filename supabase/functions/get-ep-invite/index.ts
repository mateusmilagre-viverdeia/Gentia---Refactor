import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invite_id } = await req.json();

    if (!invite_id || typeof invite_id !== "string") {
      return new Response(
        JSON.stringify({ error: "invite_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invite_id)) {
      return new Response(
        JSON.stringify({ error: "Formato de ID inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invite, error } = await supabaseAdmin
      .from("ep_invites")
      .select("id, name, email, role, accepted, expires_at")
      .eq("id", invite_id)
      .single();

    if (error || !invite) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.accepted) {
      return new Response(
        JSON.stringify({ error: "Este convite já foi aceito" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ invite }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in get-ep-invite:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
