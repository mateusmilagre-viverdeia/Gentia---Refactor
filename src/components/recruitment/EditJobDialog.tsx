import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Pencil,
  FileText,
  MapPin,
  Briefcase,
  DollarSign,
  Info,
  Lock,
  Target
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { JobWorkflowBuilder } from "@/components/recruitment/workflow/JobWorkflowBuilder";
import { useJobWorkflow } from "@/hooks/useJobWorkflow";
import type { RecruitmentJobWorkflowStepInput } from "@/types/job-workflow.types";

interface JobData {
  id: string;
  account_id?: string;
  title: string;
  description?: string | null;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  status: string;
  work_regime?: string | null;
  work_modality?: string | null;
  hide_salary?: boolean | null;
  additional_info?: string | null;
  agent_id?: string | null;
  min_hunting_score?: number | null;
  job_descriptions?: {
    id: string;
    title: string;
    area?: string | null;
  } | null;
}

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobData;
}

const WORK_REGIMES = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "temporario", label: "Temporário" },
  { value: "estagio", label: "Estágio" },
  { value: "trainee", label: "Trainee" },
];

const WORK_MODALITIES = [
  { value: "remoto", label: "Remoto" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

export function EditJobDialog({ open, onOpenChange, job }: EditJobDialogProps) {
  const queryClient = useQueryClient();
  const { account: currentAccount } = useAccount();

  const accountId = job.account_id || currentAccount?.id;
  
  // Form state
  const [salary, setSalary] = useState("");
  const [hideSalary, setHideSalary] = useState(false);
  const [workRegime, setWorkRegime] = useState("");
  const [workModality, setWorkModality] = useState("");
  const [location, setLocation] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [agentId, setAgentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<RecruitmentJobWorkflowStepInput[]>([]);
  const [minHuntingScore, setMinHuntingScore] = useState(0);

  const { steps: persistedSteps, saveWorkflow } = useJobWorkflow({
    jobId: job?.id,
    accountId,
  });

  // Fetch available agents
  const [agents, setAgents] = useState<Array<{ id: string; name: string; description: string | null; type: string | null }>>([]);
  
  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentAccount?.id || !open) return;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from("recruitment_agents") as any;
      const { data, error } = await query
        .select("id, name, description, type")
        .eq("account_id", currentAccount.id)
        .eq("is_active", true)
        .order("name");
      
      if (!error && data) {
        setAgents(data);
      }
    };
    
    fetchAgents();
  }, [currentAccount?.id, open]);

  // Initialize form with job data
  useEffect(() => {
    if (open && job) {
      setSalary(job.budget_min ? formatSalaryInput(String(job.budget_min)) : "");
      setHideSalary(job.hide_salary || false);
      setWorkRegime(job.work_regime || "");
      setWorkModality(job.work_modality || "");
      setLocation(job.location || "");
      setAdditionalInfo(job.additional_info || "");
      setAgentId(job.agent_id || "");
      setMinHuntingScore(job.min_hunting_score || 0);

      // Initialize workflow steps from DB if present; otherwise keep a safe default.
      if (persistedSteps?.length) {
        setWorkflowSteps(
          persistedSteps.map((s) => ({
            id: s.id,
            step_type: s.step_type as any,
            agent_id: s.agent_id,
            threshold_config: (s.threshold_config as any) ?? {},
          }))
        );
      } else {
        setWorkflowSteps([]);
      }
    }
  }, [open, job, persistedSteps]);

  const formatSalaryInput = (value: string): string => {
    const cleaned = value.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return number.toLocaleString("pt-BR");
  };

  const parseSalary = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSalaryInput(e.target.value);
    setSalary(formatted);
  };

  const updateJob = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("recruitment_jobs")
        .update({
          location: workModality === "remoto" ? "Remoto" : location || (workModality === "presencial" ? "Presencial" : "Híbrido"),
          employment_type: WORK_REGIMES.find(r => r.value === workRegime)?.label,
          budget_min: parseSalary(salary),
          budget_max: parseSalary(salary),
          work_regime: workRegime,
          work_modality: workModality,
          hide_salary: hideSalary,
          additional_info: additionalInfo,
          agent_id: agentId || null,
          min_hunting_score: minHuntingScore,
        })
        .eq("id", job.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-job", job.id] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      // Toast and close handled in handleSubmit after workflow save
    },
    onError: (error: any) => {
      // Detalhes são logados/mostrados no handleSubmit
      console.error("[EditJobDialog] updateJob mutation error:", error);
    },
  });

  const formatPgError = (error: any): string => {
    if (!error) return "erro desconhecido";
    const parts = [error.message, error.details, error.hint].filter(Boolean);
    const code = error.code ? ` [${error.code}]` : "";
    return (parts.join(" — ") || String(error)) + code;
  };

  const handleSubmit = async () => {
    const missingAgent = workflowSteps.some(
      (s) => s.step_type !== "screening" && !s.agent_id
    );
    if (missingAgent) {
      toast.error("Selecione um agente para cada etapa do workflow");
      return;
    }
    setIsSubmitting(true);
    try {
      try {
        await updateJob.mutateAsync();
      } catch (error: any) {
        console.error("[EditJobDialog] Falha no UPDATE recruitment_jobs:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });
        toast.error(`Erro ao salvar vaga: ${formatPgError(error)}`);
        return;
      }

      if (accountId) {
        try {
          await saveWorkflow.mutateAsync(workflowSteps);
          queryClient.invalidateQueries({ queryKey: ["job-workflow", job.id, accountId] });
        } catch (error: any) {
          console.error("[EditJobDialog] Falha ao salvar workflow steps:", {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            payload: workflowSteps,
          });
          toast.error(`Erro ao salvar workflow: ${formatPgError(error)}`);
          return;
        }
      }

      toast.success("Vaga atualizada com sucesso!");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jd = job.job_descriptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Vaga
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <div className="space-y-6">
            {/* Locked: Job Description */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Job Description</span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              </div>
              <p className="font-semibold">{jd?.title || job.title}</p>
              {jd?.area && (
                <p className="text-sm text-muted-foreground">{jd.area}</p>
              )}
            </div>


            {/* Workflow */}
            <JobWorkflowBuilder
              value={workflowSteps}
              onChange={setWorkflowSteps}
              agents={agents.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
              jobId={job.id}
            />

            {/* Editable: Salary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="salary" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Remuneração
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hide-salary" className="text-sm text-muted-foreground">
                    Ocultar remuneração
                  </Label>
                  <Switch
                    id="hide-salary"
                    checked={hideSalary}
                    onCheckedChange={setHideSalary}
                  />
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="salary"
                  value={salary}
                  onChange={handleSalaryChange}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Editable: Work Regime */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Regime
              </Label>
              <Select value={workRegime} onValueChange={setWorkRegime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_REGIMES.map((regime) => (
                    <SelectItem key={regime.value} value={regime.value}>
                      {regime.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Editable: Work Modality */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Modalidade
              </Label>
              <Select value={workModality} onValueChange={(val) => {
                setWorkModality(val);
                if (val === "remoto") setLocation("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODALITIES.map((modality) => (
                    <SelectItem key={modality.value} value={modality.value}>
                      {modality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location - only for presencial/hibrido */}
            {(workModality === "presencial" || workModality === "hibrido") && (
              <div className="space-y-2">
                <Label htmlFor="edit-location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Onde é a vaga?
                </Label>
                <Input
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                />
              </div>
            )}

            {/* Editable: Additional Info */}
            <div className="space-y-2">
              <Label htmlFor="additional-info" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informações adicionais
              </Label>
              <Textarea
                id="additional-info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Informações complementares sobre a vaga..."
                rows={4}
              />
            </div>

            {/* Min Hunting Score */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Score Mínimo de Hunting para Abordagem
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[minHuntingScore]}
                  onValueChange={([v]) => setMinHuntingScore(v)}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[48px] justify-center">
                  {minHuntingScore}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas candidatos com score de hunting ≥{minHuntingScore}% serão incluídos 
                em campanhas de abordagem automática. Use 0% para desativar este filtro.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
