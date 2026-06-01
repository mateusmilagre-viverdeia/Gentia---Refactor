import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { RESEND_DEFAULT_FROM_EMAIL } from '../_shared/resend-email.ts';

const log = createLogger('send-welcome-email');
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  user_id: string;
  account_id: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  admin_rh: 'Admin RH',
  leader: 'Líder',
  member: 'Membro',
  viewer: 'Visualizador',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, account_id, role }: WelcomeEmailRequest = await req.json();

    log.log("Received request", { user_id, account_id, role });

    if (!user_id || !account_id || !role) {
      log.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "user_id, account_id e role são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      log.error("Profile not found", { error: profileError });
      return new Response(
        JSON.stringify({ error: "Perfil do usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Profile found", { email: profile.email, name: profile.first_name });

    // Fetch company name
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", account_id)
      .single();

    if (companyError || !company) {
      log.error("Company not found", { error: companyError });
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Company found", { name: company.name });

    const userName = profile.first_name || "Usuário";
    const userEmail = profile.email;
    const companyName = company.name;
    const roleLabel = roleLabels[role] || role;
    const platformUrl = Deno.env.get("SITE_URL") || "https://app.eppartners.com.br";

    if (!userEmail) {
      log.log("User email not found");
      return new Response(
        JSON.stringify({ error: "Email do usuário não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email
    const emailResponse = await resend.emails.send({
      from: `EP Partners <${RESEND_DEFAULT_FROM_EMAIL}>`,
      to: [userEmail],
      subject: `Bem-vindo à equipe ${companyName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 40px 20px; 
            }
            .card {
              background: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            .header { 
              text-align: center; 
              margin-bottom: 32px;
            }
            .header h1 {
              color: #18181b;
              font-size: 24px;
              font-weight: 600;
              margin: 0;
            }
            .content { 
              color: #3f3f46;
              font-size: 16px;
              line-height: 1.6;
            }
            .content p {
              margin: 0 0 16px 0;
            }
            .highlight-box {
              background: #f4f4f5;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              text-align: center;
            }
            .company-name {
              color: #18181b;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }
            .role-badge { 
              display: inline-block;
              background: #e0e7ff; 
              color: #3730a3; 
              padding: 6px 16px; 
              border-radius: 9999px; 
              font-size: 14px;
              font-weight: 500;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button { 
              display: inline-block; 
              background: #18181b; 
              color: #ffffff !important; 
              padding: 14px 32px; 
              text-decoration: none; 
              border-radius: 8px;
              font-weight: 500;
              font-size: 16px;
            }
            .footer { 
              text-align: center;
              color: #71717a;
              font-size: 14px;
              margin-top: 32px;
              padding-top: 24px;
              border-top: 1px solid #e4e4e7;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>🎉 Bem-vindo à equipe!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                <p>Seu acesso foi confirmado com sucesso! Agora você faz parte da equipe:</p>
                
                <div class="highlight-box">
                  <p class="company-name">${companyName}</p>
                  <span class="role-badge">${roleLabel}</span>
                </div>
                
                <p>Você já pode acessar todas as funcionalidades disponíveis para o seu perfil.</p>
                
                <div class="button-container">
                  <a href="${platformUrl}" class="button">Acessar Plataforma</a>
                </div>
              </div>
              <div class="footer">
                <p>Se precisar de ajuda, entre em contato com o administrador da sua equipe.</p>
                <p style="margin-top: 8px;">EP Partners</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await supabaseAdmin.from("recruitment_communications_log").insert({
      account_id,
      message_type: "welcome_email",
      channel: "email",
      recipient: userEmail,
      subject: `Bem-vindo à equipe ${companyName}!`,
      body: null,
      status: "sent",
      provider: "resend",
      provider_message_id: (emailResponse as any)?.id ?? (emailResponse as any)?.data?.id ?? null,
      metadata: { user_id, role },
    });

    log.log("Email sent successfully", { response: emailResponse });

    return new Response(
      JSON.stringify({ success: true, message: "Email de boas-vindas enviado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Error sending welcome email", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
