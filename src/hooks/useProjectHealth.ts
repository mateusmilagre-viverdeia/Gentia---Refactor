import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ProjectHealthScore, 
  HealthStatus,
  HEALTH_WEIGHTS,
  getHealthStatus
} from '@/types/project-health.types';

interface UseProjectHealthReturn {
  healthScore: ProjectHealthScore | null;
  healthScores: ProjectHealthScore[];
  loading: boolean;
  error: string | null;
  calculateHealth: (accountId: string) => Promise<ProjectHealthScore | null>;
  refreshHealth: (accountId: string) => Promise<void>;
  loadAllHealthScores: () => Promise<void>;
}

// Pillar max stages for progress calculation
const PILLAR_MAX_STAGES: Record<string, number> = {
  mission: 5,
  vision: 6,
  values: 5,
  indicators: 6,
  decision: 5,
  energy: 3,
  development: 3,
  event: 1,
  ritual: 1,
};

export function useProjectHealth(accountId?: string): UseProjectHealthReturn {
  const [healthScore, setHealthScore] = useState<ProjectHealthScore | null>(null);
  const [healthScores, setHealthScores] = useState<ProjectHealthScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate progress score based on pillar stages
  const calculateProgressScore = useCallback(async (accId: string): Promise<number> => {
    try {
      // Get all pillar sessions
      const [mission, vision, values, indicators, decision, energy, development, event, ritual] = await Promise.all([
        supabase.from('mission_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('vision_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('values_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('strategic_indicators').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('decision_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('energy_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('development_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('event_sessions').select('stage').eq('account_id', accId).maybeSingle(),
        supabase.from('ritual_sessions').select('stage').eq('account_id', accId).maybeSingle(),
      ]);

      const pillars = [
        { data: mission.data, key: 'mission' },
        { data: vision.data, key: 'vision' },
        { data: values.data, key: 'values' },
        { data: indicators.data, key: 'indicators' },
        { data: decision.data, key: 'decision' },
        { data: energy.data, key: 'energy' },
        { data: development.data, key: 'development' },
        { data: event.data, key: 'event' },
        { data: ritual.data, key: 'ritual' },
      ];

      let totalProgress = 0;
      let pillarCount = 0;

      for (const pillar of pillars) {
        const maxStage = PILLAR_MAX_STAGES[pillar.key] || 5;
        const currentStage = pillar.data?.stage || 0;
        const progress = Math.min((currentStage / maxStage) * 100, 100);
        totalProgress += progress;
        pillarCount++;
      }

      return pillarCount > 0 ? Math.round(totalProgress / pillarCount) : 0;
    } catch (err) {
      console.error('Error calculating progress score:', err);
      return 0;
    }
  }, []);

  // Calculate engagement score based on checkpoint frequency
  const calculateEngagementScore = useCallback(async (accId: string): Promise<{ score: number; lastCheckpointDate: string | null }> => {
    try {
      const { data: checkpoints, error } = await supabase
        .from('project_checkpoints')
        .select('checkpoint_date, created_at')
        .eq('account_id', accId)
        .order('checkpoint_date', { ascending: false })
        .limit(10);

      if (error || !checkpoints || checkpoints.length === 0) {
        return { score: 0, lastCheckpointDate: null };
      }

      const lastCheckpointDate = checkpoints[0].checkpoint_date;
      const daysSinceLastCheckpoint = Math.floor(
        (new Date().getTime() - new Date(lastCheckpointDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Ideal: checkpoint every 2 weeks (14 days)
      // Score decreases as time passes:
      // 0-7 days: 100
      // 8-14 days: 80
      // 15-21 days: 60
      // 22-30 days: 40
      // 31-45 days: 20
      // 45+ days: 0
      let score = 100;
      if (daysSinceLastCheckpoint > 7) score = 80;
      if (daysSinceLastCheckpoint > 14) score = 60;
      if (daysSinceLastCheckpoint > 21) score = 40;
      if (daysSinceLastCheckpoint > 30) score = 20;
      if (daysSinceLastCheckpoint > 45) score = 0;

      return { score, lastCheckpointDate };
    } catch (err) {
      console.error('Error calculating engagement score:', err);
      return { score: 0, lastCheckpointDate: null };
    }
  }, []);

  // Calculate velocity score (progress vs expected based on project age)
  const calculateVelocityScore = useCallback(async (accId: string, progressScore: number): Promise<number> => {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('created_at')
        .eq('id', accId)
        .maybeSingle();

      if (error || !company) return 50; // Default to middle score

      const projectAgeDays = Math.floor(
        (new Date().getTime() - new Date(company.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Expected progress based on age:
      // 0-30 days: 15% expected
      // 31-60 days: 30% expected
      // 61-90 days: 50% expected
      // 91-120 days: 70% expected
      // 121-180 days: 85% expected
      // 180+ days: 100% expected
      let expectedProgress = 15;
      if (projectAgeDays > 30) expectedProgress = 30;
      if (projectAgeDays > 60) expectedProgress = 50;
      if (projectAgeDays > 90) expectedProgress = 70;
      if (projectAgeDays > 120) expectedProgress = 85;
      if (projectAgeDays > 180) expectedProgress = 100;

      // Score is based on how close actual is to expected
      // If ahead: bonus up to 100
      // If behind: penalty
      const ratio = expectedProgress > 0 ? progressScore / expectedProgress : 1;
      const score = Math.min(100, Math.round(ratio * 100));

      return Math.max(0, score);
    } catch (err) {
      console.error('Error calculating velocity score:', err);
      return 50;
    }
  }, []);

  // Calculate action score based on completed vs pending actions
  const calculateActionScore = useCallback(async (accId: string): Promise<{ score: number; pending: number; completed: number }> => {
    try {
      const { data: actions, error } = await supabase
        .from('checkpoint_actions')
        .select('status')
        .eq('account_id', accId);

      if (error || !actions || actions.length === 0) {
        return { score: 100, pending: 0, completed: 0 }; // No actions = perfect score
      }

      const completed = actions.filter(a => a.status === 'completed').length;
      const pending = actions.filter(a => a.status === 'pending').length;
      const inProgress = actions.filter(a => a.status === 'in_progress').length;
      const total = actions.length;

      // Score based on completion rate with weight for in_progress
      const completionRate = (completed + inProgress * 0.5) / total;
      const score = Math.round(completionRate * 100);

      return { score, pending, completed };
    } catch (err) {
      console.error('Error calculating action score:', err);
      return { score: 50, pending: 0, completed: 0 };
    }
  }, []);

  // Main calculation function
  const calculateHealth = useCallback(async (accId: string): Promise<ProjectHealthScore | null> => {
    setLoading(true);
    setError(null);

    try {
      // Calculate all component scores in parallel
      const [progressScore, engagementResult, actionResult] = await Promise.all([
        calculateProgressScore(accId),
        calculateEngagementScore(accId),
        calculateActionScore(accId),
      ]);

      const velocityScore = await calculateVelocityScore(accId, progressScore);

      // Calculate weighted final score
      const healthScoreValue = Math.round(
        progressScore * HEALTH_WEIGHTS.progress +
        engagementResult.score * HEALTH_WEIGHTS.engagement +
        velocityScore * HEALTH_WEIGHTS.velocity +
        actionResult.score * HEALTH_WEIGHTS.actions
      );

      const healthStatus = getHealthStatus(healthScoreValue);

      // Calculate days since last activity
      const lastActivityDate = engagementResult.lastCheckpointDate;
      const daysSinceLastActivity = lastActivityDate
        ? Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Upsert health score to database
      const healthData = {
        account_id: accId,
        progress_score: progressScore,
        engagement_score: engagementResult.score,
        velocity_score: velocityScore,
        action_score: actionResult.score,
        health_score: healthScoreValue,
        health_status: healthStatus,
        last_checkpoint_date: engagementResult.lastCheckpointDate,
        last_activity_date: lastActivityDate,
        days_since_last_activity: daysSinceLastActivity,
        pending_actions_count: actionResult.pending,
        completed_actions_count: actionResult.completed,
        calculated_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase
        .from('project_health_scores')
        .upsert(healthData, { onConflict: 'account_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting health score:', upsertError);
        // Return calculated data even if save fails
        const fallbackData: ProjectHealthScore = {
          ...healthData,
          id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return fallbackData;
      }

      const typedData: ProjectHealthScore = {
        ...data,
        health_status: data.health_status as HealthStatus,
      };
      setHealthScore(typedData);
      return typedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular health score';
      setError(message);
      console.error('Error calculating health:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [calculateProgressScore, calculateEngagementScore, calculateVelocityScore, calculateActionScore]);

  // Refresh health score for a specific account
  const refreshHealth = useCallback(async (accId: string) => {
    await calculateHealth(accId);
  }, [calculateHealth]);

  // Load all health scores (for dashboard)
  const loadAllHealthScores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('project_health_scores')
        .select('*')
        .order('health_score', { ascending: true });

      if (fetchError) throw fetchError;

      const typedData: ProjectHealthScore[] = (data || []).map(item => ({
        ...item,
        health_status: item.health_status as HealthStatus,
      }));
      setHealthScores(typedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar health scores';
      setError(message);
      console.error('Error loading health scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load health score for specific account on mount
  useEffect(() => {
    if (accountId) {
      supabase
        .from('project_health_scores')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const typedData: ProjectHealthScore = {
              ...data,
              health_status: data.health_status as HealthStatus,
            };
            setHealthScore(typedData);
          }
        });
    }
  }, [accountId]);

  return {
    healthScore,
    healthScores,
    loading,
    error,
    calculateHealth,
    refreshHealth,
    loadAllHealthScores,
  };
}
