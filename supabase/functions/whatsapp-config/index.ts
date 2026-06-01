import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "save" | "test";

interface WhatsAppConfigRequest {
  action: Action;
  accountId: string;
  phoneNumberId?: string;
  wabaId?: string | null;
  accessToken?: string;
  isActive?: boolean;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function testMetaConnection(phoneNumberId: string, accessToken: string) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message || `Falha na API do WhatsApp (${response.status})`;
    if (response.status === 401 || response.status === 403) return { ok: false, error: "Token inválido ou sem permissão" };
    return { ok: false, error: message };
  }

  return { ok: true, data: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.context) return unauthorizedResponse(corsHeaders, authResult.error);

    const { user, supabase } = authResult.context;
    const body = (await req.json()) as WhatsAppConfigRequest;

    if (!body.accountId || !body.action) return json({ success: false, error: "Dados incompletos" }, 400);

    const hasAccess = await verifyAccountAccess(supabase, user.id, body.accountId);
    if (!hasAccess) return forbiddenResponse(corsHeaders);

    if (body.action === "save") {
      const phoneNumberId = (body.phoneNumberId || "").trim();
      const accessToken = (body.accessToken || "").trim();
      if (!phoneNumberId || !accessToken) return json({ success: false, error: "Phone Number ID e token são obrigatórios" }, 400);

      const validation = await testMetaConnection(phoneNumberId, accessToken);
      if (!validation.ok) return json({ success: false, error: validation.error || "Não foi possível validar o WhatsApp" }, 400);

      const { error } = await supabase
        .from("recruitment_whatsapp_config")
        .upsert({
          account_id: body.accountId,
          phone_number_id: phoneNumberId,
          waba_id: body.wabaId || null,
          access_token: accessToken,
          is_active: body.isActive ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "account_id" });

      if (error) return json({ success: false, error: "Erro ao salvar configuração" }, 500);
      return json({ success: true, message: "WhatsApp validado e salvo com segurança" });
    }

    const { data: config, error } = await supabase
      .from("recruitment_whatsapp_config")
      .select("phone_number_id, access_token, is_active")
      .eq("account_id", body.accountId)
      .maybeSingle();

    if (error || !config) return json({ success: false, error: "Configuração não encontrada" }, 404);
    if (!config.is_active) return json({ success: false, error: "Integração WhatsApp está desativada" }, 400);

    const validation = await testMetaConnection(config.phone_number_id, config.access_token);
    if (!validation.ok) return json({ success: false, error: validation.error || "Falha na conexão" }, 400);
    return json({ success: true, message: "Conexão WhatsApp ativa" });
  } catch (error) {
    console.error("whatsapp-config error", error);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
