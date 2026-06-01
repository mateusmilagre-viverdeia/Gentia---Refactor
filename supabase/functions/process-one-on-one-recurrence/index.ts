import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recurrence {
  id: string;
  account_id: string;
  manager_id: string;
  collaborator_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  preferred_time: string | null;
  is_active: boolean;
  next_occurrence: string;
  template_id: string | null;
}

function calculateNextOccurrence(
  currentDate: string,
  frequency: 'weekly' | 'biweekly' | 'monthly'
): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Processing recurrences for date: ${today}`);

    // Fetch all active recurrences where next_occurrence is today or in the past
    const { data: recurrences, error: fetchError } = await supabase
      .from('meeting_one_on_one_recurrence')
      .select('*')
      .eq('is_active', true)
      .lte('next_occurrence', today);

    if (fetchError) {
      console.error('Error fetching recurrences:', fetchError);
      throw fetchError;
    }

    if (!recurrences || recurrences.length === 0) {
      console.log('No recurrences to process');
      return new Response(
        JSON.stringify({ message: 'No recurrences to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${recurrences.length} recurrences to process`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const recurrence of recurrences as Recurrence[]) {
      try {
        // Parse the preferred time or default to 10:00
        const preferredTime = recurrence.preferred_time || '10:00:00';
        const scheduledAt = `${recurrence.next_occurrence}T${preferredTime}`;

        // Create the new meeting
        const { data: newMeeting, error: meetingError } = await supabase
          .from('meetings_one_on_one')
          .insert({
            account_id: recurrence.account_id,
            manager_id: recurrence.manager_id,
            collaborator_id: recurrence.collaborator_id,
            scheduled_at: scheduledAt,
            duration_minutes: 30,
            status: 'scheduled',
            recurrence_id: recurrence.id,
            template_id: recurrence.template_id,
          })
          .select()
          .single();

        if (meetingError) {
          console.error(`Error creating meeting for recurrence ${recurrence.id}:`, meetingError);
          errors.push(`Recurrence ${recurrence.id}: ${meetingError.message}`);
          continue;
        }

        console.log(`Created meeting ${newMeeting.id} for recurrence ${recurrence.id}`);

        // If there's a template, copy the template items to the new meeting
        if (recurrence.template_id) {
          const { data: template, error: templateError } = await supabase
            .from('meeting_one_on_one_templates')
            .select('items')
            .eq('id', recurrence.template_id)
            .single();

          if (!templateError && template?.items) {
            const items = (template.items as Array<{ type: string; content: string }>).map(
              (item, index) => ({
                meeting_id: newMeeting.id,
                item_type: item.type,
                content: item.content,
                order_index: index,
                created_by: recurrence.manager_id,
              })
            );

            if (items.length > 0) {
              await supabase.from('meeting_one_on_one_items').insert(items);
            }
          }
        }

        // Carry over pending actions from the most recent meeting with this collaborator
        const { data: lastMeeting } = await supabase
          .from('meetings_one_on_one')
          .select('id')
          .eq('account_id', recurrence.account_id)
          .eq('manager_id', recurrence.manager_id)
          .eq('collaborator_id', recurrence.collaborator_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMeeting) {
          const { data: pendingActions } = await supabase
            .from('meeting_one_on_one_items')
            .select('*')
            .eq('meeting_id', lastMeeting.id)
            .eq('item_type', 'action')
            .eq('is_completed', false);

          if (pendingActions && pendingActions.length > 0) {
            // Get current max order_index
            const { data: existingItems } = await supabase
              .from('meeting_one_on_one_items')
              .select('order_index')
              .eq('meeting_id', newMeeting.id)
              .order('order_index', { ascending: false })
              .limit(1);

            const startIndex = existingItems?.[0]?.order_index ?? -1;

            const carryOverItems = pendingActions.map((action: any, index: number) => ({
              meeting_id: newMeeting.id,
              item_type: 'action',
              content: `[Pendente] ${action.content}`,
              due_date: action.due_date,
              order_index: startIndex + 1 + index,
              created_by: recurrence.manager_id,
            }));

            await supabase.from('meeting_one_on_one_items').insert(carryOverItems);
            console.log(`Carried over ${carryOverItems.length} pending actions`);
          }
        }

        // Calculate and update the next occurrence
        const nextOccurrence = calculateNextOccurrence(
          recurrence.next_occurrence,
          recurrence.frequency
        );

        const { error: updateError } = await supabase
          .from('meeting_one_on_one_recurrence')
          .update({ next_occurrence: nextOccurrence })
          .eq('id', recurrence.id);

        if (updateError) {
          console.error(`Error updating next occurrence for ${recurrence.id}:`, updateError);
          errors.push(`Recurrence ${recurrence.id}: Failed to update next_occurrence`);
        } else {
          console.log(`Updated next occurrence to ${nextOccurrence}`);
          processedCount++;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing recurrence ${recurrence.id}:`, err);
        errors.push(`Recurrence ${recurrence.id}: ${errorMessage}`);
      }
    }

    const response = {
      message: `Processed ${processedCount} of ${recurrences.length} recurrences`,
      processed: processedCount,
      total: recurrences.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Processing complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
