import { useState } from "react";
import { getPublicJobUrl } from "@/lib/publicUrl";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { useTableSort } from "@/hooks/useTableSort";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { RecruitmentSetupAlert } from "@/components/recruitment/RecruitmentSetupAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { JobDistributionBadges } from "@/components/recruitment/jobs/JobDistributionBadges";
import { CreateJobWizard } from "@/components/recruitment/CreateJobWizard";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, MoreHorizontal, MapPin, Clock, Copy, Link, Trash2, ChevronLeft, ChevronRight, Briefcase, Send, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { toast } from "sonner";
import { JobPublishDialog } from "@/components/recruitment/jobs/JobPublishDialog";
import { JobPublishStatus } from "@/components/recruitment/jobs/JobPublishStatus";
import { JobSlaBadge } from "@/components/recruitment/sla/JobSlaBadge";
import { Shield } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

const statusTabs = ["Todas", "Rascunho", "Ativas", "Pausadas", "Fechadas"];
const statusMap: Record<string, string> = {
  "Todas": "All",
  "Rascunho": "draft",
  "Ativas": "active",
  "Pausadas": "paused",
  "Fechadas": "closed",
};

const JobsPage = () => {
  const navigate = useNavigate();
  const { currentAccount } = useOrganization();
  const { duplicateJob, deleteJob } = useRecruitmentActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Todas");
  const [rowsPerPage, setRowsPerPage] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);
  const [publishDialogJob, setPublishDialogJob] = useState<{ id: string; title: string; description?: string; location?: string; status?: string } | null>(null);

  const { data: jobsData = [], isLoading } = useQuery({
    queryKey: ["recruitment-jobs", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("*, job_descriptions(id, title)")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  const jobs = jobsData.map((j: any) => ({
    id: j.id,
    title: j.title,
    department: j.department || "",
    location: j.location || "Remoto",
    type: j.employment_type || "Integral",
    budgetMin: Number(j.budget_min) || 0,
    budgetMax: Number(j.budget_max) || 0,
    status: j.status || "draft",
    createdAt: new Date(j.created_at || Date.now()),
    jobDescriptionId: j.job_description_id,
    jobDescriptionTitle: j.job_descriptions?.title,
    dataLimiteEntrega: j.data_limite_entrega || null,
    emGarantia: !!j.em_garantia,
    garantiaExpiraEm: j.garantia_expira_em || null,
    reposicaoDaVagaId: j.reposicao_da_vaga_id || null,
    autopilotEnabled: !!j.autopilot_enabled,
    autopilotTriggeredAt: j.autopilot_triggered_at || null,
    autopilotMinCandidates: j.autopilot_min_candidates ?? 3,
    autopilotMinScore: Number(j.autopilot_min_score) || 7,
  }));

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "Todas" || job.status === statusMap[activeTab];
    return matchesSearch && matchesTab;
  });

  const { sortConfig, handleSort, sortedData } = useTableSort(filteredJobs, { key: "createdAt", direction: "desc" });

  // Paginate the sorted data
  const startIndex = (currentPage - 1) * parseInt(rowsPerPage);
  const endIndex = startIndex + parseInt(rowsPerPage);
  const paginatedJobs = sortedData.slice(startIndex, endIndex);

  const totalPages = Math.ceil(sortedData.length / parseInt(rowsPerPage));

  const toggleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(filteredJobs.map((j) => j.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatBudget = (min: number, max: number) => {
    if (min === 0 && max === 0) return "-";
    return `R$ ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  const handleRowClick = (jobId: string) => {
    navigate(`/atracao-contratacao/recrutamento/jobs/${jobId}`);
  };

  const handleCopyId = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(jobId);
    toast.success("ID da vaga copiado!");
  };

  const handleCopyUrl = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getPublicJobUrl(jobId));
    toast.success("Link da vaga copiado!");
  };

  const handleDuplicateJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    duplicateJob.mutate({ jobId });
  };

  const handleDeleteClick = (e: React.MouseEvent, job: { id: string; title: string }) => {
    e.stopPropagation();
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (jobToDelete) {
      deleteJob.mutate({ jobId: jobToDelete.id });
    }
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <RecruitmentSetupAlert />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Vagas <span className="text-muted-foreground font-normal">({jobs.length})</span>
            </h1>
          </div>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar vaga
          </Button>
        </div>

        {/* Tabs and Filters */}
        <div className="flex items-center justify-between gap-4">
          <Tabs data-demo-anchor="shortlist-cards" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div data-demo-anchor="job-funnel" className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedJobs.length === paginatedJobs.length && paginatedJobs.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortableHeader
                  label="Vaga"
                  sortKey="title"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Localização"
                  sortKey="location"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Tipo"
                  sortKey="type"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>Orçamento</TableHead>
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>SLA</TableHead>
                <SortableHeader
                  label="Criada em"
                  sortKey="createdAt"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-8 w-8" />
                      <p>Nenhuma vaga encontrada</p>
                      <Button variant="outline" size="sm" onClick={() => setShowCreateWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira vaga
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedJobs.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(job.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={() => toggleSelect(job.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{job.title}</p>
                          {job.autopilotEnabled && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Bot
                                    className={`h-3.5 w-3.5 cursor-help ${job.autopilotTriggeredAt ? "text-green-600" : "text-blue-600 animate-pulse"}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {job.autopilotTriggeredAt ? (
                                    <p className="text-xs">
                                      <strong>Autopilot disparado</strong>
                                      <br />
                                      {formatBRT(new Date(job.autopilotTriggeredAt), "dd/MM/yyyy 'às' HH:mm")}
                                    </p>
                                  ) : (
                                    <p className="text-xs">
                                      <strong>Autopilot ativo</strong>
                                      <br />
                                      Aguardando {job.autopilotMinCandidates} candidatos com score ≥ {job.autopilotMinScore.toFixed(1)}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {job.reposicaoDaVagaId && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] px-1.5 py-0">
                              REPOSIÇÃO
                            </Badge>
                          )}
                          {job.emGarantia && (() => {
                            const days = job.garantiaExpiraEm
                              ? Math.ceil((new Date(job.garantiaExpiraEm).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                              : null;
                            const cls =
                              days === null ? "text-blue-600" :
                              days < 7 ? "text-red-600" :
                              days <= 14 ? "text-yellow-600" :
                              "text-green-600";
                            const tip = days !== null ? `Garantia: ${days}d restantes` : "Garantia ativa";
                            return <Shield className={`h-3.5 w-3.5 ${cls}`} aria-label={tip} />;
                          })()}
                          <JobPublishStatus jobId={job.id} />
                        </div>
                        <p className="text-xs text-muted-foreground">{job.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {job.type}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBudget(job.budgetMin, job.budgetMax)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={job.status} />
                        <JobDistributionBadges jobId={job.id} accountId={currentAccount?.id} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <JobSlaBadge deadline={job.dataLimiteEntrega} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBRT(job.createdAt, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setPublishDialogJob({ id: job.id, title: job.title, location: job.location, status: job.status });
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Publicar em plataformas
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => handleDuplicateJob(e, job.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar vaga
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyId(e, job.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar ID da vaga
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyUrl(e, job.id)}>
                            <Link className="h-4 w-4 mr-2" />
                            Copiar URL da página
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(e, job)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir vaga
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>Página {currentPage} de {totalPages || 1}</span>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Create Job Wizard */}
        <CreateJobWizard
          open={showCreateWizard}
          onOpenChange={setShowCreateWizard}
          onSuccess={(jobId) => {
            navigate(`/atracao-contratacao/recrutamento/jobs/${jobId}`);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir vaga</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a vaga "{jobToDelete?.title}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Publish Dialog */}
        {publishDialogJob && (
          <JobPublishDialog
            open={!!publishDialogJob}
            onOpenChange={(open) => !open && setPublishDialogJob(null)}
            job={publishDialogJob}
          />
        )}
      </div>
    </RecruitmentLayout>
  );
};

export default JobsPage;
