import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";
import { RESEND_NOTIFICATIONS_FROM_EMAIL } from "../_shared/resend-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  pool_entry_id: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TALENT-POOL-NOTIFICATION] ${step}${detailsStr}`);
};

const DEFAULT_EMAIL_SUBJECT = "🎯 Novas oportunidades para você no Talent Pool";

const DEFAULT_EMAIL_BODY = `
Olá {{candidate_name}},

Boas notícias! Seu perfil foi avaliado positivamente e agora está disponível para empresas parceiras que buscam profissionais com seu perfil.

✅ Seu perfil é exibido de forma ANÔNIMA
✅ Seus dados pessoais só são compartilhados com sua autorização
✅ Você pode sair do pool a qualquer momento

Para gerenciar suas preferências de privacidade, acesse:
{{preferences_url}}

Se preferir não participar, clique no link acima e desative o compartilhamento.

Atenciosamente,
Equipe Gentia
`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { pool_entry_id }: NotificationRequest = await req.json();

    if (!pool_entry_id) {
      return new Response(
        JSON.stringify({ error: "pool_entry_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing notification", { pool_entry_id });

    // Fetch pool entry
    const { data: poolEntry, error: poolError } = await supabase
      .from("shared_talent_pool")
      .select(`
        id,
        candidate_id,
        source_account_id,
        notification_sent_at
      `)
      .eq("id", pool_entry_id)
      .single();

    if (poolError || !poolEntry) {
      logStep("Pool entry not found", { error: poolError?.message });
      return new Response(
        JSON.stringify({ error: "Pool entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if notification already sent
    if (poolEntry.notification_sent_at) {
      logStep("Notification already sent", { sent_at: poolEntry.notification_sent_at });
      return new Response(
        JSON.stringify({ success: true, message: "Notification already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch candidate data separately using correct column name
    const { data: candidate, error: candidateError } = await supabase
      .from("recruitment_candidates")
      .select("id, first_name, last_name, email")
      .eq("id", poolEntry.candidate_id)
      .single();

    if (candidateError || !candidate?.email) {
      logStep("Candidate not found", { candidate_id: poolEntry.candidate_id, error: candidateError?.message });
      return new Response(
        JSON.stringify({ error: "Candidate not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build candidate name from first_name and last_name
    const candidateName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "Candidato";

    logStep("Generating preferences token", { email: candidate.email });

    // Generate preferences token by calling the existing function
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
      "generate-preferences-token",
      {
        body: {
          candidate_email: candidate.email,
          source: "pool_entry",
        },
      }
    );

    if (tokenError || !tokenData?.success) {
      logStep("Token generation failed", { error: tokenError?.message || tokenData?.error });
      throw new Error("Failed to generate preferences token");
    }

    const preferencesUrl = tokenData.preferences_url;
    logStep("Token generated", { preferences_url: preferencesUrl });

    // Try to get custom template for account
    const template = await getActiveRecruitmentTemplate({
      supabase,
      accountId: poolEntry.source_account_id,
      channel: "email",
      messageType: "talent_pool_entry" as any,
      reminderDay: null,
    });

    const subject = template?.subject || DEFAULT_EMAIL_SUBJECT;
    const bodyTemplate = template?.body || DEFAULT_EMAIL_BODY;

    // Render template variables
    const variables = {
      candidate_name: candidateName,
      preferences_url: preferencesUrl,
    };

    const renderedBody = renderTemplateVariables(bodyTemplate, variables);

    // Build HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0;">Talent Pool</h1>
          <p style="color: #64748b; margin-top: 4px;">Gent.IA</p>
        </div>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          ${renderedBody.split('\n').map(line => {
            if (line.startsWith('✅')) {
              return `<p style="color: #10b981; margin: 8px 0;">✅ ${line.slice(2)}</p>`;
            }
            if (line.includes('{{preferences_url}}') || line.includes(preferencesUrl)) {
              return '';
            }
            return `<p style="color: #334155; margin: 8px 0; line-height: 1.6;">${line}</p>`;
          }).join('')}
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${preferencesUrl}" 
             style="background-color: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Gerenciar Minhas Preferências
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Este email foi enviado automaticamente pelo sistema Talent Pool da Gent.IA.<br>
            Se você não deseja participar, clique no botão acima e desative o compartilhamento.
          </p>
        </div>
      </div>
    `;

    logStep("Sending email", { to: candidate.email, subject });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `Gentia Talent Pool <${RESEND_NOTIFICATIONS_FROM_EMAIL}>`,
      to: [candidate.email],
      subject,
      html,
    });

    logStep("Email sent", { emailId: emailResponse.data?.id });

    // Update pool entry with notification timestamp
    const { error: updateError } = await supabase
      .from("shared_talent_pool")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", pool_entry_id);

    if (updateError) {
      logStep("Failed to update notification timestamp", { error: updateError.message });
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.data?.id,
        preferences_url: preferencesUrl,
        ...templateMetadata(template),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error sending notification", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
