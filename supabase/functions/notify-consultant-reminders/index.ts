import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsultantWithPrefs {
  consultant_id: string;
  user_id: string;
  name: string;
  email: string;
  checkpoint_reminder_days: number;
  notify_upcoming_checkpoints: boolean;
  notify_overdue_actions: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting consultant reminder notifications...');

    // Get all active consultants with their preferences
    const { data: consultants, error: consultantsError } = await supabase
      .from('ep_consultants')
      .select(`
        id,
        user_id,
        name,
        email,
        consultant_notification_preferences (
          checkpoint_reminder_days,
          notify_upcoming_checkpoints,
          notify_overdue_actions
        )
      `)
      .eq('active', true);

    if (consultantsError) {
      throw consultantsError;
    }

    console.log(`Found ${consultants?.length || 0} active consultants`);

    const notifications: { type: string; consultant: string; count: number }[] = [];

    for (const consultant of consultants || []) {
      const prefs = consultant.consultant_notification_preferences?.[0];
      const checkpointReminderDays = prefs?.checkpoint_reminder_days || 3;
      const notifyCheckpoints = prefs?.notify_upcoming_checkpoints !== false;
      const notifyOverdue = prefs?.notify_overdue_actions !== false;

      // Get assigned accounts for this consultant
      const { data: assignments } = await supabase
        .from('consultant_assignments')
        .select('account_id, companies(name)')
        .eq('consultant_id', consultant.id)
        .eq('active', true);

      if (!assignments || assignments.length === 0) continue;

      const accountIds = assignments.map(a => a.account_id);

      // Check for upcoming checkpoints (within reminder days)
      if (notifyCheckpoints) {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + checkpointReminderDays);

        const { data: upcomingCheckpoints } = await supabase
          .from('project_checkpoints')
          .select('id, account_id, topic, checkpoint_date, companies(name)')
          .in('account_id', accountIds)
          .eq('status', 'scheduled')
          .gte('checkpoint_date', new Date().toISOString())
          .lte('checkpoint_date', reminderDate.toISOString());

        for (const checkpoint of upcomingCheckpoints || []) {
          // Check if we already sent a reminder for this checkpoint today
          const today = new Date().toISOString().split('T')[0];
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', consultant.user_id)
            .eq('entity_type', 'checkpoint_reminder')
            .eq('entity_id', checkpoint.id)
            .gte('created_at', today)
            .maybeSingle();

          if (!existingNotif) {
            const companyName = (checkpoint as any).companies?.name || 'Projeto';
            const checkpointDate = new Date(checkpoint.checkpoint_date).toLocaleDateString('pt-BR');

            await supabase.rpc('create_consultant_notification', {
              p_consultant_user_id: consultant.user_id,
              p_account_id: checkpoint.account_id,
              p_type: 'consultant_checkpoint_reminder',
              p_title: `Checkpoint próximo: ${checkpoint.topic}`,
              p_message: `Checkpoint agendado para ${checkpointDate} no projeto ${companyName}`,
              p_target_url: `/consultor/projeto/${checkpoint.account_id}`,
              p_entity_type: 'checkpoint_reminder',
              p_entity_id: checkpoint.id,
              p_priority: 'high'
            });

            notifications.push({
              type: 'checkpoint_reminder',
              consultant: consultant.name,
              count: 1
            });
          }
        }
      }

      // Check for overdue actions
      if (notifyOverdue) {
        const { data: overdueActions } = await supabase
          .from('checkpoint_actions')
          .select('id, account_id, title, due_date, companies(name)')
          .in('account_id', accountIds)
          .neq('status', 'completed')
          .lt('due_date', new Date().toISOString());

        for (const action of overdueActions || []) {
          // Check if we already sent an overdue notification today
          const today = new Date().toISOString().split('T')[0];
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', consultant.user_id)
            .eq('entity_type', 'action_overdue')
            .eq('entity_id', action.id)
            .gte('created_at', today)
            .maybeSingle();

          if (!existingNotif) {
            const companyName = (action as any).companies?.name || 'Projeto';
            const dueDate = new Date(action.due_date!).toLocaleDateString('pt-BR');

            await supabase.rpc('create_consultant_notification', {
              p_consultant_user_id: consultant.user_id,
              p_account_id: action.account_id,
              p_type: 'consultant_action_overdue',
              p_title: `Ação atrasada: ${action.title}`,
              p_message: `A ação estava prevista para ${dueDate} no projeto ${companyName}`,
              p_target_url: `/consultor/projeto/${action.account_id}`,
              p_entity_type: 'action_overdue',
              p_entity_id: action.id,
              p_priority: 'urgent'
            });

            notifications.push({
              type: 'action_overdue',
              consultant: consultant.name,
              count: 1
            });
          }
        }
      }
    }

    console.log('Notification summary:', notifications);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notifications.length,
        details: notifications
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in notify-consultant-reminders:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
