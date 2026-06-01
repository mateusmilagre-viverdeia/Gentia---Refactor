import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { sendEmailViaResend, RESEND_DEFAULT_FROM_EMAIL, RESEND_DEFAULT_FROM_NAME } from '../_shared/resend-email.ts';

const log = createLogger('send-team-invite');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  admin_rh: "Admin RH",
  leader: "Líder",
  member: "Membro",
  viewer: "Visualizador",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface InviteRequest {
  email: string;
  role: string;
  account_id: string;
  invite_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  log.log("Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const isInternalCall = token === supabaseServiceKey;
    let userId: string | null = null;

    if (!isInternalCall) {
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuário não autenticado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    } else {
      log.log("Internal service-to-service call detected, skipping user auth");
    }

    const { email, role, account_id, invite_id }: InviteRequest = await req.json();
    log.log("Processing invite", { email, role, account_id, invite_id });

    if (!email || !role || !account_id || !invite_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isInternalCall && userId) {
      const { data: membership } = await supabaseAdmin
        .from("account_members")
        .select("role")
        .eq("account_id", account_id)
        .eq("user_id", userId)
        .single();

      const isAccountAdmin = membership && ["owner", "admin"].includes(membership.role);

      if (!isAccountAdmin) {
        const { data: isConsultant } = await supabaseAdmin.rpc(
          'can_edit_client_project',
          { _user_id: userId, _account_id: account_id }
        );
        if (!isConsultant) {
          return new Response(
            JSON.stringify({ success: false, error: "Sem permissão para convidar membros" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", account_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: "Conta não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let inviterName = "Administrador";
    if (userId) {
      const { data: inviterProfile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", userId)
        .single();
      inviterName = inviterProfile
        ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() || inviterProfile.email
        : "Administrador";
    }

    // Build invite link — prioritize env vars over origin (admin browser may be on preview iframe)
    const publicUrl =
      Deno.env.get("PUBLIC_SITE_URL") ||
      Deno.env.get("SITE_URL") ||
      req.headers.get("origin") ||
      "https://gentia.lovable.app";
    const inviteLink = `${publicUrl}/app/accept-invite?invite_id=${invite_id}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Convite para ${escapeHtml(account.name)}</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p><strong>${escapeHtml(inviterName || "")}</strong> está convidando você para fazer parte da equipe <strong>${escapeHtml(account.name)}</strong> como <strong>${roleLabels[role] || role}</strong>.</p>
            <p>Clique no botão abaixo para aceitar o convite e definir sua senha:</p>
            <p style="text-align: center;">
              <a href="${inviteLink}" class="button">Aceitar Convite</a>
            </p>
            <p style="font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:<br>${inviteLink}</p>
          </div>
          <div class="footer">
            <p>Este convite expira em 7 dias.</p>
            <p>Se você não esperava este convite, pode ignorar este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `Convite para participar de ${account.name}`;

    // Use shared helper (reads platform_email_config + handles errors properly)
    const result = await sendEmailViaResend({
      supabase: supabaseAdmin,
      to: email,
      subject,
      html: emailHtml,
      fromName: RESEND_DEFAULT_FROM_NAME,
      fromEmail: RESEND_DEFAULT_FROM_EMAIL,
      accountId: account_id,
    });

    // Always log the attempt — with real status and error
    await supabaseAdmin.from("recruitment_communications_log").insert({
      account_id,
      message_type: "team_invite",
      channel: "email",
      recipient: email,
      subject,
      body: emailHtml,
      status: result.ok ? "sent" : "failed",
      provider: "resend",
      provider_message_id: result.id ?? null,
      error_message: result.ok ? null : (result.error ?? "unknown"),
      metadata: { invite_id, role, internal_call: isInternalCall, invite_link: inviteLink },
    });

    if (!result.ok) {
      log.error("Email send failed", { error: result.error, email });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha ao enviar email: ${result.error || "erro desconhecido"}`,
          provider_error: result.error,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Email sent successfully", { id: result.id, email });

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso", id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Error", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro ao enviar convite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
