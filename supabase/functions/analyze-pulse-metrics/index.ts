import { createClient } from "npm:@supabase/supabase-js@2"
import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from '../_shared/auth-helpers.ts'
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('analyze-pulse-metrics');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AlertThresholds {
  score_drop_threshold: number;
  low_participation_threshold: number;
  low_score_threshold: number;
  low_score_days: number;
  team_divergence_threshold: number;
}

interface MetricData {
  date: string;
  engagement_score_avg: number;
  participation_rate: number;
  by_driver: Record<string, { avg: number; count: number }>;
  by_team: Record<string, { avg: number; participation: number }>;
}

Deno.serve(async (req) => {
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
    const { account_id } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this account
    const hasAccess = await verifyAccountAccess(supabase, user.id, account_id);
    if (!hasAccess) {
      log.warn(`User ${user.id} denied access to account ${account_id}`);
      return forbiddenResponse(corsHeaders);
    }

    log.log('Analyzing pulse metrics', { account_id });

    // Default thresholds
    const thresholds: AlertThresholds = {
      score_drop_threshold: 15, // % drop to trigger alert
      low_participation_threshold: 50, // % minimum participation
      low_score_threshold: 2.5, // minimum average score (1-5 scale)
      low_score_days: 5, // consecutive days of low score
      team_divergence_threshold: 20, // % divergence from company average
    };

    // Fetch last 30 days of metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metrics, error: metricsError } = await supabase
      .from('pulse_metrics_daily')
      .select('*')
      .eq('account_id', account_id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (metricsError) {
      log.error('Error fetching metrics', { error: metricsError });
      throw metricsError;
    }

    if (!metrics || metrics.length < 2) {
      log.log('Not enough metrics data for analysis');
      return new Response(JSON.stringify({ 
        success: true, 
        alerts_created: 0,
        message: 'Not enough data for analysis' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alertsToCreate: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Fetch existing unresolved alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from('pulse_alerts')
      .select('alert_type, related_driver_id, related_team_id')
      .eq('account_id', account_id)
      .eq('is_resolved', false);

    const existingAlertKeys = new Set(
      (existingAlerts || []).map(a => 
        `${a.alert_type}-${a.related_driver_id || 'null'}-${a.related_team_id || 'null'}`
      )
    );

    // 1. Check for score drops (compare last 7 days vs previous 7 days)
    if (metrics.length >= 14) {
      const recent = metrics.slice(-7);
      const previous = metrics.slice(-14, -7);
      
      const recentAvg = recent.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / recent.length;
      const previousAvg = previous.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / previous.length;
      
      if (previousAvg > 0) {
        const dropPercent = ((previousAvg - recentAvg) / previousAvg) * 100;
        
        if (dropPercent >= thresholds.score_drop_threshold) {
          const alertKey = `score_drop-null-null`;
          if (!existingAlertKeys.has(alertKey)) {
            alertsToCreate.push({
              account_id,
              alert_type: 'score_drop',
              severity: dropPercent >= 25 ? 'critical' : 'warning',
              title: 'Queda significativa no engajamento',
              description: `O score de engajamento caiu ${dropPercent.toFixed(1)}% nos últimos 7 dias (de ${previousAvg.toFixed(2)} para ${recentAvg.toFixed(2)}).`,
              metric_value: recentAvg,
              threshold_value: previousAvg,
            });
          }
        }
      }
    }

    // 2. Check for low participation
    const lastMetric = metrics[metrics.length - 1];
    if (lastMetric.participation_rate !== null && 
        lastMetric.participation_rate < thresholds.low_participation_threshold) {
      const alertKey = `low_participation-null-null`;
      if (!existingAlertKeys.has(alertKey)) {
        alertsToCreate.push({
          account_id,
          alert_type: 'low_participation',
          severity: lastMetric.participation_rate < 30 ? 'critical' : 'warning',
          title: 'Participação baixa',
          description: `A taxa de participação está em ${lastMetric.participation_rate?.toFixed(1)}%, abaixo do mínimo recomendado de ${thresholds.low_participation_threshold}%.`,
          metric_value: lastMetric.participation_rate,
          threshold_value: thresholds.low_participation_threshold,
        });
      }
    }

    // 3. Check for persistent low scores
    const recentDays = metrics.slice(-thresholds.low_score_days);
    const consecutiveLowScores = recentDays.every(
      m => m.engagement_score_avg !== null && m.engagement_score_avg < thresholds.low_score_threshold
    );

    if (consecutiveLowScores && recentDays.length >= thresholds.low_score_days) {
      const avgScore = recentDays.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / recentDays.length;
      const alertKey = `low_score_persistent-null-null`;
      if (!existingAlertKeys.has(alertKey)) {
        alertsToCreate.push({
          account_id,
          alert_type: 'low_score_persistent',
          severity: 'critical',
          title: 'Score baixo persistente',
          description: `O score de engajamento está abaixo de ${thresholds.low_score_threshold} há ${thresholds.low_score_days} dias consecutivos (média: ${avgScore.toFixed(2)}).`,
          metric_value: avgScore,
          threshold_value: thresholds.low_score_threshold,
        });
      }
    }

    // 4. Check for team divergence
    if (lastMetric.by_team) {
      const companyAvg = lastMetric.engagement_score_avg || 0;
      const teamData = lastMetric.by_team as Record<string, { avg: number; participation: number }>;
      
      for (const [teamId, teamMetrics] of Object.entries(teamData)) {
        if (teamMetrics.avg && companyAvg > 0) {
          const divergence = ((companyAvg - teamMetrics.avg) / companyAvg) * 100;
          
          if (divergence >= thresholds.team_divergence_threshold) {
            const alertKey = `team_divergence-null-${teamId}`;
            if (!existingAlertKeys.has(alertKey)) {
              alertsToCreate.push({
                account_id,
                alert_type: 'team_divergence',
                severity: divergence >= 30 ? 'critical' : 'warning',
                title: 'Equipe com score divergente',
                description: `Uma equipe está ${divergence.toFixed(1)}% abaixo da média da empresa (${teamMetrics.avg.toFixed(2)} vs ${companyAvg.toFixed(2)}).`,
                metric_value: teamMetrics.avg,
                threshold_value: companyAvg,
                related_team_id: teamId,
              });
            }
          }
        }
      }
    }

    // 5. Check for improvements (positive alert)
    if (metrics.length >= 14) {
      const recent = metrics.slice(-7);
      const previous = metrics.slice(-14, -7);
      
      const recentAvg = recent.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / recent.length;
      const previousAvg = previous.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / previous.length;
      
      if (previousAvg > 0) {
        const improvement = ((recentAvg - previousAvg) / previousAvg) * 100;
        
        if (improvement >= 15) {
          const alertKey = `improvement-null-null`;
          if (!existingAlertKeys.has(alertKey)) {
            alertsToCreate.push({
              account_id,
              alert_type: 'improvement',
              severity: 'info',
              title: 'Melhoria no engajamento!',
              description: `O score de engajamento aumentou ${improvement.toFixed(1)}% nos últimos 7 dias (de ${previousAvg.toFixed(2)} para ${recentAvg.toFixed(2)}).`,
              metric_value: recentAvg,
              threshold_value: previousAvg,
            });
          }
        }
      }
    }

    // Insert new alerts
    if (alertsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('pulse_alerts')
        .insert(alertsToCreate);

      if (insertError) {
        log.error('Error inserting alerts', { error: insertError });
        throw insertError;
      }

      log.log('Created alerts', { count: alertsToCreate.length });
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_created: alertsToCreate.length,
      alerts: alertsToCreate.map(a => ({ type: a.alert_type, severity: a.severity })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    log.error('Error analyzing pulse metrics', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
