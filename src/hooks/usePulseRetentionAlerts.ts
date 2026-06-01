import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";

export type RetentionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RetentionAlert {
  id: string;
  account_id: string;
  alert_type: string;
  severity: RetentionRiskLevel;
  title: string;
  description: string | null;
  related_team_id: string | null;
  related_driver_id: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  // Joined data
  team_name?: string;
  driver_name?: string;
}

export interface RetentionRiskUser {
  user_id: string;
  user_name: string;
  team_id: string | null;
  team_name: string | null;
  risk_level: RetentionRiskLevel;
  risk_factors: string[];
  avg_score: number;
  participation_rate: number;
  trend: 'declining' | 'stable' | 'improving';
  last_response_date: string | null;
}

export interface TeamRiskSummary {
  team_id: string;
  team_name: string;
  risk_level: RetentionRiskLevel;
  avg_engagement: number;
  participation_rate: number;
  alerts_count: number;
  at_risk_members: number;
  total_members: number;
}

// Thresholds for risk levels
const RISK_THRESHOLDS = {
  engagement: { critical: 40, high: 55, medium: 70 }, // Score 0-100
  participation: { critical: 30, high: 50, medium: 70 }, // Percentage
  decline: { critical: -25, high: -15, medium: -8 }, // Percentage points drop
};

function calculateRiskLevel(engagement: number, participation: number, decline: number = 0): RetentionRiskLevel {
  // Check critical conditions
  if (engagement <= RISK_THRESHOLDS.engagement.critical || 
      participation <= RISK_THRESHOLDS.participation.critical ||
      decline <= RISK_THRESHOLDS.decline.critical) {
    return 'critical';
  }
  
  // Check high conditions
  if (engagement <= RISK_THRESHOLDS.engagement.high || 
      participation <= RISK_THRESHOLDS.participation.high ||
      decline <= RISK_THRESHOLDS.decline.high) {
    return 'high';
  }
  
  // Check medium conditions
  if (engagement <= RISK_THRESHOLDS.engagement.medium || 
      participation <= RISK_THRESHOLDS.participation.medium ||
      decline <= RISK_THRESHOLDS.decline.medium) {
    return 'medium';
  }
  
  return 'low';
}

export function usePulseRetentionAlerts(accountId: string | null) {
  const queryClient = useQueryClient();

  // Fetch retention alerts
  const { data: alerts = [], isLoading: isLoadingAlerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['pulse-retention-alerts', accountId],
    queryFn: async (): Promise<RetentionAlert[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from('pulse_alerts')
        .select(`
          *,
          pulse_teams:related_team_id(name),
          pulse_drivers:related_driver_id(name)
        `)
        .eq('account_id', accountId)
        .in('alert_type', ['low_engagement', 'declining_trend', 'low_participation', 'driver_at_risk'])
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(alert => ({
        ...alert,
        severity: alert.severity as RetentionRiskLevel || 'medium',
        team_name: (alert.pulse_teams as any)?.name,
        driver_name: (alert.pulse_drivers as any)?.name,
      }));
    },
    enabled: !!accountId,
  });

  // Fetch team risk summaries
  const { data: teamRisks = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['pulse-team-risks', accountId],
    queryFn: async (): Promise<TeamRiskSummary[]> => {
      if (!accountId) return [];

      // Get teams with member counts
      const { data: teams, error: teamsError } = await supabase
        .from('pulse_teams')
        .select(`
          id, name,
          pulse_user_profiles(count)
        `)
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (teamsError) throw teamsError;
      if (!teams?.length) return [];

      // Get recent metrics
      const endDate = formatBRT(new Date(), 'yyyy-MM-dd');
      const startDate = formatBRT(subDays(new Date(), 14), 'yyyy-MM-dd');

      const { data: metrics } = await supabase
        .from('pulse_metrics_daily')
        .select('date, by_team')
        .eq('account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      // Get alerts per team
      const { data: alertCounts } = await supabase
        .from('pulse_alerts')
        .select('related_team_id')
        .eq('account_id', accountId)
        .eq('is_resolved', false)
        .not('related_team_id', 'is', null);

      const alertsByTeam: Record<string, number> = {};
      (alertCounts || []).forEach(a => {
        if (a.related_team_id) {
          alertsByTeam[a.related_team_id] = (alertsByTeam[a.related_team_id] || 0) + 1;
        }
      });

      return teams.map(team => {
        // Calculate team metrics from recent data
        let totalEngagement = 0;
        let totalParticipation = 0;
        let dataPoints = 0;

        (metrics || []).forEach(m => {
          const teamData = (m.by_team as Record<string, { avg: number; count: number }>)?.[team.id];
          if (teamData?.avg) {
            totalEngagement += teamData.avg; // Already 0-100 from edge function
            dataPoints++;
          }
        });

        const avgEngagement = dataPoints > 0 ? totalEngagement / dataPoints : 50;
        const participationRate = 75; // Would need more detailed calculation
        const memberCount = (team.pulse_user_profiles as any)?.[0]?.count || 0;

        const riskLevel = calculateRiskLevel(avgEngagement, participationRate);
        const atRiskMembers = riskLevel === 'critical' ? Math.ceil(memberCount * 0.3) : 
                             riskLevel === 'high' ? Math.ceil(memberCount * 0.2) : 
                             riskLevel === 'medium' ? Math.ceil(memberCount * 0.1) : 0;

        return {
          team_id: team.id,
          team_name: team.name,
          risk_level: riskLevel,
          avg_engagement: Math.round(avgEngagement),
          participation_rate: participationRate,
          alerts_count: alertsByTeam[team.id] || 0,
          at_risk_members: atRiskMembers,
          total_members: memberCount,
        };
      }).sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return riskOrder[a.risk_level] - riskOrder[b.risk_level];
      });
    },
    enabled: !!accountId,
  });

  // Generate retention alerts based on Pulse data
  const generateAlerts = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Account ID required');

      const endDate = formatBRT(new Date(), 'yyyy-MM-dd');
      const startDate = formatBRT(subDays(new Date(), 7), 'yyyy-MM-dd');
      const previousStart = formatBRT(subDays(new Date(), 14), 'yyyy-MM-dd');

      // Fetch recent and previous period metrics
      const { data: recentMetrics } = await supabase
        .from('pulse_metrics_daily')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate);

      const { data: previousMetrics } = await supabase
        .from('pulse_metrics_daily')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', previousStart)
        .lt('date', startDate);

      const alertsToCreate: Array<{
        account_id: string;
        alert_type: string;
        severity: string;
        title: string;
        description: string;
        metric_value: number;
        threshold_value: number;
        related_team_id?: string;
        related_driver_id?: string;
      }> = [];

      // Calculate overall engagement
      const recentEngagement = recentMetrics?.length
        ? recentMetrics.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / recentMetrics.length
        : 0;

      const previousEngagement = previousMetrics?.length
        ? previousMetrics.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / previousMetrics.length
        : recentEngagement;

      const engagementScore = recentEngagement * 10; // Convert 0-10 to 0-100
      const engagementDrop = (previousEngagement - recentEngagement) * 10;

      // Check for low engagement
      if (engagementScore <= RISK_THRESHOLDS.engagement.high) {
        const severity = engagementScore <= RISK_THRESHOLDS.engagement.critical ? 'critical' : 'high';
        alertsToCreate.push({
          account_id: accountId,
          alert_type: 'low_engagement',
          severity,
          title: 'Engajamento crítico detectado',
          description: `O score de engajamento está em ${Math.round(engagementScore)}%, abaixo do limite recomendado de ${RISK_THRESHOLDS.engagement.high}%.`,
          metric_value: engagementScore,
          threshold_value: RISK_THRESHOLDS.engagement.high,
        });
      }

      // Check for declining trend
      if (engagementDrop >= Math.abs(RISK_THRESHOLDS.decline.high)) {
        const severity = engagementDrop >= Math.abs(RISK_THRESHOLDS.decline.critical) ? 'critical' : 'high';
        alertsToCreate.push({
          account_id: accountId,
          alert_type: 'declining_trend',
          severity,
          title: 'Queda significativa de engajamento',
          description: `O engajamento caiu ${Math.round(engagementDrop)} pontos na última semana.`,
          metric_value: -engagementDrop,
          threshold_value: RISK_THRESHOLDS.decline.high,
        });
      }

      // Insert alerts (deduplicated by type)
      if (alertsToCreate.length > 0) {
        for (const alert of alertsToCreate) {
          // Check if similar alert exists
          const { data: existing } = await supabase
            .from('pulse_alerts')
            .select('id')
            .eq('account_id', accountId)
            .eq('alert_type', alert.alert_type)
            .eq('is_resolved', false)
            .gte('created_at', startDate)
            .single();

          if (!existing) {
            await supabase.from('pulse_alerts').insert(alert);
          }
        }
      }

      return alertsToCreate.length;
    },
    onSuccess: (count) => {
      if (count > 0) {
        toast.success(`${count} alerta(s) de retenção gerado(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['pulse-retention-alerts'] });
    },
    onError: (error) => {
      toast.error('Erro ao gerar alertas: ' + error.message);
    },
  });

  // Mark alert as read
  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-retention-alerts'] });
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by_user_id: user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-retention-alerts'] });
      toast.success('Alerta resolvido');
    },
    onError: (error) => {
      toast.error('Erro ao resolver: ' + error.message);
    },
  });

  // Summary stats
  const summary = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    highRiskTeams: teamRisks.filter(t => t.risk_level === 'critical' || t.risk_level === 'high').length,
    unreadAlerts: alerts.filter(a => !a.is_read).length,
  };

  return {
    alerts,
    teamRisks,
    summary,
    isLoading: isLoadingAlerts || isLoadingTeams,
    generateAlerts,
    markAsRead,
    resolveAlert,
    refetchAlerts,
  };
}
