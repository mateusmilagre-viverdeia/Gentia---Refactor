import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useJobWorkflow } from "@/hooks/useJobWorkflow";
import { useRecruitmentSessions, RECRUITMENT_SESSIONS_KEY } from "@/hooks/useRecruitmentSessions";
import { useRecruitmentCandidateMap } from "@/hooks/useRecruitmentCandidateMap";
import { KanbanCard } from "@/components/recruitment/kanban/KanbanCard";
import { CandidateProfileModal } from "@/components/recruitment/CandidateProfileModal";
import type { ApplicationData } from "@/components/recruitment/kanban/KanbanBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Brain, TestTubeDiagonal, CheckCircle2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowKanbanTabProps {
  jobId: string;
}

const STEP_LABELS: Record<string, string> = {
  screening: "Triagem",
  cultural: "Fit Cultural",
  disc: "DISC",
  technical: "Técnico",
};

const STEP_ICONS: Record<string, typeof Bot> = {
  screening: Filter,
  cultural: Bot,
  disc: Brain,
  technical: TestTubeDiagonal,
};

const STEP_COLORS: Record<string, string> = {
  screening: "bg-amber-500",
  cultural: "bg-purple-500",
  disc: "bg-indigo-500",
  technical: "bg-cyan-500",
};

export function WorkflowKanbanTab({ jobId }: WorkflowKanbanTabProps) {
  const { currentAccount } = useOrganization();
  const { steps: workflowSteps, isLoading: stepsLoading } = useJobWorkflow({
    jobId,
    accountId: currentAccount?.id,
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Use unified sessions hook filtered by jobId
  const { data: sessions, isLoading: sessionsLoading } = useRecruitmentSessions(
    currentAccount?.id ? { accountId: currentAccount.id, jobId } : null
  );

  // Fetch screening results for this job
  const { data: screeningResults } = useQuery({
    queryKey: [RECRUITMENT_SESSIONS_KEY, "screening", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_screening_results")
        .select("id, candidate_id, job_id, passed, created_at")
        .eq("job_id", jobId);
      return data || [];
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });

  // Convert workflow steps to the format expected by buildCandidateMap
  const workflowStepsForMap = useMemo(
    () => workflowSteps.map(s => ({ job_id: jobId, step_type: s.step_type })),
    [workflowSteps, jobId]
  );

  const candidateMap = useRecruitmentCandidateMap(
    sessions,
    workflowStepsForMap,
    screeningResults as any,
  );

  // Also enrich from applications that have no sessions yet
  const { data: applications } = useQuery({
    queryKey: [RECRUITMENT_SESSIONS_KEY, "apps", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id, status, applied_at, candidate:recruitment_candidates(id, first_name, last_name, email)")
        .eq("job_id", jobId);
      return data || [];
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });

  // Build columns from workflow steps + Aprovados column
  const columns = useMemo(() => {
    const stepTypes = workflowSteps.map(s => s.step_type);
    const cols: { key: string; label: string; icon: typeof Bot; color: string; applications: ApplicationData[] }[] = [];

    for (const step of workflowSteps) {
      cols.push({
        key: step.step_type,
        label: STEP_LABELS[step.step_type] || step.step_type,
        icon: STEP_ICONS[step.step_type] || Bot,
        color: STEP_COLORS[step.step_type] || "bg-blue-500",
        applications: [],
      });
    }

    cols.push({
      key: "_approved",
      label: "Aprovados",
      icon: CheckCircle2,
      color: "bg-green-500",
      applications: [],
    });

    // Add candidates from applications that have no sessions
    const candidatesInMap = new Set(Array.from(candidateMap.values()).map(c => c.candidateId));
    if (applications) {
      for (const app of applications as any[]) {
        const cid = app.candidate?.id;
        if (!cid || candidatesInMap.has(cid)) continue;
        // This candidate has no sessions yet, place in first step
        const appData: ApplicationData = {
          id: app.id,
          candidateId: cid,
          candidateName: [app.candidate?.first_name, app.candidate?.last_name].filter(Boolean).join(" ") || "Candidato",
          candidateEmail: app.candidate?.email || "",
          jobId,
          jobTitle: "",
          jobDepartment: "",
          status: stepTypes[0] || "screening",
          stageId: null,
          interviewStatus: null,
          appliedAt: new Date(app.applied_at),
          evaluatedAt: null,
          matchingScore: null,
        };
        const col = cols.find(c => c.key === (stepTypes[0] || "screening"));
        if (col) col.applications.push(appData);
      }
    }

    // Add candidates from unified map
    for (const candidate of candidateMap.values()) {
      const scores = [candidate.cultureScore, candidate.discScore, candidate.techScore].filter(s => s != null) as number[];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      const targetColumn = candidate.currentStage === "approved" ? "_approved" : candidate.currentStage;

      const appData: ApplicationData = {
        id: candidate.applicationId || candidate.candidateId,
        candidateId: candidate.candidateId,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobId,
        jobTitle: "",
        jobDepartment: "",
        status: targetColumn,
        stageId: null,
        interviewStatus: null,
        appliedAt: candidate.enteredAt,
        evaluatedAt: null,
        matchingScore: avgScore,
      };

      const col = cols.find(c => c.key === targetColumn);
      if (col) col.applications.push(appData);
    }

    return cols;
  }, [workflowSteps, candidateMap, applications, jobId]);

  const totalCandidates = Array.from(candidateMap.values()).length + 
    (applications?.filter((a: any) => !candidateMap.has(`${a.candidate?.id}|${jobId}`)).length || 0);

  const handleViewDetails = (candidateId: string) => {
    const candidate = candidateMap.get(
      Array.from(candidateMap.keys()).find(k => k.startsWith(candidateId + "|")) || ""
    );
    setSelectedSessionId(candidate?.cultureSessionId || null);
    setSelectedApplicationId(candidate?.applicationId || null);
    setModalOpen(true);
  };

  const handleHire = () => {};
  const handleReject = () => {};

  if (stepsLoading || sessionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-64" />
          ))}
        </div>
      </div>
    );
  }

  if (workflowSteps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum workflow configurado para esta vaga.</p>
        <p className="text-sm mt-1">Configure etapas de workflow durante a criação ou edição da vaga.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Progressão dos candidatos no workflow ({totalCandidates} candidatos ativos)
        </h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className={cn(
                "flex flex-col w-72 min-h-[400px] rounded-lg border bg-muted/30 flex-shrink-0",
                col.key === "_approved" && "border-green-200 bg-green-50/30"
              )}
            >
              <div className="flex items-center gap-2 p-3 border-b">
                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{col.label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {col.applications.length}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.applications.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    Nenhum candidato nesta etapa
                  </div>
                ) : (
                  col.applications.map((appData) => (
                    <KanbanCard
                      key={appData.id}
                      application={appData}
                      onViewDetails={handleViewDetails}
                      onHire={handleHire}
                      onReject={handleReject}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CandidateProfileModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sessionId={selectedSessionId}
        applicationId={selectedApplicationId}
      />
    </div>
  );
}
