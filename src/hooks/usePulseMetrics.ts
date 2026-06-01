import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { PulseDriver, PulsePillar } from '@/types/pulse.types';
import { formatBRT } from "@/lib/datetime";

export interface DailyMetric {
  id: string;
  date: string;
  engagement_score_avg: number | null;
  participation_rate: number | null;
  responded_users: number | null;
  total_users: number | null;
  by_driver: Record<string, { avg: number; count: number }> | null;
  by_pillar: Record<string, { avg: number; count: number }> | null;
  by_team: Record<string, { avg: number; count: number }> | null;
}

export interface PulseAlert {
  id: string;
  title: string;
  description: string | null;
  alert_type: string;
  severity: string | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  metric_value: number | null;
  threshold_value: number | null;
  related_driver_id: string | null;
  related_pillar_id: string | null;
  related_team_id: string | null;
  pulse_drivers?: PulseDriver;
  pulse_pillars?: PulsePillar;
}

export interface TeamMetric {
  team_id: string;
  team_name: string;
  participation_rate: number;
  engagement_score: number;
  member_count: number;
}

export interface DriverScore {
  driver_key: string;
  driver_name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  response_count: number;
}

export interface DashboardSummary {
  overallEngagement: number;
  participationRate: number;
  activeUsers: number;
  totalUsers: number;
  currentStreak: number;
  alertsCount: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export function usePulseMetrics(accountId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  const [drivers, setDrivers] = useState<PulseDriver[]>([]);
  const [pillars, setPillars] = useState<PulsePillar[]>([]);

  // Calculate live metrics for a date range (fallback when pulse_metrics_daily is empty)
  const calculateLiveMetricsRange = useCallback(async (startDate: string, endDate: string): Promise<DailyMetric[]> => {
    if (!accountId) return [];
    try {
      const { data: responses, error } = await supabase
        .from('pulse_responses')
        .select('date, numeric_score, respondent_user_id, respondent_team_id, question_id')
        .eq('account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      if (!responses?.length) return [];

      const { count: totalUsers } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('is_active', true);

      const responsesByDate: Record<string, typeof responses> = {};
      responses.forEach(r => {
        if (!responsesByDate[r.date]) responsesByDate[r.date] = [];
        responsesByDate[r.date].push(r);
      });

      const liveMetrics: DailyMetric[] = Object.entries(responsesByDate).map(([date, dateResponses]) => {
        const validScores = dateResponses
          .filter(r => r.numeric_score !== null)
          .map(r => r.numeric_score as number);
        
        const avgScore = validScores.length > 0
          ? validScores.reduce((a, b) => a + b, 0) / validScores.length
          : 0;

        const uniqueResponders = new Set(dateResponses.map(r => r.respondent_user_id).filter(Boolean));
        const respondedUsers = uniqueResponders.size;
        const participationRate = totalUsers && totalUsers > 0
          ? Math.round((respondedUsers / totalUsers) * 100)
          : 0;

        return {
          id: `live-${date}`,
          date,
          engagement_score_avg: Math.round(avgScore * 100) / 100,
          participation_rate: participationRate,
          responded_users: respondedUsers,
          total_users: totalUsers || 0,
          by_driver: null,
          by_pillar: null,
          by_team: null,
        };
      });

      return liveMetrics.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
      console.error('Error calculating live metrics range:', error);
      return [];
    }
  }, [accountId]);

  // Fetch daily metrics for a date range
  const fetchMetrics = useCallback(async (startDate: string, endDate: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_metrics_daily')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('[usePulseMetrics] No aggregated metrics found, calculating live metrics');
        const liveMetrics = await calculateLiveMetricsRange(startDate, endDate);
        if (liveMetrics.length > 0) {
          setMetrics(liveMetrics);
          return;
        }
      }
      
      setMetrics((data || []).map(m => ({
        ...m,
        by_driver: m.by_driver as any,
        by_pillar: m.by_pillar as any,
        by_team: m.by_team as any,
      })));
    } catch (error: any) {
      toast({ title: 'Erro ao carregar métricas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast, calculateLiveMetricsRange]);

  // Fetch last 30 days by default
  const fetchLast30Days = useCallback(async () => {
    const endDate = formatBRT(new Date(), 'yyyy-MM-dd');
    const startDate = formatBRT(subDays(new Date(), 30), 'yyyy-MM-dd');
    await fetchMetrics(startDate, endDate);
  }, [fetchMetrics]);

  // Fetch by period (days)
  const fetchByPeriod = useCallback(async (days: number) => {
    const endDate = formatBRT(new Date(), 'yyyy-MM-dd');
    const startDate = formatBRT(subDays(new Date(), days), 'yyyy-MM-dd');
    await fetchMetrics(startDate, endDate);
  }, [fetchMetrics]);

  // Fetch alerts
  const fetchAlerts = useCallback(async (onlyUnread: boolean = false) => {
    if (!accountId) return;
    try {
      let query = supabase
        .from('pulse_alerts')
        .select('*, pulse_drivers(*), pulse_pillars(*)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (onlyUnread) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data as unknown as PulseAlert[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar alertas', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  // Mark alert as read
  const markAlertRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar alerta', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // Resolve alert
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by_user_id: user?.id || null,
        })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
      toast({ title: 'Alerta resolvido' });
    } catch (error: any) {
      toast({ title: 'Erro ao resolver alerta', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // Fetch drivers and pillars for reference
  const fetchReferenceData = useCallback(async () => {
    if (!accountId) return;
    try {
      const [driversRes, pillarsRes] = await Promise.all([
        supabase
          .from('pulse_drivers')
          .select('*')
          .or(`account_id.eq.${accountId},account_id.is.null`)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('pulse_pillars')
          .select('*')
          .or(`account_id.eq.${accountId},account_id.is.null`)
          .eq('is_active', true)
          .order('sort_order'),
      ]);

      if (driversRes.data) setDrivers(driversRes.data as PulseDriver[]);
      if (pillarsRes.data) setPillars(pillarsRes.data as PulsePillar[]);
    } catch (error: any) {
      console.error('Error fetching reference data:', error);
    }
  }, [accountId]);

  // Calculate real-time metrics from responses (when pulse_metrics_daily not yet aggregated)
  const calculateLiveMetrics = useCallback(async (date: string) => {
    if (!accountId) return null;
    try {
      const { data: responses, error } = await supabase
        .from('pulse_responses')
        .select('numeric_score, question_id, pulse_questions(driver_id, pulse_drivers(key, name))')
        .eq('account_id', accountId)
        .eq('date', date);

      if (error) throw error;
      if (!responses?.length) return null;

      const scores = responses
        .filter(r => r.numeric_score !== null)
        .map(r => r.numeric_score as number);

      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

      // Group by driver
      const byDriver: Record<string, { total: number; count: number }> = {};
      responses.forEach(r => {
        const driverKey = (r.pulse_questions as any)?.pulse_drivers?.key;
        if (driverKey && r.numeric_score !== null) {
          if (!byDriver[driverKey]) byDriver[driverKey] = { total: 0, count: 0 };
          byDriver[driverKey].total += r.numeric_score;
          byDriver[driverKey].count++;
        }
      });

      return {
        date,
        engagement_score_avg: avgScore,
        response_count: responses.length,
        by_driver: Object.fromEntries(
          Object.entries(byDriver).map(([k, v]) => [k, { avg: v.total / v.count, count: v.count }])
        ),
      };
    } catch (error: any) {
      console.error('Error calculating live metrics:', error);
      return null;
    }
  }, [accountId]);

  // Computed summary
  const summary = useMemo<DashboardSummary>(() => {
    if (metrics.length === 0) {
      return {
        overallEngagement: 0,
        participationRate: 0,
        activeUsers: 0,
        totalUsers: 0,
        currentStreak: 0,
        alertsCount: alerts.filter(a => !a.is_read).length,
        trend: 'stable',
        trendValue: 0,
      };
    }

    const half = Math.floor(metrics.length / 2);
    const recent = metrics.slice(half);
    const previous = metrics.slice(0, half);

    const avgEngagement = recent.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / recent.length;
    const avgParticipation = recent.reduce((sum, m) => sum + (m.participation_rate || 0), 0) / recent.length;
    const latestMetric = metrics[metrics.length - 1];

    const prevEngagement = previous.length > 0
      ? previous.reduce((sum, m) => sum + (m.engagement_score_avg || 0), 0) / previous.length
      : avgEngagement;

    const trendValue = avgEngagement - prevEngagement;
    const trend: 'up' | 'down' | 'stable' = trendValue > 0.1 ? 'up' : trendValue < -0.1 ? 'down' : 'stable';

    return {
      overallEngagement: Math.round(avgEngagement * 10), // Convert 0-10 to 0-100
      participationRate: Math.round(avgParticipation),
      activeUsers: latestMetric?.responded_users || 0,
      totalUsers: latestMetric?.total_users || 0,
      currentStreak: 0, // Would need separate calculation
      alertsCount: alerts.filter(a => !a.is_read).length,
      trend,
      trendValue: Math.round(trendValue * 10), // Convert to percentage points
    };
  }, [metrics, alerts]);

  // Driver scores computed
  const driverScores = useMemo<DriverScore[]>(() => {
    if (metrics.length === 0 || drivers.length === 0) return [];

    const half = Math.floor(metrics.length / 2);
    const recent = metrics.slice(half);
    const previous = metrics.slice(0, half);

    return drivers.map(driver => {
      const recentScores: number[] = [];
      const prevScores: number[] = [];

      recent.forEach(m => {
        const driverData = m.by_driver?.[driver.key];
        if (driverData?.avg) recentScores.push(driverData.avg);
      });

      previous.forEach(m => {
        const driverData = m.by_driver?.[driver.key];
        if (driverData?.avg) prevScores.push(driverData.avg);
      });

      const avgRecent = recentScores.length > 0
        ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
        : 0;

      const avgPrev = prevScores.length > 0
        ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
        : avgRecent;

      const diff = avgRecent - avgPrev;
      const trend: 'up' | 'down' | 'stable' = diff > 0.1 ? 'up' : diff < -0.1 ? 'down' : 'stable';

      return {
        driver_key: driver.key,
        driver_name: driver.name,
        score: Math.round(avgRecent), // Already 0-100 from edge function
        trend,
        response_count: recentScores.length,
      };
    }).filter(d => d.response_count > 0);
  }, [metrics, drivers]);

  // Chart data for engagement over time
  const engagementChartData = useMemo(() => {
    return metrics.map(m => ({
      date: formatBRT(new Date(m.date), 'dd/MM'),
      fullDate: m.date,
      engagement: m.engagement_score_avg ? Math.round(m.engagement_score_avg * 10) : null,
      participation: m.participation_rate || null,
    }));
  }, [metrics]);

  // Team-filtered engagement chart data
  const getTeamEngagementChartData = useCallback((teamId: string | null) => {
    if (!teamId) return engagementChartData;
    return metrics.map(m => {
      const teamData = m.by_team?.[teamId];
      return {
        date: formatBRT(new Date(m.date), 'dd/MM'),
        fullDate: m.date,
        engagement: teamData?.avg ? Math.round(teamData.avg * 10) : null,
        participation: m.participation_rate || null,
      };
    });
  }, [metrics, engagementChartData]);

  // Previous period chart data for benchmark overlay
  const [previousPeriodData, setPreviousPeriodData] = useState<DailyMetric[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const fetchPreviousPeriod = useCallback(async (days: number) => {
    if (!accountId) return;
    setLoadingPrevious(true);
    try {
      const endDate = formatBRT(subDays(new Date(), days), 'yyyy-MM-dd');
      const startDate = formatBRT(subDays(new Date(), days * 2), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('pulse_metrics_daily')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        const liveMetrics = await calculateLiveMetricsRange(startDate, endDate);
        setPreviousPeriodData(liveMetrics);
      } else {
        setPreviousPeriodData((data || []).map(m => ({
          ...m,
          by_driver: m.by_driver as any,
          by_pillar: m.by_pillar as any,
          by_team: m.by_team as any,
        })));
      }
    } catch (error) {
      console.error('Error fetching previous period:', error);
    } finally {
      setLoadingPrevious(false);
    }
  }, [accountId, calculateLiveMetricsRange]);

  const previousPeriodChartData = useMemo(() => {
    return previousPeriodData.map((m, i) => ({
      engagement: m.engagement_score_avg ? Math.round(m.engagement_score_avg * 10) : null,
      participation: m.participation_rate || null,
    }));
  }, [previousPeriodData]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchLast30Days(),
      fetchAlerts(),
      fetchReferenceData(),
    ]);
  }, [fetchLast30Days, fetchAlerts, fetchReferenceData]);

  return {
    loading,
    metrics,
    alerts,
    drivers,
    pillars,
    summary,
    driverScores,
    engagementChartData,
    getTeamEngagementChartData,
    previousPeriodChartData,
    loadingPrevious,
    fetchPreviousPeriod,
    // Actions
    fetchMetrics,
    fetchLast30Days,
    fetchByPeriod,
    fetchAlerts,
    markAlertRead,
    resolveAlert,
    fetchReferenceData,
    calculateLiveMetrics,
    fetchAll,
  };
}
