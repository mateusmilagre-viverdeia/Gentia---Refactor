import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('expire-trials');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.log("Starting trial expiration check");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all trials that have expired
    const now = new Date().toISOString();
    
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('org_billing')
      .select('org_id, trial_end')
      .eq('status', 'trialing')
      .lt('trial_end', now);

    if (fetchError) {
      log.error("Error fetching expired trials", fetchError);
      throw fetchError;
    }

    log.log(`Found ${expiredTrials?.length || 0} expired trials`);

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired trials found",
          expired_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update expired trials to 'unpaid' status
    const orgIds = expiredTrials.map(t => t.org_id);
    
    const { error: updateError } = await supabase
      .from('org_billing')
      .update({ status: 'unpaid' })
      .in('org_id', orgIds);

    if (updateError) {
      log.error("Error updating expired trials", updateError);
      throw updateError;
    }

    // Log billing events for each expired trial
    const billingEvents = expiredTrials.map(trial => ({
      org_id: trial.org_id,
      event_type: 'trial_expired',
      payload: { 
        trial_end: trial.trial_end,
        expired_at: now 
      }
    }));

    const { error: eventError } = await supabase
      .from('billing_events')
      .insert(billingEvents);

    if (eventError) {
      log.error("Error logging billing events", eventError);
      // Don't throw - event logging failure shouldn't block the process
    }

    log.log(`Successfully expired ${expiredTrials.length} trials`, { orgIds });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Expired ${expiredTrials.length} trials`,
        expired_count: expiredTrials.length,
        org_ids: orgIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error("Error in expire-trials function", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
