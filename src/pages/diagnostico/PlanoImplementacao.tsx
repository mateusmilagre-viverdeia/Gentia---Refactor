import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, ClipboardList, Info, Calendar } from 'lucide-react';
import { SolutionCards } from '@/components/diagnostico/plano/SolutionCards';
import { PlanGenerating } from '@/components/diagnostico/plano/PlanGenerating';
import { PlanTimeline } from '@/components/diagnostico/plano/PlanTimeline';
import { PlanChat } from '@/components/diagnostico/plano/PlanChat';
import { useImplementationPlan } from '@/hooks/useImplementationPlan';
import type { PlanMode } from '@/types/implementation-plan.types';

const PlanoImplementacao = () => {
  const { plan, loading, generating, generatePlan, refinePlan, refining, updatePlanLocally } = useImplementationPlan();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [solutionModes, setSolutionModes] = useState<Record<string, PlanMode>>({});
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [projectDuration, setProjectDuration] = useState<number>(6);

  // Restore state when plan loads from DB
  useEffect(() => {
    if (!loading && plan?.ai_plan) {
      setStep(3);
      // Restore solution modes
      if (plan.selected_solutions) {
        const modes: Record<string, PlanMode> = {};
        for (const s of plan.selected_solutions as any[]) {
          modes[s.id] = s.mode || 'creation';
        }
        if (Object.keys(modes).length > 0) setSolutionModes(modes);
      }
      if (plan.additional_info) setAdditionalInfo(plan.additional_info);
      if (plan.project_duration) setProjectDuration(plan.project_duration);
    }
  }, [loading, plan?.ai_plan]);

  const showTimeline = plan?.ai_plan && plan.steps.length > 0 && !generating;
  const selectedCount = Object.keys(solutionModes).length;

  const handleToggle = (id: string) => {
    setSolutionModes((prev) => {
      if (id in prev) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: 'creation' };
    });
  };

  const handleModeChange = (id: string, mode: PlanMode) => {
    setSolutionModes((prev) => ({ ...prev, [id]: mode }));
  };

  const handleGenerate = async () => {
    setStep(2);
    await generatePlan(solutionModes, additionalInfo, projectDuration);
    setStep(3);
  };

  const handleRegenerate = async () => {
    const modes: Record<string, PlanMode> = {};
    if (plan?.selected_solutions) {
      for (const s of plan.selected_solutions as any[]) {
        modes[s.id] = s.mode || 'creation';
      }
    }
    setStep(2);
    await generatePlan(
      Object.keys(modes).length > 0 ? modes : solutionModes,
      plan?.additional_info || additionalInfo,
      plan?.project_duration || projectDuration
    );
    setStep(3);
  };

  if (loading) {
    return (
      <AppLayout
        title="Plano de Implementação"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Onboarding', href: '/diagnostico' },
          { label: 'Plano de Implementação' },
        ]}
      >
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Plano de Implementação"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Onboarding', href: '/diagnostico' },
        { label: 'Plano de Implementação' },
      ]}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Plano de Implementação</h1>
            <p className="text-sm text-muted-foreground">
              Plano personalizado baseado no seu diagnóstico e soluções contratadas
            </p>
          </div>
        </div>

        {/* Show timeline if plan exists */}
        {showTimeline && step !== 1 && step !== 2 ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Reconfigurar
              </Button>
            </div>
            <PlanTimeline
              plan={plan!.ai_plan!}
              steps={plan!.steps}
              onRegenerate={handleRegenerate}
              isRegenerating={generating}
              onMetricsUpdate={async (metrics) => {
                if (!plan) return;
                const updatedAiPlan = { ...plan.ai_plan!, metrics };
                const { error } = await supabase
                  .from('implementation_plans')
                  .update({ ai_plan: updatedAiPlan as any })
                  .eq('id', plan.id);
                if (error) {
                  toast.error('Erro ao salvar métrica');
                } else {
                  updatePlanLocally({ ai_plan: updatedAiPlan });
                  toast.success('Métrica atualizada');
                }
              }}
              onStepUpdate={async (stepId, updates) => {
                if (!plan) return;
                const updatedSteps = plan.steps.map((s) =>
                  s.id === stepId ? { ...s, ...updates } : s
                );
                const { error } = await supabase
                  .from('implementation_plans')
                  .update({ steps: updatedSteps as any })
                  .eq('id', plan.id);
                if (error) {
                  toast.error('Erro ao salvar alteração');
                } else {
                  updatePlanLocally({ steps: updatedSteps });
                  toast.success('Etapa atualizada');
                }
              }}
              onStepDelete={async (stepId) => {
                if (!plan) return;
                const updatedSteps = plan.steps
                  .filter((s) => s.id !== stepId)
                  .map((s, i) => ({ ...s, order: i + 1 }));
                const { error } = await supabase
                  .from('implementation_plans')
                  .update({ steps: updatedSteps as any })
                  .eq('id', plan.id);
                if (error) {
                  toast.error('Erro ao excluir etapa');
                } else {
                  updatePlanLocally({ steps: updatedSteps });
                  toast.success('Etapa excluída');
                }
              }}
            />
            <PlanChat onRefine={refinePlan} isRefining={refining} />
          </div>
        ) : step === 2 || generating ? (
          <PlanGenerating />
        ) : (
          /* Step 1: Configuration */
          <div className="space-y-4">
            <SolutionCards
              solutionModes={solutionModes}
              onToggle={handleToggle}
              onModeChange={handleModeChange}
            />

            {/* Project Duration */}
            <div className="space-y-2">
              <Label htmlFor="project-duration" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Duração total do projeto (meses)
              </Label>
              <Input
                id="project-duration"
                type="number"
                min={1}
                max={36}
                value={projectDuration}
                onChange={(e) => setProjectDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                O tempo restante após as etapas de implementação será preenchido automaticamente como "Fase de Acompanhamento".
              </p>
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <Label htmlFor="additional-info" className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-muted-foreground" />
                Informações adicionais relevantes para o projeto
              </Label>
              <Textarea
                id="additional-info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Insira observações, contexto do cliente, restrições de prazo, particularidades da empresa ou qualquer informação que ajude a IA a personalizar melhor o plano..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Essas informações serão consideradas pela IA ao gerar o plano personalizado.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={selectedCount === 0}
              >
                Gerar Plano com IA
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PlanoImplementacao;
