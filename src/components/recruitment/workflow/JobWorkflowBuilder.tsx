import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Bot, Brain, TestTubeDiagonal, Settings2, CheckCircle2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  RecruitmentJobWorkflowStepInput,
  RecruitmentWorkflowStepType,
} from "@/types/job-workflow.types";
import { JobDISCProfileConfig } from "@/components/recruitment/JobDISCProfileConfig";
import { useJobDISCProfile, type JobDISCProfileInput } from "@/hooks/useJobDISCProfile";
import { ScreeningQuestionsEditor } from "@/components/recruitment/workflow/ScreeningQuestionsEditor";
import { supabase } from "@/integrations/supabase/client";
import type { ScreeningQuestion } from "@/types/job-workflow.types";

type AgentOption = { id: string; name: string; type?: string | null };

const STEP_META: Record<RecruitmentWorkflowStepType, { label: string; icon: any }> = {
  screening: { label: "Triagem", icon: Shield },
  cultural: { label: "Fit Cultural", icon: Bot },
  disc: { label: "DISC", icon: Brain },
  technical: { label: "Técnico", icon: TestTubeDiagonal },
};

function defaultThresholdFor(type: RecruitmentWorkflowStepType) {
  if (type === "disc") return { min_match: 70 };
  if (type === "screening") return { questions: [] };
  return { min_score: 60 };
}

function pickDefaultAgentFor(
  stepType: RecruitmentWorkflowStepType,
  agents: AgentOption[]
): AgentOption | null {
  if (!agents?.length) return null;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (stepType === "cultural") {
    return (
      agents.find((a) => norm(a.name) === "agente de fit cultural") ??
      agents.find((a) => norm(a.name).includes("cultural")) ??
      null
    );
  }
  if (stepType === "disc") {
    return (
      agents.find((a) => a.type === "disc") ??
      agents.find((a) => norm(a.name) === "agente de fit comportamental") ??
      agents.find((a) =>
        norm(a.name).includes("comportamental") || norm(a.name).includes("disc")
      ) ??
      null
    );
  }
  if (stepType === "technical") {
    return (
      agents.find((a) => norm(a.name) === "agente de fit tecnico") ??
      agents.find((a) => norm(a.name).includes("tecnico")) ??
      agents.find((a) => a.type === "adaptive") ??
      null
    );
  }
  return null;
}

function SortableStepRow(props: {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const { id, children, onRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background p-4",
        isDragging && "opacity-70"
      )}
    >
      <button
        type="button"
        className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">{children}</div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label="Remover etapa"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function JobWorkflowBuilder(props: {
  value: RecruitmentJobWorkflowStepInput[];
  onChange: (next: RecruitmentJobWorkflowStepInput[]) => void;
  agents: AgentOption[];
  disabled?: boolean;
  jobId?: string;
  // Draft mode (used inside Create wizard, before the job exists)
  discProfileDraft?: JobDISCProfileInput | null;
  onDiscProfileDraftChange?: (value: JobDISCProfileInput) => void;
}) {
  const { value, onChange, agents, disabled, jobId, discProfileDraft, onDiscProfileDraftChange } = props;
  const isDraftMode = !jobId && !!onDiscProfileDraftChange;

  const [showDISCConfig, setShowDISCConfig] = useState(false);
  const { profile: discProfile, isLoading: discProfileLoading, seedProfile } = useJobDISCProfile(jobId);

  // Inherit DISC agent settings to job profile when agent is selected
  // Uses seedProfile (insert-only) to NEVER overwrite existing config
  const inheritAgentSettings = useCallback(async (agentId: string) => {
    if (!jobId) return;
    // Wait for profile query to finish before deciding
    if (discProfileLoading) {
      console.log('🛡️ inheritAgentSettings: profile still loading, skipping');
      return;
    }
    // Don't overwrite existing profile
    if (discProfile) {
      console.log('🛡️ inheritAgentSettings: profile already exists, skipping');
      return;
    }

    try {
      const { data: agent } = await supabase
        .from('recruitment_agents')
        .select('settings')
        .eq('id', agentId)
        .single();

      const discEval = (agent?.settings as any)?.disc_evaluation;
      if (!discEval || !discEval.primary_profile) return;

      const profileInput: JobDISCProfileInput = {
        job_id: jobId,
        primary_profile: discEval.primary_profile,
        secondary_profile: discEval.secondary_profile || null,
        min_match_score: discEval.min_match_score ?? 70,
        weight_d: discEval.weight_d ?? 25,
        weight_i: discEval.weight_i ?? 25,
        weight_s: discEval.weight_s ?? 25,
        weight_c: discEval.weight_c ?? 25,
        use_advanced_mode: discEval.use_advanced_mode ?? false,
        target_d: discEval.target_d ?? 50,
        target_i: discEval.target_i ?? 50,
        target_s: discEval.target_s ?? 50,
        target_c: discEval.target_c ?? 50,
        tolerance: discEval.tolerance ?? 15,
        eliminator_d: discEval.eliminator_d ?? null,
        eliminator_i: discEval.eliminator_i ?? null,
        eliminator_s: discEval.eliminator_s ?? null,
        eliminator_c: discEval.eliminator_c ?? null,
      };

      // seedProfile only inserts if no profile exists (double-checked in DB)
      seedProfile(profileInput);
    } catch (err) {
      console.error('Failed to inherit DISC agent settings:', err);
    }
  }, [jobId, discProfile, discProfileLoading, seedProfile]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [local, setLocal] = useState<RecruitmentJobWorkflowStepInput[]>(value);
  useEffect(() => setLocal(value), [value]);

  const ids = useMemo(
    () => local.map((s, idx) => `${s.step_type}-${idx}-${s.agent_id ?? "none"}`),
    [local]
  );

  const commit = (next: RecruitmentJobWorkflowStepInput[]) => {
    setLocal(next);
    onChange(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(local, oldIndex, newIndex));
  };

  const addStep = (type: RecruitmentWorkflowStepType) => {
    const defaultAgent = type === "screening" ? null : pickDefaultAgentFor(type, agents);
    commit([
      ...local,
      {
        step_type: type,
        agent_id: defaultAgent?.id ?? null,
        threshold_config: defaultThresholdFor(type),
      },
    ]);
    if (type === "disc" && defaultAgent?.id) {
      inheritAgentSettings(defaultAgent.id);
    }
  };

  const removeStep = (idx: number) => {
    commit(local.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<RecruitmentJobWorkflowStepInput>) => {
    commit(local.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const updateThreshold = (idx: number, patch: Record<string, any>) => {
    commit(
      local.map((s, i) =>
        i === idx
          ? { ...s, threshold_config: { ...(s.threshold_config ?? {}), ...patch } }
          : s
      )
    );
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Workflow da vaga</p>
          <p className="text-xs text-muted-foreground">
            Defina a ordem das etapas e os thresholds mínimos para avançar automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("screening")}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Triagem
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("cultural")}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Fit Cultural
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("disc")}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            DISC
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("technical")}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Técnico
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {local.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Adicione ao menos uma etapa para configurar o workflow.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {local.map((step, idx) => {
                  const Icon = STEP_META[step.step_type].icon;
                  return (
                    <SortableStepRow key={ids[idx]} id={ids[idx]} onRemove={() => removeStep(idx)}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{STEP_META[step.step_type].label}</span>
                      </div>

                      {step.step_type === "screening" ? (
                        /* Screening: only show questions editor, no agent/threshold */
                        <div className="space-y-2">
                          <ScreeningQuestionsEditor
                            jobId={jobId}
                            questions={(step.threshold_config?.questions as ScreeningQuestion[]) || []}
                            onChange={(questions) =>
                              updateThreshold(idx, { questions })
                            }
                            disabled={disabled}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={step.step_type}
                            onValueChange={(v) =>
                              updateStep(idx, {
                                step_type: v as RecruitmentWorkflowStepType,
                                threshold_config: defaultThresholdFor(v as RecruitmentWorkflowStepType),
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="screening">Triagem</SelectItem>
                              <SelectItem value="cultural">Fit Cultural</SelectItem>
                              <SelectItem value="disc">DISC</SelectItem>
                              <SelectItem value="technical">Técnico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Agente <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={step.agent_id ?? ""}
                            onValueChange={(v) => {
                              const agentId = v || null;
                              updateStep(idx, { agent_id: agentId });
                              if (agentId && step.step_type === "disc") {
                                inheritAgentSettings(agentId);
                              }
                            }}
                            disabled={disabled}
                          >
                            <SelectTrigger
                              aria-invalid={!step.agent_id}
                              className={cn(!step.agent_id && "border-destructive focus:ring-destructive")}
                            >
                              <SelectValue placeholder="Selecione um agente" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!step.agent_id && (
                            <p className="text-xs text-destructive">Selecione um agente para esta etapa.</p>
                          )}
                        </div>

                        {step.step_type === "disc" ? (
                          <div className="col-span-2 space-y-4">
                            <div className="space-y-2">
                              <Label>Mínimo match DISC (%)</Label>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                value={step.threshold_config?.min_match ?? 70}
                                onChange={(e) =>
                                  updateThreshold(idx, {
                                    min_match: Number(e.target.value || 0),
                                  })
                                }
                                disabled={disabled}
                              />
                            </div>
                            
                            {(jobId || isDraftMode) && (() => {
                              const effectiveProfile: any = isDraftMode ? discProfileDraft : discProfile;
                              return (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDISCConfig(true)}
                                    disabled={disabled}
                                    className="w-full"
                                  >
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    Configurar perfil comportamental
                                  </Button>
                                  
                                  {effectiveProfile && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-primary">
                                          {effectiveProfile.use_advanced_mode ? 'Modo Avançado configurado' : 'Perfil DISC configurado'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {effectiveProfile.use_advanced_mode ? (
                                            <>
                                              D:{effectiveProfile.target_d} I:{effectiveProfile.target_i} S:{effectiveProfile.target_s} C:{effectiveProfile.target_c}
                                              {(effectiveProfile.eliminator_d || effectiveProfile.eliminator_i || effectiveProfile.eliminator_s || effectiveProfile.eliminator_c) && (
                                                <span className="ml-2">
                                                  | Eliminatórios: 
                                                  {effectiveProfile.eliminator_d && ` D≥${effectiveProfile.eliminator_d}`}
                                                  {effectiveProfile.eliminator_i && ` I≥${effectiveProfile.eliminator_i}`}
                                                  {effectiveProfile.eliminator_s && ` S≥${effectiveProfile.eliminator_s}`}
                                                  {effectiveProfile.eliminator_c && ` C≥${effectiveProfile.eliminator_c}`}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <>Perfil: {effectiveProfile.primary_profile}{effectiveProfile.secondary_profile ? `/${effectiveProfile.secondary_profile}` : ''} | Pesos: D:{effectiveProfile.weight_d} I:{effectiveProfile.weight_i} S:{effectiveProfile.weight_s} C:{effectiveProfile.weight_c}</>
                                          )}
                                        </p>
                                        {!isDraftMode && effectiveProfile.updated_at && (
                                          <p className="text-[10px] text-muted-foreground/70">
                                            Salvo em: {new Date(effectiveProfile.updated_at).toLocaleString('pt-BR')}
                                          </p>
                                        )}
                                        {isDraftMode && (
                                          <p className="text-[10px] text-muted-foreground/70">
                                            Será persistido ao concluir a criação da vaga.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Nota mínima (%)</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={100}
                              value={step.threshold_config?.min_score ?? 60}
                              onChange={(e) =>
                                updateThreshold(idx, {
                                  min_score: Number(e.target.value || 0),
                                })
                              }
                              disabled={disabled}
                            />
                          </div>
                        )}
                      </div>
                      )}
                    </SortableStepRow>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* DISC Advanced Configuration Dialog */}
      {(jobId || isDraftMode) && (
        <Dialog open={showDISCConfig} onOpenChange={setShowDISCConfig}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configuração de Perfil DISC
              </DialogTitle>
            </DialogHeader>
            <JobDISCProfileConfig 
              jobId={jobId} 
              onSave={() => setShowDISCConfig(false)}
              compact
              draftValue={isDraftMode ? discProfileDraft : undefined}
              onDraftChange={isDraftMode ? onDiscProfileDraftChange : undefined}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
