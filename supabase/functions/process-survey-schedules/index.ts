import { createClient } from 'npm:@supabase/supabase-js@2';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('process-survey-schedules');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomRecurrenceDate {
  start: string;
  end: string;
}

interface Survey {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_anonymous: boolean;
  created_by: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_end_date: string | null;
  custom_recurrence_dates: CustomRecurrenceDate[] | null;
  reminder_enabled: boolean;
  reminder_days_before: number[];
  reminder_sent_dates: string[];
}

interface SurveySchedule {
  id: string;
  survey_id: string;
  scheduled_start_date: string;
  scheduled_end_date: string;
  status: string;
  created_survey_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    log.log(`Running at ${new Date().toISOString()}`);

    // ===== PART 1: Create scheduled survey instances =====
    const { data: pendingSchedules, error: schedulesError } = await supabase
      .from('survey_schedules')
      .select('*, surveys(*)')
      .eq('status', 'pending')
      .lte('scheduled_start_date', todayStr);

    if (schedulesError) {
      log.error('Error fetching pending schedules:', schedulesError);
      throw schedulesError;
    }

    log.log(`Found ${pendingSchedules?.length || 0} pending schedules to process`);

    for (const schedule of pendingSchedules || []) {
      const parentSurvey = schedule.surveys as Survey;
      if (!parentSurvey) continue;

      log.log(`Creating survey instance for schedule ${schedule.id}`);

      // Create new survey instance
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          account_id: parentSurvey.account_id,
          title: parentSurvey.title,
          description: parentSurvey.description,
          category: parentSurvey.category,
          is_anonymous: parentSurvey.is_anonymous,
          start_date: schedule.scheduled_start_date,
          end_date: schedule.scheduled_end_date,
          status: 'active',
          created_by: parentSurvey.created_by,
          parent_survey_id: parentSurvey.id,
          reminder_enabled: parentSurvey.reminder_enabled,
          reminder_days_before: parentSurvey.reminder_days_before,
          reminder_sent_dates: [],
        })
        .select()
        .single();

      if (createError) {
        log.error(`Error creating survey for schedule ${schedule.id}:`, createError);
        continue;
      }

      // Copy questions from parent survey
      const { data: questions } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', parentSurvey.id)
        .order('position');

      if (questions?.length) {
        const newQuestions = questions.map((q) => ({
          survey_id: newSurvey.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          position: q.position,
        }));

        await supabase.from('survey_questions').insert(newQuestions);
      }

      // Copy invitations from parent survey
      const { data: invitations } = await supabase
        .from('survey_invitations')
        .select('user_id')
        .eq('survey_id', parentSurvey.id);

      if (invitations?.length) {
        const newInvitations = invitations.map((inv) => ({
          survey_id: newSurvey.id,
          user_id: inv.user_id,
          status: 'pending',
        }));

        await supabase.from('survey_invitations').insert(newInvitations);

        // Create notifications for users
        const notifications = invitations.map((inv) => ({
          user_id: inv.user_id,
          account_id: parentSurvey.account_id,
          type: 'survey_invite',
          title: 'Novo questionário disponível',
          message: `O questionário "${parentSurvey.title}" está disponível para resposta.`,
          link: `/responder-questionario/${newSurvey.id}`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Update schedule status
      await supabase
        .from('survey_schedules')
        .update({ 
          status: 'executed',
          created_survey_id: newSurvey.id 
        })
        .eq('id', schedule.id);

      // Increment recurrence count on parent
      await supabase
        .from('surveys')
        .update({ recurrence_count: (parentSurvey as any).recurrence_count + 1 })
        .eq('id', parentSurvey.id);

      log.log(`Successfully created survey ${newSurvey.id} from schedule ${schedule.id}`);
    }

    // ===== PART 1.5: Create schedules for custom recurrence dates =====
    // Find surveys with custom recurrence that need schedule entries created
    const { data: customRecurringSurveys, error: customError } = await supabase
      .from('surveys')
      .select('*')
      .eq('is_recurring', true)
      .eq('recurrence_pattern', 'custom')
      .not('custom_recurrence_dates', 'is', null);

    if (!customError && customRecurringSurveys?.length) {
      log.log(`Found ${customRecurringSurveys.length} surveys with custom recurrence`);

      for (const survey of customRecurringSurveys) {
        const customDates = survey.custom_recurrence_dates as CustomRecurrenceDate[] | null;
        if (!customDates || !Array.isArray(customDates)) continue;

        // Get existing schedules for this survey
        const { data: existingSchedules } = await supabase
          .from('survey_schedules')
          .select('scheduled_start_date')
          .eq('survey_id', survey.id);

        const existingDates = new Set(
          existingSchedules?.map(s => s.scheduled_start_date.split('T')[0]) || []
        );

        // Create schedules for custom dates that don't exist yet
        const newSchedules = customDates
          .filter(d => !existingDates.has(d.start.split('T')[0]))
          .map(d => ({
            survey_id: survey.id,
            scheduled_start_date: d.start,
            scheduled_end_date: d.end,
            status: 'pending',
          }));

        if (newSchedules.length > 0) {
          const { error: insertError } = await supabase
            .from('survey_schedules')
            .insert(newSchedules);

          if (insertError) {
            log.error(`Error creating custom schedules for survey ${survey.id}:`, insertError);
          } else {
            log.log(`Created ${newSchedules.length} custom schedules for survey ${survey.id}`);
          }
        }
      }
    }

    // ===== PART 2: Send reminders =====
    const { data: activeSurveys, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .eq('status', 'active')
      .eq('reminder_enabled', true);

    if (surveysError) {
      log.error('Error fetching active surveys:', surveysError);
      throw surveysError;
    }

    log.log(`Found ${activeSurveys?.length || 0} surveys with reminders enabled`);

    for (const survey of activeSurveys || []) {
      const startDate = new Date(survey.start_date);
      const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const reminderDays: number[] = survey.reminder_days_before || [];
      const sentDates: string[] = survey.reminder_sent_dates || [];

      // Check if we should send a reminder today
      if (reminderDays.includes(daysUntilStart) && !sentDates.includes(todayStr)) {
        log.log(`Sending ${daysUntilStart}-day reminder for survey ${survey.id}`);

        // Get all invited users who haven't responded
        const { data: pendingInvitations } = await supabase
          .from('survey_invitations')
          .select('user_id')
          .eq('survey_id', survey.id)
          .eq('status', 'pending');

        if (pendingInvitations?.length) {
          const notifications = pendingInvitations.map((inv) => ({
            user_id: inv.user_id,
            account_id: survey.account_id,
            type: 'survey_reminder',
            title: 'Lembrete: Questionário pendente',
            message: daysUntilStart === 0
              ? `O questionário "${survey.title}" começa hoje!`
              : `O questionário "${survey.title}" começa em ${daysUntilStart} dia(s).`,
            link: `/responder-questionario/${survey.id}`,
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // Mark reminder as sent
        await supabase
          .from('surveys')
          .update({ reminder_sent_dates: [...sentDates, todayStr] })
          .eq('id', survey.id);

        log.log(`Sent reminders to ${pendingInvitations?.length || 0} users for survey ${survey.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedSchedules: pendingSchedules?.length || 0,
        checkedSurveys: activeSurveys?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Error in process-survey-schedules:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});