import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createLogger } from '../_shared/logger.ts';
import { RESEND_DEFAULT_FROM_EMAIL } from '../_shared/resend-email.ts';

const log = createLogger('send-ep-invite');
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const epRoleLabels: Record<string, string> = {
  ep_consultant: "Consultor EP",
  head_cs: "Head de CS",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EPInviteRequest {
  email: string;
  name: string;
  role: 'ep_consultant' | 'head_cs';
}

const handler = async (req: Request): Promise<Response> => {
  log.log("Request received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      log.error("User not authenticated", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has permission to invite EP members
    // Query for any of the allowed roles - use .limit(1) to handle users with multiple roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "head_cs", "ep_partner"]);

    if (rolesError) {
      log.error("Error fetching user roles", rolesError);
    }

    // Check if user has at least one valid role
    const userRole = userRoles && userRoles.length > 0 ? userRoles[0] : null;

    if (!userRole) {
      log.error("User is not authorized to invite EP members. User ID:", user.id);
      return new Response(
        JSON.stringify({ error: "Sem permissão para convidar membros EP" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("User has role", userRole.role);

    // Restrict ep_partner to only invite ep_consultant (not head_cs)
    if (userRole.role === "ep_partner") {
      const { role: requestedRole }: EPInviteRequest = await req.clone().json();
      if (requestedRole === "head_cs") {
        return new Response(
          JSON.stringify({ error: "EP Partners só podem convidar consultores" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body
    const { email, name, role }: EPInviteRequest = await req.json();
    log.log("Processing invite", { email, name, role });

    // Validate inputs
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if valid role
    if (!['ep_consultant', 'head_cs'].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Cargo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a pending EP invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("ep_invites")
      .insert({
        email,
        name,
        role,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      log.error("Error creating invite", inviteError);
      throw inviteError;
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    const inviterName = inviterProfile
      ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() || inviterProfile.email
      : user.email;

    // Build invite link
    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
    const inviteLink = `${origin}/app/accept-ep-invite?invite_id=${invite.id}`;

    // Send email
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
          .highlight { background: #e0f2fe; padding: 2px 8px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Convite EP Partners</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${escapeHtml(name)}</strong>!</p>
            <p><strong>${escapeHtml(inviterName || "")}</strong> está convidando você para fazer parte da equipe <strong>EP Partners</strong> como <span class="highlight">${epRoleLabels[role] || role}</span>.</p>
            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
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

    const emailResponse = await resend.emails.send({
      from: `EP Partners <${RESEND_DEFAULT_FROM_EMAIL}>`,
      to: [email],
      subject: `Convite para equipe EP Partners - ${epRoleLabels[role]}`,
      html: emailHtml,
    });

    await supabaseAdmin.from("recruitment_communications_log").insert({
      account_id: "67f66f7a-d9a8-455e-8820-ee836cfe7401",
      message_type: "ep_invite",
      channel: "email",
      recipient: email,
      subject: `Convite para equipe EP Partners - ${epRoleLabels[role]}`,
      body: emailHtml,
      status: "sent",
      provider: "resend",
      provider_message_id: (emailResponse as any)?.id ?? (emailResponse as any)?.data?.id ?? null,
      metadata: { invite_id: invite.id, role, invited_by: user.id },
    });

    log.log("Email sent successfully", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso", invite_id: invite.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Error", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar convite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
