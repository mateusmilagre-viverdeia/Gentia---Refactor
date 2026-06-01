import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createLogger } from '../_shared/logger.ts';
import { RESEND_DEFAULT_FROM_EMAIL } from '../_shared/resend-email.ts';

const log = createLogger('approve-invite');
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
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

interface ApproveRequest {
  invite_id: string;
  email: string;
  role: string;
  account_id: string;
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
        JSON.stringify({ error: "Não autorizado" }),
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

    // Get authenticated user (approver)
    const { data: { user: approver }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !approver) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { invite_id, email, role, account_id }: ApproveRequest = await req.json();
    log.log("Processing", { invite_id, email, role, account_id });

    // Check if approver can manage account
    const { data: membership } = await supabaseAdmin
      .from("account_members")
      .select("role")
      .eq("account_id", account_id)
      .eq("user_id", approver.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para aprovar convites" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get account details
    const { data: account } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Conta não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;
    let passwordResetLink: string | null = null;

    if (existingUser) {
      log.log("User already exists", existingUser.id);
      userId = existingUser.id;
    } else {
      // Create new user
      log.log("Creating new user");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { invited_to_account: account_id },
      });

      if (createError || !newUser.user) {
        log.error("Error creating user", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // Generate password reset link
      const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${origin}/auth/redefinir-senha` },
      });

      if (!linkError && linkData) {
        passwordResetLink = linkData.properties?.action_link || null;
      }
    }

    // Check if profile exists, create if not
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        email,
        account_id,
      });
    } else {
      // Update profile with account_id if not set
      await supabaseAdmin
        .from("profiles")
        .update({ account_id })
        .eq("id", userId)
        .is("account_id", null);
    }

    // Add as account member (upsert to handle existing)
    const { error: memberError } = await supabaseAdmin
      .from("account_members")
      .upsert({
        account_id,
        user_id: userId,
        role,
      }, { onConflict: "account_id,user_id" });

    if (memberError) {
      log.error("Error adding member", memberError);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar membro" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invite as accepted
    await supabaseAdmin
      .from("account_invites")
      .update({ accepted: true })
      .eq("id", invite_id);

    // Send welcome email
    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
    const loginLink = passwordResetLink || `${origin}/auth/login`;

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
            <h1>Bem-vindo(a) à ${escapeHtml(account.name)}!</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Você foi adicionado(a) à equipe <strong>${escapeHtml(account.name)}</strong> como <strong>${roleLabels[role] || role}</strong>.</p>
            ${passwordResetLink ? `
              <p>Como este é seu primeiro acesso, clique no botão abaixo para configurar sua senha:</p>
              <p style="text-align: center;">
                <a href="${passwordResetLink}" class="button">Configurar Senha</a>
              </p>
            ` : `
              <p>Faça login para acessar a plataforma:</p>
              <p style="text-align: center;">
                <a href="${loginLink}" class="button">Acessar Plataforma</a>
              </p>
            `}
          </div>
          <div class="footer">
            <p>EP Partners - Código de Cultura</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `EP Partners <${RESEND_DEFAULT_FROM_EMAIL}>`,
      to: [email],
      subject: `Você foi adicionado à ${account.name}`,
      html: emailHtml,
    });

    await supabaseAdmin.from("recruitment_communications_log").insert({
      account_id,
      message_type: "team_invite_approved",
      channel: "email",
      recipient: email,
      subject: `Você foi adicionado à ${account.name}`,
      body: emailHtml,
      status: "sent",
      provider: "resend",
      provider_message_id: (emailResponse as any)?.id ?? (emailResponse as any)?.data?.id ?? null,
      metadata: { invite_id, user_id: userId, role },
    });

    log.log("Success");

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Error", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao aprovar convite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
