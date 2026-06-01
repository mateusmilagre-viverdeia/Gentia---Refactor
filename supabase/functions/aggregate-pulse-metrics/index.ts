import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from '../_shared/auth-helpers.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('aggregate-pulse-metrics');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map culture question pillar types to driver keys
const PILLAR_TO_DRIVER_MAP: Record<string, string> = {
  'value': 'culture_values',
  'development': 'professional_growth',
  'vision': 'company_direction',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === 'ERROR' || step.includes('Error')) {
    log.error(step, details);
  } else {
    log.log(step, details);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.context) {
      return unauthorizedResponse(corsHeaders);
    }

    const { user, supabase } = authResult.context;

    const { account_id, date } = await req.json();
    
    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this account
    const hasAccess = await verifyAccountAccess(supabase, user.id, account_id);
    if (!hasAccess) {
      logStep('Access denied', { userId: user.id, accountId: account_id });
      return forbiddenResponse(corsHeaders);
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    logStep('Starting aggregation', { account_id, targetDate });

    // Get all responses for the date (include culture_question_id)
    const { data: responses, error: responsesError } = await supabase
      .from('pulse_responses')
      .select('numeric_score, respondent_user_id, respondent_team_id, question_id, culture_question_id')
      .eq('account_id', account_id)
      .eq('date', targetDate);

    if (responsesError) {
      logStep('Error fetching responses', { error: responsesError.message });
      throw responsesError;
    }

    // Get total users in the account
    const { count: totalUsers, error: usersError } = await supabase
      .from('account_members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id)
      .eq('is_active', true);

    if (usersError) {
      logStep('Error counting users', { error: usersError.message });
      throw usersError;
    }

    // Get questions with driver info for breakdown
    const questionIds = [...new Set(responses?.filter(r => r.question_id).map(r => r.question_id) || [])];
    
    let driverMap: Record<string, string> = {};
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from('pulse_questions')
        .select('id, driver_id, pulse_drivers(key)')
        .in('id', questionIds);
      
      questions?.forEach((q: any) => {
        if (q.pulse_drivers?.key) {
          driverMap[q.id] = q.pulse_drivers.key;
        }
      });
    }

    // Get culture questions with pillar info for breakdown
    const cultureQuestionIds = [...new Set(
      responses?.filter(r => r.culture_question_id).map(r => r.culture_question_id) || []
    )];
    
    let cultureToDriverMap: Record<string, string> = {};
    if (cultureQuestionIds.length > 0) {
      const { data: cultureQuestions } = await supabase
        .from('pulse_culture_questions')
        .select('id, pillar_type')
        .in('id', cultureQuestionIds);
      
      cultureQuestions?.forEach((cq: any) => {
        const driverKey = PILLAR_TO_DRIVER_MAP[cq.pillar_type];
        if (driverKey) {
          cultureToDriverMap[cq.id] = driverKey;
        }
      });
      
      logStep('Culture questions mapped', { 
        count: cultureQuestionIds.length, 
        mapped: Object.keys(cultureToDriverMap).length 
      });
    }

    // Calculate metrics
    const validResponses = responses?.filter(r => r.numeric_score !== null) || [];
    const respondedUserIds = new Set(responses?.map(r => r.respondent_user_id).filter(Boolean) || []);
    const respondedUsers = respondedUserIds.size;
    
    // Calculate engagement score (keep on 1-5 scale for DB storage)
    const avgScore = validResponses.length > 0
      ? validResponses.reduce((sum, r) => sum + (r.numeric_score || 0), 0) / validResponses.length
      : 0;
    // Round to 2 decimal places and cap at 5.00 (DB has precision 4,2)
    const engagementScore = Math.min(Math.round(avgScore * 100) / 100, 5.00);

    // Calculate participation rate (cap at 99.99 for DB precision)
    const participationRate = (totalUsers && totalUsers > 0)
      ? Math.min(Math.round((respondedUsers / totalUsers) * 10000) / 100, 99.99)
      : 0;

    // Calculate by_driver breakdown (considering both standard and culture questions)
    const byDriver: Record<string, { avg: number; count: number }> = {};
    validResponses.forEach(r => {
      // Try standard question driver first
      let driverKey = r.question_id ? driverMap[r.question_id] : null;
      
      // If not found, try culture question mapping
      if (!driverKey && r.culture_question_id) {
        driverKey = cultureToDriverMap[r.culture_question_id];
      }
      
      if (driverKey) {
        if (!byDriver[driverKey]) {
          byDriver[driverKey] = { avg: 0, count: 0 };
        }
        byDriver[driverKey].avg += r.numeric_score || 0;
        byDriver[driverKey].count += 1;
      }
    });
    
    // Convert to averages (scale 0-10 to 0-100)
    Object.keys(byDriver).forEach(key => {
      if (byDriver[key].count > 0) {
        byDriver[key].avg = Math.round((byDriver[key].avg / byDriver[key].count / 10) * 100);
      }
    });

    // Calculate by_team breakdown
    const byTeam: Record<string, { avg: number; count: number; responded: number }> = {};
    validResponses.forEach(r => {
      const teamId = r.respondent_team_id;
      if (teamId) {
        if (!byTeam[teamId]) {
          byTeam[teamId] = { avg: 0, count: 0, responded: 0 };
        }
        byTeam[teamId].avg += r.numeric_score || 0;
        byTeam[teamId].count += 1;
      }
    });
    
    // Track unique responders per team
    const teamResponders: Record<string, Set<string>> = {};
    responses?.forEach(r => {
      if (r.respondent_team_id && r.respondent_user_id) {
        if (!teamResponders[r.respondent_team_id]) {
          teamResponders[r.respondent_team_id] = new Set();
        }
        teamResponders[r.respondent_team_id].add(r.respondent_user_id);
      }
    });
    
    // Convert to averages (scale 0-10 to 0-100)
    Object.keys(byTeam).forEach(key => {
      if (byTeam[key].count > 0) {
        byTeam[key].avg = Math.round((byTeam[key].avg / byTeam[key].count / 10) * 100);
        byTeam[key].responded = teamResponders[key]?.size || 0;
      }
    });

    // Upsert metrics
    const metricsData = {
      account_id,
      date: targetDate,
      engagement_score_avg: engagementScore,
      participation_rate: participationRate,
      responded_users: respondedUsers,
      total_users: totalUsers || 0,
      by_driver: byDriver,
      by_team: byTeam,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('pulse_metrics_daily')
      .upsert(metricsData, {
        onConflict: 'account_id,date',
      });

    if (upsertError) {
      logStep('Error upserting metrics', { error: upsertError.message });
      throw upsertError;
    }

    logStep('Aggregation completed', {
      engagement_score: engagementScore,
      participation_rate: participationRate,
      responded_users: respondedUsers,
      total_users: totalUsers,
      drivers: Object.keys(byDriver).length,
      teams: Object.keys(byTeam).length,
    });

    return new Response(JSON.stringify({
      success: true,
      metrics: metricsData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Fatal error', { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
