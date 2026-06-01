import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface InterviewTokenUsage {
  id: string;
  session_id: string;
  session_type: 'cultural' | 'technical';
  job_id: string | null;
  candidate_id: string | null;
  audio_input_seconds: number;
  audio_output_seconds: number;
  audio_input_tokens: number;
  audio_output_tokens: number;
  text_input_tokens: number;
  text_output_tokens: number;
  audio_input_cost_usd: number;
  audio_output_cost_usd: number;
  text_cost_usd: number;
  total_cost_usd: number;
  model_audio: string;
  model_text: string;
  duration_seconds: number | null;
  created_at: string;
  credits_consumed?: number;
}

export interface CreditConfig {
  usd_to_brl: number;
  margin_percent: number;
  credit_value_brl: number;
}

export interface CostAnalyticsSummary {
  totalInterviews: number;
  totalCostUsd: number;
  avgCostPerInterviewUsd: number;
  avgDurationSeconds: number;
  byType: {
    cultural: {
      count: number;
      totalCostUsd: number;
      avgCostUsd: number;
      avgDurationSeconds: number;
    };
    technical: {
      count: number;
      totalCostUsd: number;
      avgCostUsd: number;
      avgDurationSeconds: number;
    };
  };
  costBreakdown: {
    audioInput: number;
    audioOutput: number;
    textProcessing: number;
  };
  dailyData: Array<{
    date: string;
    culturalCount: number;
    technicalCount: number;
    totalCost: number;
  }>;
}

interface UseInterviewCostAnalyticsReturn {
  summary: CostAnalyticsSummary | null;
  recentUsage: InterviewTokenUsage[];
  creditConfig: CreditConfig;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;
}

// OpenAI Realtime pricing - gpt-realtime-mini
export const OPENAI_REALTIME_RATES = {
  audio_input_per_1m_tokens: 10.00,   // $10/1M tokens
  audio_output_per_1m_tokens: 20.00,  // $20/1M tokens
};

// Lovable AI rates (approximate for Gemini models)
export const LOVABLE_AI_RATES = {
  'google/gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
  'google/gemini-3-flash-preview': { input: 0.00015, output: 0.0006 },
};

// USD to BRL conversion rate (update periodically)
export const USD_TO_BRL = 5.0;

const DEFAULT_CREDIT_CONFIG: CreditConfig = {
  usd_to_brl: 5.65,
  margin_percent: 50,
  credit_value_brl: 1.39,
};

function calculateCredits(totalCostUsd: number, config: CreditConfig): number {
  const costBrl = totalCostUsd * config.usd_to_brl * (1 + config.margin_percent / 100);
  return Math.max(Math.round((costBrl / config.credit_value_brl) * 10) / 10, 0.1);
}

export function useInterviewCostAnalytics(): UseInterviewCostAnalyticsReturn {
  const { currentOrganization } = useOrganization();
  const [summary, setSummary] = useState<CostAnalyticsSummary | null>(null);
  const [recentUsage, setRecentUsage] = useState<InterviewTokenUsage[]>([]);
  const [creditConfig, setCreditConfig] = useState<CreditConfig>(DEFAULT_CREDIT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });

  const fetchAnalytics = useCallback(async () => {
    if (!currentOrganization?.id) {
      setSummary(null);
      setRecentUsage([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch credit config
      const { data: configData } = await supabase
        .from('platform_credit_config')
        .select('usd_to_brl, margin_percent, credit_value_brl')
        .limit(1)
        .single();

      const config = configData
        ? {
            usd_to_brl: Number(configData.usd_to_brl),
            margin_percent: Number(configData.margin_percent),
            credit_value_brl: Number(configData.credit_value_brl),
          }
        : { ...DEFAULT_CREDIT_CONFIG };
      setCreditConfig(config);

      const { data, error: queryError } = await supabase
        .from('interview_token_usage')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const usage = ((data || []) as InterviewTokenUsage[]).map(u => ({
        ...u,
        credits_consumed: calculateCredits(Number(u.total_cost_usd || 0), config),
      }));
      setRecentUsage(usage);

      // Calculate summary
      const culturalInterviews = usage.filter(u => u.session_type === 'cultural');
      const technicalInterviews = usage.filter(u => u.session_type === 'technical');

      const totalCostUsd = usage.reduce((sum, u) => sum + Number(u.total_cost_usd || 0), 0);
      const avgDuration = usage.length > 0 
        ? usage.reduce((sum, u) => sum + (u.duration_seconds || 0), 0) / usage.length 
        : 0;

      const culturalCost = culturalInterviews.reduce((sum, u) => sum + Number(u.total_cost_usd || 0), 0);
      const technicalCost = technicalInterviews.reduce((sum, u) => sum + Number(u.total_cost_usd || 0), 0);

      const culturalDuration = culturalInterviews.length > 0
        ? culturalInterviews.reduce((sum, u) => sum + (u.duration_seconds || 0), 0) / culturalInterviews.length
        : 0;
      const technicalDuration = technicalInterviews.length > 0
        ? technicalInterviews.reduce((sum, u) => sum + (u.duration_seconds || 0), 0) / technicalInterviews.length
        : 0;

      const audioInputTotal = usage.reduce((sum, u) => sum + Number(u.audio_input_cost_usd || 0), 0);
      const audioOutputTotal = usage.reduce((sum, u) => sum + Number(u.audio_output_cost_usd || 0), 0);
      const textTotal = usage.reduce((sum, u) => sum + Number(u.text_cost_usd || 0), 0);

      // Group by day for chart
      const dailyMap = new Map<string, { culturalCount: number; technicalCount: number; totalCost: number }>();
      usage.forEach(u => {
        const day = new Date(u.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(day) || { culturalCount: 0, technicalCount: 0, totalCost: 0 };
        if (u.session_type === 'cultural') {
          existing.culturalCount++;
        } else {
          existing.technicalCount++;
        }
        existing.totalCost += Number(u.total_cost_usd || 0);
        dailyMap.set(day, existing);
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSummary({
        totalInterviews: usage.length,
        totalCostUsd,
        avgCostPerInterviewUsd: usage.length > 0 ? totalCostUsd / usage.length : 0,
        avgDurationSeconds: avgDuration,
        byType: {
          cultural: {
            count: culturalInterviews.length,
            totalCostUsd: culturalCost,
            avgCostUsd: culturalInterviews.length > 0 ? culturalCost / culturalInterviews.length : 0,
            avgDurationSeconds: culturalDuration,
          },
          technical: {
            count: technicalInterviews.length,
            totalCostUsd: technicalCost,
            avgCostUsd: technicalInterviews.length > 0 ? technicalCost / technicalInterviews.length : 0,
            avgDurationSeconds: technicalDuration,
          },
        },
        costBreakdown: {
          audioInput: audioInputTotal,
          audioOutput: audioOutputTotal,
          textProcessing: textTotal,
        },
        dailyData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setError(message);
      console.error('Error fetching cost analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    summary,
    recentUsage,
    creditConfig,
    isLoading,
    error,
    refresh: fetchAnalytics,
    dateRange,
    setDateRange,
  };
}
