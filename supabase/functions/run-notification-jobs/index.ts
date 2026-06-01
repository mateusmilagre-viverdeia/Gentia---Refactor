import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFICATION-JOBS] ${step}${detailsStr}`);
};

// Project alerts configuration
const INACTIVITY_THRESHOLD_DAYS = 14;
const HEALTH_CRITICAL_THRESHOLD = 40;
const HEALTH_DROP_THRESHOLD = 15;
const HEALTH_DROP_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate CRON_SECRET for automated calls OR allow anon key for cron jobs
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    
    // Allow if: valid cron secret OR has Authorization header (for cron jobs with anon key)
    const hasCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith("Bearer ");
    
    if (!hasCronSecret && !hasAuthHeader) {
      logStep("Unauthorized: missing authentication");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Starting notification jobs");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      overdueActions: 0,
      billingNotifications: 0,
      expiredCleaned: 0,
      discReminders: {
        success: false,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      },
      projectAlerts: {
        created: 0,
        updated: 0,
        resolved: 0,
        emailsQueued: 0,
      },
    };

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // =========================================
    // 1. DETECT OVERDUE ACTION PLANS
    // =========================================
    logStep("Checking for overdue action plans");
    
    const { data: overdueActions, error: actionsError } = await supabase
      .from('action_plans')
      .select('id, title, user_id, account_id, deadline, responsible')
      .lt('deadline', today)
      .not('status', 'in', '("concluida","cancelada")');

    if (actionsError) {
      logStep("Error fetching overdue actions", { error: actionsError.message });
    } else if (overdueActions && overdueActions.length > 0) {
      logStep("Found overdue actions", { count: overdueActions.length });

      for (const action of overdueActions) {
        const dedupeKey = `overdue_action_${action.id}`;
        
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('dedupe_key', dedupeKey)
          .single();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: action.user_id,
              account_id: action.account_id,
              org_id: action.account_id,
              type: 'action_overdue',
              title: `Ação atrasada: ${action.title}`,
              message: `A ação "${action.title}" está atrasada. Prazo era ${new Date(action.deadline).toLocaleDateString('pt-BR')}.`,
              priority: 'high',
              entity_type: 'action_plan',
              entity_id: action.id,
              target_url: '/plano-de-acao',
              dedupe_key: dedupeKey,
            });

          if (insertError) {
            logStep("Error creating overdue notification", { error: insertError.message, actionId: action.id });
          } else {
            results.overdueActions++;
          }
        }
      }
    }

    // =========================================
    // 2. BILLING NOTIFICATIONS (D-3 to D+7)
    // =========================================
    logStep("Checking billing status for all orgs");

    const { data: billingRecords, error: billingError } = await supabase
      .from('org_billing')
      .select('org_id, status, current_period_end, grace_until, stripe_subscription_id')
      .in('status', ['active', 'past_due', 'unpaid']);

    if (billingError) {
      logStep("Error fetching billing records", { error: billingError.message });
    } else if (billingRecords && billingRecords.length > 0) {
      for (const billing of billingRecords) {
        if (!billing.current_period_end) continue;

        const periodEnd = new Date(billing.current_period_end);
        const diffTime = periodEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let shouldNotify = false;
        let notificationType = '';
        let priority: 'normal' | 'high' | 'urgent' = 'normal';
        let title = '';
        let message = '';

        if (diffDays === 3) {
          shouldNotify = true;
          notificationType = 'billing_warning_d3';
          priority = 'normal';
          title = 'Sua assinatura vence em 3 dias';
          message = 'Renove sua assinatura para continuar usando a plataforma sem interrupções.';
        } else if (diffDays === 0) {
          shouldNotify = true;
          notificationType = 'billing_due_d0';
          priority = 'high';
          title = 'Sua assinatura vence hoje';
          message = 'Efetue o pagamento hoje para evitar interrupção do serviço.';
        } else if (diffDays < 0 && diffDays >= -7) {
          const daysOverdue = Math.abs(diffDays);
          shouldNotify = true;
          notificationType = `billing_overdue_d${daysOverdue}`;
          priority = 'urgent';
          title = `Pagamento atrasado há ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}`;
          message = daysOverdue >= 7 
            ? 'Sua conta será bloqueada se o pagamento não for efetuado imediatamente.'
            : 'Efetue o pagamento para evitar o bloqueio da sua conta.';

          if (daysOverdue >= 7 && billing.status !== 'blocked') {
            // Check for active admin grant before blocking
            const { data: activeGrant } = await supabase
              .from('admin_grants')
              .select('id')
              .eq('org_id', billing.org_id)
              .is('revoked_at', null)
              .gt('expires_at', now.toISOString())
              .limit(1);

            if (activeGrant && activeGrant.length > 0) {
              logStep("Org has active admin grant, skipping block", { orgId: billing.org_id });
            } else if (billing.stripe_subscription_id) {
              // Verify with Stripe before blocking
              try {
                const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
                if (stripeKey) {
                  const stripeRes = await fetch(
                    `https://api.stripe.com/v1/subscriptions/${billing.stripe_subscription_id}`,
                    { headers: { Authorization: `Bearer ${stripeKey}` } }
                  );
                  const sub = await stripeRes.json();
                  if (sub.status === 'active' || sub.status === 'trialing') {
                    // Subscription is actually active — sync local data instead of blocking
                    await supabase
                      .from('org_billing')
                      .update({
                        status: 'active',
                        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        blocked_at: null,
                        grace_until: null,
                      })
                      .eq('org_id', billing.org_id);
                    logStep("Org subscription active on Stripe, synced locally", { orgId: billing.org_id });
                  } else {
                    // Actually expired on Stripe too — block
                    await supabase
                      .from('org_billing')
                      .update({ status: 'blocked', blocked_at: new Date().toISOString() })
                      .eq('org_id', billing.org_id);
                    logStep("Org blocked due to non-payment (confirmed with Stripe)", { orgId: billing.org_id });
                  }
                }
              } catch (stripeErr) {
                logStep("Error checking Stripe, skipping block to be safe", { orgId: billing.org_id, error: String(stripeErr) });
              }
            } else {
              // No grant, no stripe subscription — block
              await supabase
                .from('org_billing')
                .update({ status: 'blocked', blocked_at: new Date().toISOString() })
                .eq('org_id', billing.org_id);
              logStep("Org blocked due to non-payment (no subscription)", { orgId: billing.org_id });
            }
          }
        }

        if (shouldNotify) {
          const dedupeKey = `billing_${billing.org_id}_${notificationType}_${today}`;

          const { data: existingNotif } = await supabase
            .from('billing_notifications')
            .select('id')
            .eq('org_id', billing.org_id)
            .eq('notification_type', notificationType)
            .gte('sent_at', today)
            .single();

          if (!existingNotif) {
            const { data: admins } = await supabase
              .from('account_members')
              .select('user_id')
              .eq('account_id', billing.org_id)
              .in('role', ['owner', 'admin']);

            if (admins && admins.length > 0) {
              for (const admin of admins) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', admin.user_id)
                  .single();

                await supabase
                  .from('notifications')
                  .insert({
                    user_id: admin.user_id,
                    org_id: billing.org_id,
                    type: 'billing',
                    title,
                    message,
                    priority,
                    entity_type: 'billing',
                    target_url: '/conta/billing',
                    dedupe_key: `${dedupeKey}_${admin.user_id}`,
                  });

                await supabase
                  .from('billing_notifications')
                  .insert({
                    org_id: billing.org_id,
                    notification_type: notificationType,
                    email_to: profile?.email || 'unknown',
                  });

                results.billingNotifications++;
              }
            }
          }
        }
      }
    }

    // =========================================
    // 3. PROJECT ALERTS (NEW)
    // =========================================
    logStep("Generating project alerts");

    // Get all active companies with health scores
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active');

    if (companiesError) {
      logStep("Error fetching companies", { error: companiesError.message });
    } else if (companies && companies.length > 0) {
      for (const company of companies) {
        const accountId = company.id;
        const alertsToUpsert: Array<{
          account_id: string;
          alert_type: string;
          severity: string;
          title: string;
          description: string;
          dedupe_key: string;
          metadata: Record<string, unknown>;
        }> = [];

        // 3a. Check for overdue milestones
        const { data: overdueMilestones } = await supabase
          .from('project_milestones')
          .select('id, milestone_name, planned_end, status')
          .eq('account_id', accountId)
          .lt('planned_end', today)
          .not('status', 'in', '("completed","cancelled")');

        if (overdueMilestones && overdueMilestones.length > 0) {
          for (const milestone of overdueMilestones) {
            const daysOverdue = Math.ceil(
              (now.getTime() - new Date(milestone.planned_end).getTime()) / (1000 * 60 * 60 * 24)
            );
            alertsToUpsert.push({
              account_id: accountId,
              alert_type: 'overdue',
              severity: daysOverdue > 14 ? 'critical' : 'warning',
              title: `Marco atrasado: ${milestone.milestone_name}`,
              description: `O marco "${milestone.milestone_name}" está atrasado há ${daysOverdue} dia(s).`,
              dedupe_key: `overdue_milestone_${milestone.id}`,
              metadata: { milestone_id: milestone.id, days_overdue: daysOverdue },
            });
          }
        }

        // 3b. Check for blocked milestones
        const { data: blockedMilestones } = await supabase
          .from('project_milestones')
          .select('id, milestone_name, status')
          .eq('account_id', accountId)
          .eq('status', 'blocked');

        if (blockedMilestones && blockedMilestones.length > 0) {
          for (const milestone of blockedMilestones) {
            alertsToUpsert.push({
              account_id: accountId,
              alert_type: 'blocked',
              severity: 'warning',
              title: `Marco bloqueado: ${milestone.milestone_name}`,
              description: `O marco "${milestone.milestone_name}" está bloqueado e precisa de atenção.`,
              dedupe_key: `blocked_milestone_${milestone.id}`,
              metadata: { milestone_id: milestone.id },
            });
          }
        }

        // 3c. Check for inactivity
        const { data: healthScore } = await supabase
          .from('project_health_scores')
          .select('days_since_last_activity, health_score, health_status, last_activity_date, calculated_at')
          .eq('account_id', accountId)
          .single();

        if (healthScore) {
          // Inactivity alert
          if (healthScore.days_since_last_activity >= INACTIVITY_THRESHOLD_DAYS) {
            alertsToUpsert.push({
              account_id: accountId,
              alert_type: 'inactivity',
              severity: healthScore.days_since_last_activity > 30 ? 'critical' : 'warning',
              title: `Projeto inativo há ${healthScore.days_since_last_activity} dias`,
              description: `Nenhuma atividade registrada desde ${healthScore.last_activity_date ? new Date(healthScore.last_activity_date).toLocaleDateString('pt-BR') : 'data desconhecida'}.`,
              dedupe_key: `inactivity_${accountId}`,
              metadata: { days_inactive: healthScore.days_since_last_activity },
            });
          }

          // Critical health score alert
          if (healthScore.health_score < HEALTH_CRITICAL_THRESHOLD) {
            alertsToUpsert.push({
              account_id: accountId,
              alert_type: 'health_critical',
              severity: 'critical',
              title: `Health Score crítico: ${healthScore.health_score}`,
              description: `O projeto está em estado crítico e precisa de intervenção urgente.`,
              dedupe_key: `health_critical_${accountId}`,
              metadata: { health_score: healthScore.health_score, health_status: healthScore.health_status },
            });
          }
        }

        // 3d. Upsert alerts and resolve old ones
        for (const alertData of alertsToUpsert) {
          // Check if alert already exists
          const { data: existingAlert } = await supabase
            .from('project_alerts')
            .select('id, status, severity, first_detected_at')
            .eq('account_id', alertData.account_id)
            .eq('dedupe_key', alertData.dedupe_key)
            .single();

          if (existingAlert) {
            // Update existing alert
            if (existingAlert.status === 'active') {
              await supabase
                .from('project_alerts')
                .update({
                  severity: alertData.severity,
                  title: alertData.title,
                  description: alertData.description,
                  metadata: alertData.metadata,
                  last_detected_at: now.toISOString(),
                })
                .eq('id', existingAlert.id);
              results.projectAlerts.updated++;
            } else {
              // Reactivate resolved/dismissed alert
              await supabase
                .from('project_alerts')
                .update({
                  status: 'active',
                  severity: alertData.severity,
                  title: alertData.title,
                  description: alertData.description,
                  metadata: alertData.metadata,
                  last_detected_at: now.toISOString(),
                  resolved_at: null,
                  dismissed_at: null,
                  dismissed_by: null,
                })
                .eq('id', existingAlert.id);
              results.projectAlerts.created++;
            }
          } else {
            // Create new alert (using service role to bypass RLS)
            const { error: insertError } = await supabase
              .from('project_alerts')
              .insert({
                ...alertData,
                status: 'active',
                first_detected_at: now.toISOString(),
                last_detected_at: now.toISOString(),
              });

            if (insertError) {
              logStep("Error creating project alert", { error: insertError.message, dedupe_key: alertData.dedupe_key });
            } else {
              results.projectAlerts.created++;

              // Queue email for critical alerts
              if (alertData.severity === 'critical') {
                // Get client admins for email notification
                const { data: clientAdmins } = await supabase
                  .from('account_members')
                  .select('user_id')
                  .eq('account_id', accountId)
                  .in('role', ['owner', 'admin']);

                if (clientAdmins && clientAdmins.length > 0) {
                  for (const admin of clientAdmins) {
                    // Create in-app notification for critical alert
                    await supabase
                      .from('notifications')
                      .insert({
                        user_id: admin.user_id,
                        account_id: accountId,
                        org_id: accountId,
                        type: 'project_alert',
                        title: alertData.title,
                        message: alertData.description,
                        priority: 'urgent',
                        entity_type: 'project_alert',
                        target_url: '/portal/projeto',
                        dedupe_key: `notif_${alertData.dedupe_key}_${admin.user_id}`,
                      });
                    results.projectAlerts.emailsQueued++;
                  }
                }
              }
            }
          }
        }

        // 3e. Resolve alerts that no longer apply
        // Get all active alerts for this account
        const { data: activeAlerts } = await supabase
          .from('project_alerts')
          .select('id, dedupe_key, alert_type')
          .eq('account_id', accountId)
          .eq('status', 'active');

        if (activeAlerts && activeAlerts.length > 0) {
          const currentDedupeKeys = new Set(alertsToUpsert.map(a => a.dedupe_key));
          
          for (const alert of activeAlerts) {
            // If alert is not in current batch, it should be resolved
            if (!currentDedupeKeys.has(alert.dedupe_key)) {
              // Skip inactivity alerts - they auto-resolve when activity happens
              // but we need to check if condition still applies
              if (alert.alert_type === 'inactivity' && healthScore && healthScore.days_since_last_activity < INACTIVITY_THRESHOLD_DAYS) {
                await supabase
                  .from('project_alerts')
                  .update({
                    status: 'resolved',
                    resolved_at: now.toISOString(),
                  })
                  .eq('id', alert.id);
                results.projectAlerts.resolved++;
              } else if (alert.alert_type === 'health_critical' && healthScore && healthScore.health_score >= HEALTH_CRITICAL_THRESHOLD) {
                await supabase
                  .from('project_alerts')
                  .update({
                    status: 'resolved',
                    resolved_at: now.toISOString(),
                  })
                  .eq('id', alert.id);
                results.projectAlerts.resolved++;
              } else if (alert.alert_type === 'overdue' && !currentDedupeKeys.has(alert.dedupe_key)) {
                // Milestone was completed or removed
                await supabase
                  .from('project_alerts')
                  .update({
                    status: 'resolved',
                    resolved_at: now.toISOString(),
                  })
                  .eq('id', alert.id);
                results.projectAlerts.resolved++;
              } else if (alert.alert_type === 'blocked' && !currentDedupeKeys.has(alert.dedupe_key)) {
                // Milestone was unblocked
                await supabase
                  .from('project_alerts')
                  .update({
                    status: 'resolved',
                    resolved_at: now.toISOString(),
                  })
                  .eq('id', alert.id);
                results.projectAlerts.resolved++;
              }
            }
          }
        }
      }
    }

    logStep("Project alerts processed", results.projectAlerts);

    // =========================================
    // 4. CLEAN EXPIRED NOTIFICATIONS
    // =========================================
    logStep("Cleaning expired notifications");
    
    const { data: expired, error: expiredError } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (!expiredError && expired) {
      results.expiredCleaned = expired.length;
    }

    // =========================================
    // 5. DISC REMINDERS (D+1/D+3/D+5)
    // =========================================
    logStep("Running DISC reminders (D+1/D+3/D+5)");

    try {
      const { data: discData, error: discError } = await supabase.functions.invoke(
        "send-disc-reminders",
        {
          body: {},
        }
      );

      if (discError) {
        logStep("DISC reminders failed", { error: discError.message });
        results.discReminders = {
          success: false,
          processed: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
        };
      } else {
        results.discReminders = {
          success: true,
          processed: Number((discData as any)?.processed ?? 0),
          sent: Number((discData as any)?.sent ?? 0),
          skipped: Number((discData as any)?.skipped ?? 0),
          failed: Number((discData as any)?.failed ?? 0),
        };
        logStep("DISC reminders done", results.discReminders);
      }
    } catch (e: any) {
      logStep("DISC reminders exception", { error: e?.message || "unknown" });
      results.discReminders = {
        success: false,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      };
    }

    // =========================================
    // 6. PULSE PARTICIPATION ALERTS
    // =========================================
    logStep("Checking pulse participation alerts");

    try {
      const pulseAlertsResponse = await fetch(
        `${supabaseUrl}/functions/v1/check-pulse-participation-alerts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (pulseAlertsResponse.ok) {
        const pulseAlertsResult = await pulseAlertsResponse.json();
        logStep("Pulse participation alerts completed", pulseAlertsResult);
        (results as any).pulseAlerts = pulseAlertsResult;
      } else {
        logStep("Pulse participation alerts failed", { status: pulseAlertsResponse.status });
      }
    } catch (error) {
      logStep("Error running pulse participation alerts", { error: String(error) });
    }

    logStep("Notification jobs completed", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error in notification jobs", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
