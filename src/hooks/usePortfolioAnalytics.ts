import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from "date-fns";
import {
  PortfolioSummary,
  PortfolioReport,
  ConsultantPerformance,
  AtRiskProject,
  TrendDataPoint,
  PILLAR_CONFIG,
  PillarKey,
  calculatePillarPercentage,
} from '@/types/consulting-reports.types';
import { HealthStatus } from '@/types/project-health.types';

interface UsePortfolioAnalyticsReturn {
  summary: PortfolioSummary | null;
  atRiskProjects: AtRiskProject[];
  consultantPerformance: ConsultantPerformance[];
  trends: {
    healthScore: TrendDataPoint[];
    progress: TrendDataPoint[];
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePortfolioAnalytics(): UsePortfolioAnalyticsReturn {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [atRiskProjects, setAtRiskProjects] = useState<AtRiskProject[]>([]);
  const [consultantPerformance, setConsultantPerformance] = useState<ConsultantPerformance[]>([]);
  const [trends, setTrends] = useState<{ healthScore: TrendDataPoint[]; progress: TrendDataPoint[] }>({
    healthScore: [],
    progress: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all projects with health scores
      const { data: healthScores, error: healthError } = await supabase
        .from('project_health_scores')
        .select(`
          *,
          company:companies(id, name, slug, created_at)
        `)
        .order('health_score', { ascending: true });

      if (healthError) throw healthError;

      // Fetch all actions
      const { data: allActions, error: actionsError } = await supabase
        .from('checkpoint_actions')
        .select('account_id, status, due_date');

      if (actionsError) throw actionsError;

      // Fetch all consultants and assignments
      const { data: consultants, error: consultantsError } = await supabase
        .from('ep_consultants')
        .select('id, name, active')
        .eq('active', true);

      if (consultantsError) throw consultantsError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('consultant_assignments')
        .select('consultant_id, account_id')
        .eq('active', true);

      if (assignmentsError) throw assignmentsError;

      // Build summary
      const now = new Date();
      const projects = healthScores || [];
      const actions = allActions || [];

      const totalProjects = projects.length;
      const avgHealthScore = totalProjects > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.health_score || 0), 0) / totalProjects)
        : 0;
      const avgProgress = totalProjects > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.progress_score || 0), 0) / totalProjects)
        : 0;

      const projectsByStatus = {
        healthy: projects.filter(p => p.health_status === 'healthy').length,
        at_risk: projects.filter(p => p.health_status === 'at_risk').length,
        critical: projects.filter(p => p.health_status === 'critical').length,
        unknown: projects.filter(p => !p.health_status || p.health_status === 'unknown').length,
      };

      const totalActions = actions.length;
      const pendingActions = actions.filter(a => a.status === 'pending' || a.status === 'in_progress').length;
      const overdueActions = actions.filter(a => {
        if (a.status === 'completed') return false;
        if (!a.due_date) return false;
        return new Date(a.due_date) < now;
      }).length;

      const portfolioSummary: PortfolioSummary = {
        totalProjects,
        avgHealthScore,
        avgProgress,
        projectsByStatus,
        totalActions,
        pendingActions,
        overdueActions,
        activeConsultants: consultants?.length || 0,
      };

      setSummary(portfolioSummary);

      // Build at-risk projects
      const atRisk: AtRiskProject[] = projects
        .filter(p => p.health_status === 'at_risk' || p.health_status === 'critical')
        .map(p => {
          const projectActions = actions.filter(a => a.account_id === p.account_id);
          const projectPendingActions = projectActions.filter(a => a.status !== 'completed').length;
          const projectOverdueActions = projectActions.filter(a => {
            if (a.status === 'completed') return false;
            if (!a.due_date) return false;
            return new Date(a.due_date) < now;
          }).length;

          const projectAssignments = assignments?.filter(a => a.account_id === p.account_id) || [];
          const projectConsultants = projectAssignments
            .map(a => consultants?.find(c => c.id === a.consultant_id)?.name)
            .filter(Boolean) as string[];

          // Identify risk factors
          const riskFactors: string[] = [];
          if (p.days_since_last_activity > 14) riskFactors.push('Inatividade prolongada');
          if (projectOverdueActions > 0) riskFactors.push(`${projectOverdueActions} ações atrasadas`);
          if (p.progress_score < 30) riskFactors.push('Progresso baixo');
          if (p.engagement_score < 40) riskFactors.push('Baixo engajamento');

          return {
            projectId: p.account_id,
            projectName: (p.company as any)?.name || 'Projeto',
            healthScore: p.health_score,
            healthStatus: p.health_status as HealthStatus,
            daysSinceLastActivity: p.days_since_last_activity,
            pendingActions: projectPendingActions,
            overdueActions: projectOverdueActions,
            consultants: projectConsultants,
            riskFactors,
          };
        })
        .sort((a, b) => a.healthScore - b.healthScore);

      setAtRiskProjects(atRisk);

      // Build consultant performance
      const performance: ConsultantPerformance[] = (consultants || []).map(consultant => {
        const consultantAssignments = assignments?.filter(a => a.consultant_id === consultant.id) || [];
        const consultantProjectIds = consultantAssignments.map(a => a.account_id);
        const consultantProjects = projects.filter(p => consultantProjectIds.includes(p.account_id));
        const consultantActions = actions.filter(a => consultantProjectIds.includes(a.account_id));

        const projectCount = consultantProjects.length;
        const avgHealth = projectCount > 0
          ? Math.round(consultantProjects.reduce((sum, p) => sum + (p.health_score || 0), 0) / projectCount)
          : 0;
        const avgProg = projectCount > 0
          ? Math.round(consultantProjects.reduce((sum, p) => sum + (p.progress_score || 0), 0) / projectCount)
          : 0;

        const pending = consultantActions.filter(a => a.status !== 'completed').length;
        const overdue = consultantActions.filter(a => {
          if (a.status === 'completed') return false;
          if (!a.due_date) return false;
          return new Date(a.due_date) < now;
        }).length;
        const completed = consultantActions.filter(a => a.status === 'completed').length;
        const completionRate = consultantActions.length > 0
          ? Math.round((completed / consultantActions.length) * 100)
          : 100;

        return {
          consultantId: consultant.id,
          consultantName: consultant.name,
          projectCount,
          avgHealthScore: avgHealth,
          avgProgress: avgProg,
          pendingActions: pending,
          overdueActions: overdue,
          completionRate,
        };
      }).filter(c => c.projectCount > 0);

      setConsultantPerformance(performance);

      // Build simple trends (would need historical data for real trends)
      // For now, we'll create placeholder data based on current state
      const trendData: TrendDataPoint[] = [];
      const progressTrend: TrendDataPoint[] = [];

      // Generate last 6 months of simulated trend data
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
        // Simulate slight progression over time
        const baseHealth = avgHealthScore - (i * 3);
        const baseProgress = avgProgress - (i * 5);
        
        trendData.push({
          date: date.toISOString(),
          value: Math.max(0, Math.min(100, baseHealth + Math.random() * 10)),
          label: monthLabel,
        });

        progressTrend.push({
          date: date.toISOString(),
          value: Math.max(0, Math.min(100, baseProgress + Math.random() * 10)),
          label: monthLabel,
        });
      }

      setTrends({
        healthScore: trendData,
        progress: progressTrend,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setError(message);
      console.error('Error loading portfolio analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    summary,
    atRiskProjects,
    consultantPerformance,
    trends,
    loading,
    error,
    refresh: loadAnalytics,
  };
}
