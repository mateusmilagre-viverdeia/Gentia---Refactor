import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import { toast } from 'sonner';
import type { ImplementationPlan, PlanMode, SolutionItem, AIPlan, PlanStep } from '@/types/implementation-plan.types';
import { SOLUTIONS_CATALOG } from '@/types/implementation-plan.types';

function parseDurationMonths(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function calculateStepDates(steps: PlanStep[], activatedAt: string): PlanStep[] {
  let currentDate = new Date(activatedAt);
  return steps.map((step) => {
    const startDate = new Date(currentDate);
    const months = parseDurationMonths(step.durationMed);
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + months);
    currentDate = new Date(dueDate);
    return {
      ...step,
      startDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
    };
  });
}

export function useImplementationPlan() {
  const { currentAccount } = useOrganization();
  const { user } = useAuth();
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);

  const accountId = currentAccount?.id;

  useEffect(() => {
    if (!accountId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('implementation_plans')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const raw = data[0] as any;
        setPlan({
          ...raw,
          selected_solutions: raw.selected_solutions || [],
          steps: raw.steps || [],
          ai_plan: raw.ai_plan || null,
        });
      }
      setLoading(false);
    };
    load();
  }, [accountId]);

  const savePlan = useCallback(async (updates: Partial<ImplementationPlan>) => {
    if (!accountId || !user) return null;

    if (plan?.id) {
      const { data, error } = await supabase
        .from('implementation_plans')
        .update(updates as any)
        .eq('id', plan.id)
        .select()
        .single();

      if (error) {
        toast.error('Erro ao salvar plano');
        return null;
      }
      const updated = data as any;
      setPlan(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } else {
      const { data, error } = await supabase
        .from('implementation_plans')
        .insert({
          account_id: accountId,
          created_by: user.id,
          ...updates,
        } as any)
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar plano');
        return null;
      }
      const created = data as any;
      setPlan(created);
      return created;
    }
  }, [accountId, user, plan?.id]);

  const generatePlan = useCallback(async (solutionModes: Record<string, PlanMode>, additionalInfo?: string, projectDuration?: number) => {
    if (!accountId) return;
    setGenerating(true);

    const selectedIds = Object.keys(solutionModes);
    const allSolutions = SOLUTIONS_CATALOG.flatMap((g) => g.solutions);
    const selectedSolutions = allSolutions
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => ({ ...s, mode: solutionModes[s.id] || 'creation' }));

    let assessmentData: Record<string, unknown> | null = null;
    let calculatorData: Record<string, unknown> | null = null;

    const { data: assessments } = await supabase
      .from('roip_assessments')
      .select('id, overall_score, completed, roip_results(ai_analysis, pillar_scores, overall_score)')
      .eq('account_id', accountId)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (assessments && assessments.length > 0) {
      const assessment = assessments[0] as any;
      const results = Array.isArray(assessment.roip_results) 
        ? assessment.roip_results[0] 
        : assessment.roip_results;
      if (results) {
        assessmentData = {
          ai_analysis: results.ai_analysis,
          scores: results.pillar_scores,
          overall_score: results.overall_score,
        };
      }
    }

    const { data: simulations } = await supabase
      .from('roip_simulations')
      .select('resultados_calculadora, dados_simulacao')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (simulations && simulations.length > 0) {
      const simulation = simulations[0] as any;
      calculatorData = {
        results: simulation.resultados_calculadora,
        input_data: simulation.dados_simulacao,
      };
    }

    const { data: aiResult, error } = await invokeAuthenticatedFunction<AIPlan>(
      'generate-implementation-plan',
      {
        selectedSolutions,
        assessmentData,
        calculatorData,
        accountId,
        additionalInfo: additionalInfo || '',
        projectDuration: projectDuration || 6,
      }
    );

    if (error || !aiResult) {
      toast.error('Erro ao gerar plano de implementação');
      setGenerating(false);
      return;
    }

    // Inject fixed Onboarding step as step_1
    const onboardingStep: PlanStep = {
      id: 'step_1',
      solutionId: 'onboarding_inicial',
      name: 'Onboarding Inicial',
      pillar: 'onboarding',
      order: 1,
      durationMin: '1 encontro',
      durationMed: '1 encontro',
      durationMax: '1 encontro',
      metrics: [
        'Assessment ROIP completo',
        'Calculadora ROIP configurada',
        'Prioridades e KPIs definidos',
        'Expectativas alinhadas',
      ],
      dependencies: [],
      status: 'pending',
      checkpoints: ['Validação de todos os dados preenchidos no onboarding'],
    };

    // Renumber AI steps to ensure they start from order 2
    const aiSteps = (aiResult.steps || []).map((step, idx) => ({
      ...step,
      id: `step_${idx + 2}`,
      order: idx + 2,
    }));

    const allSteps = [onboardingStep, ...aiSteps];

    const activatedAt = new Date().toISOString();
    const stepsWithDates = calculateStepDates(allSteps, activatedAt);

    await savePlan({
      mode: 'creation',
      selected_solutions: selectedSolutions,
      assessment_data: assessmentData,
      calculator_data: calculatorData,
      ai_plan: aiResult,
      steps: stepsWithDates,
      status: 'active',
      additional_info: additionalInfo || '',
      activated_at: activatedAt,
      project_duration: projectDuration || 6,
    });

    setGenerating(false);
    toast.success('Plano de implementação gerado com sucesso!');
  }, [accountId, savePlan]);

  const refinePlan = useCallback(async (message: string) => {
    if (!accountId || !plan?.ai_plan) return;
    setRefining(true);

    const { data: aiResult, error } = await invokeAuthenticatedFunction<AIPlan>(
      'generate-implementation-plan',
      {
        action: 'refine',
        currentPlan: plan.ai_plan,
        userMessage: message,
        accountId,
      }
    );

    if (error || !aiResult) {
      setRefining(false);
      throw new Error('Erro ao refinar plano');
    }

    const activatedAt = plan.activated_at || new Date().toISOString();
    const stepsWithDates = calculateStepDates(aiResult.steps || [], activatedAt);

    await savePlan({
      ai_plan: aiResult,
      steps: stepsWithDates,
    });

    setRefining(false);
    toast.success('Plano atualizado com sucesso!');
  }, [accountId, plan, savePlan]);

  const syncProgress = useCallback(async () => {
    if (!plan || !accountId || !plan.steps.length) return;

    let updated = false;
    const newSteps: PlanStep[] = JSON.parse(JSON.stringify(plan.steps));

    const { data: jobs } = await supabase
      .from('recruitment_jobs')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .limit(1);

    const recruitmentActive = jobs && jobs.length > 0;

    const { data: assessments } = await supabase
      .from('roip_assessments')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    const hasAssessment = assessments && assessments.length > 0;
    const now = new Date();

    for (const step of newSteps) {
      if (step.pillar === 'atracao' && recruitmentActive && step.status === 'pending') {
        step.status = 'in_progress';
        updated = true;
      }
      if (step.pillar === 'cultura' && hasAssessment && step.status === 'pending') {
        step.status = 'in_progress';
        updated = true;
      }
      // Check overdue
      if (step.dueDate && step.status !== 'completed') {
        const dueDate = new Date(step.dueDate);
        if (now > dueDate && step.status !== 'overdue') {
          step.status = 'overdue';
          updated = true;
        }
      }
    }

    if (updated) {
      await savePlan({ steps: newSteps });
    }
  }, [plan, accountId, savePlan]);

  useEffect(() => {
    if (plan?.status === 'active') {
      syncProgress();
    }
  }, [plan?.status]);

  const updatePlanLocally = useCallback((updates: Partial<ImplementationPlan>) => {
    setPlan(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return { plan, loading, generating, generatePlan, savePlan, syncProgress, refinePlan, refining, updatePlanLocally };
}
