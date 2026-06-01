import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from '../_shared/auth-helpers.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('check-achievements');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProgressData {
  completedSteps?: string[];
  stepProgress?: Record<string, number>; // progresso por etapa (0-100)
  overallProgress?: number;
  streakDays?: number;
  accessTime?: string;
  completedJourneys?: string[];
  unlockedJourneys?: string[]; // jornadas desbloqueadas
  actionPlanStats?: {
    total: number;
    completed: number;
    hasPlans: boolean;
  };
  planUpdateCount?: number;
  stepCompletionDays?: Record<string, number>; // dias para completar cada etapa
  fastCompletedSteps?: number; // etapas completadas rapidamente
}

interface BadgeRequirement {
  type: string;
  value?: unknown;
  step?: string;
  journey?: string;
  min?: number;
  max_days?: number;
  days?: number;
  before?: string;
  after?: string;
  count?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  points: number;
  category: string;
  requirement: BadgeRequirement | null;
}

// Step to journey mapping
const STEP_TO_JOURNEY: Record<string, string> = {
  // Diagnostico journey
  assessment_roip: 'diagnostico',
  // Cultura journey
  energia: 'cultura',
  desenvolvimento: 'cultura',
  valores: 'cultura',
  missao: 'cultura',
  visao: 'cultura',
  decisao: 'cultura',
  indicadores: 'cultura',
  projetos: 'cultura',
  evento: 'cultura',
  rituais: 'cultura',
  culture_code: 'cultura',
  // Atracao journey
  vendendo: 'atracao',
  funil: 'atracao',
  perguntas: 'atracao',
  organograma: 'atracao',
  // Retencao journey
  analisador: 'retencao',
  desempenho: 'retencao',
  habilidade: 'retencao',
  maturidade: 'retencao',
};

// Step completion stages (max stage for each step)
const STEP_MAX_STAGES: Record<string, number> = {
  valores: 9,
  energia: 5,
  desenvolvimento: 5,
  missao: 16,
  visao: 13,
  decisao: 9,
  indicadores: 3,
  evento: 11,
  rituais: 7,
  perguntas: 6,
};

function checkRequirement(
  requirement: BadgeRequirement | null,
  progressData: ProgressData,
  allCompletedSteps: string[],
  allCompletedJourneys: string[],
  stepProgressMap: Record<string, number>
): boolean {
  if (!requirement) return false;

  const { type } = requirement;
  const req = requirement as BadgeRequirement;

  log.log(`Checking requirement type: ${type}`, req);

  switch (type) {
    case 'first_step':
      return allCompletedSteps.length > 0;

    case 'step_complete': {
      const stepValue = (req.step || req.value) as string;
      return allCompletedSteps.includes(stepValue);
    }

    case 'step_started': {
      const stepValue = (req.step || req.value) as string;
      // Step is started if it has any progress or is completed
      const hasProgress = (stepProgressMap[stepValue] || 0) > 0;
      const isCompleted = allCompletedSteps.includes(stepValue);
      log.log(`step_started: ${stepValue} - hasProgress: ${hasProgress}, isCompleted: ${isCompleted}`);
      return hasProgress || isCompleted;
    }

    case 'complete_any_steps': {
      const countValue = (req.count || req.value) as number;
      return allCompletedSteps.length >= countValue;
    }

    case 'journey_complete': {
      const journeyValue = (req.journey || req.value) as string;
      return allCompletedJourneys.includes(journeyValue);
    }

    case 'overall_progress': {
      const minProgress = (req.min || req.value) as number;
      return (progressData.overallProgress || 0) >= minProgress;
    }

    case 'streak': {
      const daysValue = (req.days || req.value) as number;
      return (progressData.streakDays || 0) >= daysValue;
    }

    case 'time_access': {
      const currentHour = new Date().getHours();
      
      if (req.before) {
        const beforeHour = parseInt(req.before.split(':')[0]);
        if (currentHour < beforeHour) return true;
      }
      if (req.after) {
        const afterHour = parseInt(req.after.split(':')[0]);
        if (currentHour >= afterHour) return true;
      }
      return false;
    }

    // NEW: Step progress (25%, 50%, 75%)
    case 'step_progress': {
      const stepId = req.step as string;
      const minProgress = req.min as number;
      const progress = stepProgressMap[stepId] || 0;
      log.log(`step_progress: ${stepId} - progress: ${progress}, min: ${minProgress}`);
      return progress >= minProgress;
    }

    // NEW: Action plan created
    case 'action_plan_created': {
      return progressData.actionPlanStats?.hasPlans === true;
    }

    // NEW: Action plan progress (% of actions completed)
    case 'action_plan_progress': {
      const minPercent = req.min as number;
      const stats = progressData.actionPlanStats;
      if (!stats || stats.total === 0) return false;
      const percent = Math.round((stats.completed / stats.total) * 100);
      return percent >= minPercent;
    }

    // NEW: Plan updated (how many times updated)
    case 'plan_updated': {
      const minUpdates = req.min as number;
      return (progressData.planUpdateCount || 0) >= minUpdates;
    }

    // NEW: Speed complete (completed a step in X days or less)
    case 'speed_complete': {
      const maxDays = req.max_days as number;
      const completionDays = progressData.stepCompletionDays || {};
      return Object.values(completionDays).some(days => days <= maxDays);
    }

    // NEW: Speed count (completed N steps quickly)
    case 'speed_count': {
      const minCount = req.min as number;
      const maxDays = req.max_days as number;
      const completionDays = progressData.stepCompletionDays || {};
      const fastSteps = Object.values(completionDays).filter(days => days <= maxDays).length;
      return fastSteps >= minCount;
    }

    // NEW: Journey unlocked
    case 'journey_unlocked': {
      const journeyId = req.journey as string;
      return progressData.unlockedJourneys?.includes(journeyId) || false;
    }

    // NEW: Quality fields
    case 'quality_fields': {
      // This would need to be calculated from front-end
      return false; // Placeholder - needs implementation
    }

    // NEW: Quality complete
    case 'quality_complete': {
      return false; // Placeholder - needs implementation
    }

    default:
      log.log(`Unknown requirement type: ${type}`);
      return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    const { accountId, progressData } = await req.json() as { 
      accountId: string; 
      progressData: ProgressData;
    };

    log.log('Checking achievements for account:', accountId);
    log.log('Progress data:', JSON.stringify(progressData, null, 2));

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this account
    const hasAccess = await verifyAccountAccess(supabase, user.id, accountId);
    if (!hasAccess) {
      log.log(`[check-achievements] User ${user.id} denied access to account ${accountId}`);
      return forbiddenResponse(corsHeaders);
    }

    // Fetch all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      log.error('Error fetching badges:', badgesError);
      throw badgesError;
    }

    // Fetch already earned badges
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('account_id', accountId);

    if (earnedError) {
      log.error('Error fetching earned badges:', earnedError);
      throw earnedError;
    }

    const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);

    // Derive completed steps and progress from the real session tables
    const [
      valuesRes,
      energyRes,
      developmentRes,
      missionRes,
      visionRes,
      decisionRes,
      indicatorsRes,
      eventRes,
      ritualRes,
      projectsRes,
      cultureCodeRes,
      sellingRes,
      funnelsRes,
      valuesQuestionsRes,
      orgChartsRes,
      peopleAnalysesRes,
      performanceRes,
      uniqueAbilityRes,
      maturityRes,
      actionPlansRes,
      planUpdatesRes,
      stepTrackingRes,
      roipAssessmentRes,
    ] = await Promise.all([
      supabase.from('values_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('energy_sessions').select('stage').eq('account_id', accountId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('development_sessions').select('stage').eq('account_id', accountId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('mission_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('vision_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('decision_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('strategic_indicators').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('event_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('ritual_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('strategic_projects').select('id').eq('account_id', accountId).limit(1),
      supabase.from('culture_code_sessions').select('id, slides').eq('account_id', accountId).maybeSingle(),
      supabase.from('selling_company_sessions').select('status').eq('account_id', accountId).maybeSingle(),
      supabase.from('hiring_funnels').select('id').eq('account_id', accountId).limit(1),
      supabase.from('values_questions_sessions').select('stage').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('org_charts').select('id').eq('account_id', accountId).limit(1),
      supabase.from('people_analyses').select('id').eq('account_id', accountId).limit(1),
      supabase.from('performance_assessments').select('id').eq('account_id', accountId).limit(1),
      supabase.from('unique_ability_analyses').select('id').eq('account_id', accountId).limit(1),
      supabase.from('team_maturity_assessments').select('id').eq('account_id', accountId).limit(1),
      supabase.from('action_plans').select('id, status').eq('account_id', accountId),
      supabase.from('plan_update_history').select('id').eq('account_id', accountId),
      supabase.from('step_start_tracking').select('step_id, started_at, completed_at').eq('account_id', accountId),
      supabase.from('roip_assessments').select('id, status').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const completedStepsSet = new Set<string>();
    const stepProgressMap: Record<string, number> = {};

    const getStageProgress = (stage: unknown, maxStage: number): number => {
      if (typeof stage !== 'number') return 0;
      return Math.min(100, Math.round((stage / maxStage) * 100));
    };

    const stageComplete = (stage: unknown, completionStage: number) =>
      typeof stage === 'number' && stage >= completionStage;

    // Calculate step progress and completion
    // Valores
    stepProgressMap['valores'] = getStageProgress(valuesRes.data?.stage, STEP_MAX_STAGES.valores);
    if (stageComplete(valuesRes.data?.stage, 9)) completedStepsSet.add('valores');
    
    // Energia
    stepProgressMap['energia'] = getStageProgress(energyRes.data?.stage, STEP_MAX_STAGES.energia);
    if (stageComplete(energyRes.data?.stage, 5)) completedStepsSet.add('energia');
    
    // Desenvolvimento
    stepProgressMap['desenvolvimento'] = getStageProgress(developmentRes.data?.stage, STEP_MAX_STAGES.desenvolvimento);
    if (stageComplete(developmentRes.data?.stage, 5)) completedStepsSet.add('desenvolvimento');
    
    // Missão
    stepProgressMap['missao'] = getStageProgress(missionRes.data?.stage, STEP_MAX_STAGES.missao);
    if (stageComplete(missionRes.data?.stage, 16)) completedStepsSet.add('missao');
    
    // Visão
    stepProgressMap['visao'] = getStageProgress(visionRes.data?.stage, STEP_MAX_STAGES.visao);
    if (stageComplete(visionRes.data?.stage, 13)) completedStepsSet.add('visao');
    
    // Decisão
    stepProgressMap['decisao'] = getStageProgress(decisionRes.data?.stage, STEP_MAX_STAGES.decisao);
    if (stageComplete(decisionRes.data?.stage, 9)) completedStepsSet.add('decisao');
    
    // Indicadores
    stepProgressMap['indicadores'] = getStageProgress(indicatorsRes.data?.stage, STEP_MAX_STAGES.indicadores);
    if (stageComplete(indicatorsRes.data?.stage, 3)) completedStepsSet.add('indicadores');
    
    // Evento
    stepProgressMap['evento'] = getStageProgress(eventRes.data?.stage, STEP_MAX_STAGES.evento);
    if (stageComplete(eventRes.data?.stage, 11)) completedStepsSet.add('evento');
    
    // Rituais
    stepProgressMap['rituais'] = getStageProgress(ritualRes.data?.stage, STEP_MAX_STAGES.rituais);
    if (stageComplete(ritualRes.data?.stage, 7)) completedStepsSet.add('rituais');
    
    // Perguntas valores
    stepProgressMap['perguntas'] = getStageProgress(valuesQuestionsRes.data?.stage, STEP_MAX_STAGES.perguntas);
    if (stageComplete(valuesQuestionsRes.data?.stage, 6)) completedStepsSet.add('perguntas');

    // Steps that are binary (exist or not)
    if (projectsRes.data && projectsRes.data.length > 0) {
      completedStepsSet.add('projetos');
      stepProgressMap['projetos'] = 100;
    }
    
    if (cultureCodeRes.data?.slides && Array.isArray(cultureCodeRes.data.slides) && cultureCodeRes.data.slides.length > 0) {
      completedStepsSet.add('culture_code');
      stepProgressMap['culture_code'] = 100;
    }

    // Atração steps
    if (sellingRes.data?.status === 'completed') {
      completedStepsSet.add('vendendo');
      stepProgressMap['vendendo'] = 100;
    }
    if (funnelsRes.data && funnelsRes.data.length > 0) {
      completedStepsSet.add('funil');
      stepProgressMap['funil'] = 100;
    }
    if (orgChartsRes.data && orgChartsRes.data.length > 0) {
      completedStepsSet.add('organograma');
      stepProgressMap['organograma'] = 100;
    }

    // Retenção steps
    if (peopleAnalysesRes.data && peopleAnalysesRes.data.length > 0) {
      completedStepsSet.add('analisador');
      stepProgressMap['analisador'] = 100;
    }
    if (performanceRes.data && performanceRes.data.length > 0) {
      completedStepsSet.add('desempenho');
      stepProgressMap['desempenho'] = 100;
    }
    if (uniqueAbilityRes.data && uniqueAbilityRes.data.length > 0) {
      completedStepsSet.add('habilidade');
      stepProgressMap['habilidade'] = 100;
    }
    if (maturityRes.data && maturityRes.data.length > 0) {
      completedStepsSet.add('maturidade');
      stepProgressMap['maturidade'] = 100;
    }

    // Diagnóstico - ROIP Assessment
    if (roipAssessmentRes.data) {
      // If assessment exists, it was started
      stepProgressMap['assessment_roip'] = roipAssessmentRes.data.status === 'completed' ? 100 : 50;
      if (roipAssessmentRes.data.status === 'completed') {
        completedStepsSet.add('assessment_roip');
        log.log('ROIP Assessment completed, adding to completedSteps');
      } else {
        log.log('ROIP Assessment exists but not completed, status:', roipAssessmentRes.data.status);
      }
    }

    // Merge with progressData from frontend
    if (progressData.completedSteps) {
      progressData.completedSteps.forEach(step => completedStepsSet.add(step));
    }
    if (progressData.stepProgress) {
      Object.entries(progressData.stepProgress).forEach(([step, progress]) => {
        stepProgressMap[step] = Math.max(stepProgressMap[step] || 0, progress);
      });
    }

    const allCompletedSteps = Array.from(completedStepsSet);

    // Determine completed journeys
    const completedJourneys = new Set<string>();
    if (progressData.completedJourneys) {
      progressData.completedJourneys.forEach(j => completedJourneys.add(j));
    }

    // Journey steps configuration
    const journeySteps: Record<string, string[]> = {
      cultura: ['energia', 'desenvolvimento', 'valores', 'missao', 'visao', 'decisao', 'indicadores', 'projetos', 'evento', 'rituais', 'culture_code'],
      atracao: ['vendendo', 'funil', 'perguntas', 'organograma'],
      retencao: ['analisador', 'desempenho', 'habilidade', 'maturidade'],
    };

    Object.entries(journeySteps).forEach(([journey, steps]) => {
      const allStepsCompleted = steps.every(step => allCompletedSteps.includes(step));
      if (allStepsCompleted) {
        completedJourneys.add(journey);
      }
    });

    const allCompletedJourneys = Array.from(completedJourneys);

    // Calculate overall progress
    const totalSteps = Object.values(journeySteps).flat().length;
    const overallProgress = totalSteps > 0 ? Math.round((allCompletedSteps.length / totalSteps) * 100) : 0;

    // Calculate action plan stats
    const actionPlans = actionPlansRes.data || [];
    const actionPlanStats = {
      total: actionPlans.length,
      completed: actionPlans.filter((a: { status: string }) => a.status === 'concluida').length,
      hasPlans: actionPlans.length > 0,
    };

    // Calculate plan update count
    const planUpdateCount = planUpdatesRes.data?.length || 0;

    // Calculate step completion days
    const stepCompletionDays: Record<string, number> = {};
    if (stepTrackingRes.data) {
      stepTrackingRes.data.forEach((track: { step_id: string; started_at: string; completed_at: string | null }) => {
        if (track.completed_at) {
          const started = new Date(track.started_at);
          const completed = new Date(track.completed_at);
          const days = Math.ceil((completed.getTime() - started.getTime()) / (1000 * 60 * 60 * 24));
          stepCompletionDays[track.step_id] = days;
        }
      });
    }

    // Determine unlocked journeys based on cultura completion
    const unlockedJourneys: string[] = [];
    // Atracao is unlocked if at least 3 cultura steps are done
    if (allCompletedSteps.filter(s => journeySteps.cultura.includes(s)).length >= 3) {
      unlockedJourneys.push('atracao');
    }
    // Retencao is unlocked if at least 5 cultura steps are done
    if (allCompletedSteps.filter(s => journeySteps.cultura.includes(s)).length >= 5) {
      unlockedJourneys.push('retencao');
    }

    // Merge unlocked journeys from progressData
    if (progressData.unlockedJourneys) {
      progressData.unlockedJourneys.forEach(j => {
        if (!unlockedJourneys.includes(j)) unlockedJourneys.push(j);
      });
    }

    // Build enriched progress data
    const enrichedProgressData: ProgressData = {
      ...progressData,
      overallProgress,
      stepProgress: stepProgressMap,
      actionPlanStats: progressData.actionPlanStats || actionPlanStats,
      planUpdateCount: progressData.planUpdateCount ?? planUpdateCount,
      stepCompletionDays: progressData.stepCompletionDays || stepCompletionDays,
      unlockedJourneys,
    };

    log.log('Derived completed steps:', allCompletedSteps);
    log.log('Step progress map:', stepProgressMap);
    log.log('Derived completed journeys:', allCompletedJourneys);
    log.log('Overall progress:', overallProgress);
    log.log('Action plan stats:', actionPlanStats);

    // Check each badge that hasn't been earned yet
    const newBadges: Badge[] = [];

    for (const badge of (allBadges || [])) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) {
        continue;
      }

      const requirement = badge.requirement as BadgeRequirement | null;
      const isEarned = checkRequirement(
        requirement,
        enrichedProgressData,
        allCompletedSteps,
        allCompletedJourneys,
        stepProgressMap
      );

      if (isEarned) {
        log.log(`Badge earned: ${badge.name}`);

        // Insert the badge
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert({
            account_id: accountId,
            user_id: accountId, // Using account_id as user_id for compatibility
            badge_id: badge.id,
          });

        if (insertError) {
          log.error(`Error inserting badge ${badge.name}:`, insertError);
          continue;
        }

        // Update gamification stats
        const { data: stats } = await supabase
          .from('company_gamification_stats')
          .select('*')
          .eq('account_id', accountId)
          .single();

        if (stats) {
          await supabase
            .from('company_gamification_stats')
            .update({
              total_points: (stats.total_points || 0) + badge.points,
              badges_earned: (stats.badges_earned || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('account_id', accountId);
        } else {
          await supabase
            .from('company_gamification_stats')
            .insert({
              account_id: accountId,
              total_points: badge.points,
              badges_earned: 1,
            });
        }

        newBadges.push(badge as Badge);
      }
    }

    log.log(`New badges earned: ${newBadges.length}`);

    return new Response(
      JSON.stringify({ 
        newBadges,
        totalChecked: allBadges?.length || 0,
        alreadyEarned: earnedBadgeIds.size,
        completedSteps: allCompletedSteps,
        completedJourneys: allCompletedJourneys,
        overallProgress,
        stepProgress: stepProgressMap,
        actionPlanStats,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    log.error('Error in check-achievements:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});