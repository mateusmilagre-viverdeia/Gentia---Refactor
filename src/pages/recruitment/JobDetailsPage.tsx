import { useState } from "react";
import { getPublicJobUrl } from "@/lib/publicUrl";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Pencil, Trash2, Calendar, MapPin, Briefcase, XCircle, ExternalLink, Trophy, FileText, Building2, Clock, DollarSign, Globe, Mic } from "lucide-react";
import { ImportOfflineInterviewDialog } from "@/components/recruitment/offline-interview/ImportOfflineInterviewDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { EditJobDialog } from "@/components/recruitment/EditJobDialog";
import { UnifiedFunnelTab } from "@/components/recruitment/workflow/UnifiedFunnelTab";
import { AutopilotToggle } from "@/components/recruitment/autopilot/AutopilotToggle";
import { AutopilotShortlistCard } from "@/components/recruitment/autopilot/AutopilotShortlistCard";
import { ShortlistRankingView } from "@/components/recruitment/shortlist/ShortlistRankingView";
import { ShortlistReportGenerator } from "@/components/recruitment/shortlist/ShortlistReportGenerator";
import { ReportViewsTracker } from "@/components/recruitment/shortlist/ReportViewsTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobSlaCard } from "@/components/recruitment/sla/JobSlaCard";
import { JobWarrantyCard } from "@/components/recruitment/sla/JobWarrantyCard";
import { CompatibleCandidatesCard } from "@/components/recruitment/crossmatch/CompatibleCandidatesCard";
import { JobROIReportButton } from "@/components/recruitment/JobROIReportButton";
import { CopilotButton } from "@/components/recruitment/copilot";
import { PostHireChecklistCard } from "@/components/recruitment/post-hire/PostHireChecklistCard";
import { ClipboardCheck } from "lucide-react";
import { SimulateCultureInterviewButton } from "@/components/recruitment/SimulateCultureInterviewButton";
import { SimulateTechnicalInterviewButton } from "@/components/recruitment/SimulateTechnicalInterviewButton";
import { formatBRT } from "@/lib/datetime";


const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentAccount, loading: orgLoading } = useOrganization();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportGeneratorOpen, setReportGeneratorOpen] = useState(false);
  const [importOfflineOpen, setImportOfflineOpen] = useState(false);
  console.log("[JobDetailsPage] Render. jobId:", jobId, "currentAccount:", currentAccount?.id, "orgLoading:", orgLoading);

  // Fetch job details with job description and company
  const { data: job, isLoading, error, status, fetchStatus } = useQuery({
    queryKey: ["recruitment-job", jobId, currentAccount?.id],
    queryFn: async () => {
      console.log("[JobDetailsPage] queryFn EXECUTING. jobId:", jobId, "accountId:", currentAccount?.id);
      if (!jobId) return null;
      
      // Build query - if we have a currentAccount, filter by it for security
      let query = supabase
        .from("recruitment_jobs")
        .select(`
          *,
          job_descriptions (
            id, title, area, mission, indicators, responsibilities,
            required_skills, desired_skills, behavioral_competencies,
            development, benefits
          ),
          companies:account_id (
            id, name
          ),
          clientes_consultoria:cliente_id (
            id, razao_social, nome_fantasia
          )
        `)
        .eq("id", jobId);
      
      // Filter by current account to ensure user has access
      if (currentAccount?.id) {
        query = query.eq("account_id", currentAccount.id);
      }
      
      const { data, error } = await query.maybeSingle();
      
      console.log("[JobDetailsPage] Query result:", { data, error });
      
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!currentAccount?.id,
  });





  console.log("[JobDetailsPage] Query state:", { status, fetchStatus, isLoading, hasJob: !!job, error: error?.message });

  // Toggle status mutation
  const toggleStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("recruitment_jobs")
        .update({ status: newStatus })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success("Status atualizado!");
    },
    onError: (error: any) => {
      console.error("[JobDetailsPage] toggleStatus error", error);
      toast.error(error?.message ? `Erro ao atualizar status: ${error.message}` : "Erro ao atualizar status");
    },
  });

  // Delete mutation
  const deleteJob = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("recruitment_jobs")
        .delete()
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success("Vaga excluída!");
      navigate("/atracao-contratacao/recrutamento/jobs");
    },
    onError: () => {
      toast.error("Erro ao excluir vaga");
    },
  });

  const handleCopyLink = () => {
    const publicUrl = getPublicJobUrl(jobId!);
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link da vaga copiado!");
  };

  const handleOpenPublicPage = () => {
    window.open(getPublicJobUrl(jobId!), "_blank");
  };

  const isPublished = job?.status === "active";

  if (isLoading || orgLoading) {
    return (
      <RecruitmentLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="bg-background border rounded-lg p-6">
            <div className="flex gap-6">
              <Skeleton className="h-24 w-24 rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </RecruitmentLayout>
    );
  }

  if (!job) {
    return (
      <RecruitmentLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Vaga não encontrada ou você não tem permissão para acessá-la.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta vaga pode pertencer a outra organização.
          </p>
          <Button variant="link" asChild className="mt-4">
            <Link to="/atracao-contratacao/recrutamento/jobs">Voltar para vagas</Link>
          </Button>
        </div>
      </RecruitmentLayout>
    );
  }

  const jd = job.job_descriptions;
  const responsibilities = jd?.responsibilities || [];
  const cliente = (job as any).clientes_consultoria as { id: string; razao_social: string; nome_fantasia: string | null } | null;
  const clienteName = cliente?.nome_fantasia || cliente?.razao_social || null;

  // SLA calculation
  const getSlaInfo = () => {
    if (!job.data_limite_entrega) return null;
    const now = new Date();
    const deadline = new Date(job.data_limite_entrega);
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasado`, variant: "destructive" as const };
    if (diffDays <= 3) return { label: `${diffDays}d restantes`, variant: "warning" as const };
    return { label: `${diffDays}d restantes`, variant: "success" as const };
  };
  const slaInfo = getSlaInfo();

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/atracao-contratacao/recrutamento/jobs">Vagas</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{job.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Job Header Card - Compact */}
        <div className="bg-background border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-5">
            {/* Company Icon */}
            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Job Info */}
            <div className="min-w-0 w-[280px] shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-base font-semibold">{job.title}</h1>
                <Badge 
                  variant={isPublished ? "default" : "secondary"}
                  className={isPublished ? "bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0" : "text-[10px] px-1.5 py-0"}
                >
                  {isPublished ? "Publicada" : "Rascunho"}
                </Badge>
              </div>
              {(job.companies as { name?: string } | null)?.name && (
                <p className="text-xs font-medium text-muted-foreground">{(job.companies as { name: string }).name}</p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                {clienteName && (
                  <Link to={`/atracao-contratacao/recrutamento/clientes/${cliente!.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Building2 className="h-3 w-3" />
                    <span>{clienteName}</span>
                  </Link>
                )}
                {job.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{job.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Criada em {formatBRT(new Date(job.created_at), "dd/MM/yyyy")}</span>
                </div>
                {slaInfo && (
                  <Badge variant={slaInfo.variant} className="text-[10px] px-1.5 py-0">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    {slaInfo.label}
                  </Badge>
                )}
                {job.fee_acordado && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Fee: {Number(job.fee_acordado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Responsibilities - More space */}
            {responsibilities.length > 0 && (
              <div className="bg-muted/40 rounded-lg px-4 py-2.5 flex-1 max-w-md hidden lg:block">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Principais responsabilidades
                </p>
                <ul className="text-xs space-y-0.5">
                  {responsibilities.slice(0, 3).map((resp, i) => (
                    <li key={i} className="text-foreground/70 line-clamp-1">• {resp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Right Column Actions - Icon buttons only */}
            <div className="shrink-0 flex items-center gap-1">
              {cliente && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    supabase
                      .from("portal_clientes_acesso")
                      .select("token_acesso")
                      .eq("cliente_id", cliente.id)
                      .eq("ativo", true)
                      .limit(1)
                      .maybeSingle()
                      .then(({ data }) => {
                        if (data?.token_acesso) {
                          window.open(`${window.location.origin}/portal/${data.token_acesso}`, "_blank");
                        } else {
                          toast.info("Nenhum acesso ao portal configurado para este cliente.");
                        }
                      });
                  }}
                  className="h-8 w-8 text-muted-foreground"
                  title="Abrir portal do cliente"
                >
                  <Globe className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleCopyLink} className="h-8 w-8 text-muted-foreground" title="Copiar link">
                <Copy className="h-4 w-4" />
              </Button>
              {isPublished && (
                <Button variant="ghost" size="icon" onClick={handleOpenPublicPage} className="h-8 w-8 text-muted-foreground" title="Ver página pública">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setEditDialogOpen(true)}
                className="h-8 w-8 text-muted-foreground"
                title="Editar vaga"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <SimulateCultureInterviewButton jobId={job.id} variant="ghost" size="sm" />
              <SimulateTechnicalInterviewButton jobId={job.id} variant="ghost" size="sm" />
            </div>
          </div>

          {/* Toggle and Actions - Compact row */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
              <span className={`text-xs font-medium ${!isPublished ? 'text-foreground' : 'text-muted-foreground'}`}>
                Rascunho
              </span>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => {
                  toggleStatus.mutate(checked ? "active" : "draft");
                }}
                className="scale-90"
              />
              <span className={`text-xs font-medium ${isPublished ? 'text-foreground' : 'text-muted-foreground'}`}>
                Ativa
              </span>
            </div>

            <AutopilotToggle jobId={jobId!} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (job.status === "closed") {
                  toggleStatus.mutate("draft");
                } else {
                  setCloseDialogOpen(true);
                }
              }}
              className="h-8 text-xs"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {job.status === "closed" ? "Reabrir vaga" : "Fechar vaga"}
            </Button>

            {currentAccount?.id && (
              <JobROIReportButton jobId={jobId!} accountId={currentAccount.id} />
            )}

            <CopilotButton scope="job" jobId={jobId} contextLabel={job.title} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOfflineOpen(true)}
              className="h-8 text-xs"
            >
              <Mic className="h-3.5 w-3.5 mr-1" />
              Importar entrevista presencial
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
              title="Excluir vaga"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* SLA + Garantia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JobSlaCard
            jobId={jobId!}
            dataAbertura={(job as any).data_abertura_cliente || job.created_at}
            prazoEntregaDias={(job as any).prazo_entrega_dias || null}
            dataLimiteEntrega={(job as any).data_limite_entrega || null}
          />
          <JobWarrantyCard jobId={jobId!} />
        </div>

        {/* Cross-match: candidatos compatíveis no banco */}
        {currentAccount?.id && <CompatibleCandidatesCard jobId={jobId!} accountId={currentAccount.id} />}

        {/* Autopilot de Shortlist (Fase 4 — Aposta B) */}
        {currentAccount?.id && (job as any).cliente_id && (
          <AutopilotShortlistCard jobId={jobId!} accountId={currentAccount.id} />
        )}

        {/* Tabs: Funnel + Shortlist */}
        <Tabs defaultValue="funnel" className="w-full">
          <TabsList>
            <TabsTrigger value="funnel">Funil</TabsTrigger>
            <TabsTrigger value="shortlist" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Shortlist IA
            </TabsTrigger>
            <TabsTrigger value="post-hire" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Pós-contratação
            </TabsTrigger>
          </TabsList>
          <TabsContent value="funnel">
            <UnifiedFunnelTab jobId={jobId!} />
          </TabsContent>
          <TabsContent value="shortlist" className="space-y-3">
            <ShortlistRankingView
              jobId={jobId!}
              onGenerateReport={() => setReportGeneratorOpen(true)}
            />
            <ReportViewsTracker jobId={jobId!} />
          </TabsContent>
          <TabsContent value="post-hire" className="space-y-3">
            {currentAccount?.id ? (
              <PostHireChecklistCard jobId={jobId!} accountId={currentAccount.id} />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A vaga "{job.title}" será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJob.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Job Confirmation Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga "{job.title}" será marcada como fechada e não receberá mais candidaturas. Você poderá reabri-la depois se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toggleStatus.mutate("closed");
                setCloseDialogOpen(false);
              }}
            >
              Fechar vaga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Job Dialog */}
      <EditJobDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        job={job}
      />

      {/* Shortlist Report Generator */}
      <ShortlistReportGenerator
        open={reportGeneratorOpen}
        onOpenChange={setReportGeneratorOpen}
        jobId={jobId!}
        jobTitle={job.title}
        candidates={[]}
      />

      {/* Import Offline Interview */}
      {currentAccount?.id && (
        <ImportOfflineInterviewDialog
          open={importOfflineOpen}
          onOpenChange={setImportOfflineOpen}
          accountId={currentAccount.id}
          jobId={jobId!}
        />
      )}
    </RecruitmentLayout>
  );
};

export default JobDetailsPage;
