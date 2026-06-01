import { useState, useEffect, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  GraduationCap,
  ThumbsUp,
  ThumbsDown,
  Linkedin,
  Trash2,
  Brain,
  Target,
  FileText,
  TrendingUp,
  TrendingDown,
  RotateCcw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CopilotButton } from "./copilot";
import { ResetStepDialog } from "./ResetStepDialog";
import { CandidateActivityTimeline } from "./CandidateActivityTimeline";
import { CandidateClientHistory } from "./CandidateClientHistory";
import { AttemptHistorySection } from "./AttemptHistorySection";
import { DISCResultSection } from "./DISCResultSection";
import { TechnicalOverviewTab } from "./technical-interview-details/TechnicalOverviewTab";
import { BehavioralInsightsSection } from "./interview-details/BehavioralInsightsSection";
import { ResumeIntelligenceSection } from "./interview-details/ResumeIntelligenceSection";
import { CVDeepAnalysisCard } from "./CVDeepAnalysisCard";
import { TechnicalSkillsTab } from "./technical-interview-details/TechnicalSkillsTab";
import { useTechnicalInterviewDetails } from "@/hooks/useTechnicalInterviewDetails";
import { Code } from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { useAccount } from "@/hooks/useAccount";
import { useEPRole } from "@/hooks/useEPRole";
import { formatBRT } from "@/lib/datetime";

interface CandidateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  applicationId?: string | null;
}

interface RadarDataPoint {
  pillar: string;
  fullPillar?: string;
  candidato: number;
  empresa: number;
  fullMark: number;
}

interface AlignedResponse {
  questionIndex: number;
  questionText: string;
  candidateResponse: string;
  reason: string;
  valueLabel?: string | null;
}

// Helper to parse pillar evaluations from analysis
const parsePillarEvaluations = (analysis: string) => {
  const pillarMatch = analysis.match(/## Avaliação por Pilar:\n([\s\S]*?)(?=\n\n##|$)/);
  if (!pillarMatch) return [];
  
  const pillarSection = pillarMatch[1];
  const pillars: Array<{
    name: string;
    alignment: string;
    justification: string;
    score: number;
  }> = [];
  
  const matches = pillarSection.matchAll(/\*\*(.+?)\*\*\s*\((\w+)\):\s*(.+?)(?=\n\*\*|$)/gs);
  
  for (const match of matches) {
    const [, name, alignment, justification] = match;
    let score = 50;
    if (alignment === "Forte") score = 85;
    else if (alignment === "Moderado") score = 65;
    else if (alignment === "Baixo" || alignment === "Fraco") score = 30;
    
    pillars.push({
      name: name.trim(),
      alignment,
      justification: justification.trim(),
      score
    });
  }
  
  return pillars;
};

export function CandidateProfileModal({
  open,
  onOpenChange,
  sessionId,
  applicationId,
}: CandidateProfileModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { deleteApplication } = useRecruitmentActions();
  const { accountRole } = useAccount();
  const { isSuperAdmin, isEPConsultant } = useEPRole();
  const canManageRecruitment = isSuperAdmin || isEPConsultant || (accountRole && ['owner', 'admin', 'admin_rh'].includes(accountRole));

  // Fetch session with candidate data AND application in parallel
  const { data: sessionData, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["candidate-profile-modal", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      console.log("[CandidateProfileModal] Fetching session data for:", sessionId);
      
      // Fetch session data - use maybeSingle to avoid throwing on no results
      const { data: session, error } = await supabase
        .from("culture_interview_sessions")
        .select(`
          id,
          matching_score,
          matching_analysis,
          status,
          completed_at,
          created_at,
          job_id,
          attempt_number,
          aligned_responses,
          misaligned_responses,
          candidate_radar_data,
          company_radar_data,
          candidate:candidate_profiles(
            id, full_name, first_name, last_name, avatar_url,
            user_id, phone, city, birth_date, linkedin_url,
            gender
          )
        `)
        .eq("id", sessionId)
        .maybeSingle();
      
      console.log("[CandidateProfileModal] Query result:", { 
        sessionId, 
        hasSession: !!session, 
        error: error?.message,
        matching_score: session?.matching_score,
        matching_analysis: session?.matching_analysis?.substring(0, 100)
      });
      
      if (error) {
        console.error("[CandidateProfileModal] Query error:", error);
        throw error;
      }
      if (!session) {
        console.warn("[CandidateProfileModal] No session found for ID:", sessionId);
        return null;
      }
      
      // Fetch email, job, and application ID in parallel
      const jobResult = session.job_id
        ? await supabase
            .from("recruitment_jobs")
            .select("id, title, agent_id")
            .eq("id", session.job_id)
            .maybeSingle()
        : { data: null };

      const [emailResult, applicationResult, agentResult, criteriaResult] = await Promise.all([
        session.candidate?.user_id
          ? supabase
              .from("profiles")
              .select("email")
              .eq("id", session.candidate.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        session.candidate?.id && session.job_id
          ? supabase
              .from("recruitment_applications")
              .select("id, candidate_id")
              .eq("candidate_id", session.candidate.id)
              .eq("job_id", session.job_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        (jobResult as any)?.data?.agent_id
          ? supabase
              .from("recruitment_agents")
              .select("minimum_score")
              .eq("id", (jobResult as any).data.agent_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Fetch criteria evaluations from dedicated table
        supabase
          .from("culture_interview_criteria_evaluations")
          .select("*")
          .eq("session_id", sessionId)
          .order("weight_multiplier", { ascending: false })
      ]);
      
      // Create a modified candidate object with email
      const candidateWithEmail = session.candidate ? {
        ...session.candidate,
        email: emailResult.data?.email || null
      } : null;
      
      return {
        ...session,
        candidate: candidateWithEmail,
        job: jobResult.data || null,
        _applicationId: applicationResult.data?.id || null,
        _recruitmentCandidateId: applicationResult.data?.candidate_id || null,
        _agentMinimumScore: agentResult.data?.minimum_score ?? null,
        _criteriaEvaluations: criteriaResult.data || [],
      };
    },
    enabled: !!sessionId && open,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  // Fallback: fetch candidate data via applicationId when no sessionId
  const { data: fallbackData, isLoading: fallbackLoading } = useQuery({
    queryKey: ["candidate-profile-fallback", applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      const { data: app, error } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          job_id,
          candidate_id,
          candidate:recruitment_candidates(id, first_name, last_name, email, phone),
          job:recruitment_jobs(id, title)
        `)
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return app;
    },
    enabled: !sessionId && !!applicationId && open,
  });

  // Force refetch when sessionId changes
  useEffect(() => {
    if (sessionId && open) {
      refetch();
    }
  }, [sessionId, open, refetch]);

  const session = sessionData;
  const effectiveApplicationId = applicationId || sessionData?._applicationId || null;
  const recruitmentCandidateId = (sessionData as any)?._recruitmentCandidateId || fallbackData?.candidate_id || null;
  const agentMinimumScore = sessionData?._agentMinimumScore;
  const criteriaEvaluations = (sessionData as any)?._criteriaEvaluations || [];
  
  // Debug logging for session data
  useEffect(() => {
    if (session) {
      console.log("[CandidateProfileModal] Session loaded:", {
        id: session.id,
        matching_score: session.matching_score,
        has_analysis: !!session.matching_analysis,
        analysis_preview: session.matching_analysis?.substring(0, 100),
        candidate_name: session.candidate?.full_name,
        aligned_count: (session.aligned_responses as any[])?.length || 0,
        misaligned_count: (session.misaligned_responses as any[])?.length || 0
      });
    }
  }, [session]);

  // Fetch work history
  const { data: workHistory = [] } = useQuery({
    queryKey: ["candidate-work-history", session?.candidate?.id],
    queryFn: async () => {
      if (!session?.candidate?.id) return [];
      const { data, error } = await supabase
        .from("candidate_work_history")
        .select("*")
        .eq("candidate_profile_id", session.candidate.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.candidate?.id && open,
  });

  // Fetch education
  const { data: education = [] } = useQuery({
    queryKey: ["candidate-education", session?.candidate?.id],
    queryFn: async () => {
      if (!session?.candidate?.id) return [];
      const { data, error } = await supabase
        .from("candidate_education")
        .select("*")
        .eq("candidate_profile_id", session.candidate.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.candidate?.id && open,
  });

  // Fetch DISC behavioral assessment data
  const { data: discData } = useQuery({
    queryKey: ["candidate-disc-result", session?.candidate?.id, session?.job_id],
    queryFn: async () => {
      if (!session?.candidate?.id || !session?.job_id) return null;
      
      // Find DISC session by candidate_profile_id (without nested select)
      const { data: discSession } = await supabase
        .from("candidate_disc_sessions")
        .select("id, status, completed_at")
        .eq("candidate_profile_id", session.candidate.id)
        .eq("job_id", session.job_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!discSession) return null;

      // Fetch full results via RPC to avoid nested RLS issues
      const { data: fullResults } = await supabase.rpc('get_disc_full_results', {
        p_session_ids: [discSession.id]
      });
      const result = fullResults?.[0] ?? null;
      if (!result) return null;

      // Fetch DISC profile config for this job
      const { data: discProfile } = await supabase
        .from("recruitment_disc_profiles")
        .select("*")
        .eq("job_id", session.job_id)
        .maybeSingle();

      return {
        result,
        profile: discProfile,
        completedAt: discSession.completed_at,
      };
    },
    enabled: !!session?.candidate?.id && !!session?.job_id && open,
  });

  // Fetch latest client decision (portal feedback) for this candidate+job
  const { data: clientDecision } = useQuery({
    queryKey: ["candidate-client-decision", session?.candidate?.id, session?.job_id],
    queryFn: async () => {
      if (!session?.candidate?.id || !session?.job_id) return null;
      const { data } = await supabase
        .from("portal_feedbacks")
        .select("decisao, motivo, created_at")
        .eq("candidato_id", session.candidate.id)
        .eq("vaga_id", session.job_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!session?.candidate?.id && !!session?.job_id && open,
  });

  // Fetch technical interview data
  const { data: technicalSessionId } = useQuery({
    queryKey: ["candidate-technical-session", session?.candidate?.id, session?.job_id],
    queryFn: async (): Promise<string | null> => {
      if (!session?.candidate?.id || !session?.job_id) return null;

      // Primary: search directly by candidate_profile_id (most reliable)
      const directResult: any = await supabase
        .from("technical_interview_sessions")
        .select("id")
        .eq("candidate_profile_id", session.candidate.id)
        .eq("job_id", session.job_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (directResult.data?.id) return directResult.data.id;

      // Fallback: search via recruitment_candidates.candidate_id
      // @ts-ignore - Supabase type instantiation too deep
      const rcResult = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("candidate_profile_id", session.candidate.id);

      const rcCandidates = rcResult.data;
      if (!rcCandidates || rcCandidates.length === 0) return null;

      const candidateIds = rcCandidates.map((c: any) => c.id);

      const techResult: any = await supabase
        .from("technical_interview_sessions")
        .select("id")
        .in("candidate_id", candidateIds)
        .eq("job_id", session.job_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return techResult.data?.id || null;
    },
    enabled: !!session?.candidate?.id && !!session?.job_id && open,
  });

  const { data: technicalInterview } = useTechnicalInterviewDetails(technicalSessionId || null);

  const handleDeleteApplication = async () => {
    if (!sessionId) return;
    try {
      await deleteApplication.mutateAsync({
        sessionId,
        applicationId: effectiveApplicationId || undefined,
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };


  // Fallback rendering when no session but we have application data
  if (!sessionId) {
    const fbCandidate = fallbackData?.candidate as any;
    const fbJob = fallbackData?.job as any;
    const fbName = fbCandidate
      ? `${fbCandidate.first_name || ''} ${fbCandidate.last_name || ''}`.trim() || "Candidato"
      : "Candidato";
    const fbInitials = fbName === "Candidato" ? "C" : fbName.split(" ").filter(Boolean).map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();

    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
            {fallbackLoading ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </div>
            ) : !fallbackData ? (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">Dados do candidato não encontrados.</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                        {fbInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate">{fbName}</h3>
                      {fbJob?.title && (
                        <p className="text-xs text-muted-foreground truncate">{fbJob.title}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {fbCandidate?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{fbCandidate.email}</span>
                    </div>
                  )}
                  {fbCandidate?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{fbCandidate.phone}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{fallbackData.status}</Badge>
                  </div>

                  <Separator />

                  {canManageRecruitment && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowResetDialog(true)}
                    >
                      Liberar para Refazer Etapa
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {fbCandidate && fbJob && effectiveApplicationId && (
          <ResetStepDialog
            open={showResetDialog}
            onOpenChange={setShowResetDialog}
            candidateId={fbCandidate.id}
            candidateName={fbName}
            jobId={fbJob.id}
            applicationId={effectiveApplicationId}
          />
        )}
      </>
    );
  }

  const score = session?.matching_score || 0;
  const overallCutoff = typeof agentMinimumScore === "number"
    ? agentMinimumScore
    : agentMinimumScore != null
      ? Number.parseFloat(String(agentMinimumScore))
      : null;
  const belowOverallMinimum = overallCutoff != null ? score < overallCutoff * 10 : false;
  const analysis = session?.matching_analysis || "";
  const candidateName = session?.candidate?.full_name || 
    `${session?.candidate?.first_name || ''} ${session?.candidate?.last_name || ''}`.trim() ||
    "Candidato";
  const completedAt = session?.completed_at 
    ? formatBRT(new Date(session.completed_at), "dd/MM/yyyy")
    : "-";

  const pillars = parsePillarEvaluations(analysis);
  const mainAnalysis = analysis.replace(/\n\n## Avaliação por Pilar:[\s\S]*$/, "").trim();
  
  const alignedFromDb = (session?.aligned_responses as unknown as AlignedResponse[]) || [];
  const misalignedFromDb = (session?.misaligned_responses as unknown as AlignedResponse[]) || [];
  const aligned = Array.isArray(alignedFromDb) ? alignedFromDb : [];
  const misaligned = Array.isArray(misalignedFromDb) ? misalignedFromDb : [];

  const candidateRadarFromDb = session?.candidate_radar_data as { pillars: string[]; scores: number[] } | null;
  const companyRadarFromDb = session?.company_radar_data as { pillars: string[]; scores: number[] } | null;
  const criteriaEvaluationsFromDb = (session as any)?.criteria_evaluations as Array<{
    pillar: string;
    alignment: string;
    justification: string;
    score: number;
    minimumScore?: number;
    importance?: string;
    weight?: number;
  }> | null;
  
  // Build radar chart data - show company minimum scores as reference line
  const radarChartData: RadarDataPoint[] = candidateRadarFromDb?.pillars?.map((pillar, idx) => ({
    pillar: pillar.length > 15 ? pillar.substring(0, 15) + "..." : pillar,
    fullPillar: pillar,
    candidato: candidateRadarFromDb.scores[idx] || 0,
    empresa: companyRadarFromDb?.scores[idx] || 100, // This is the minimum score (nota de corte)
    fullMark: 100,
  })) || pillars.map(p => ({
    pillar: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
    fullPillar: p.name,
    candidato: p.score,
    empresa: 100,
    fullMark: 100,
  }));

  // Check if any criteria is below minimum
  const criteriaWithMinimum = criteriaEvaluationsFromDb?.filter(c => c.minimumScore != null) || [];
  const belowMinimumCriteria = criteriaWithMinimum.filter(c => 
    c.score < (c.minimumScore! * 10) // Convert minimum 0-10 to 0-100
  );

  const getInitials = () => {
    if (!candidateName || candidateName === "Candidato") return "C";
    const parts = candidateName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return candidateName.slice(0, 2).toUpperCase();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Alta";
    if (score >= 50) return "Média";
    return "Baixa";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden gap-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : queryError ? (
          <div className="p-6 text-center">
            <p className="text-destructive font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground mb-4">{queryError.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !session ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Dados do candidato não encontrados.</p>
            <p className="text-xs text-muted-foreground mt-1">Session ID: {sessionId}</p>
          </div>
        ) : (
          <>
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-b px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={session?.candidate?.avatar_url} />
                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">{candidateName}</h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {session?.candidate?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.candidate.city}
                        </span>
                      )}
                      {(session?.job as any)?.title && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {(session.job as any).title}
                        </span>
                      )}
                      <span className="text-muted-foreground/60">•</span>
                      <span>{completedAt}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <CopilotButton
                    scope="candidate"
                    candidateId={recruitmentCandidateId || session?.candidate?.id}
                    jobId={session?.job_id}
                    contextLabel={candidateName}
                  />
                  {canManageRecruitment && effectiveApplicationId && recruitmentCandidateId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetDialog(true)}
                      className="gap-1.5"
                      title="Liberar candidato para refazer uma etapa"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Refazer etapa
                    </Button>
                  )}
                  {/* Score Ring */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getScoreColor(score)}`}>
                    <Target className="h-4 w-4" />
                    <span className="font-bold text-lg">{score.toFixed(0)}%</span>
                    <span className="text-xs font-medium">{getScoreLabel(score)}</span>
                  </div>

                  {overallCutoff != null && (
                    <Badge variant={belowOverallMinimum ? "destructive" : "secondary"}>
                      Corte: {Number(overallCutoff).toFixed(1)}/100
                    </Badge>
                  )}

                  {(session as any)?.attempt_number > 1 && (
                    <Badge variant="info">
                      Tentativa {(session as any).attempt_number}
                    </Badge>
                  )}

                  {clientDecision?.decisao && (
                    <Badge
                      variant={
                        clientDecision.decisao === "aprovado" ? "default" :
                        clientDecision.decisao === "reprovado" ? "destructive" :
                        "secondary"
                      }
                      className={clientDecision.decisao === "aprovado" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Cliente: {clientDecision.decisao === "aprovado" ? "Aprovado" : clientDecision.decisao === "reprovado" ? "Reprovado" : clientDecision.decisao}
                    </Badge>
                  )}

                </div>
              </div>

              {/* Contact Info Bar */}
              <div className="flex items-center gap-4 mt-3 text-xs">
                {session?.candidate?.email && (
                  <a href={`mailto:${session.candidate.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{session.candidate.email}</span>
                  </a>
                )}
                {session?.candidate?.phone && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {session.candidate.phone}
                  </span>
                )}
                {session?.candidate?.linkedin_url && (
                  <a 
                    href={session.candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="culture" className="flex-1">
              <div className="border-b px-5">
                <TabsList className="h-10 bg-transparent p-0 gap-4">
                  <TabsTrigger 
                    value="culture" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-2 text-sm"
                  >
                    <Brain className="h-4 w-4 mr-1.5" />
                    Análise Cultural
                  </TabsTrigger>
                  {discData?.result && (
                    <TabsTrigger 
                      value="disc" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-2 text-sm"
                    >
                      <Target className="h-4 w-4 mr-1.5" />
                      Fit Comportamental
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="technical" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-2 text-sm"
                  >
                    <Code className="h-4 w-4 mr-1.5" />
                    Fit Técnico
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-2 text-sm"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    Perfil
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(90vh-180px)]">
                {/* Culture Tab */}
                <TabsContent value="culture" className="m-0 p-5 space-y-4">
                  {/* Early termination warning - only show if truly no meaningful data */}
                  {session?.status === 'completed' && score === 0 && (!session?.candidate_radar_data || (Array.isArray(session.candidate_radar_data) && session.candidate_radar_data.length === 0)) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Target className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Entrevista encerrada precocemente</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Não foi possível capturar respostas suficientes para uma análise completa. 
                          Considere agendar uma nova entrevista com o candidato.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Radar Charts - Improved */}
                  {radarChartData.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-medium text-muted-foreground">Nota Mínima (Corte)</span>
                          </div>
                        </div>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                              <PolarAngleAxis 
                                dataKey="pillar" 
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                              />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                              <Radar
                                dataKey="empresa"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.2}
                                strokeWidth={2}
                                strokeDasharray="4 4"
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">
                          Baseado nos critérios do agente
                        </p>
                      </div>

                      <div className="bg-muted/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-xs font-medium text-muted-foreground">Candidato vs Mínimo</span>
                          </div>
                          {belowMinimumCriteria.length > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {belowMinimumCriteria.length} abaixo do mínimo
                            </Badge>
                          )}
                        </div>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                              <PolarAngleAxis 
                                dataKey="pillar" 
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                              />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                              <Radar
                                dataKey="empresa"
                                stroke="#f59e0b"
                                fill="transparent"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                strokeOpacity={0.7}
                              />
                              <Radar
                                dataKey="candidato"
                                stroke="#22c55e"
                                fill="#22c55e"
                                fillOpacity={0.25}
                                strokeWidth={2}
                              />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const candidateScore = data.candidato;
                                    const minScore = data.empresa;
                                    const isBelow = candidateScore < minScore;
                                    return (
                                      <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                                        <p className="font-medium mb-1">{data.fullPillar || data.pillar}</p>
                                        <p className={isBelow ? "text-red-600" : "text-green-600"}>
                                          Candidato: {candidateScore.toFixed(0)}%
                                        </p>
                                        <p className="text-amber-600">
                                          Mínimo: {minScore.toFixed(0)}%
                                        </p>
                                        {isBelow && (
                                          <p className="text-red-500 font-medium mt-1">⚠️ Abaixo do mínimo</p>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-[10px] text-muted-foreground">Candidato</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-4 border-t-2 border-amber-500 border-dashed" />
                            <span className="text-[10px] text-muted-foreground">Mínimo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Criteria Evaluations from Database */}
                  {criteriaEvaluations.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Avaliação por Critério
                        </h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {criteriaEvaluations.length} critérios
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        {criteriaEvaluations.map((criterion: any) => {
                          const scoreValue = criterion.score || 0;
                          const minimumScore = criterion.minimum_score_percent || 0;
                          const passedMinimum = criterion.passed_minimum ?? (scoreValue >= minimumScore);
                          const importance = criterion.importance || 'normal';
                          
                          // Color based on score
                          const getColorClass = () => {
                            if (scoreValue >= 80) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' };
                            if (scoreValue >= 50) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' };
                            return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' };
                          };
                          const colors = getColorClass();
                          
                          // Importance label
                          const importanceLabels: Record<string, string> = {
                            'critical': 'Crítico',
                            'very_important': 'Muito Importante',
                            'important': 'Importante',
                            'normal': 'Normal',
                            'minor': 'Menor'
                          };
                          
                          return (
                            <div 
                              key={criterion.id} 
                              className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-sm font-semibold truncate">{criterion.criterion_name}</h5>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors.badge}`}>
                                      {importanceLabels[importance] || importance}
                                    </Badge>
                                    {!passedMinimum && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                        Abaixo do mínimo
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-lg font-bold ${colors.text}`}>
                                    {scoreValue.toFixed(1)}%
                                  </span>
                                  {minimumScore > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      (mín: {minimumScore}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Justification */}
                              {criterion.justification && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {criterion.justification}
                                </p>
                              )}
                              
                              {/* Evidence sections */}
                              {(criterion.positive_evidence || criterion.negative_evidence) && (
                                <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                                  {criterion.positive_evidence && Array.isArray(criterion.positive_evidence) && criterion.positive_evidence.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <TrendingUp className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                                      <div className="text-xs text-green-700">
                                  {criterion.positive_evidence.map((ev: any, idx: number) => (
                                          <p key={idx} className="mb-1 last:mb-0">"{typeof ev === 'string' ? ev : ev?.quote || ''}"</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {criterion.negative_evidence && Array.isArray(criterion.negative_evidence) && criterion.negative_evidence.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <TrendingDown className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                                      <div className="text-xs text-red-700">
                                        {criterion.negative_evidence.map((ev: any, idx: number) => (
                                          <p key={idx} className="mb-1 last:mb-0">"{typeof ev === 'string' ? ev : ev?.quote || ''}"</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : pillars.length > 0 ? (
                    /* Fallback to parsed pillars from analysis if no criteria in DB */
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avaliação por Pilar</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {pillars.map((pillar, idx) => {
                          const color = pillar.alignment === "Forte" ? "green" : pillar.alignment === "Moderado" ? "amber" : "red";
                          return (
                            <div 
                              key={idx} 
                              className={`p-2.5 rounded-lg border bg-${color}-50/50 border-${color}-200/50`}
                              style={{
                                backgroundColor: color === "green" ? "rgba(34, 197, 94, 0.05)" : color === "amber" ? "rgba(245, 158, 11, 0.05)" : "rgba(239, 68, 68, 0.05)",
                                borderColor: color === "green" ? "rgba(34, 197, 94, 0.2)" : color === "amber" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)"
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium truncate">{pillar.name}</span>
                                <span 
                                  className="text-sm font-bold shrink-0"
                                  style={{ color: color === "green" ? "#16a34a" : color === "amber" ? "#d97706" : "#dc2626" }}
                                >
                                  {pillar.score}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* AI Analysis - Collapsible style */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parecer da IA</h4>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-4">
                      {mainAnalysis ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>{mainAnalysis}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {score === 0 
                              ? "Análise não disponível. A entrevista pode ter sido encerrada precocemente."
                              : "Análise não disponível."}
                          </p>
                          {score === 0 && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Considere agendar uma nova entrevista com o candidato.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aligned/Misaligned - Side by side compact */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <h4 className="text-xs font-medium text-green-700">Pontos Fortes</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700">{aligned.length}</Badge>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {aligned.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma resposta identificada.</p>
                        ) : aligned.slice(0, 3).map((r, idx) => (
                          <div key={idx} className="p-2 rounded bg-green-50/50 border border-green-100 text-xs">
                            <p className="text-muted-foreground line-clamp-2">{r.candidateResponse}</p>
                            {r.reason && (
                              <p className="text-green-700 mt-1 text-[11px] italic">"{r.reason}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <h4 className="text-xs font-medium text-red-700">Pontos de Atenção</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-red-100 text-red-700">{misaligned.length}</Badge>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {misaligned.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma resposta identificada.</p>
                        ) : misaligned.slice(0, 3).map((r, idx) => (
                          <div key={idx} className="p-2 rounded bg-red-50/50 border border-red-100 text-xs">
                            <p className="text-muted-foreground line-clamp-2">{r.candidateResponse}</p>
                            {r.reason && (
                              <p className="text-red-700 mt-1 text-[11px] italic">"{r.reason}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Behavioral Insights Section */}
                  <Separator />
                  <BehavioralInsightsSection sessionId={sessionId!} />
                </TabsContent>

                {/* DISC / Fit Comportamental Tab */}
                {discData?.result && (
                  <TabsContent value="disc" className="m-0 p-5 space-y-5">
                    <DISCResultSection
                      result={discData.result}
                      profile={discData.profile}
                      completedAt={discData.completedAt || undefined}
                    />
                    {/* Behavioral Insights in DISC tab too */}
                    <Separator />
                    <BehavioralInsightsSection sessionId={sessionId!} />
                  </TabsContent>
                )}

                {/* Technical / Fit Técnico Tab */}
                <TabsContent value="technical" className="m-0 p-5 space-y-6">
                  <CVDeepAnalysisCard
                    candidateId={recruitmentCandidateId}
                    jobId={session?.job_id}
                  />
                  {technicalSessionId && (
                    <>
                      <ResumeIntelligenceSection technicalSessionId={technicalSessionId} />
                      <Separator />
                    </>
                  )}
                  {technicalInterview ? (
                    <>
                      <TechnicalOverviewTab interview={technicalInterview} />
                      <TechnicalSkillsTab interview={technicalInterview} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Code className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-base font-medium mb-1">Avaliação técnica não realizada</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Este candidato ainda não iniciou a etapa de fit técnico. A avaliação estará disponível após o candidato completar a entrevista técnica.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Profile Tab */}
                <TabsContent value="profile" className="m-0 p-5 space-y-5">
                  {/* Work History */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Experiência Profissional</h4>
                    </div>
                    {workHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-6">Não informado</p>
                    ) : (
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        {workHistory.map((job) => (
                          <div key={job.id} className="relative">
                            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-background" />
                            <div>
                              <h5 className="font-medium text-sm">{job.position}</h5>
                              <p className="text-xs text-muted-foreground">{job.company}</p>
                              <p className="text-[11px] text-muted-foreground/70">
                                {formatBRT(new Date(job.start_date), "MMM yyyy")} - 
                                {job.is_current ? " Atual" : job.end_date ? ` ${formatBRT(new Date(job.end_date), "MMM yyyy")}` : ""}
                              </p>
                              {job.responsibilities && (
                                <p className="text-xs text-muted-foreground mt-1">{job.responsibilities}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Education */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formação Acadêmica</h4>
                    </div>
                    {education.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-6">Não informado</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pl-6">
                        {education.map((edu) => (
                          <div key={edu.id} className="p-3 rounded-lg bg-muted/30">
                            <h5 className="font-medium text-sm">{edu.course_name}</h5>
                            <p className="text-xs text-muted-foreground">{edu.degree_type}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Client History */}
                  <CandidateClientHistory
                    candidateId={recruitmentCandidateId}
                    currentJobId={session?.job_id || null}
                  />


                  {/* Attempt History */}
                  <AttemptHistorySection
                    candidateId={recruitmentCandidateId}
                    jobId={session?.job_id || null}
                  />

                  <Separator />

                  {/* Activity Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico de Atividades</h4>
                    </div>
                    <div className="pl-6">
                      <CandidateActivityTimeline candidateId={session?.candidate?.id || null} maxItems={5} />
                    </div>
                  </div>

                  {/* Reset Step */}
                  {canManageRecruitment && effectiveApplicationId && recruitmentCandidateId && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowResetDialog(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Liberar para Refazer Etapa
                    </Button>
                  )}

                  {/* Danger Zone */}
                  <Separator className="my-4" />
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir candidatura
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir candidatura</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza? O candidato poderá se candidatar novamente após a exclusão.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteApplication}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteApplication.isPending}
                        >
                          {deleteApplication.isPending ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </DialogContent>

      {effectiveApplicationId && recruitmentCandidateId && session && (
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          candidateId={recruitmentCandidateId}
          candidateName={candidateName}
          jobId={session.job_id}
          applicationId={effectiveApplicationId}
        />
      )}
    </Dialog>
  );
}
