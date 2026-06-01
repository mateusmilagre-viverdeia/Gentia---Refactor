import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EP_PARTNERS_ACCOUNT_ID = "67f66f7a-d9a8-455e-8820-ee836cfe7401";
const COOLDOWN_MS = 2 * 60 * 1000;

function normalizeEmail(email: unknown) {
  return String(email || "").toLowerCase().trim();
}

function getAppOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  return Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.tech";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const { email, source = "public" } = await req.json();
    const normalizedEmail = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse({ error: "E-mail inválido" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cooldownSince = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recentRecovery } = await supabaseAdmin
      .from("recruitment_communications_log")
      .select("id, created_at, status, provider_message_id")
      .eq("recipient", normalizedEmail)
      .eq("message_type", "auth_recovery")
      .in("status", ["sent", "blocked_by_cooldown"])
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRecovery) {
      await supabaseAdmin.from("recruitment_communications_log").insert({
        account_id: EP_PARTNERS_ACCOUNT_ID,
        message_type: "auth_recovery",
        channel: "email",
        recipient: normalizedEmail,
        subject: "Reset your password",
        status: "blocked_by_cooldown",
        provider: "internal_guard",
        provider_message_id: null,
        error_code: "RECOVERY_COOLDOWN_ACTIVE",
        error_message: "Já existe um link de recuperação recente para este e-mail.",
        metadata: { source, recent_recovery_id: recentRecovery.id },
      });

      return jsonResponse({ success: true, blocked_by_cooldown: true });
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getAppOrigin(req)}/auth/redefinir-senha?recovery_source=${encodeURIComponent(String(source))}`,
    });

    if (error) {
      await supabaseAdmin.from("recruitment_communications_log").insert({
        account_id: EP_PARTNERS_ACCOUNT_ID,
        message_type: "auth_recovery",
        channel: "email",
        recipient: normalizedEmail,
        subject: "Reset your password",
        status: "failed",
        provider: "auth",
        provider_message_id: null,
        error_code: "RECOVERY_REQUEST_FAILED",
        error_message: error.message,
        metadata: { source },
      });
      return jsonResponse({ error: "Erro ao solicitar recuperação de senha" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return jsonResponse({ error: message }, 500);
  }
});