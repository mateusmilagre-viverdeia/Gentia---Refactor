import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Journey, JourneyStep, JourneyProgress } from '@/types/gamification.types';

interface JourneyConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockRequirement: { journey: string; minProgress: number } | null;
  steps: StepConfig[];
}

interface StepConfig {
  id: string;
  title: string;
  description: string;
  route: string;
  points: number;
  sessionTable?: string;
  completionStage?: number;
}

const JOURNEY_CONFIG: JourneyConfig[] = [
  {
    id: 'diagnostico',
    title: 'Onboarding',
    description: 'Avalie o estado atual da sua organização',
    icon: 'ClipboardCheck',
    color: 'purple',
    unlockRequirement: null,
    steps: [
      { id: 'assessment_roip', title: 'Assessment ROIP', description: 'Avalie o Retorno sobre Investimento em Pessoas', route: '/app/assessment/roip', points: 200, sessionTable: 'roip_assessments' },
    ]
  },
  {
    id: 'cultura',
    title: 'Cultura Organizacional',
    description: 'Construa os pilares da sua cultura',
    icon: 'Lightbulb',
    color: 'amber',
    unlockRequirement: null,
    steps: [
      { id: 'missao', title: 'Missão', description: 'Crie a missão da sua empresa', route: '/cultura/criacao-de-cultura', points: 150, sessionTable: 'mission_sessions', completionStage: 16 },
      { id: 'visao', title: 'Visão', description: 'Defina a visão de futuro', route: '/cultura/criacao-de-cultura', points: 150, sessionTable: 'vision_sessions', completionStage: 13 },
      { id: 'valores', title: 'Valores', description: 'Defina os valores fundamentais da empresa', route: '/cultura/criacao-de-cultura', points: 150, sessionTable: 'values_sessions', completionStage: 9 },
      { id: 'indicadores', title: 'Indicadores', description: 'Defina indicadores estratégicos', route: '/cultura/criacao-de-cultura', points: 100, sessionTable: 'strategic_indicators', completionStage: 3 },
      { id: 'projetos', title: 'Projetos Estratégicos', description: 'Planeje projetos estratégicos', route: '/cultura/criacao-de-cultura', points: 100, sessionTable: 'strategic_projects' },
      { id: 'energia', title: 'Energia', description: 'Identifique o que energiza sua equipe', route: '/cultura/criacao-de-cultura', points: 100, sessionTable: 'energy_sessions', completionStage: 5 },
      { id: 'desenvolvimento', title: 'Desenvolvimento', description: 'Defina como desenvolver pessoas', route: '/cultura/criacao-de-cultura', points: 100, sessionTable: 'development_sessions', completionStage: 5 },
      { id: 'decisao', title: 'Decisão', description: 'Como tomar decisões na empresa', route: '/cultura/criacao-de-cultura', points: 150, sessionTable: 'decision_sessions', completionStage: 9 },
      { id: 'evento', title: 'Evento de Cultura', description: 'Planeje seu evento de cultura', route: '/cultura/evento-de-cultura', points: 150, sessionTable: 'event_sessions', completionStage: 11 },
      { id: 'rituais', title: 'Rituais', description: 'Crie rituais de fortalecimento', route: '/cultura/rituais-de-cultura', points: 100, sessionTable: 'ritual_sessions', completionStage: 8 },
      { id: 'culture_code', title: 'Culture Code', description: 'Crie o Culture Code da empresa', route: '/cultura/criador-culture-code', points: 150, sessionTable: 'culture_code_sessions' },
    ]
  },
  {
    id: 'atracao',
    title: 'Atração e Contratação',
    description: 'Atraia e contrate os melhores talentos',
    icon: 'Target',
    color: 'green',
    unlockRequirement: null,
    steps: [
      { id: 'vendendo', title: 'Vendendo a Empresa', description: 'Crie conteúdo para atrair talentos', route: '/atracao-contratacao/atracao', points: 150, sessionTable: 'selling_company_sessions' },
      { id: 'funil', title: 'Funil de Contratação', description: 'Configure seu processo seletivo', route: '/atracao-contratacao/funil-contratacao', points: 100, sessionTable: 'hiring_funnels' },
      { id: 'perguntas', title: 'Perguntas de Valores', description: 'Crie perguntas baseadas em valores', route: '/atracao-contratacao/perguntas-valores', points: 150, sessionTable: 'values_questions_sessions', completionStage: 6 },
      { id: 'organograma', title: 'Organograma', description: 'Monte seu organograma', route: '/atracao-contratacao/organograma', points: 100, sessionTable: 'org_charts' },
    ]
  },
  {
    id: 'retencao',
    title: 'Retenção',
    description: 'Retenha e desenvolva seu time',
    icon: 'Users',
    color: 'blue',
    unlockRequirement: null,
    steps: [
      { id: 'analisador', title: 'Analisador de Pessoas', description: 'Analise seu time com base em valores', route: '/retencao/analisador-pessoas', points: 100, sessionTable: 'people_analyses' },
      { id: 'desempenho', title: 'Avaliação de Desempenho', description: 'Avalie performance vs valores', route: '/retencao/avaliacao-desempenho', points: 100, sessionTable: 'performance_assessments' },
      { id: 'habilidade', title: 'Habilidade Única', description: 'Descubra talentos únicos', route: '/retencao/habilidade-unica', points: 150, sessionTable: 'unique_ability_analyses' },
      { id: 'maturidade', title: 'Maturidade do Time', description: 'Avalie maturidade da equipe', route: '/retencao/maturidade-time', points: 150, sessionTable: 'team_maturity_assessments' },
    ]
  }
];

interface SessionData {
  [key: string]: number | boolean | undefined;
}

interface UseJourneyProgressReturn {
  journeys: Journey[];
  overallProgress: number;
  totalSteps: number;
  completedSteps: number;
  totalPoints: number;
  earnedPoints: number;
  isLoading: boolean;
  getJourneyById: (id: string) => Journey | undefined;
  isJourneyUnlocked: (journeyId: string) => boolean;
  nextSuggestedStep: JourneyStep | null;
  updateStepStatus: (journeyId: string, stepId: string, status: string, progress?: number) => Promise<void>;
  skipStep: (journeyId: string, stepId: string) => Promise<void>;
  completeStep: (journeyId: string, stepId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// Fetch function extracted for React Query
async function fetchJourneyData(accountId: string): Promise<{ sessionData: SessionData; progressData: JourneyProgress[] }> {
  // Execute queries in parallel batches to avoid TypeScript depth limits
  const roipAssessmentRes = await supabase.from('roip_assessments').select('id, completed').match({ account_id: accountId, completed: true }).limit(1);
  
  // Order by stage DESC to get the most advanced session (not just the most recent)
  const [missionRes, visionRes, valuesRes, energyRes, developmentRes] = await Promise.all([
    supabase.from('mission_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vision_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('values_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('energy_sessions').select('stage').eq('account_id', accountId).is('deleted_at', null).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('development_sessions').select('stage').eq('account_id', accountId).is('deleted_at', null).order('stage', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const [decisionRes, indicatorsRes, eventRes, ritualRes, cultureCodeRes] = await Promise.all([
    supabase.from('decision_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('strategic_indicators').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('event_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('ritual_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('culture_code_sessions').select('id, slides').eq('account_id', accountId).maybeSingle(),
  ]);

  const [sellingRes, funnelsRes, orgChartsRes, peopleRes, performanceRes] = await Promise.all([
    supabase.from('selling_company_sessions').select('status').eq('account_id', accountId).maybeSingle(),
    supabase.from('hiring_funnels').select('id').eq('account_id', accountId).limit(1),
    supabase.from('org_charts').select('id').eq('account_id', accountId).limit(1),
    supabase.from('people_analyses').select('id').eq('account_id', accountId).limit(1),
    supabase.from('performance_assessments').select('id').eq('account_id', accountId).limit(1),
  ]);

  const [uniqueAbilityRes, maturityRes, strategicProjectsRes, valuesQuestionsRes, progressRes] = await Promise.all([
    supabase.from('unique_ability_analyses').select('id').eq('account_id', accountId).limit(1),
    supabase.from('team_maturity_assessments').select('id').eq('account_id', accountId).limit(1),
    supabase.from('strategic_projects').select('id').eq('account_id', accountId).limit(1),
    supabase.from('values_questions_sessions').select('stage').eq('account_id', accountId).order('stage', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('journey_progress').select('*').eq('account_id', accountId),
  ]);

  const hasCultureCodeSlides = cultureCodeRes.data?.slides && 
    Array.isArray(cultureCodeRes.data.slides) && 
    cultureCodeRes.data.slides.length > 0;

  const sessionData: SessionData = {
    roip_assessments: !!(roipAssessmentRes.data && roipAssessmentRes.data.length > 0),
    mission_sessions: missionRes.data?.stage,
    vision_sessions: visionRes.data?.stage,
    values_sessions: valuesRes.data?.stage,
    energy_sessions: energyRes.data?.stage,
    development_sessions: developmentRes.data?.stage,
    decision_sessions: decisionRes.data?.stage,
    strategic_indicators: indicatorsRes.data?.stage,
    event_sessions: eventRes.data?.stage,
    ritual_sessions: ritualRes.data?.stage,
    culture_code_sessions: hasCultureCodeSlides,
    selling_company_sessions: sellingRes.data?.status === 'approved',
    hiring_funnels: !!(funnelsRes.data && funnelsRes.data.length > 0),
    org_charts: !!(orgChartsRes.data && orgChartsRes.data.length > 0),
    people_analyses: !!(peopleRes.data && peopleRes.data.length > 0),
    performance_assessments: !!(performanceRes.data && performanceRes.data.length > 0),
    unique_ability_analyses: !!(uniqueAbilityRes.data && uniqueAbilityRes.data.length > 0),
    team_maturity_assessments: !!(maturityRes.data && maturityRes.data.length > 0),
    strategic_projects: !!(strategicProjectsRes.data && strategicProjectsRes.data.length > 0),
    values_questions_sessions: valuesQuestionsRes.data?.stage,
  };

  return { sessionData, progressData: (progressRes.data || []) as JourneyProgress[] };
}

export function useJourneyProgress(): UseJourneyProgressReturn {
  // Use OrganizationContext (global, doesn't reset on navigation) instead of useAccount
  const { currentAccount, loading: orgLoading } = useOrganization();
  const accountId = currentAccount?.id;
  const queryClient = useQueryClient();

  // Use React Query with staleTime to prevent refetch on every navigation
  // IMPORTANT: Removed placeholderData to prevent stale data from showing when switching accounts in EP Override mode
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['journey-progress', accountId],
    queryFn: () => fetchJourneyData(accountId!),
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh, no refetch on navigation
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const sessionData = data?.sessionData ?? {};
  const progressData = data?.progressData ?? [];
  
  // Only show loading on initial fetch when org context is still loading or no data yet
  const isLoading = (orgLoading || queryLoading) && !data;

  const getStepStatus = useCallback((step: StepConfig): { status: JourneyStep['status']; progress: number } => {
    // Calculate real progress based on session data
    let realProgress = 0;
    let realStatus: JourneyStep['status'] = 'available';

    // Check manual progress data first
    const manualProgress = progressData.find(p => p.step_id === step.id);
    if (manualProgress) {
      realProgress = manualProgress.progress_percentage || 0;
      realStatus = manualProgress.status as JourneyStep['status'];
    } else if (step.sessionTable) {
      // Check session data
      const value = sessionData[step.sessionTable];
      
      if (typeof value === 'boolean') {
        realProgress = value ? 100 : 0;
        realStatus = value ? 'completed' : 'available';
      } else if (typeof value === 'number' && step.completionStage) {
        if (value >= step.completionStage) {
          realProgress = 100;
          realStatus = 'completed';
        } else if (value > 0) {
          realProgress = Math.round((value / step.completionStage) * 100);
          realStatus = 'in_progress';
        }
      }
    }

    return { status: realStatus, progress: realProgress };
  }, [sessionData, progressData]);

  const journeys = useMemo((): Journey[] => {
    return JOURNEY_CONFIG.map(config => {
      const steps: JourneyStep[] = config.steps.map(stepConfig => {
        const { status, progress } = getStepStatus(stepConfig);
        return {
          id: stepConfig.id,
          title: stepConfig.title,
          description: stepConfig.description,
          icon: config.icon,
          route: stepConfig.route,
          points: stepConfig.points,
          status,
          progress_percentage: progress,
        };
      });

      const completedSteps = steps.filter(s => s.status === 'completed').length;
      const totalSteps = steps.length;
      const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const earnedPoints = steps.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.points, 0);
      const totalPoints = steps.reduce((sum, s) => sum + s.points, 0);

      return {
        id: config.id,
        title: config.title,
        description: config.description,
        icon: config.icon,
        color: config.color,
        steps,
        totalSteps,
        completedSteps,
        totalPoints,
        earnedPoints,
      };
    });
  }, [getStepStatus]);

  const overallStats = useMemo(() => {
    const totalSteps = journeys.reduce((sum, j) => sum + j.totalSteps, 0);
    const completedSteps = journeys.reduce((sum, j) => sum + j.completedSteps, 0);
    const totalPoints = journeys.reduce((sum, j) => sum + j.totalPoints, 0);
    const earnedPoints = journeys.reduce((sum, j) => sum + j.earnedPoints, 0);
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return { totalSteps, completedSteps, totalPoints, earnedPoints, overallProgress };
  }, [journeys]);

  const nextSuggestedStep = useMemo((): JourneyStep | null => {
    for (const journey of journeys) {
      // First look for in_progress steps
      const inProgress = journey.steps.find(s => s.status === 'in_progress');
      if (inProgress) return inProgress;

      // Then look for available steps
      const available = journey.steps.find(s => s.status === 'available');
      if (available) return available;
    }
    return null;
  }, [journeys]);

  const getJourneyById = (id: string) => journeys.find(j => j.id === id);

  const isJourneyUnlocked = (_journeyId: string) => true;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['journey-progress', accountId] });
  }, [queryClient, accountId]);

  const updateStepStatus = async (journeyId: string, stepId: string, status: string, progress: number = 0) => {
    if (!accountId) return;

    await supabase
      .from('journey_progress')
      .upsert({
        account_id: accountId,
        journey_id: journeyId,
        step_id: stepId,
        status,
        progress_percentage: progress,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      }, { onConflict: 'account_id,journey_id,step_id' });

    await refetch();
  };

  const skipStep = async (journeyId: string, stepId: string) => {
    if (!accountId) return;

    await supabase
      .from('journey_progress')
      .upsert({
        account_id: accountId,
        journey_id: journeyId,
        step_id: stepId,
        status: 'skipped',
        skipped_at: new Date().toISOString(),
      }, { onConflict: 'account_id,journey_id,step_id' });

    await refetch();
  };

  const completeStep = async (journeyId: string, stepId: string) => {
    await updateStepStatus(journeyId, stepId, 'completed', 100);
  };

  return {
    journeys,
    ...overallStats,
    isLoading,
    getJourneyById,
    isJourneyUnlocked,
    nextSuggestedStep,
    updateStepStatus,
    skipStep,
    completeStep,
    refetch,
  };
}
