import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccount } from "@/hooks/useAccount";
import { useEPRole } from "@/hooks/useEPRole";
import { useConsultantAssignments } from "@/hooks/useConsultantAssignments";
import { useTableSort } from "@/hooks/useTableSort";
import { useRecruitmentSessions, RECRUITMENT_SESSIONS_KEY } from "@/hooks/useRecruitmentSessions";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Skeleton } from "@/components/ui/skeleton";
import { InterviewDetailsSheet } from "@/components/recruitment/InterviewDetailsSheet";
import { TechnicalInterviewResultSheet } from "@/components/recruitment/TechnicalInterviewResultSheet";
import { DISCInterviewResultSheet } from "@/components/recruitment/DISCInterviewResultSheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Search, MoreHorizontal, Clock, Link as LinkIcon, Video, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { X } from "lucide-react";
import { useResetCandidateStep, type ResetStepType } from "@/hooks/useResetCandidateStep";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import type { UnifiedSession, UnifiedSessionType } from "@/hooks/useRecruitmentSessions";
import { formatBRT } from "@/lib/datetime";

type InterviewType = UnifiedSessionType;

function inviteToastFromWhatsAppStatus(whatsapp: unknown) {
  const w = whatsapp as any;
  if (!w) return "Convite reenviado com sucesso";
  if (w.attempted === true && w.sent === true) return "Convite reenviado por e-mail e WhatsApp";
  if (w.attempted === false && w.sent === false && w.skipped_reason === "no_phone") {
    return "Convite reenviado por e-mail (sem telefone para WhatsApp)";
  }
  if (w.attempted === true && w.sent === false) return "Convite reenviado por e-mail; WhatsApp falhou";
  return "Convite reenviado com sucesso";
}

const INTERVIEW_STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "scheduled", label: "Agendada" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
];

const INTERVIEW_TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "cultural", label: "Fit Cultural" },
  { value: "disc", label: "Fit Comportamental" },
  { value: "technical", label: "Fit Técnico" },
];

const TYPE_BADGE_CONFIG: Record<InterviewType, { label: string; variant: "info" | "purple" | "warning" }> = {
  cultural: { label: "Fit Cultural", variant: "info" },
  disc: { label: "Fit Comportamental", variant: "purple" },
  technical: { label: "Fit Técnico", variant: "warning" },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sessionToRow(s: UnifiedSession) {
  const initials = s.candidateName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    id: s.id,
    interviewType: s.type,
    candidateName: s.candidateName,
    candidateEmail: s.candidateEmail,
    initials,
    jobTitle: s.jobTitle,
    agentName: s.agentName,
    duration: formatDuration(s.durationSeconds),
    status: s.status,
    evaluation: s.score !== null ? (s.score >= 70 ? "approved" : s.score >= 40 ? "pending" : "rejected") : "n/a",
    matchingScore: s.score,
    date: s.createdAt,
    completedAt: s.completedAt,
    startedAt: s.startedAt,
    candidateId: s.candidateId,
    candidateProfileId: s.candidateProfileId,
    jobId: s.jobId,
    agentId: s.agentId,
    applicationId: s.applicationId || "",
    isArchived: s.isArchived === true,
    attemptNumber: s.attemptNumber ?? null,
  };
}

const InterviewsPage = () => {
  const { currentAccount } = useOrganization();
  const { accountRole } = useAccount();
  const { isSuperAdmin, isHeadCS, isEPConsultant } = useEPRole();
  const { assignments: consultantAssignments } = useConsultantAssignments();
  const isConsultantForCurrentAccount = !!currentAccount?.id
    && (consultantAssignments || []).some(a => a.account_id === currentAccount.id && a.active);
  const canManageRecruitment = isSuperAdmin || isHeadCS || isEPConsultant
    || isConsultantForCurrentAccount
    || (accountRole && ['owner', 'admin', 'admin_rh'].includes(accountRole));
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [interviewToCancel, setInterviewToCancel] = useState<{ id: string; type: InterviewType } | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [technicalSheetOpen, setTechnicalSheetOpen] = useState(false);
  const [selectedTechnicalId, setSelectedTechnicalId] = useState<string | null>(null);
  const [discSheetOpen, setDiscSheetOpen] = useState(false);
  const [selectedDiscId, setSelectedDiscId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [interviewToReset, setInterviewToReset] = useState<{ candidateId: string; jobId: string; applicationId: string; stepType: ResetStepType; candidateName: string } | null>(null);
  const resetStepMutation = useResetCandidateStep();

  // Use unified sessions hook
  const { data: sessions = [], isLoading } = useRecruitmentSessions(
    currentAccount?.id ? { accountId: currentAccount.id } : null
  );

  const interviews = sessions.map(sessionToRow);

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || interview.status === statusFilter;
    const matchesType = typeFilter === "all" || interview.interviewType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const { sortConfig, handleSort, sortedData: sortedInterviews } = useTableSort(filteredInterviews, { key: "date", direction: "desc" });

  const toggleSelectAll = () => {
    if (selectedInterviews.length === sortedInterviews.length) {
      setSelectedInterviews([]);
    } else {
      setSelectedInterviews(sortedInterviews.map((i) => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInterviews((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (interviewId: string, interviewType: InterviewType) => {
    if (interviewType === "cultural") {
      setSelectedInterviewId(interviewId);
      setDetailsSheetOpen(true);
    } else if (interviewType === "technical") {
      setSelectedTechnicalId(interviewId);
      setTechnicalSheetOpen(true);
    } else if (interviewType === "disc") {
      setSelectedDiscId(interviewId);
      setDiscSheetOpen(true);
    }
  };

  // Cancel interview mutation
  const cancelInterviewMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: InterviewType }) => {
      const tableName = type === "cultural"
        ? "culture_interview_sessions"
        : type === "disc"
          ? "candidate_disc_sessions"
          : "technical_interview_sessions";

      const { error } = await (supabase as any)
        .from(tableName)
        .update({ status: "cancelled", ...(type !== "disc" ? { updated_at: new Date().toISOString() } : {}) })
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECRUITMENT_SESSIONS_KEY] });
      toast.success("Entrevista cancelada");
      setCancelDialogOpen(false);
      setInterviewToCancel(null);
    },
    onError: () => {
      toast.error("Erro ao cancelar entrevista");
    },
  });

  // Resend invite mutation (cultural only)
  const resendInviteMutation = useMutation({
    mutationFn: async (interview: { id: string; candidateId: string; jobId: string }) => {
      const { data, error } = await supabase.functions.invoke("send-interview-invite", {
        body: {
          session_id: interview.id,
          candidate_id: interview.candidateId,
          job_id: interview.jobId,
          is_resend: true,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [RECRUITMENT_SESSIONS_KEY] });
      toast.success(inviteToastFromWhatsAppStatus(data?.whatsapp));
    },
    onError: (error: Error) => {
      console.error("Error resending invite:", error);
      toast.error(`Erro ao reenviar convite: ${error.message}`);
    },
  });

  const handleCancelClick = (interviewId: string, interviewType: InterviewType) => {
    setInterviewToCancel({ id: interviewId, type: interviewType });
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (interviewToCancel) {
      cancelInterviewMutation.mutate(interviewToCancel);
    }
  };

  const handleResetClick = (interview: { candidateId: string; jobId: string; applicationId: string; interviewType: InterviewType; candidateName: string }) => {
    if (!interview.applicationId) {
      toast.error("Não foi possível encontrar a candidatura associada.");
      return;
    }
    setInterviewToReset({
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      applicationId: interview.applicationId,
      stepType: interview.interviewType as ResetStepType,
      candidateName: interview.candidateName,
    });
    setResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    if (interviewToReset) {
      resetStepMutation.mutate(
        {
          candidateId: interviewToReset.candidateId,
          jobId: interviewToReset.jobId,
          applicationId: interviewToReset.applicationId,
          stepType: interviewToReset.stepType,
        },
        {
          onSuccess: () => {
            setResetDialogOpen(false);
            setInterviewToReset(null);
          },
        }
      );
    }
  };

  const handleResendInvite = async (interview: { id: string; candidateId: string; jobId: string; interviewType: InterviewType }) => {
    if (interview.interviewType === "cultural") {
      resendInviteMutation.mutate({
        id: interview.id,
        candidateId: interview.candidateId,
        jobId: interview.jobId,
      });
    } else {
      try {
        const functionName = interview.interviewType === "disc"
          ? "send-disc-invite"
          : "send-technical-invite";
        const { data, error } = await invokeAuthenticatedFunction(functionName, {
          session_id: interview.id,
          candidate_id: interview.candidateId,
          job_id: interview.jobId,
          is_resend: true,
        });
        if (error) throw new Error(error);
        queryClient.invalidateQueries({ queryKey: [RECRUITMENT_SESSIONS_KEY] });
        toast.success("Convite reenviado com sucesso");
      } catch (err: any) {
        toast.error(`Erro ao reenviar convite: ${err.message}`);
      }
    }
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Entrevistas <span className="text-muted-foreground font-normal">({interviews.length})</span>
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entrevistas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || typeFilter !== "all") && (
              <Button variant="ghost" size="icon" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div data-demo-anchor="interview-list" className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedInterviews.length === sortedInterviews.length && sortedInterviews.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortableHeader
                  label="Candidato"
                  sortKey="candidateName"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>Tipo</TableHead>
                <SortableHeader
                  label="Vaga"
                  sortKey="jobTitle"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <TableHead>Agente</TableHead>
                <SortableHeader
                  label="Duração"
                  sortKey="duration"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Score"
                  sortKey="matchingScore"
                  currentSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Data"
                  sortKey="date"
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
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : sortedInterviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Video className="h-8 w-8" />
                      <p>Nenhuma entrevista encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedInterviews.map((interview) => {
                  const typeCfg = TYPE_BADGE_CONFIG[interview.interviewType];

                  return (
                    <TableRow
                      key={`${interview.interviewType}-${interview.id}-${interview.isArchived ? 'a' : 'l'}`}
                      className={`cursor-pointer hover:bg-muted/50 ${interview.isArchived ? "opacity-70" : ""}`}
                      onClick={() => handleRowClick(interview.id, interview.interviewType)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedInterviews.includes(interview.id)}
                          onCheckedChange={() => toggleSelect(interview.id)}
                          disabled={interview.isArchived}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                              {interview.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{interview.candidateName}</p>
                              {interview.isArchived && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  Tentativa {interview.attemptNumber ?? "anterior"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{interview.candidateEmail || "Sem e-mail"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto text-foreground hover:text-primary text-sm">
                          <LinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{interview.jobTitle}</span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{interview.agentName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Clock className="h-3.5 w-3.5" />
                          {interview.duration}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={interview.status} />
                      </TableCell>
                      <TableCell>
                        {interview.matchingScore !== null && interview.matchingScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                interview.matchingScore >= 70 ? "bg-green-500" :
                                interview.matchingScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                            />
                            <span className={`text-sm font-medium ${
                              interview.matchingScore >= 70 ? "text-green-600 dark:text-green-400" :
                              interview.matchingScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                            }`}>
                              {interview.matchingScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBRT(interview.date, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(interview.id, interview.interviewType);
                            }}>
                              Ver detalhes
                            </DropdownMenuItem>
                            {!interview.isArchived && interview.status === "pending" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResendInvite(interview);
                                }}
                                disabled={resendInviteMutation.isPending}
                              >
                                {resendInviteMutation.isPending ? "Enviando..." : "Reenviar convite"}
                              </DropdownMenuItem>
                            )}
                            {!interview.isArchived && canManageRecruitment && !["cancelled"].includes(interview.status) && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetClick(interview);
                                }}
                                disabled={resetStepMutation.isPending}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {resetStepMutation.isPending ? "Resetando..." : "Resetar etapa"}
                              </DropdownMenuItem>
                            )}
                            {!interview.isArchived && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelClick(interview.id, interview.interviewType);
                                }}
                                disabled={interview.status === "completed" || interview.status === "cancelled"}
                              >
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Interview Details Sheet (cultural) */}
      <InterviewDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        interviewId={selectedInterviewId}
      />

      {/* Technical Interview Details Sheet */}
      <TechnicalInterviewResultSheet
        open={technicalSheetOpen}
        onOpenChange={setTechnicalSheetOpen}
        sessionId={selectedTechnicalId}
      />

      {/* DISC Interview Details Sheet */}
      <DISCInterviewResultSheet
        open={discSheetOpen}
        onOpenChange={setDiscSheetOpen}
        sessionId={selectedDiscId}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar entrevista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará a entrevista como cancelada. O candidato não poderá mais acessar o link de entrevista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar entrevista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Step Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Resetar etapa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {interviewToReset && (
                <>
                  Os dados da avaliação de <strong>{interviewToReset.candidateName}</strong> na etapa{" "}
                  <strong>
                    {interviewToReset.stepType === "cultural" ? "Fit Cultural" : interviewToReset.stepType === "disc" ? "Fit Comportamental" : "Fit Técnico"}
                  </strong>{" "}
                  serão excluídos permanentemente e o candidato poderá refazer a etapa.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetStepMutation.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={resetStepMutation.isPending}
            >
              {resetStepMutation.isPending ? "Resetando..." : "Confirmar Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RecruitmentLayout>
  );
};

export default InterviewsPage;
