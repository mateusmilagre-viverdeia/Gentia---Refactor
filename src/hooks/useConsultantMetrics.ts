import { useMemo } from 'react';
import { differenceInDays } from "date-fns";
import type { ClientProjectWithProgress, EPConsultant } from '@/types/consultant.types';

export interface PillarCompletion {
  pillar: string;
  label: string;
  percentage: number;
  completed: number;
  total: number;
}

export interface ConsultantMetrics {
  consultant: EPConsultant;
  projectCount: number;
  avgCompletion: number;
  avgDays: number;
  pendingActions: number;
  projects: ClientProjectWithProgress[];
}

export interface GlobalMetrics {
  avgCompletion: number;
  avgProjectDays: number;
  completedProjects: number;
  atRiskProjects: number;
  totalProjects: number;
}

// Max stages for each pillar
const PILLAR_MAX_STAGES: Record<string, number> = {
  mission: 16,
  vision: 13,
  values: 9,
  indicators: 3,
  decision: 9,
  energy: 5,
  development: 5,
  event: 11,
  ritual: 7,
};

const PILLAR_LABELS: Record<string, string> = {
  mission: 'Missão',
  vision: 'Visão',
  values: 'Valores',
  indicators: 'Indicadores',
  decision: 'Decisão',
  energy: 'Energia',
  development: 'Desenvolvimento',
  event: 'Evento',
  ritual: 'Rituais',
};

export function calculatePillarCompletion(stage: number | null, pillar: string): number {
  if (!stage || stage === 0) return 0;
  const max = PILLAR_MAX_STAGES[pillar] || 9;
  return Math.min(100, Math.round((stage / max) * 100));
}

export function calculateProjectCompletion(project: ClientProjectWithProgress): number {
  const pillars = [
    { stage: project.mission_stage, key: 'mission' },
    { stage: project.vision_stage, key: 'vision' },
    { stage: project.values_stage, key: 'values' },
    { stage: project.indicators_stage, key: 'indicators' },
    { stage: project.decision_stage, key: 'decision' },
    { stage: project.energy_stage, key: 'energy' },
    { stage: project.development_stage, key: 'development' },
  ];

  const totalCompletion = pillars.reduce((sum, p) => {
    return sum + calculatePillarCompletion(p.stage, p.key);
  }, 0);

  return Math.round(totalCompletion / pillars.length);
}

export function calculateProjectAge(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

export function useConsultantMetrics(
  projects: ClientProjectWithProgress[],
  consultants: EPConsultant[],
  getProjectConsultants: (accountId: string) => EPConsultant[]
) {
  // Global metrics
  const globalMetrics = useMemo<GlobalMetrics>(() => {
    if (projects.length === 0) {
      return {
        avgCompletion: 0,
        avgProjectDays: 0,
        completedProjects: 0,
        atRiskProjects: 0,
        totalProjects: 0,
      };
    }

    const completions = projects.map(calculateProjectCompletion);
    const avgCompletion = Math.round(completions.reduce((a, b) => a + b, 0) / completions.length);

    const ages = projects.map(p => calculateProjectAge(p.created_at));
    const avgProjectDays = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);

    const completedProjects = completions.filter(c => c >= 100).length;

    // At risk: <25% completion and >30 days old
    const atRiskProjects = projects.filter((p, i) => {
      return completions[i] < 25 && ages[i] > 30;
    }).length;

    return {
      avgCompletion,
      avgProjectDays,
      completedProjects,
      atRiskProjects,
      totalProjects: projects.length,
    };
  }, [projects]);

  // Pillar completion aggregated
  const pillarCompletions = useMemo<PillarCompletion[]>(() => {
    const pillars = ['mission', 'vision', 'values', 'indicators', 'decision', 'energy', 'development'];

    return pillars.map(pillar => {
      const stageKey = `${pillar}_stage` as keyof ClientProjectWithProgress;
      const completions = projects.map(p => calculatePillarCompletion(p[stageKey] as number | null, pillar));
      const avgPercentage = projects.length > 0
        ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
        : 0;

      const maxStage = PILLAR_MAX_STAGES[pillar];
      const completedCount = projects.filter(p => {
        const stage = p[stageKey] as number | null;
        return stage && stage >= maxStage;
      }).length;

      return {
        pillar,
        label: PILLAR_LABELS[pillar],
        percentage: avgPercentage,
        completed: completedCount,
        total: projects.length,
      };
    });
  }, [projects]);

  // Metrics per consultant
  const consultantMetrics = useMemo<ConsultantMetrics[]>(() => {
    return consultants.filter(c => c.active).map(consultant => {
      // Find projects assigned to this consultant
      const consultantProjects = projects.filter(p => {
        const projectConsultants = getProjectConsultants(p.id);
        return projectConsultants.some(c => c.id === consultant.id);
      });

      const projectCount = consultantProjects.length;

      const avgCompletion = projectCount > 0
        ? Math.round(consultantProjects.map(calculateProjectCompletion).reduce((a, b) => a + b, 0) / projectCount)
        : 0;

      const avgDays = projectCount > 0
        ? Math.round(consultantProjects.map(p => calculateProjectAge(p.created_at)).reduce((a, b) => a + b, 0) / projectCount)
        : 0;

      const pendingActions = consultantProjects.reduce((sum, p) => sum + (p.pending_actions_count || 0), 0);

      return {
        consultant,
        projectCount,
        avgCompletion,
        avgDays,
        pendingActions,
        projects: consultantProjects,
      };
    });
  }, [consultants, projects, getProjectConsultants]);

  // Projects without consultant
  const unassignedProjects = useMemo(() => {
    return projects.filter(p => {
      const projectConsultants = getProjectConsultants(p.id);
      return projectConsultants.length === 0;
    });
  }, [projects, getProjectConsultants]);

  return {
    globalMetrics,
    pillarCompletions,
    consultantMetrics,
    unassignedProjects,
    calculateProjectCompletion,
  };
}
