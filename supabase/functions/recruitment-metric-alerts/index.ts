import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RESEND_NOTIFICATIONS_FROM_EMAIL } from "../_shared/resend-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetricThresholds {
  id: string;
  account_id: string;
  alert_time_to_hire: boolean;
  alert_conversion_rate: boolean;
  alert_rejection_rate: boolean;
  alert_stagnant_pipeline: boolean;
  max_time_to_hire_days: number;
  min_conversion_rate: number;
  max_rejection_rate: number;
  max_stagnant_days: number;
  email_enabled: boolean;
  email_frequency: string;
  notify_emails: string[];
}

interface AlertData {
  type: 'time_to_hire' | 'conversion_rate' | 'rejection_rate' | 'stagnant_pipeline';
  metricValue: number;
  thresholdValue: number;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
}

type CommChannel = 'whatsapp' | 'email';
type CommSeverity = 'info' | 'warning' | 'critical';

const COMM_SUPPRESSION_HOURS = 2;
const COMM_RATE_WINDOW_HOURS = 2;
const COMM_STREAK_WINDOW_MINUTES = 30;
const COMM_MIN_ATTEMPTS_FOR_RATE = 20;
const COMM_FAILURE_RATE_WARNING = 0.15;
const COMM_FAILURE_RATE_CRITICAL = 0.3;
const COMM_CONSECUTIVE_FAILURES_CRITICAL = 5;

const commRuleId = (channel: CommChannel, kind: 'failure_rate' | 'consecutive_failures') =>
  `comm_${channel}_${kind}`;

const isSuppressed = async (supabase: any, accountId: string, ruleId: string) => {
  const cutoff = new Date(Date.now() - COMM_SUPPRESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('recruitment_communication_alerts')
    .select('id')
    .eq('account_id', accountId)
    .eq('rule_id', ruleId)
    .is('resolved_at', null)
    .gte('created_at', cutoff)
    .limit(1);
  if (error) {
    console.error('[recruitment-metric-alerts] Failed suppression check', { accountId, ruleId, error });
    return false;
  }
  return (data || []).length > 0;
};

const createCommAlert = async (
  supabase: any,
  params: {
    accountId: string;
    ruleId: string;
    severity: CommSeverity;
    title: string;
    description: string;
    stats: Record<string, unknown>;
  },
) => {
  const { error } = await supabase
    .from('recruitment_communication_alerts')
    .insert({
      account_id: params.accountId,
      severity: params.severity,
      rule_id: params.ruleId,
      title: params.title,
      description: params.description,
      stats_snapshot: params.stats,
    });
  if (error) {
    console.error('[recruitment-metric-alerts] Failed creating communication alert', {
      accountId: params.accountId,
      ruleId: params.ruleId,
      error,
    });
  }
};

const computeTopErrors = (rows: Array<{ error_code?: string | null; error_message?: string | null }>) => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.error_code || r.error_message || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
};

const generateCommunicationAlertsForAccount = async (supabase: any, accountId: string) => {
  const rateWindowStart = new Date(Date.now() - COMM_RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const streakWindowStart = new Date(Date.now() - COMM_STREAK_WINDOW_MINUTES * 60 * 1000).toISOString();

  const channels: CommChannel[] = ['whatsapp', 'email'];
  for (const channel of channels) {
    // 1) Failure rate window
    {
      const ruleId = commRuleId(channel, 'failure_rate');
      const suppressed = await isSuppressed(supabase, accountId, ruleId);
      if (!suppressed) {
        const { data, error } = await supabase
          .from('recruitment_communications_log')
          .select('status, error_code, error_message')
          .eq('account_id', accountId)
          .eq('channel', channel)
          .gte('created_at', rateWindowStart)
          .in('status', ['sent', 'failed'])
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) {
          console.error('[recruitment-metric-alerts] Failed fetching comm logs (rate)', { accountId, channel, error });
        } else {
          const rows = (data || []) as Array<{ status: string; error_code?: string | null; error_message?: string | null }>;
          const attempts = rows.length;
          const failedRows = rows.filter((r) => r.status === 'failed');
          const failures = failedRows.length;
          const failureRate = attempts > 0 ? failures / attempts : 0;

          if (attempts >= COMM_MIN_ATTEMPTS_FOR_RATE && failureRate >= COMM_FAILURE_RATE_WARNING) {
            const severity: CommSeverity =
              failureRate >= COMM_FAILURE_RATE_CRITICAL ? 'critical' : 'warning';

            const pct = Math.round(failureRate * 100);
            const title =
              severity === 'critical'
                ? `Falhas altas em ${channel.toUpperCase()}`
                : `Falhas elevadas em ${channel.toUpperCase()}`;
            const description =
              `Taxa de falha em ${channel.toUpperCase()} nas últimas ${COMM_RATE_WINDOW_HOURS}h: ` +
              `${pct}% (${failures}/${attempts}).`;

            await createCommAlert(supabase, {
              accountId,
              ruleId,
              severity,
              title,
              description,
              stats: {
                kind: 'failure_rate',
                channel,
                window: `${COMM_RATE_WINDOW_HOURS}h`,
                window_start: rateWindowStart,
                attempts,
                failures,
                failure_rate: failureRate,
                top_errors: computeTopErrors(failedRows),
              },
            });
          }
        }
      }
    }

    // 2) Consecutive failures window
    {
      const ruleId = commRuleId(channel, 'consecutive_failures');
      const suppressed = await isSuppressed(supabase, accountId, ruleId);
      if (!suppressed) {
        const { data, error } = await supabase
          .from('recruitment_communications_log')
          .select('status, error_code, error_message, created_at')
          .eq('account_id', accountId)
          .eq('channel', channel)
          .gte('created_at', streakWindowStart)
          .in('status', ['sent', 'failed'])
          .order('created_at', { ascending: false })
          .limit(25);

        if (error) {
          console.error('[recruitment-metric-alerts] Failed fetching comm logs (streak)', { accountId, channel, error });
        } else {
          const rows = (data || []) as Array<{
            status: string;
            error_code?: string | null;
            error_message?: string | null;
            created_at: string;
          }>;

          let streak = 0;
          for (const r of rows) {
            if (r.status === 'failed') streak++;
            else break;
          }

          if (streak >= COMM_CONSECUTIVE_FAILURES_CRITICAL) {
            const last = rows[0];
            await createCommAlert(supabase, {
              accountId,
              ruleId,
              severity: 'critical',
              title: `Falhas consecutivas em ${channel.toUpperCase()}`,
              description:
                `Detectadas ${streak} falhas consecutivas em ${channel.toUpperCase()} nos últimos ` +
                `${COMM_STREAK_WINDOW_MINUTES}min.`,
              stats: {
                kind: 'consecutive_failures',
                channel,
                window: `${COMM_STREAK_WINDOW_MINUTES}min`,
                window_start: streakWindowStart,
                consecutive_failures: streak,
                last_error: last?.error_code || last?.error_message || null,
                last_at: last?.created_at || null,
              },
            });
          }
        }
      }
    }
  }
};

const generateCommunicationAlerts = async (supabase: any) => {
  const { data: accounts, error } = await supabase
    .from('companies')
    .select('id')
    .eq('status', 'active');

  if (error) {
    console.error('[recruitment-metric-alerts] Failed fetching accounts for communication alerts', error);
    return;
  }

  const accountIds = (accounts || []).map((a: any) => a.id);
  console.log('[recruitment-metric-alerts] Communication alerts: processing accounts', { count: accountIds.length });

  for (const accountId of accountIds) {
    // eslint-disable-next-line no-await-in-loop
    await generateCommunicationAlertsForAccount(supabase, accountId);
  }
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECRUITMENT-METRIC-ALERTS] ${step}${detailsStr}`);
};

const calculateDaysBetween = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

const generateEmailHtml = (
  companyName: string,
  alerts: AlertData[],
  dashboardUrl: string
): string => {
  const alertsHtml = alerts.map(alert => `
    <div style="background-color: ${alert.severity === 'critical' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${alert.severity === 'critical' ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <h3 style="color: ${alert.severity === 'critical' ? '#dc2626' : '#d97706'}; margin: 0 0 12px 0; font-size: 16px;">
        ${alert.severity === 'critical' ? '🚨' : '⚠️'} ${alert.title}
      </h3>
      <p style="margin: 0 0 12px 0; color: #374151;">${alert.description}</p>
      <div style="background-color: #f9fafb; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Valor atual:</span>
          <strong style="color: #111827;">${alert.metricValue.toFixed(1)}${alert.type === 'time_to_hire' ? ' dias' : '%'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280;">Limite configurado:</span>
          <strong style="color: #111827;">${alert.type === 'conversion_rate' ? '≥' : '≤'} ${alert.thresholdValue.toFixed(1)}${alert.type === 'time_to_hire' ? ' dias' : '%'}</strong>
        </div>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
        <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Recomendações:</p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          ${alert.recommendations.map(rec => `<li style="margin-bottom: 4px;">${rec}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111827; font-size: 24px; margin: 0;">Gent.IA</h1>
        <p style="color: #6b7280; margin: 8px 0 0 0;">Alertas de Métricas de Recrutamento</p>
      </div>
      
      <p style="color: #374151;">Olá,</p>
      <p style="color: #374151;">
        Identificamos que ${alerts.length > 1 ? 'algumas métricas' : 'uma métrica'} do processo de recrutamento
        ${alerts.length > 1 ? 'ultrapassaram os limites configurados' : 'ultrapassou o limite configurado'} para <strong>${companyName}</strong>:
      </p>
      
      ${alertsHtml}
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          📊 Ver Dashboard Completo
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>Este email foi enviado automaticamente pelo sistema de recrutamento.</p>
        <p>Para ajustar suas preferências de alertas, acesse as configurações.</p>
        <p style="margin-top: 16px;">
          <strong>Gent.IA</strong> - Gestão Inteligente de Talentos
        </p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting metric alerts check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

     // Communication alerts (in-app)
     try {
       await generateCommunicationAlerts(supabase);
     } catch (e) {
       console.error('[recruitment-metric-alerts] Communication alerts generation failed', e);
     }

    // Get all organizations with metric thresholds configured
    const { data: thresholdConfigs, error: thresholdsError } = await supabase
      .from('recruitment_metric_thresholds')
      .select('*, companies(name)')
      .eq('email_enabled', true);

    if (thresholdsError) {
      throw new Error(`Failed to fetch thresholds: ${thresholdsError.message}`);
    }

    logStep("Found threshold configs", { count: thresholdConfigs?.length || 0 });

    const results: { account_id: string; alerts_sent: number; emails_sent: number }[] = [];

    for (const config of thresholdConfigs || []) {
      const accountId = config.account_id;
      const companyName = (config.companies as { name: string })?.name || 'Sua empresa';
      
      logStep("Processing account", { accountId, companyName });

      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Fetch jobs for this account
      const { data: jobs } = await supabase
        .from('recruitment_jobs')
        .select('id')
        .eq('account_id', accountId);

      const jobIds = jobs?.map(j => j.id) || [];
      
      if (jobIds.length === 0) {
        logStep("No jobs found for account", { accountId });
        continue;
      }

      // Fetch applications for these jobs
      const { data: applications } = await supabase
        .from('recruitment_applications')
        .select('id, status, applied_at, updated_at')
        .in('job_id', jobIds)
        .gte('applied_at', startDate.toISOString());

      const totalApplications = applications?.length || 0;
      
      if (totalApplications === 0) {
        logStep("No applications found for account", { accountId });
        continue;
      }

      // Calculate metrics
      const hiredApps = applications?.filter(a => a.status === 'hired') || [];
      const rejectedApps = applications?.filter(a => a.status === 'rejected') || [];

      // Time to hire (for hired candidates)
      let avgTimeToHire = 0;
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          return sum + calculateDaysBetween(app.applied_at, app.updated_at);
        }, 0);
        avgTimeToHire = totalDays / hiredApps.length;
      }

      // Conversion rate
      const conversionRate = (hiredApps.length / totalApplications) * 100;

      // Rejection rate
      const rejectionRate = (rejectedApps.length / totalApplications) * 100;

      logStep("Calculated metrics", { 
        accountId, 
        avgTimeToHire, 
        conversionRate, 
        rejectionRate,
        totalApplications 
      });

      // Check thresholds and generate alerts
      const alertsToCreate: AlertData[] = [];

      // Time to hire alert
      if (config.alert_time_to_hire && hiredApps.length > 0) {
        if (avgTimeToHire > config.max_time_to_hire_days) {
          alertsToCreate.push({
            type: 'time_to_hire',
            metricValue: avgTimeToHire,
            thresholdValue: config.max_time_to_hire_days,
            severity: avgTimeToHire > config.max_time_to_hire_days * 1.5 ? 'critical' : 'warning',
            title: 'Tempo de Contratação Elevado',
            description: `O tempo médio de contratação está em ${avgTimeToHire.toFixed(0)} dias, acima do limite de ${config.max_time_to_hire_days} dias.`,
            recommendations: [
              'Revisar etapas do processo seletivo',
              'Avaliar gargalos no pipeline de candidatos',
              'Considerar automatizar triagem inicial',
            ],
          });
        }
      }

      // Conversion rate alert
      if (config.alert_conversion_rate && totalApplications >= 10) {
        if (conversionRate < config.min_conversion_rate) {
          alertsToCreate.push({
            type: 'conversion_rate',
            metricValue: conversionRate,
            thresholdValue: config.min_conversion_rate,
            severity: conversionRate < config.min_conversion_rate / 2 ? 'critical' : 'warning',
            title: 'Taxa de Conversão Baixa',
            description: `A taxa de conversão está em ${conversionRate.toFixed(1)}%, abaixo do mínimo de ${config.min_conversion_rate}%.`,
            recommendations: [
              'Revisar critérios de triagem inicial',
              'Avaliar qualidade das fontes de candidatos',
              'Verificar alinhamento das vagas com o mercado',
            ],
          });
        }
      }

      // Rejection rate alert
      if (config.alert_rejection_rate && totalApplications >= 10) {
        if (rejectionRate > config.max_rejection_rate) {
          alertsToCreate.push({
            type: 'rejection_rate',
            metricValue: rejectionRate,
            thresholdValue: config.max_rejection_rate,
            severity: rejectionRate > 90 ? 'critical' : 'warning',
            title: 'Taxa de Rejeição Alta',
            description: `A taxa de rejeição está em ${rejectionRate.toFixed(1)}%, acima do limite de ${config.max_rejection_rate}%.`,
            recommendations: [
              'Melhorar descrição das vagas',
              'Revisar requisitos obrigatórios',
              'Investir em employer branding',
            ],
          });
        }
      }

      if (alertsToCreate.length === 0) {
        logStep("No alerts to create for account", { accountId });
        continue;
      }

      // Create alerts in database
      for (const alert of alertsToCreate) {
        await supabase
          .from('recruitment_metric_alerts')
          .insert({
            account_id: accountId,
            alert_type: alert.type,
            metric_value: alert.metricValue,
            threshold_value: alert.thresholdValue,
            severity: alert.severity,
          });
      }

      // Get users to notify — RESTRITO a Owner / Admin / Admin RH
      // (alertas de métricas de recrutamento devem ir só para quem age sobre eles)
      const { data: members, error: membersError } = await supabase
        .from('account_members')
        .select('role, profiles!inner(email, first_name)')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .in('role', ['owner', 'admin', 'admin_rh'])
        .not('profiles.email', 'is', null);

      if (membersError) {
        logStep("Error fetching admin recipients", { accountId, error: membersError.message });
      }

      const emailsToNotify = new Set<string>();

      // Add admin/admin_rh emails
      (members || []).forEach((m: any) => {
        const email = m?.profiles?.email;
        if (email) emailsToNotify.add(email);
      });

      // Add explicitly configured notify emails (escolha manual do admin)
      (config.notify_emails || []).forEach((email: string) => {
        emailsToNotify.add(email);
      });

      if (emailsToNotify.size === 0) {
        logStep("No emails to notify for account", { accountId });
        continue;
      }

      // Throttle email by configured frequency (in-app alerts above are already created)
      const freqWindowMs: Record<string, number> = {
        instant:  60 * 60 * 1000,
        realtime: 60 * 60 * 1000,
        hourly:   60 * 60 * 1000,
        daily:    24 * 60 * 60 * 1000,
        weekly:    7 * 24 * 60 * 60 * 1000,
      };
      const windowMs = freqWindowMs[config.email_frequency as string] ?? freqWindowMs.daily;
      const lastAlertAtMs = config.last_alert_at ? new Date(config.last_alert_at).getTime() : 0;
      const withinWindow = Date.now() - lastAlertAtMs < windowMs;

      // Always update last_check_at so we know the cron ran
      await supabase
        .from('recruitment_metric_thresholds')
        .update({ last_check_at: new Date().toISOString() })
        .eq('account_id', accountId);

      if (withinWindow) {
        logStep("Skipping email — within frequency window", {
          accountId,
          email_frequency: config.email_frequency,
          last_alert_at: config.last_alert_at,
        });
        results.push({
          account_id: accountId,
          alerts_sent: alertsToCreate.length,
          emails_sent: 0,
        });
        continue;
      }

      // Send email
      const siteUrl = Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
      const dashboardUrl = `${siteUrl}/atracao-contratacao/recrutamento/analytics`;

      const emailHtml = generateEmailHtml(companyName, alertsToCreate, dashboardUrl);

      const emailResponse = await resend.emails.send({
        from: `Gentia <${RESEND_NOTIFICATIONS_FROM_EMAIL}>`,
        to: Array.from(emailsToNotify),
        subject: `⚠️ Alerta de Recrutamento: ${alertsToCreate.length} métrica${alertsToCreate.length > 1 ? 's' : ''} fora do limite`,
        html: emailHtml,
      });

      if ((emailResponse as any)?.error) {
        logStep("Email send failed — keeping last_alert_at unchanged", {
          accountId,
          error: (emailResponse as any).error,
        });
      } else {
        logStep("Email sent", {
          accountId,
          emailId: emailResponse.data?.id,
          recipientCount: emailsToNotify.size,
        });
        await supabase
          .from('recruitment_metric_thresholds')
          .update({ last_alert_at: new Date().toISOString() })
          .eq('account_id', accountId);
      }

      results.push({
        account_id: accountId,
        alerts_sent: alertsToCreate.length,
        emails_sent: emailsToNotify.size,
      });
    }

    logStep("Completed metric alerts check", { results });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        processed: thresholdConfigs?.length || 0 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error in metric alerts", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
