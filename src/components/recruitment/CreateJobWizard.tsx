import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useJobDescriptionToRecruitment } from "@/hooks/useJobDescriptionToRecruitment";
import { useJobDescriptionSeeder } from "@/hooks/useJobDescriptionSeeder";
import { useFunnelOptions, useDefaultFunnel } from "@/hooks/useJobPipeline";
import { useEnabledChannels } from "@/hooks/useEnabledChannels";
import { ALL_CHANNELS } from "@/hooks/useJobDistribution";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { ChannelLogo } from "@/components/recruitment/jobs/ChannelLogo";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { JobWorkflowBuilder } from "@/components/recruitment/workflow/JobWorkflowBuilder";
import type { RecruitmentJobWorkflowStepInput } from "@/types/job-workflow.types";
import type { JobDISCProfileInput } from "@/hooks/useJobDISCProfile";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Check, 
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Info,
  Bot,
  ExternalLink,
  GitBranch,
  Target,
  Search,
  Rss,
  CheckCircle2,
} from "lucide-react";

// Agent interface for real data
interface AgentOption {
  id: string;
  name: string;
  description: string | null;
  type: string;
  is_active: boolean;
}

interface CreateJobWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jobId: string) => void;
}

interface JobDescriptionOption {
  id: string;
  title: string;
  area: string | null;
  status: string;
  mission: string | null;
  responsibilities: string[];
  required_skills: string[];
  desired_skills: string[];
  behavioral_competencies: string[];
  benefits: string[];
  created_at: string;
  account_id: string;
  company_name?: string;
}

const WORK_REGIMES = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "temporario", label: "Temporário" },
  { value: "estagio", label: "Estágio" },
  { value: "trainee", label: "Trainee" },
  { value: "outros", label: "Outros" },
];

const WORK_MODALITIES = [
  { value: "remoto", label: "Remoto" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

export function CreateJobWizard({ open, onOpenChange, onSuccess }: CreateJobWizardProps) {
  const navigate = useNavigate();
  const { account: currentAccount } = useAccount();
  const { createJobFromJD } = useJobDescriptionToRecruitment();
  const { seedJobDescriptions } = useJobDescriptionSeeder();
  const [step, setStep] = useState(1);
  const [selectedJD, setSelectedJD] = useState<JobDescriptionOption | null>(null);
  
  // Form state
  const [salary, setSalary] = useState("");
  const [hideSalary, setHideSalary] = useState(false);
  const [workRegime, setWorkRegime] = useState("");
  const [customRegime, setCustomRegime] = useState("");
  const [workModality, setWorkModality] = useState("");
  const [location, setLocation] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [seniorityTarget, setSeniorityTarget] = useState<"junior" | "pleno" | "senior" | "">("");
  const [publishJob, setPublishJob] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<RecruitmentJobWorkflowStepInput[]>([]);
  const [discProfileDraft, setDiscProfileDraft] = useState<JobDISCProfileInput | null>(null);

  // Discard DISC draft if user removed the DISC step from the workflow
  useEffect(() => {
    if (discProfileDraft && !workflowSteps.some((s) => s.step_type === "disc")) {
      setDiscProfileDraft(null);
    }
  }, [workflowSteps, discProfileDraft]);
  const [minHuntingScore, setMinHuntingScore] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Client selection state (for consultancy CRM)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [feeAcordado, setFeeAcordado] = useState("");
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<number | null>(null);

  // Autopilot config (Step 5, only visible when client is selected)
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotMinCandidates, setAutopilotMinCandidates] = useState<number>(3);
  const [autopilotMinScore, setAutopilotMinScore] = useState<number>(7.0);

  // Step 4: channel selection
  const { enabledChannels, isLoading: isLoadingChannels } = useEnabledChannels();
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>([]);

  // Pre-select all enabled channels when they load
  useEffect(() => {
    if (enabledChannels.length > 0 && selectedPublishChannels.length === 0) {
      setSelectedPublishChannels(enabledChannels.map(ch => ch.name));
    }
  }, [enabledChannels]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch funnels
  const { data: funnelOptions = [] } = useFunnelOptions();
  const { data: defaultFunnel } = useDefaultFunnel();

  // Set default funnel when available
  useEffect(() => {
    if (defaultFunnel?.id && !selectedFunnelId) {
      setSelectedFunnelId(defaultFunnel.id);
    }
  }, [defaultFunnel?.id, selectedFunnelId]);

  // Fetch job descriptions for the current account only (tenant isolation)
  const { data: jobDescriptions = [], isLoading } = useQuery({
    queryKey: ["job-descriptions-current-account", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      
      const { data, error } = await supabase
        .from("job_descriptions")
        .select("id, title, area, status, mission, responsibilities, required_skills, desired_skills, behavioral_competencies, benefits, created_at, account_id")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(jd => ({
        ...jd
      })) as JobDescriptionOption[];
    },
    enabled: !!currentAccount?.id && open,
  });

  // Fetch available agents from database
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ["recruitment-agents-available", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from("recruitment_agents") as any;
      const { data, error } = await query
        .select("id, name, description, type, is_active")
        .eq("account_id", currentAccount.id)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as AgentOption[];
    },
    enabled: !!currentAccount?.id && open,
  });

  // Fetch active clients for consultancy CRM
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-wizard", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("clientes_consultoria")
        .select("id, razao_social, nome_fantasia, fee_percentual, fee_fixo, modelo_fee, prazo_entrega_dias")
        .eq("account_id", currentAccount.id)
        .eq("status", "ativo")
        .order("razao_social");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAccount?.id && open,
  });

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId === "none" ? null : clientId);
    const client = clients.find((c: any) => c.id === clientId);
    if (client) {
      if (client.prazo_entrega_dias) setPrazoEntregaDias(client.prazo_entrega_dias);
      if (client.fee_percentual) setFeeAcordado(String(client.fee_percentual));
      else if (client.fee_fixo) setFeeAcordado(String(client.fee_fixo));
    } else {
      setPrazoEntregaDias(null);
      setFeeAcordado("");
    }
  };

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedJD(null);
      setSalary("");
      setHideSalary(false);
      setWorkRegime("");
      setCustomRegime("");
      setWorkModality("");
      setLocation("");
      setAdditionalInfo("");
      setPublishJob(false);
      setWorkflowSteps([]);
      setDiscProfileDraft(null);
      setSelectedFunnelId(defaultFunnel?.id || null);
      setMinHuntingScore(0);
      setSearchTerm("");
      setCurrentPage(1);
      setSelectedPublishChannels([]);
      setSelectedClientId(null);
      setFeeAcordado("");
      setPrazoEntregaDias(null);
      setAutopilotEnabled(false);
      setAutopilotMinCandidates(3);
      setAutopilotMinScore(7.0);
    }
  }, [open, defaultFunnel?.id]);

  // Filtered and paginated JDs
  const filteredJDs = jobDescriptions.filter((jd) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      jd.title?.toLowerCase().includes(term) ||
      jd.area?.toLowerCase().includes(term) ||
      jd.mission?.toLowerCase().includes(term)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredJDs.length / ITEMS_PER_PAGE));
  const paginatedJDs = filteredJDs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelectJD = (jd: JobDescriptionOption) => {
    setSelectedJD(jd);
  };

  // Step 5 (Autopilot) is only shown when a client is linked
  const totalSteps = selectedClientId ? 5 : 4;

  const handleNext = () => {
    if (step === 1 && selectedJD) setStep(2);
    else if (step === 2) {
      const missingAgent = workflowSteps.some(
        (s) => s.step_type !== "screening" && !s.agent_id
      );
      if (workflowSteps.length === 0) {
        toast.error("Adicione ao menos uma etapa ao workflow");
        return;
      }
      if (missingAgent) {
        toast.error("Selecione um agente para cada etapa do workflow");
        return;
      }
      setStep(3);
    }
    else if (step === 3) {
      if (!workRegime) {
        toast.error("Selecione o regime de trabalho");
        return;
      }
      if (workRegime === "outros" && !customRegime.trim()) {
        toast.error("Descreva o regime de trabalho");
        return;
      }
      if (!workModality) {
        toast.error("Selecione a modalidade de trabalho");
        return;
      }
      if ((workModality === "presencial" || workModality === "hibrido") && !location.trim()) {
        toast.error("Informe a localização da vaga");
        return;
      }
      if (!seniorityTarget) {
        toast.error("Selecione a senioridade da vaga");
        return;
      }
      setStep(4);
    } else if (step === 4 && selectedClientId) {
      setStep(5);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    else if (step === 5) setStep(4);
  };

  const parseSalary = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const formatSalaryInput = (value: string): string => {
    const cleaned = value.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return number.toLocaleString("pt-BR");
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSalaryInput(e.target.value);
    setSalary(formatted);
  };

  const togglePublishChannel = (channelName: string) => {
    setSelectedPublishChannels(prev =>
      prev.includes(channelName)
        ? prev.filter(n => n !== channelName)
        : [...prev, channelName]
    );
  };

  const publishToChannelsInBackground = (jobId: string) => {
    if (selectedPublishChannels.length === 0) return;

    // Fire-and-forget background publishing
    Promise.all(
      selectedPublishChannels.map(channelName =>
        invokeAuthenticatedFunction('post-job-to-channel', {
          jobId,
          channelName,
          accountId: currentAccount?.id,
        }).catch(err => {
          console.error(`[publish] Error publishing to ${channelName}:`, err);
        })
      )
    ).then(() => {
      toast.success(`Vaga publicada em ${selectedPublishChannels.length} plataforma(s)`);
    }).catch(() => {
      toast.error('Erro ao publicar em algumas plataformas');
    });
  };

  const handleSubmit = async () => {
    if (!selectedJD) return;
    
    setIsSubmitting(true);
    try {
      const result = await createJobFromJD.mutateAsync({
        jobDescriptionId: selectedJD.id,
        title: selectedJD.title,
        department: selectedJD.area || undefined,
        location: workModality === "remoto" ? "Remoto" : location || (workModality === "presencial" ? "Presencial" : "Híbrido"),
        employmentType: workRegime === "outros"
          ? customRegime.trim()
          : WORK_REGIMES.find(r => r.value === workRegime)?.label,
        budgetMin: parseSalary(salary),
        budgetMax: parseSalary(salary),
        status: publishJob ? "active" : "draft",
        workRegime: workRegime === "outros" ? customRegime.trim() : workRegime,
        workModality,
        hideSalary,
        additionalInfo,
        agentId: workflowSteps.find(s => s.step_type === 'cultural')?.agent_id || undefined,
        funnelId: selectedFunnelId || undefined,
        minHuntingScore,
        seniorityTarget: seniorityTarget || undefined,
      });

      // Persist workflow steps
      if (result?.id && workflowSteps.length > 0) {
        const accountId = selectedJD.account_id;
        const payload = workflowSteps.map((s, idx) => ({
          account_id: accountId,
          job_id: result.id,
          step_type: s.step_type,
          agent_id: s.agent_id ?? null,
          position: idx,
          threshold_config: JSON.parse(JSON.stringify(s.threshold_config ?? {})),
          is_active: true,
        }));
        console.log("Workflow steps payload:", JSON.stringify(payload));
        const { error } = await supabase
          .from("recruitment_job_workflow_steps")
          .insert(payload);
        if (error) {
          console.error("Error saving workflow steps:", error, "Payload:", payload);
          toast.error("Erro ao salvar etapas do workflow. A vaga foi criada, mas as etapas precisam ser reconfiguradas.");
        }
      }

      // Persist DISC profile draft (if any) — only if a DISC step exists in the workflow
      if (
        result?.id &&
        discProfileDraft &&
        workflowSteps.some((s) => s.step_type === "disc")
      ) {
        const { error: discErr } = await supabase
          .from("recruitment_disc_profiles")
          .insert({
            job_id: result.id,
            primary_profile: discProfileDraft.primary_profile,
            secondary_profile: discProfileDraft.secondary_profile ?? null,
            min_match_score: discProfileDraft.min_match_score ?? 70,
            weight_d: discProfileDraft.weight_d ?? 25,
            weight_i: discProfileDraft.weight_i ?? 25,
            weight_s: discProfileDraft.weight_s ?? 25,
            weight_c: discProfileDraft.weight_c ?? 25,
            use_advanced_mode: discProfileDraft.use_advanced_mode ?? false,
            target_d: discProfileDraft.target_d ?? 50,
            target_i: discProfileDraft.target_i ?? 50,
            target_s: discProfileDraft.target_s ?? 50,
            target_c: discProfileDraft.target_c ?? 50,
            tolerance: discProfileDraft.tolerance ?? 15,
            eliminator_d: discProfileDraft.eliminator_d ?? null,
            eliminator_i: discProfileDraft.eliminator_i ?? null,
            eliminator_s: discProfileDraft.eliminator_s ?? null,
            eliminator_c: discProfileDraft.eliminator_c ?? null,
          } as any);
        if (discErr) {
          console.error("Error saving DISC profile:", discErr);
          toast.error("Vaga criada, mas o perfil DISC não foi salvo. Configure-o na edição da vaga.");
        }
      }
      // Update job with client data + autopilot config if selected
      if (result?.id && selectedClientId) {
        const now = new Date();
        const dataLimite = prazoEntregaDias
          ? new Date(now.getTime() + prazoEntregaDias * 24 * 60 * 60 * 1000).toISOString()
          : null;
        
        await supabase
          .from("recruitment_jobs")
          .update({
            cliente_id: selectedClientId,
            fee_acordado: feeAcordado ? parseFloat(feeAcordado) : null,
            prazo_entrega_dias: prazoEntregaDias,
            data_abertura_cliente: now.toISOString(),
            data_limite_entrega: dataLimite,
            autopilot_enabled: autopilotEnabled,
            autopilot_min_candidates: autopilotMinCandidates,
            autopilot_min_score: autopilotMinScore,
          } as any)
          .eq("id", result.id);
      }

      if (result?.id) {
        // Background publishing — does not block the UI
        publishToChannelsInBackground(result.id);
        
        if (selectedPublishChannels.length > 0) {
          toast.info("Publicação nas plataformas selecionadas em andamento...");
        }

        onSuccess?.(result.id);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedJobDescriptions = async () => {
    await seedJobDescriptions.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Criar Nova Vaga
          </DialogTitle>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <FileText className="h-4 w-4" />
              <span>1. Job Description</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
             <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Bot className="h-4 w-4" />
               <span>2. Workflow</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Info className="h-4 w-4" />
              <span>3. Detalhes</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              step === 4 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Rss className="h-4 w-4" />
              <span>4. Distribuição</span>
            </div>
            {selectedClientId && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                  step === 5 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Bot className="h-4 w-4" />
                  <span>5. Autopilot</span>
                </div>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 1 && (
              <ScrollArea className="h-[500px] px-6 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : jobDescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Nenhum Job Description cadastrado</h3>
                  <p className="text-muted-foreground max-w-sm mb-4">
                    Você ainda não possui Job Descriptions. Crie um primeiro para poder abrir vagas de recrutamento.
                  </p>
                  <Button 
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/atracao-contratacao/contratacao/job-description");
                    }}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ir para Job Descriptions
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Selecione um Job Description para criar a vaga:
                  </p>
                  {/* Search input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título, área ou missão..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                  {paginatedJDs.length === 0 && searchTerm.trim() ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum Job Description encontrado para "{searchTerm}"
                    </p>
                  ) : null}
                  {paginatedJDs.map((jd) => {
                    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
                      approved: { label: "Aprovado", variant: "success" },
                      draft: { label: "Rascunho", variant: "secondary" },
                      in_progress: { label: "Em Andamento", variant: "outline" },
                      archived: { label: "Arquivado", variant: "destructive" },
                    };
                    const status = statusConfig[jd.status] || { label: jd.status, variant: "outline" as const };
                    
                    return (
                      <div
                        key={jd.id}
                        onClick={() => handleSelectJD(jd)}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          selectedJD?.id === jd.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-muted-foreground/50 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium">{jd.title}</h4>
                              <Badge variant={status.variant} className="text-[9px] px-1.5 py-0">
                                {status.label}
                              </Badge>
                            </div>
                            {jd.area && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <Building2 className="h-3.5 w-3.5" />
                                {jd.area}
                              </div>
                            )}
                            {jd.mission && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {jd.mission}
                              </p>
                            )}
                          </div>
                          {selectedJD?.id === jd.id && (
                            <div className="bg-primary rounded-full p-1">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {jd.responsibilities?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {jd.responsibilities.length} responsabilidades
                            </Badge>
                          )}
                          {jd.required_skills?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {jd.required_skills.length} competências obrigatórias
                            </Badge>
                          )}
                          {jd.benefits?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {jd.benefits.length} benefícios
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={page === currentPage}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    {filteredJDs.length} resultado{filteredJDs.length !== 1 ? "s" : ""}
                    {searchTerm.trim() ? ` para "${searchTerm}"` : ""}
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
          
          {step === 2 && (
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                   Configure o workflow da vaga. Adicione as etapas e selecione os agentes dentro de cada uma:
                </p>
                
                {isLoadingAgents ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <JobWorkflowBuilder
                    value={workflowSteps}
                    onChange={setWorkflowSteps}
                    agents={agents.map((a: any) => ({ id: a.id, name: a.name, type: a.type }))}
                    discProfileDraft={discProfileDraft}
                    onDiscProfileDraftChange={setDiscProfileDraft}
                  />
                )}
              </div>
            </ScrollArea>
          )}
          
          {step === 3 && (
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-6">
                {/* Selected JD Summary */}
                {selectedJD && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Job Description selecionado:</span>
                    </div>
                    <p className="font-semibold">{selectedJD.title}</p>
                    {selectedJD.area && (
                      <p className="text-sm text-muted-foreground">{selectedJD.area}</p>
                    )}
                  </div>
                )}
                {/* Client Selection (Consultancy CRM) */}
                {clients.length > 0 && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Cliente (opcional)
                    </Label>
                    <Select value={selectedClientId || "none"} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cliente vinculado</SelectItem>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nome_fantasia || client.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClientId && (
                      <div className="flex gap-4 mt-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Fee acordado</Label>
                          <Input
                            value={feeAcordado}
                            onChange={(e) => setFeeAcordado(e.target.value)}
                            placeholder="Ex: 15"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Prazo de entrega (dias)</Label>
                          <Input
                            type="number"
                            value={prazoEntregaDias || ""}
                            onChange={(e) => setPrazoEntregaDias(e.target.value ? Number(e.target.value) : null)}
                            placeholder="Ex: 15"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}


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

                {/* Work Regime */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Regime <span className="text-destructive">*</span>
                  </Label>
                  <Select value={workRegime} onValueChange={(val) => {
                    setWorkRegime(val);
                    if (val !== "outros") setCustomRegime("");
                  }}>
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
                  {workRegime === "outros" && (
                    <Input
                      value={customRegime}
                      onChange={(e) => setCustomRegime(e.target.value.slice(0, 50))}
                      placeholder="Descreva o regime de trabalho (ex.: Freelancer, Cooperado, Autônomo)"
                      maxLength={50}
                    />
                  )}
                </div>

                {/* Work Modality */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Modalidade <span className="text-destructive">*</span>
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

                {/* Seniority Target */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Senioridade da vaga <span className="text-destructive">*</span>
                  </Label>
                  <Select value={seniorityTarget} onValueChange={(v) => setSeniorityTarget(v as "junior" | "pleno" | "senior")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a senioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Júnior</SelectItem>
                      <SelectItem value="pleno">Pleno</SelectItem>
                      <SelectItem value="senior">Sênior</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Usado pelo avaliador técnico para calibrar a régua de aprovação.
                  </p>
                </div>


                {/* Location - only for presencial/hibrido */}
                {(workModality === "presencial" || workModality === "hibrido") && (
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Onde é a vaga? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: São Paulo, SP"
                    />
                  </div>
                )}

                {/* Funnel Selector */}
                {funnelOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Funil de Contratação
                    </Label>
                    <Select 
                      value={selectedFunnelId || ""} 
                      onValueChange={setSelectedFunnelId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funil" />
                      </SelectTrigger>
                      <SelectContent>
                        {funnelOptions.map((funnel) => (
                          <SelectItem key={funnel.id} value={funnel.id}>
                            {funnel.name} {funnel.is_default && "(Padrão)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define as etapas do pipeline de recrutamento para esta vaga
                    </p>
                  </div>
                )}

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

                {/* Additional Info */}
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
              </div>
            </ScrollArea>
          )}

          {/* Step 4: Publication channels */}
          {step === 4 && (
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <Rss className="h-4 w-4" />
                    Publicação Automática
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione as plataformas para publicar esta vaga automaticamente. A publicação ocorre em segundo plano após a criação da vaga.
                  </p>
                </div>

                {isLoadingChannels ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : enabledChannels.length === 0 && ALL_CHANNELS.filter(ch => ch.category === 'automatic').length === 0 ? (
                  <div className="text-center py-8">
                    <Rss className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma plataforma de publicação habilitada.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Habilite plataformas em Configurações → Distribuição.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {ALL_CHANNELS.filter(ch => ch.category === 'automatic').map(channel => (
                      <div
                        key={channel.name}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                          <div>
                            <p className="text-sm font-medium">{channel.displayName}</p>
                            <p className="text-xs text-muted-foreground">{channel.reach}</p>
                          </div>
                        </div>
                        <Badge variant="success" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sempre ativo
                        </Badge>
                      </div>
                    ))}

                    {enabledChannels.map(channel => {
                      const isSelected = selectedPublishChannels.includes(channel.name);
                      return (
                        <div
                          key={channel.name}
                          onClick={() => togglePublishChannel(channel.name)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                            <div>
                              <p className="text-sm font-medium">{channel.displayName}</p>
                              <p className="text-xs text-muted-foreground">{channel.reach} · {channel.cost}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePublishChannel(channel.name);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {enabledChannels.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {selectedPublishChannels.length} de {enabledChannels.length} plataforma(s) selecionada(s)
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Step 5: Autopilot config (only when client linked) */}
          {step === 5 && (
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4" />
                    Configurar Autopilot (opcional)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Quando habilitado, a shortlist será gerada e enviada automaticamente ao cliente assim que houver candidatos suficientes com score acima do mínimo.
                  </p>
                </div>

                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label>Ativar autopilot para esta vaga?</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAutopilotEnabled(true)}
                      className={cn(
                        "flex-1 p-4 border rounded-lg text-left transition-all",
                        autopilotEnabled
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Sim, ativar</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Shortlist gerada e enviada ao cliente automaticamente.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutopilotEnabled(false)}
                      className={cn(
                        "flex-1 p-4 border rounded-lg text-left transition-all",
                        !autopilotEnabled
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Não, manual</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Você decide quando gerar e enviar a shortlist.
                      </p>
                    </button>
                  </div>
                </div>

                {autopilotEnabled && (
                  <div className="space-y-5 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label>Mínimo de candidatos para disparar</Label>
                      <Select
                        value={String(autopilotMinCandidates)}
                        onValueChange={(v) => setAutopilotMinCandidates(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 candidatos</SelectItem>
                          <SelectItem value="4">4 candidatos</SelectItem>
                          <SelectItem value="5">5 candidatos</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Aguardar pelo menos este número de candidatos qualificados antes de gerar a shortlist.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Score mínimo dos candidatos</Label>
                        <Badge variant="outline" className="min-w-[48px] justify-center">
                          {autopilotMinScore.toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        min={5}
                        max={9}
                        step={0.1}
                        value={[autopilotMinScore]}
                        onValueChange={([v]) => setAutopilotMinScore(Number(v.toFixed(1)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Apenas candidatos com score composto ≥ {autopilotMinScore.toFixed(1)} serão considerados na shortlist automática.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div>
            {step === 1 ? (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {step === 4 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="publish-job" className="text-sm">
                  Publicar vaga
                </Label>
                <Switch
                  id="publish-job"
                  checked={publishJob}
                  onCheckedChange={setPublishJob}
                />
              </div>
            )}
            
            {(step === 1 || step === 2 || step === 3 || (step === 4 && selectedClientId)) && (
              <Button 
                onClick={handleNext} 
                disabled={step === 1 && !selectedJD}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {((step === 4 && !selectedClientId) || step === 5) && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? "Criando..." : "Cadastrar vaga"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
