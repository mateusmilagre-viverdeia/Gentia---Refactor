import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectHealth } from './useProjectHealth';
import { useProjectMilestones } from './useProjectMilestones';
import { useCheckpoints } from './useCheckpoints';
import { differenceInDays, differenceInWeeks, addWeeks } from "date-fns";
import {
  ProjectProgressReport,
  PillarProgress,
  MilestonesSummary,
  CheckpointsSummary,
  ActionsSummary,
  TimelineMetrics,
  PILLAR_CONFIG,
  PillarKey,
  calculatePillarPercentage,
  getPillarStatus,
} from '@/types/consulting-reports.types';
import type { ProjectMilestone } from '@/types/project-timeline.types';

interface UseProjectProgressReportReturn {
  report: ProjectProgressReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectProgressReport(accountId: string | null): UseProjectProgressReportReturn {
  const [report, setReport] = useState<ProjectProgressReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { healthScore, loading: healthLoading } = useProjectHealth(accountId || undefined);
  const { milestones, loading: milestonesLoading } = useProjectMilestones(accountId);
  const { checkpoints, actions, loading: checkpointsLoading } = useCheckpoints(accountId);

  const generateReport = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch company info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug, created_at')
        .eq('id', accountId)
        .maybeSingle();

      if (companyError || !company) {
        throw new Error('Empresa não encontrada');
      }

      // Fetch pillar stages
      const [mission, vision, values, indicators, decision, energy, development, event, ritual] = await Promise.all([
        supabase.from('mission_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('vision_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('values_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('strategic_indicators').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('decision_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('energy_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('development_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('event_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
        supabase.from('ritual_sessions').select('stage').eq('account_id', accountId).maybeSingle(),
      ]);

      // Build pillar progress
      const pillarData: { key: PillarKey; stage: number | null }[] = [
        { key: 'mission', stage: mission.data?.stage || null },
        { key: 'vision', stage: vision.data?.stage || null },
        { key: 'values', stage: values.data?.stage || null },
        { key: 'indicators', stage: indicators.data?.stage || null },
        { key: 'decision', stage: decision.data?.stage || null },
        { key: 'energy', stage: energy.data?.stage || null },
        { key: 'development', stage: development.data?.stage || null },
        { key: 'event', stage: event.data?.stage || null },
        { key: 'ritual', stage: ritual.data?.stage || null },
      ];

      const pillarProgress: PillarProgress[] = pillarData.map(({ key, stage }) => {
        const config = PILLAR_CONFIG[key];
        const percentage = calculatePillarPercentage(stage, key);
        return {
          pillar: key,
          label: config.label,
          currentStage: stage || 0,
          maxStage: config.maxStage,
          percentage,
          status: getPillarStatus(percentage),
        };
      });

      // Calculate overall progress
      const overallProgress = Math.round(
        pillarProgress.reduce((sum, p) => sum + p.percentage, 0) / pillarProgress.length
      );

      // Build milestones summary
      const milestonesSummary: MilestonesSummary = {
        total: milestones.length,
        completed: milestones.filter(m => m.status === 'completed').length,
        inProgress: milestones.filter(m => m.status === 'in_progress').length,
        pending: milestones.filter(m => m.status === 'pending').length,
        blocked: milestones.filter(m => m.status === 'blocked').length,
      overdue: milestones.filter(m => {
        if (m.status === 'completed') return false;
        if (!m.planned_end) return false;
        return new Date(m.planned_end) < new Date();
      }).length,
        avgProgress: milestones.length > 0
          ? Math.round(milestones.reduce((sum, m) => sum + (m.progress_percentage || 0), 0) / milestones.length)
          : 0,
      };

      // Build checkpoints summary
      const now = new Date();
      const upcomingCheckpoints = checkpoints
        .filter(c => c.status === 'scheduled' && new Date(c.checkpoint_date) > now)
        .sort((a, b) => new Date(a.checkpoint_date).getTime() - new Date(b.checkpoint_date).getTime())
        .slice(0, 3);

      const completedCheckpoints = checkpoints.filter(c => c.status === 'completed');
      const lastCheckpoint = completedCheckpoints.length > 0
        ? completedCheckpoints.sort((a, b) => 
            new Date(b.checkpoint_date).getTime() - new Date(a.checkpoint_date).getTime()
          )[0]
        : null;

      const checkpointsSummary: CheckpointsSummary = {
        total: checkpoints.length,
        completed: completedCheckpoints.length,
        scheduled: checkpoints.filter(c => c.status === 'scheduled').length,
        cancelled: checkpoints.filter(c => c.status === 'cancelled').length,
        upcoming: upcomingCheckpoints,
        lastCheckpoint,
      };

      // Build actions summary
      const overdueActions = actions.filter(a => {
        if (a.status === 'completed') return false;
        if (!a.due_date) return false;
        return new Date(a.due_date) < now;
      });

      const actionsSummary: ActionsSummary = {
        total: actions.length,
        completed: actions.filter(a => a.status === 'completed').length,
        pending: actions.filter(a => a.status === 'pending').length,
        inProgress: actions.filter(a => a.status === 'in_progress').length,
        overdue: overdueActions.length,
        completionRate: actions.length > 0
          ? Math.round((actions.filter(a => a.status === 'completed').length / actions.length) * 100)
          : 100,
      };

      // Build timeline metrics
      const projectStartDate = company.created_at;
      const projectAge = differenceInDays(now, new Date(projectStartDate));
      const weeksActive = differenceInWeeks(now, new Date(projectStartDate)) || 1;
      const velocity = Math.round(overallProgress / weeksActive * 10) / 10;

      // Estimate completion based on current velocity
      let estimatedCompletion: string | null = null;
      if (velocity > 0 && overallProgress < 100) {
        const remainingProgress = 100 - overallProgress;
        const weeksToComplete = Math.ceil(remainingProgress / velocity);
        estimatedCompletion = addWeeks(now, weeksToComplete).toISOString();
      }

      // Determine velocity trend (simplified - would need historical data for accuracy)
      const velocityTrend: 'accelerating' | 'stable' | 'decelerating' = 
        velocity > 3 ? 'accelerating' : velocity < 1 ? 'decelerating' : 'stable';

      const timeline: TimelineMetrics = {
        projectStartDate,
        projectAge,
        estimatedCompletion,
        velocity,
        velocityTrend,
      };

      // Fetch consultants
      const { data: assignments } = await supabase
        .from('consultant_assignments')
        .select('consultant:ep_consultants(name)')
        .eq('account_id', accountId)
        .eq('active', true);

      const consultants = (assignments || [])
        .map(a => (a.consultant as any)?.name)
        .filter(Boolean);

      // Build final report
      const progressReport: ProjectProgressReport = {
        projectId: accountId,
        projectName: company.name,
        projectSlug: company.slug,
        consultants,
        healthScore,
        pillarProgress,
        overallProgress,
        milestonesSummary,
        checkpointsSummary,
        actionsSummary,
        timeline,
        generatedAt: now.toISOString(),
      };

      setReport(progressReport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      setError(message);
      console.error('Error generating project report:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId, healthScore, milestones, checkpoints, actions]);

  // Auto-generate report when dependencies are ready
  useEffect(() => {
    if (accountId && !healthLoading && !milestonesLoading && !checkpointsLoading) {
      generateReport();
    }
  }, [accountId, healthLoading, milestonesLoading, checkpointsLoading, generateReport]);

  const isLoading = loading || healthLoading || milestonesLoading || checkpointsLoading;

  return {
    report,
    loading: isLoading,
    error,
    refresh: generateReport,
  };
}
