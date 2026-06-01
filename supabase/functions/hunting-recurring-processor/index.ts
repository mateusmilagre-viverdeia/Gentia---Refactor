import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate CRON secret
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch active recurring searches
    const { data: searches, error: fetchError } = await supabase
      .from('recruitment_hunting_searches')
      .select('id, account_id, job_id, query, sources, filters, recurring_schedule, last_recurring_run')
      .eq('recurring_active', true)
      .eq('status', 'completed')
      .not('recurring_schedule', 'is', null);

    if (fetchError) throw fetchError;

    if (!searches || searches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recurring searches to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const processed: string[] = [];

    for (const search of searches) {
      // Check if it's time to run based on schedule
      const lastRun = search.last_recurring_run ? new Date(search.last_recurring_run) : null;
      const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60) : Infinity;

      let shouldRun = false;
      if (search.recurring_schedule === 'daily' && hoursSinceLastRun >= 22) {
        shouldRun = true;
      } else if (search.recurring_schedule === 'weekly' && hoursSinceLastRun >= 166) {
        shouldRun = true;
      }

      if (!shouldRun) continue;

      // Check that job_id exists
      if (!search.job_id) continue;

      console.log(`Processing recurring search ${search.id} for job ${search.job_id}`);

      try {
        // Invoke hunting-autonomous-search
        const response = await fetch(`${supabaseUrl}/functions/v1/hunting-autonomous-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            job_id: search.job_id,
            account_id: search.account_id,
            max_results: 10,
          }),
        });

        const result = await response.json();

        // Update last_recurring_run
        await supabase
          .from('recruitment_hunting_searches')
          .update({ last_recurring_run: now.toISOString() } as any)
          .eq('id', search.id);

        processed.push(search.id);
        console.log(`Recurring search ${search.id} completed: ${result.results_count || 0} new results`);
      } catch (err) {
        console.error(`Error processing recurring search ${search.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        search_ids: processed,
        total_eligible: searches.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Recurring processor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
