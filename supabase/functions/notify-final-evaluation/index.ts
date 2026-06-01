import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { RESEND_NOTIFICATIONS_FROM_EMAIL } from "../_shared/resend-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyFinalEvaluationRequest {
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  accountId: string;
  score: number;
  previousStep: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-FINAL-EVALUATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: NotifyFinalEvaluationRequest = await req.json();
    const { candidateId, candidateName, jobId, jobTitle, accountId, score, previousStep } = body;

    logStep("Processing notification", { candidateId, jobId, accountId, score });

    if (!candidateId || !jobId || !accountId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check notification settings for the account
    const { data: settings } = await supabase
      .from("recruitment_notification_settings")
      .select("notify_final_evaluation, notify_final_evaluation_email, notify_owner_only")
      .eq("account_id", accountId)
      .maybeSingle();

    // Use defaults if no settings found
    const notifyInApp = settings?.notify_final_evaluation ?? true;
    const notifyEmail = settings?.notify_final_evaluation_email ?? false;
    const notifyOwnerOnly = settings?.notify_owner_only ?? false;

    logStep("Settings loaded", { notifyInApp, notifyEmail, notifyOwnerOnly });

    if (!notifyInApp && !notifyEmail) {
      logStep("Notifications disabled for this account");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get job owner and RH members
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("created_by")
      .eq("id", jobId)
      .maybeSingle();

    let recipientUserIds: string[] = [];

    if (notifyOwnerOnly && job?.created_by) {
      recipientUserIds = [job.created_by];
    } else {
      // Get all active admin/admin_rh members
      const { data: members } = await supabase
        .from("account_members")
        .select("user_id, role")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .in("role", ["owner", "admin", "admin_rh"]);

      recipientUserIds = members?.map((m) => m.user_id) || [];
    }

    if (recipientUserIds.length === 0) {
      logStep("No recipients found");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Recipients found", { count: recipientUserIds.length });

    // 3. Check for duplicate notification (dedupe within 1 hour)
    const dedupeKey = `final_eval_${candidateId}_${jobId}`;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .gte("created_at", oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (existingNotif) {
      logStep("Duplicate notification skipped", { dedupeKey });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Duplicate notification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Create in-app notification if enabled
    let notificationId: string | null = null;

    if (notifyInApp) {
      const notificationTitle = `Candidato pronto para Avaliação Final`;
      const notificationMessage = `${candidateName} completou a etapa de ${previousStep} para a vaga "${jobTitle}" com score de ${score}%. Pronto para avaliação final.`;

      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          org_id: accountId,
          title: notificationTitle,
          message: notificationMessage,
          type: "recruitment_final_evaluation",
          priority: "high",
          target_url: `/recrutamento/vagas/${jobId}?candidate=${candidateId}`,
          dedupe_key: dedupeKey,
          metadata: {
            candidateId,
            candidateName,
            jobId,
            jobTitle,
            score,
            previousStep,
          },
        })
        .select("id")
        .single();

      if (notifError) {
        console.error("Error creating notification:", notifError);
      } else {
        notificationId = notification.id;
        logStep("In-app notification created", { notificationId });

        // Create notification recipients
        const recipientRecords = recipientUserIds.map((userId) => ({
          notification_id: notificationId,
          user_id: userId,
          is_read: false,
        }));

        await supabase.from("notification_recipients").insert(recipientRecords);
        logStep("Recipients added", { count: recipientRecords.length });
      }
    }

    // 5. Send email notifications if enabled
    if (notifyEmail && notificationId) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendApiKey) {
        logStep("RESEND_API_KEY not configured, skipping email");
      } else {
        const resend = new Resend(resendApiKey);
        const siteUrl = Deno.env.get("SITE_URL") || "https://app.gent.ia";

        // Get recipient emails
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name")
          .in("id", recipientUserIds);

        for (const profile of profiles || []) {
          if (!profile.email) continue;

          try {
            await resend.emails.send({
              from: `Gentia <${RESEND_NOTIFICATIONS_FROM_EMAIL}>`,
              to: [profile.email],
              subject: `🎯 Candidato pronto para Avaliação Final - ${jobTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #f59e0b;">🎯 Candidato em Avaliação Final</h1>
                  <p>Olá ${profile.first_name || 'RH'},</p>
                  <p><strong>${candidateName}</strong> completou todas as etapas automatizadas e está pronto para a Avaliação Final!</p>
                  
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>📊 Resultados:</strong></p>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                      <li>Vaga: ${jobTitle}</li>
                      <li>Última etapa: ${previousStep}</li>
                      <li>Score: ${score}%</li>
                    </ul>
                  </div>
                  
                  <div style="margin: 24px 0;">
                    <a href="${siteUrl}/recrutamento/vagas/${jobId}?candidate=${candidateId}" 
                       style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Avaliar Candidato
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">
                    Recomendamos avaliar em até 48h para manter o candidato engajado.
                  </p>
                  
                  <p style="color: #999; font-size: 12px; margin-top: 24px;">
                    Este alerta foi gerado automaticamente pelo sistema de Recrutamento.
                  </p>
                </div>
              `,
            });

            // Update recipient with email sent timestamp
            if (notificationId) {
              await supabase
                .from("notification_recipients")
                .update({ email_sent_at: new Date().toISOString() })
                .eq("notification_id", notificationId)
                .eq("user_id", profile.id);
            }

            logStep("Email sent", { to: profile.email });
          } catch (emailError) {
            console.error("Error sending email to", profile.email, emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId,
        recipientCount: recipientUserIds.length,
        inAppSent: notifyInApp,
        emailSent: notifyEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-final-evaluation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
