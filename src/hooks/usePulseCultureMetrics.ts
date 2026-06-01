import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CulturePillar, PulseCultureMetric, CultureDashboardSummary, PILLAR_LABELS } from '@/types/pulseCulture.types';

interface CultureChartData {
  date: string;
  score: number;
  participation: number;
}

interface PillarChartData {
  pillar: CulturePillar;
  pillar_name: string;
  score: number;
  response_count: number;
}

interface PreviousPillarScore {
  pillar: CulturePillar;
  pillar_name: string;
  score: number;
}

export function usePulseCultureMetrics(accountId: string | null) {
  const [metrics, setMetrics] = useState<PulseCultureMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async (days: number = 30) => {
    if (!accountId) return;
    setLoading(true);
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('pulse_culture_metrics_daily')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      
      const mappedMetrics: PulseCultureMetric[] = (data || []).map(d => ({
        id: d.id,
        account_id: d.account_id,
        date: d.date,
        overall_score: Number(d.overall_score) || 0,
        by_pillar: (d.by_pillar as Record<string, number>) || {},
        by_value: (d.by_value as Record<string, number>) || {},
        response_count: d.response_count || 0,
        respondent_count: d.respondent_count || 0,
        created_at: d.created_at,
      }));
      
      setMetrics(mappedMetrics);
    } catch (error) {
      console.error('Error fetching culture metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Chart data for trend line
  const chartData: CultureChartData[] = useMemo(() => {
    return metrics.map(m => ({
      date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      score: Math.round(m.overall_score * 10) / 10,
      participation: m.respondent_count > 0 ? Math.round((m.response_count / m.respondent_count) * 100) : 0,
    }));
  }, [metrics]);

  // Aggregated pillar scores
  const pillarScores: PillarChartData[] = useMemo(() => {
    if (metrics.length === 0) return [];

    const pillarTotals: Record<CulturePillar, { sum: number; count: number }> = {
      mission: { sum: 0, count: 0 },
      vision: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 },
      decision: { sum: 0, count: 0 },
      indicator: { sum: 0, count: 0 },
      project: { sum: 0, count: 0 },
      energy: { sum: 0, count: 0 },
      development: { sum: 0, count: 0 },
    };

    metrics.forEach(m => {
      Object.entries(m.by_pillar).forEach(([pillar, score]) => {
        const key = pillar as CulturePillar;
        if (pillarTotals[key]) {
          pillarTotals[key].sum += score;
          pillarTotals[key].count += 1;
        }
      });
    });

    return Object.entries(pillarTotals)
      .filter(([_, val]) => val.count > 0)
      .map(([pillar, val]) => ({
        pillar: pillar as CulturePillar,
        pillar_name: PILLAR_LABELS[pillar as CulturePillar],
        score: Math.round((val.sum / val.count) * 10) / 10,
        response_count: val.count,
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  // Value scores (for heatmap)
  const valueScores = useMemo(() => {
    if (metrics.length === 0) return [];

    const valueTotals: Record<string, { sum: number; count: number }> = {};

    metrics.forEach(m => {
      Object.entries(m.by_value).forEach(([value, score]) => {
        if (!valueTotals[value]) {
          valueTotals[value] = { sum: 0, count: 0 };
        }
        valueTotals[value].sum += score;
        valueTotals[value].count += 1;
      });
    });

    return Object.entries(valueTotals)
      .map(([value, data]) => ({
        value,
        score: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  // ======= REAL TRENDS: split metrics into two halves =======
  const previousPillarScores: PreviousPillarScore[] = useMemo(() => {
    if (metrics.length < 2) return [];

    const half = Math.floor(metrics.length / 2);
    const previousMetrics = metrics.slice(0, half);

    const pillarTotals: Record<CulturePillar, { sum: number; count: number }> = {
      mission: { sum: 0, count: 0 },
      vision: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 },
      decision: { sum: 0, count: 0 },
      indicator: { sum: 0, count: 0 },
      project: { sum: 0, count: 0 },
      energy: { sum: 0, count: 0 },
      development: { sum: 0, count: 0 },
    };

    previousMetrics.forEach(m => {
      Object.entries(m.by_pillar).forEach(([pillar, score]) => {
        const key = pillar as CulturePillar;
        if (pillarTotals[key]) {
          pillarTotals[key].sum += score;
          pillarTotals[key].count += 1;
        }
      });
    });

    return Object.entries(pillarTotals)
      .filter(([_, val]) => val.count > 0)
      .map(([pillar, val]) => ({
        pillar: pillar as CulturePillar,
        pillar_name: PILLAR_LABELS[pillar as CulturePillar],
        score: Math.round((val.sum / val.count) * 10) / 10,
      }));
  }, [metrics]);

  const previousOverallScore = useMemo(() => {
    if (metrics.length < 2) return 0;
    const half = Math.floor(metrics.length / 2);
    const prev = metrics.slice(0, half);
    if (prev.length === 0) return 0;
    return Math.round((prev.reduce((s, m) => s + m.overall_score, 0) / prev.length) * 10) / 10;
  }, [metrics]);

  const previousValueScores = useMemo(() => {
    if (metrics.length < 2) return [];
    const half = Math.floor(metrics.length / 2);
    const prev = metrics.slice(0, half);
    const valueTotals: Record<string, { sum: number; count: number }> = {};
    prev.forEach(m => {
      Object.entries(m.by_value).forEach(([value, score]) => {
        if (!valueTotals[value]) valueTotals[value] = { sum: 0, count: 0 };
        valueTotals[value].sum += score;
        valueTotals[value].count += 1;
      });
    });
    return Object.entries(valueTotals)
      .map(([value, data]) => ({
        value,
        score: Math.round((data.sum / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  // Real pillar chart data per date (using actual by_pillar from each metric)
  const pillarChartData = useMemo(() => {
    return metrics.map(m => {
      const entry: Record<string, string | number> = {
        date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      };
      Object.entries(m.by_pillar).forEach(([pillar, score]) => {
        entry[pillar] = Math.round(score * 10) / 10;
      });
      return entry;
    });
  }, [metrics]);

  // Real value chart data per date
  const valueChartData = useMemo(() => {
    return metrics.map(m => {
      const entry: Record<string, string | number> = {
        date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      };
      Object.entries(m.by_value).forEach(([value, score]) => {
        entry[value] = Math.round(score * 10) / 10;
      });
      return entry;
    });
  }, [metrics]);

  // Summary for KPI cards
  const summary: CultureDashboardSummary = useMemo(() => {
    if (metrics.length === 0) {
      return {
        overallScore: 0,
        trend: 'stable' as const,
        trendValue: 0,
        participationRate: 0,
        topValues: [],
        lowValues: [],
      };
    }

    const latest = metrics[metrics.length - 1];
    const half = Math.floor(metrics.length / 2);
    const recent = metrics.slice(half);
    const previous = metrics.slice(0, half);

    const currentAvg = recent.reduce((sum, m) => sum + m.overall_score, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum, m) => sum + m.overall_score, 0) / previous.length
      : currentAvg;

    const trendValue = Math.round((currentAvg - previousAvg) * 10) / 10;

    return {
      overallScore: Math.round(currentAvg * 10) / 10,
      trend: trendValue > 0.5 ? 'up' : trendValue < -0.5 ? 'down' : 'stable',
      trendValue,
      participationRate: latest.respondent_count > 0
        ? Math.round((latest.response_count / latest.respondent_count) * 100)
        : 0,
      topValues: valueScores.slice(0, 3).map(v => ({ name: v.value, score: v.score })),
      lowValues: valueScores.slice(-3).reverse().map(v => ({ name: v.value, score: v.score })),
    };
  }, [metrics, valueScores]);

  // Fetch by period (days)
  const fetchByPeriod = useCallback(async (days: number) => {
    await fetchMetrics(days);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    fetchMetrics,
    fetchByPeriod,
    chartData,
    pillarScores,
    previousPillarScores,
    previousOverallScore,
    previousValueScores,
    pillarChartData,
    valueChartData,
    valueScores,
    summary,
  };
}
