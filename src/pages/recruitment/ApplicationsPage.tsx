import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Search, MoreHorizontal, Link as LinkIcon, FileText, UserCheck, ChevronRight, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { HireCandidateDialog } from "@/components/recruitment/HireCandidateDialog";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { ViewToggle, ViewMode } from "@/components/recruitment/ViewToggle";
import { KanbanBoard, ApplicationData } from "@/components/recruitment/kanban/KanbanBoard";
import { BulkActionsBar } from "@/components/recruitment/BulkActionsBar";
import { DiscBatchByFilterDialog } from "@/components/recruitment/DiscBatchByFilterDialog";
import { useAccount } from "@/hooks/useAccount";
import { formatBRT } from "@/lib/datetime";

const APPLICATION_STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "applied", label: "Aplicado" },
  { value: "screening", label: "Triagem" },
  { value: "interview", label: "Entrevista" },
  { value: "disc", label: "Fit Comportamental (DISC)" },
  { value: "evaluation", label: "Avaliação" },
  { value: "offer", label: "Proposta" },
  { value: "hired", label: "Contratado" },
  { value: "desqualificado", label: "Desqualificado" },
  { value: "rejected", label: "Rejeitado" },
];

const ApplicationsPage = () => {
  const navigate = useNavigate();
  const { currentAccount } = useOrganization();
  const { canManageRH } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [discFilterDialogOpen, setDiscFilterDialogOpen] = useState(false);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [applicationToReject, setApplicationToReject] = useState<string | null>(null);
  const [selectedForHire, setSelectedForHire] = useState<{
    candidate: { id: string; name: string; email?: string };
    application: { id: string; jobTitle?: string; jobDepartment?: string; jobId?: string };
  } | null>(null);
  
  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("applications-view-mode");
    return (saved as ViewMode) || "table";
  });

  useEffect(() => {
    localStorage.setItem("applications-view-mode", viewMode);
  }, [viewMode]);

  const { updateApplicationStatus } = useRecruitmentActions();

  const { data: applicationsData = [], isLoading } = useQuery({
    queryKey: ["recruitment-applications", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_applications")
        .select(`
          *,
          candidate:recruitment_candidates(id, first_name, last_name, email),
          job:recruitment_jobs(id, title)
        `)
        .eq("account_id", currentAccount.id)
        .neq("source", "test-e2e")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  // Fetch culture interview scores
  const { data: cultureScoresData = [] } = useQuery({
    queryKey: ["culture-interview-scores", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("culture_interview_sessions")
        .select("candidate_id, job_id, matching_score")
        .eq("account_id", currentAccount.id)
        .eq("status", "completed")
        .not("matching_score", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  // Create a map for quick score lookup by candidate_id + job_id
  const scoreMap = useMemo(() => {
    return new Map(
      cultureScoresData.map((s) => [`${s.candidate_id}-${s.job_id}`, s.matching_score])
    );
  }, [cultureScoresData]);

  // Fetch interviews to check status
  const { data: interviewsData = [] } = useQuery({
    queryKey: ["recruitment-interviews-status", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_interviews")
        .select("application_id, status")
        .eq("account_id", currentAccount.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  const interviewStatusMap = new Map(
    interviewsData.map((i) => [i.application_id, i.status])
  );

  const applications: ApplicationData[] = applicationsData.map((a: any) => {
    const candidateName = a.candidate 
      ? `${a.candidate.first_name} ${a.candidate.last_name || ""}`.trim()
      : "Candidato";
    const candidateEmail = a.candidate?.email || "";
    const candidateId = a.candidate?.id || "";
    const jobId = a.job?.id || "";
    const jobTitle = a.job?.title || "Vaga";
    const jobDepartment = a.job?.department || "";
    const interviewStatus = interviewStatusMap.get(a.id);

    // Use updated_at as evaluated date if status indicates evaluation happened
    const isEvaluated = ["interview", "offer", "hired", "rejected", "desqualificado"].includes(a.status || "");

    return {
      id: a.id,
      candidateId,
      candidateName,
      candidateEmail,
      jobId,
      jobTitle,
      jobDepartment,
      status: a.status || "applied",
      interviewStatus: interviewStatus === "completed" ? "completed" : null,
      appliedAt: new Date(a.applied_at || Date.now()),
      evaluatedAt: isEvaluated && a.updated_at ? new Date(a.updated_at) : null,
      matchingScore: scoreMap.get(`${candidateId}-${jobId}`) ?? null,
    };
  });

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const discTargets = useMemo(() => {
    // applicationsData includes `*` columns (including session_id when present)
    const selected = new Set(selectedApplications);
    return (applicationsData as any[])
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        applicationId: a.id,
        candidateId: a.candidate?.id ?? a.candidate_id ?? null,
        jobId: a.job?.id ?? a.job_id ?? null,
        sessionId: a.session_id ?? a.sessionId ?? null,
      }));
  }, [applicationsData, selectedApplications]);

  const toggleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredApplications.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedApplications((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleHireClick = (application: typeof applications[0]) => {
    setSelectedForHire({
      candidate: {
        id: application.candidateId,
        name: application.candidateName,
        email: application.candidateEmail,
      },
      application: {
        id: application.id,
        jobTitle: application.jobTitle,
        jobDepartment: application.jobDepartment,
        jobId: (application as any).jobId,
      },
    });
    setHireDialogOpen(true);
  };

  const handleRejectClick = (applicationId: string) => {
    setApplicationToReject(applicationId);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (applicationToReject) {
      const app = applications.find((a) => a.id === applicationToReject);
      updateApplicationStatus.mutate({
        applicationId: applicationToReject,
        status: "rejected",
        candidateId: app?.candidateId,
        jobId: app?.jobId,
        previousStatus: app?.status,
      });
      setRejectDialogOpen(false);
      setApplicationToReject(null);
    }
  };

  const handleAdvanceStage = (applicationId: string, newStatus: string) => {
    const app = applications.find((a) => a.id === applicationId);
    updateApplicationStatus.mutate({
      applicationId,
      status: newStatus,
      candidateId: app?.candidateId,
      jobId: app?.jobId,
      previousStatus: app?.status,
    });
  };

  const handleViewDetails = (candidateId: string) => {
    navigate(`/atracao-contratacao/recrutamento/candidates?view=${candidateId}`);
  };

  const stageOptions = [
    { value: "screening", label: "Triagem" },
    { value: "interview", label: "Entrevista" },
    { value: "disc", label: "Fit Comportamental (DISC)" },
    { value: "evaluation", label: "Avaliação" },
    { value: "offer", label: "Proposta" },
  ];

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Aplicações <span className="text-muted-foreground font-normal">({applications.length})</span>
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aplicações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusFilter !== "all" && (
              <Button variant="ghost" size="icon" onClick={() => setStatusFilter("all")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          {canManageRH && currentAccount?.id && (
            <Button variant="outline" onClick={() => setDiscFilterDialogOpen(true)}>
              DISC por filtro…
            </Button>
          )}
        </div>

        {/* Content - Table or Kanban */}
        {viewMode === "kanban" ? (
          isLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-72 h-[500px] rounded-lg border bg-muted/30">
                  <div className="p-3 border-b">
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="p-2 space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-24 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard
              applications={filteredApplications}
              onViewDetails={handleViewDetails}
              onHire={handleHireClick}
              onReject={handleRejectClick}
            />
          )
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entrevista</TableHead>
                  <TableHead>Aplicou em</TableHead>
                  <TableHead>Avaliado em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        <p>Nenhuma aplicação encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedApplications.includes(application.id)}
                          onCheckedChange={() => toggleSelect(application.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {application.candidateName.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{application.candidateName}</p>
                            <p className="text-xs text-muted-foreground">{application.candidateEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto text-foreground hover:text-primary">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {application.jobTitle}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} />
                      </TableCell>
                      <TableCell>
                        {application.interviewStatus ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            CONCLUÍDA
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBRT(application.appliedAt, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {application.evaluatedAt ? formatBRT(application.evaluatedAt, "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(application.candidateId)}>
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/atracao-contratacao/recrutamento/interviews?candidate=${application.candidateId}`)}>
                              Agendar entrevista
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Avançar etapa
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {stageOptions.map((stage) => (
                                  <DropdownMenuItem 
                                    key={stage.value}
                                    onClick={() => handleAdvanceStage(application.id, stage.value)}
                                    disabled={application.status === stage.value}
                                  >
                                    {stage.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleHireClick(application)}
                              className="text-green-600 focus:text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Contratar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRejectClick(application.id)}
                            >
                              Rejeitar
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
        )}
      </div>

      {/* Hire Dialog */}
      {selectedForHire && (
        <HireCandidateDialog
          open={hireDialogOpen}
          onOpenChange={setHireDialogOpen}
          candidate={selectedForHire.candidate}
          application={selectedForHire.application}
        />
      )}

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará a candidatura como rejeitada. O candidato poderá se candidatar novamente a outras vagas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedApplications.length}
        selectedApplicationIds={selectedApplications}
        onClearSelection={() => setSelectedApplications([])}
        discTargets={discTargets}
      />

      {currentAccount?.id && (
        <DiscBatchByFilterDialog
          open={discFilterDialogOpen}
          onOpenChange={setDiscFilterDialogOpen}
          accountId={currentAccount.id}
          filters={{ status: statusFilter, search: searchQuery }}
        />
      )}
    </RecruitmentLayout>
  );
};

export default ApplicationsPage;
