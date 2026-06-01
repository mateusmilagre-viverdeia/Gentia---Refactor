import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationSettings {
  account_id: string;
  notify_new_applications: boolean;
  notify_pending_evaluations: boolean;
  notify_interview_reminders: boolean;
  notify_stale_jobs: boolean;
  notify_stale_candidates: boolean;
  stale_job_days: number;
  stale_candidate_days: number;
  pending_evaluation_days: number;
  notify_owner_only: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[recruitment-notification-jobs] Starting recruitment notification jobs...');

    // Get all accounts with notification settings (or use defaults)
    const { data: accounts, error: accountsError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active');

    if (accountsError) {
      console.error('[recruitment-notification-jobs] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    console.log(`[recruitment-notification-jobs] Processing ${accounts?.length || 0} accounts`);

    let totalNotifications = 0;

    for (const account of accounts || []) {
      // Get settings for this account (or use defaults)
      const { data: settings } = await supabase
        .from('recruitment_notification_settings')
        .select('*')
        .eq('account_id', account.id)
        .single();

      const config: NotificationSettings = settings || {
        account_id: account.id,
        notify_new_applications: true,
        notify_pending_evaluations: true,
        notify_interview_reminders: true,
        notify_stale_jobs: true,
        notify_stale_candidates: true,
        stale_job_days: 7,
        stale_candidate_days: 5,
        pending_evaluation_days: 3,
        notify_owner_only: false,
      };

      // Get users to notify for this account
      const { data: members } = await supabase
        .from('account_members')
        .select('user_id, role')
        .eq('account_id', account.id)
        .eq('is_active', true);

      if (!members?.length) continue;

      const userIds = members.map((m: { user_id: string }) => m.user_id);

      // 1. Check for new applications (last 24 hours)
      if (config.notify_new_applications) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: newApplications } = await supabase
          .from('recruitment_applications')
          .select(`
            id,
            applied_at,
            candidate_id,
            job_id
          `)
          .gte('applied_at', yesterday.toISOString());

        for (const app of newApplications || []) {
          // Get job details
          const { data: jobData } = await supabase
            .from('recruitment_jobs')
            .select('id, title, account_id, created_by')
            .eq('id', app.job_id)
            .eq('account_id', account.id)
            .single();

          if (!jobData) continue;

          // Get candidate details
          const { data: candidateData } = await supabase
            .from('recruitment_candidates')
            .select('id, name')
            .eq('id', app.candidate_id)
            .single();

          const dedupeKey = `recruitment_new_application_${app.id}`;
          
          // Check if notification already exists
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();

          if (!existing) {
            const targetUsers = config.notify_owner_only && jobData.created_by
              ? [jobData.created_by]
              : userIds;

            const { data: insertedNotif, error: insertError } = await supabase
              .from('notifications')
              .insert({
                org_id: account.id,
                type: 'recruitment_new_application',
                title: 'Nova candidatura recebida',
                message: `${candidateData?.name || 'Candidato'} se candidatou para ${jobData.title}`,
                priority: 'normal',
                dedupe_key: dedupeKey,
                target_url: `/atracao-contratacao/recrutamento/candidatos/${candidateData?.id || app.candidate_id}`,
              })
              .select('id')
              .single();

            if (!insertError && insertedNotif) {
              // Create recipients
              for (const userId of targetUsers) {
                await supabase.from('notification_recipients').insert({
                  notification_id: insertedNotif.id,
                  user_id: userId,
                });
              }
              totalNotifications++;
              console.log(`[recruitment-notification-jobs] Created new application notification for ${candidateData?.name || 'candidate'}`);
            }
          }
        }
      }

      // 2. Check for pending evaluations
      if (config.notify_pending_evaluations) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - config.pending_evaluation_days);

        const { data: pendingApps } = await supabase
          .from('recruitment_applications')
          .select('id, updated_at, candidate_id, job_id')
          .eq('status', 'screening')
          .lte('updated_at', thresholdDate.toISOString());

        for (const app of pendingApps || []) {
          // Get job details
          const { data: jobData } = await supabase
            .from('recruitment_jobs')
            .select('id, title, account_id')
            .eq('id', app.job_id)
            .eq('account_id', account.id)
            .single();

          if (!jobData) continue;

          // Get candidate details
          const { data: candidateData } = await supabase
            .from('recruitment_candidates')
            .select('id, name')
            .eq('id', app.candidate_id)
            .single();

          const dedupeKey = `recruitment_pending_evaluation_${app.id}_${new Date().toISOString().split('T')[0]}`;
          
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();

          if (!existing) {
            const { data: insertedNotif, error: insertError } = await supabase
              .from('notifications')
              .insert({
                org_id: account.id,
                type: 'recruitment_pending_evaluation',
                title: 'Candidato aguardando avaliação',
                message: `${candidateData?.name || 'Candidato'} está há ${config.pending_evaluation_days}+ dias aguardando avaliação para ${jobData.title}`,
                priority: 'normal',
                dedupe_key: dedupeKey,
                target_url: `/atracao-contratacao/recrutamento/candidatos/${candidateData?.id || app.candidate_id}`,
              })
              .select('id')
              .single();

            if (!insertError && insertedNotif) {
              for (const userId of userIds) {
                await supabase.from('notification_recipients').insert({
                  notification_id: insertedNotif.id,
                  user_id: userId,
                });
              }
              totalNotifications++;
              console.log(`[recruitment-notification-jobs] Created pending evaluation notification for ${candidateData?.name || 'candidate'}`);
            }
          }
        }
      }

      // 3. Check for stale jobs (no applications in X days)
      if (config.notify_stale_jobs) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - config.stale_job_days);

        const { data: staleJobs } = await supabase
          .from('recruitment_jobs')
          .select('id, title, updated_at')
          .eq('account_id', account.id)
          .eq('status', 'open')
          .lte('updated_at', thresholdDate.toISOString());

        for (const job of staleJobs || []) {
          // Check if there were any recent applications
          const { count } = await supabase
            .from('recruitment_applications')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', job.id)
            .gte('applied_at', thresholdDate.toISOString());

          if ((count ?? 0) === 0) {
            const dedupeKey = `recruitment_stale_job_${job.id}_${new Date().toISOString().split('T')[0]}`;
            
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('dedupe_key', dedupeKey)
              .single();

            if (!existing) {
              const { data: insertedNotif, error: insertError } = await supabase
                .from('notifications')
                .insert({
                  org_id: account.id,
                  type: 'recruitment_stale_job',
                  title: 'Vaga sem movimentação',
                  message: `A vaga "${job.title}" está há ${config.stale_job_days}+ dias sem novas candidaturas`,
                  priority: 'normal',
                  dedupe_key: dedupeKey,
                  target_url: `/atracao-contratacao/recrutamento/vagas/${job.id}`,
                })
                .select('id')
                .single();

              if (!insertError && insertedNotif) {
                for (const userId of userIds) {
                  await supabase.from('notification_recipients').insert({
                    notification_id: insertedNotif.id,
                    user_id: userId,
                  });
                }
                totalNotifications++;
                console.log(`[recruitment-notification-jobs] Created stale job notification for ${job.title}`);
              }
            }
          }
        }
      }

      // 4. Check for stale candidates (stuck in same status)
      if (config.notify_stale_candidates) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - config.stale_candidate_days);

        const { data: staleApps } = await supabase
          .from('recruitment_applications')
          .select('id, status, updated_at, candidate_id, job_id')
          .in('status', ['screening', 'interview', 'evaluation'])
          .lte('updated_at', thresholdDate.toISOString());

        for (const app of staleApps || []) {
          // Get job details
          const { data: jobData } = await supabase
            .from('recruitment_jobs')
            .select('id, title, account_id')
            .eq('id', app.job_id)
            .eq('account_id', account.id)
            .single();

          if (!jobData) continue;

          // Get candidate details
          const { data: candidateData } = await supabase
            .from('recruitment_candidates')
            .select('id, name')
            .eq('id', app.candidate_id)
            .single();

          const dedupeKey = `recruitment_stale_candidate_${app.id}_${new Date().toISOString().split('T')[0]}`;
          
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();

          if (!existing) {
            const statusLabels: Record<string, string> = {
              screening: 'triagem',
              interview: 'entrevista',
              evaluation: 'avaliação',
            };

            const { data: insertedNotif, error: insertError } = await supabase
              .from('notifications')
              .insert({
                org_id: account.id,
                type: 'recruitment_stale_candidate',
                title: 'Candidato parado no funil',
                message: `${candidateData?.name || 'Candidato'} está há ${config.stale_candidate_days}+ dias na etapa de ${statusLabels[app.status] || app.status}`,
                priority: 'high',
                dedupe_key: dedupeKey,
                target_url: `/atracao-contratacao/recrutamento/candidatos/${candidateData?.id || app.candidate_id}`,
              })
              .select('id')
              .single();

            if (!insertError && insertedNotif) {
              for (const userId of userIds) {
                await supabase.from('notification_recipients').insert({
                  notification_id: insertedNotif.id,
                  user_id: userId,
                });
              }
              totalNotifications++;
              console.log(`[recruitment-notification-jobs] Created stale candidate notification for ${candidateData?.name || 'candidate'}`);
            }
          }
        }
      }

      // 5. Check for interview reminders (D-1)
      if (config.notify_interview_reminders) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStart = new Date(tomorrow);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const { data: upcomingInterviews } = await supabase
          .from('culture_interview_sessions')
          .select('id, created_at, job_id, candidate_profile_id')
          .eq('status', 'pending')
          .gte('created_at', tomorrowStart.toISOString())
          .lte('created_at', tomorrowEnd.toISOString());

        for (const interview of upcomingInterviews || []) {
          // Get job details
          const { data: jobData } = await supabase
            .from('recruitment_jobs')
            .select('id, title, account_id')
            .eq('id', interview.job_id)
            .eq('account_id', account.id)
            .single();

          if (!jobData) continue;

          // Get candidate profile details
          const { data: profileData } = await supabase
            .from('candidate_profiles')
            .select('id, full_name')
            .eq('id', interview.candidate_profile_id)
            .single();

          const dedupeKey = `recruitment_interview_reminder_${interview.id}`;
          
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();

          if (!existing) {
            const { data: insertedNotif, error: insertError } = await supabase
              .from('notifications')
              .insert({
                org_id: account.id,
                type: 'recruitment_interview_reminder',
                title: 'Entrevista agendada para amanhã',
                message: `Entrevista de cultura com ${profileData?.full_name || 'candidato'} para ${jobData.title}`,
                priority: 'high',
                dedupe_key: dedupeKey,
                target_url: `/atracao-contratacao/recrutamento/vagas/${jobData.id}`,
              })
              .select('id')
              .single();

            if (!insertError && insertedNotif) {
              for (const userId of userIds) {
                await supabase.from('notification_recipients').insert({
                  notification_id: insertedNotif.id,
                  user_id: userId,
                });
              }
              totalNotifications++;
              console.log(`[recruitment-notification-jobs] Created interview reminder for ${profileData?.full_name || 'candidate'}`);
            }
          }
        }
      }
    }

    console.log(`[recruitment-notification-jobs] Completed. Created ${totalNotifications} notifications.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${totalNotifications} notifications`,
        totalNotifications 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[recruitment-notification-jobs] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
