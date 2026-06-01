import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('calculate-royalties');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Grant {
  id: string;
  partner_id: string;
  org_id: string;
  granted_at: string;
  expires_at: string;
}

interface OrgBilling {
  org_id: string;
  active_seats: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.log('Starting monthly royalties calculation');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current period (first day of current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    log.log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Fetch all active grants (not revoked, not expired)
    const { data: grants, error: grantsError } = await supabase
      .from('partner_client_grants')
      .select('id, partner_id, org_id, granted_at, expires_at')
      .is('revoked_at', null)
      .gt('expires_at', periodStart.toISOString());

    if (grantsError) {
      log.error('Error fetching grants:', grantsError);
      throw grantsError;
    }

    log.log(`Found ${grants?.length || 0} active grants`);

    if (!grants || grants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active grants to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get org billing info for all orgs
    const orgIds = [...new Set(grants.map(g => g.org_id).filter(Boolean))];
    const { data: billingData, error: billingError } = await supabase
      .from('org_billing')
      .select('org_id, active_seats')
      .in('org_id', orgIds);

    if (billingError) {
      log.error('Error fetching billing data:', billingError);
    }

    const billingMap = new Map<string, OrgBilling>();
    (billingData || []).forEach(b => billingMap.set(b.org_id, b));

    // Check existing royalties for this period to avoid duplicates
    const { data: existingRoyalties, error: existingError } = await supabase
      .from('partner_royalties')
      .select('grant_id')
      .gte('period_start', periodStart.toISOString())
      .lt('period_start', periodEnd.toISOString());

    if (existingError) {
      log.error('Error checking existing royalties:', existingError);
    }

    const existingGrantIds = new Set((existingRoyalties || []).map(r => r.grant_id));

    // Calculate royalties for each grant
    const BASE_PLAN_AMOUNT = 197; // R$ 197 base
    const SEAT_PRICE = 20; // R$ 20 per additional seat
    const ROYALTY_PERCENTAGE = 15;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const grant of grants) {
      // Skip if royalty already exists for this grant in this period
      if (existingGrantIds.has(grant.id)) {
        log.log(`Skipping grant ${grant.id} - already processed`);
        skipped++;
        continue;
      }

      // Skip grants for partner's own project (check notes field)
      const { data: grantDetails } = await supabase
        .from('partner_client_grants')
        .select('notes')
        .eq('id', grant.id)
        .single();

      if (grantDetails?.notes?.includes('Projeto próprio')) {
        log.log(`Skipping grant ${grant.id} - own project`);
        skipped++;
        continue;
      }

      try {
        // Get billing info
        const billing = billingMap.get(grant.org_id);
        const activeSeats = billing?.active_seats || 0;
        const additionalSeats = Math.max(0, activeSeats - 1); // First seat included in base

        // Calculate amounts
        const seatAmount = additionalSeats * SEAT_PRICE;
        const totalClientAmount = BASE_PLAN_AMOUNT + seatAmount;
        const royaltyAmount = (totalClientAmount * ROYALTY_PERCENTAGE) / 100;

        // Insert royalty record
        const { error: insertError } = await supabase
          .from('partner_royalties')
          .insert({
            partner_id: grant.partner_id,
            org_id: grant.org_id,
            grant_id: grant.id,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            base_plan_amount: BASE_PLAN_AMOUNT,
            seat_amount: seatAmount,
            additional_seats: additionalSeats,
            total_client_amount: totalClientAmount,
            royalty_percentage: ROYALTY_PERCENTAGE,
            royalty_amount: royaltyAmount,
            status: 'pending',
          });

        if (insertError) {
          log.error(`Error inserting royalty for grant ${grant.id}:`, insertError);
          errors.push(`Grant ${grant.id}: ${insertError.message}`);
        } else {
          log.log(`Created royalty for grant ${grant.id}: R$ ${royaltyAmount.toFixed(2)}`);
          processed++;
        }
      } catch (err) {
        log.error(`Error processing grant ${grant.id}:`, err);
        errors.push(`Grant ${grant.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const result = {
      success: true,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      processed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    log.log('Completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
