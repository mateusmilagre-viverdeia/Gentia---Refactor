import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateProfile } from "@/contexts/CandidateProfileContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CandidateNavbar } from "@/components/candidate/CandidateNavbar";
// Modais antigos (CultureInterviewModal/TechnicalInterviewModal) foram
// substituídos pelo fluxo unificado /interview/:token e /interview/technical/:token.
// Os arquivos ficam em src/components/candidate/_archived/ apenas para histórico.
import { ApplicationStepper, buildStepperSteps } from "@/components/candidate/ApplicationStepper";
import { DISCAssessmentInline } from "@/components/candidate/DISCAssessmentInline";
import { InterviewStartGateMessage, type InterviewGateState } from "@/components/candidate/InterviewStartGate";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Sparkles,
  Brain,
  Loader2,
  AlertCircle,
  MessageCircle,
  User,
  Code,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface JobData {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  work_regime: string | null;
  work_modality: string | null;
  account_id: string;
}

interface Company {
  id: string;
  name: string;
}

const WORK_REGIME_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  temporario: "Temporário",
  estagio: "Estágio",
  trainee: "Trainee",
};

export default function AplicarVaga() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useCandidateProfile();
  const navigate = useNavigate();
  
  // Cultural Interview states (modal removido — agora redireciona para /interview/:token)
  const [startingCulturalInterview, setStartingCulturalInterview] = useState(false);
  const [hasCompletedInterview, setHasCompletedInterview] = useState(false);
  const [interviewScore, setInterviewScore] = useState<number | null>(null);

  // Technical Interview states (modal removido — agora redireciona para /interview/technical/:token)
  const [startingTechnicalInterview, setStartingTechnicalInterview] = useState(false);
  const [hasCompletedTechnicalInterview, setHasCompletedTechnicalInterview] = useState(false);
  const [technicalScore, setTechnicalScore] = useState<number | null>(null);
  const [technicalRecommendation, setTechnicalRecommendation] = useState<string>("");

  // DISC state
  const [hasCompletedDISC, setHasCompletedDISC] = useState(false);

  // Evaluating state — blocks advancement while orchestrator processes
  const [evaluatingStep, setEvaluatingStep] = useState<string | null>(null);
  const [locallyRejected, setLocallyRejected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const evaluatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch job data
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ["apply-job-details", jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data: job, error: jobError } = await supabase
        .from("recruitment_jobs")
        .select("id, title, description, department, location, work_regime, work_modality, account_id")
        .eq("id", jobId)
        .eq("status", "active")
        .maybeSingle();

      if (jobError || !job) return null;

      const { data: company } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", job.account_id)
        .maybeSingle();

      return { job, company };
    },
    enabled: !!jobId,
  });

  // Fetch workflow steps
  const { data: workflowSteps } = useQuery({
    queryKey: ["job-workflow-steps", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("id, step_type, position, is_active, agent_id, threshold_config")
        .eq("job_id", jobId)
        .eq("is_active", true)
        .order("position");

      return data || [];
    },
    enabled: !!jobId,
  });

  const getStepThreshold = (stepType: string): number | undefined => {
    const step = workflowSteps?.find((s: any) => s.step_type === stepType);
    const config = step?.threshold_config as Record<string, any> | null;
    const minScore = config?.min_score;
    return typeof minScore === "number" ? minScore : undefined;
  };

  const culturalThreshold = getStepThreshold("cultural");
  const technicalThreshold = getStepThreshold("technical");

  // Resolve candidate_id — prioriza email + account da vaga (mais confiável para
  // candidata autenticada) e mantém fallbacks por profile. Cada passo tem
  // try/catch isolado para nunca derrubar a cadeia em caso de erro pontual.
  const jobAccountId = jobData?.job?.account_id ?? null;
  const {
    data: resolvedCandidateId,
    isLoading: isResolvingCandidateId,
    isFetching: isFetchingCandidateId,
    error: candidateIdError,
    refetch: refetchCandidateId,
  } = useQuery({
    queryKey: [
      "resolved-candidate-id",
      jobId,
      profile?.id,
      user?.email,
      jobAccountId,
      // garante invalidação após reset de etapa pelo recrutador
      // (applicationStatus pode ainda não existir no primeiro render)
    ],
    queryFn: async () => {
      if (!jobId) return null;
      const email = user?.email?.trim().toLowerCase() || null;

      let lastErrorMessage: string | null = null;
      const safe = async <T,>(label: string, fn: () => Promise<T | null>): Promise<T | null> => {
        try {
          const res = await fn();
          if (res) console.debug(`[CandidateApply] candidate_id resolvido via ${label}`);
          return res;
        } catch (err) {
          const msg = (err as Error)?.message || String(err);
          lastErrorMessage = `${label}: ${msg}`;
          console.warn(`[CandidateApply] passo "${label}" falhou:`, err);
          return null;
        }
      };

      // 1. Email + account_id da vaga (primário — evita colisão multi-tenant)
      if (email && jobAccountId) {
        const r = await safe("email+account", async () => {
          const { data } = await (supabase
            .from("recruitment_candidates") as any)
            .select("id")
            .eq("email", email)
            .eq("account_id", jobAccountId)
            .maybeSingle();
          return data?.id ?? null;
        });
        if (r) return r;
      }

      // 2. Email global (fallback se account não bater)
      if (email) {
        const r = await safe("email-global", async () => {
          const { data } = await supabase
            .from("recruitment_candidates")
            .select("id")
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          return data?.id ?? null;
        });
        if (r) return r;
      }

      // 3. DISC session por candidate_profile_id
      if (profile?.id) {
        const r = await safe("disc-session", async () => {
          const { data } = await (supabase
            .from("candidate_disc_sessions")
            .select("candidate_id")
            .eq("job_id", jobId) as any)
            .eq("candidate_profile_id", profile.id)
            .limit(1)
            .maybeSingle();
          return data?.candidate_id ?? null;
        });
        if (r) return r;
      }

      // 4. Culture session completed por candidate_profile_id
      if (profile?.id) {
        const r = await safe("culture-session", async () => {
          const { data } = await supabase
            .from("culture_interview_sessions")
            .select("candidate_id")
            .eq("job_id", jobId)
            .eq("candidate_profile_id", profile.id)
            .eq("status", "completed")
            .maybeSingle();
          return data?.candidate_id ?? null;
        });
        if (r) return r;
      }

      // 5. Application única da vaga (último recurso — pode trazer outro candidato
      //    se houver várias applications, então só usa se length === 1)
      const r = await safe("application-single", async () => {
        const { data: apps } = await supabase
          .from("recruitment_applications")
          .select("candidate_id")
          .eq("job_id", jobId)
          .limit(2);
        if (apps && apps.length === 1) return apps[0].candidate_id;
        return null;
      });
      if (r) return r;

      console.warn("[CandidateApply] resolved-candidate-id: todos os fallbacks falharam", {
        jobId,
        hasProfile: !!profile?.id,
        hasEmail: !!email,
        accountId: jobAccountId,
        lastError: lastErrorMessage,
      });
      return null;
    },
    enabled: !!jobId && (!!user?.email || !!profile?.id),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  // Check application status (for rejection detection)
  const {
    data: applicationStatus,
    isLoading: isLoadingApplicationStatus,
    isFetching: isFetchingApplicationStatus,
    refetch: refetchAppStatus,
  } = useQuery({
    queryKey: ["candidate-application-status", jobId, resolvedCandidateId],
    queryFn: async () => {
      if (!jobId || !resolvedCandidateId) return null;
      const { data: app } = await supabase
        .from("recruitment_applications")
        .select("id, status")
        .eq("job_id", jobId)
        .eq("candidate_id", resolvedCandidateId)
        .maybeSingle();
      return app;
    },
    enabled: !!jobId && !!resolvedCandidateId,
    refetchInterval: evaluatingStep ? 2000 : false,
  });
  const isCheckingApplicationStatus =
    !!jobId && !!resolvedCandidateId && (isLoadingApplicationStatus || isFetchingApplicationStatus);

  const isDisqualified = applicationStatus?.status === "desqualificado" || locallyRejected;

  // Estado do gate de início de entrevista — garante que o botão nunca fique
  // cinza sem mensagem clara para o candidato.
  const [linkingCandidate, setLinkingCandidate] = useState(false);
  const canLinkCandidate = !!user?.email && !!jobAccountId && !!jobId;

  const buildGateState = (starting: boolean): InterviewGateState => {
    if (starting) return { kind: "starting" };
    if (linkingCandidate) return { kind: "loading_identity" };
    if (isResolvingCandidateId || isFetchingCandidateId) return { kind: "loading_identity" };
    if (isCheckingApplicationStatus) return { kind: "loading_identity" };
    if (candidateIdError) {
      return {
        kind: "error",
        message: (candidateIdError as Error)?.message || "Erro ao carregar seu cadastro.",
      };
    }
    if (!resolvedCandidateId) {
      return { kind: "identity_missing", hasEmail: !!user?.email, canLink: canLinkCandidate };
    }
    if (!applicationStatus?.id) {
      return { kind: "application_missing", hasEmail: !!user?.email, canLink: canLinkCandidate };
    }
    return { kind: "ready" };
  };
  const culturalGateState: InterviewGateState = buildGateState(startingCulturalInterview);
  const discGateState: InterviewGateState = buildGateState(false);
  const technicalGateState: InterviewGateState = buildGateState(startingTechnicalInterview);

  const handleLinkCandidate = async () => {
    if (!user?.email || !jobAccountId || !jobId) {
      toast.error("Não foi possível vincular: dados da vaga indisponíveis.");
      return;
    }
    try {
      setLinkingCandidate(true);
      const { data, error } = await supabase.functions.invoke("link-candidate-self", {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await refetchCandidateId();
      const linkedCandidateId = (data as any)?.candidate_id || resolvedCandidateId;
      if (linkedCandidateId) await refetchAppStatus();
      toast.success("Cadastro vinculado com sucesso!");
    } catch (err) {
      console.warn("[CandidateApply] link-candidate-self falhou", err);
      toast.error(
        "Não foi possível vincular seu cadastro. Tente recarregar a página ou contate o recrutador.",
      );
    } finally {
      setLinkingCandidate(false);
    }
  };

  // Auto-confirma a candidatura ao chegar na página: cria recruitment_candidate +
  // recruitment_application (idempotente via edge function com SERVICE_ROLE).
  // Garante que TODA vaga — Cultural, DISC ou Técnica first — tenha a application
  // criada ANTES da primeira etapa, sem depender de efeitos colaterais.
  const autoLinkAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoLinkAttemptedRef.current) return;
    if (!user?.email || !jobId || !jobAccountId) return;
    // Só roda se ainda não temos candidate_id resolvido OU não temos application
    if (isResolvingCandidateId || isFetchingCandidateId) return;
    if (resolvedCandidateId && applicationStatus?.id) {
      autoLinkAttemptedRef.current = true;
      return;
    }
    autoLinkAttemptedRef.current = true;
    (async () => {
      try {
        setLinkingCandidate(true);
        const { data, error } = await supabase.functions.invoke("link-candidate-self", {
          body: { job_id: jobId },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const linkedCandidateId = (data as any)?.candidate_id || resolvedCandidateId;
        await refetchCandidateId();
        if (linkedCandidateId) await refetchAppStatus();
      } catch (err) {
        console.warn("[CandidateApply] auto-link falhou", err);
        // Não exibe toast — usuário verá o gate de fallback se necessário
      } finally {
        setLinkingCandidate(false);
      }
    })();
  }, [
    user?.email,
    jobId,
    jobAccountId,
    isResolvingCandidateId,
    isFetchingCandidateId,
    resolvedCandidateId,
    applicationStatus?.id,
  ]);

  // Check if candidate can retry (session was aborted, abandoned, or first attempt)
  const candidateProfileId = profile?.id ?? null;
  const { data: retryEligibility } = useQuery({
    queryKey: ["retry-eligibility", jobId, resolvedCandidateId, candidateProfileId, isDisqualified],
    queryFn: async () => {
      if (!jobId) return null;

      // Build OR filter to match by candidate_id and/or candidate_profile_id (fallback for legacy/abandoned sessions)
      const idFilters: string[] = [];
      if (resolvedCandidateId) idFilters.push(`candidate_id.eq.${resolvedCandidateId}`);
      if (candidateProfileId) idFilters.push(`candidate_profile_id.eq.${candidateProfileId}`);
      if (idFilters.length === 0) return null;
      const orFilter = idFilters.join(",");

      const fetchLatest = async (table: string) => {
        const { data } = await (supabase as any)
          .from(table)
          .select("id, attempt_number, completed_naturally, status, completed_at")
          .eq("job_id", jobId)
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      };

      const [culturalSession, discSession, techSession] = await Promise.all([
        fetchLatest("culture_interview_sessions"),
        fetchLatest("candidate_disc_sessions"),
        fetchLatest("technical_interview_sessions"),
      ]);

      // Find the session that caused disqualification (latest completed/abandoned one)
      const sessions = [culturalSession, discSession, techSession].filter(Boolean);
      for (const s of sessions) {
        const cn = s?.completed_naturally;
        const isAbandoned = cn === false
          || cn == null  // never finalized (in_progress / connection lost / orphan)
          || (typeof s?.status === "string" && s.status !== "completed" && !s?.completed_at);
        if (isAbandoned) return { canRetry: true, reason: "aborted" };
        if (cn === true && (s?.attempt_number || 1) <= 1) return { canRetry: true, reason: "first_attempt" };
      }
      return { canRetry: false, reason: "max_attempts" };
    },
    enabled: !!jobId && (!!resolvedCandidateId || !!candidateProfileId),
  });

  const canRetry = retryEligibility?.canRetry === true;
  const hasAbandonedAttempt =
    canRetry && !isDisqualified && retryEligibility?.reason === "aborted";

  const handleRetry = async () => {
    if (!applicationStatus?.id || !jobId) return;
    setIsRetrying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada"); return; }

      const { data, error } = await supabase.functions.invoke("candidate-retry-step", {
        body: { applicationId: applicationStatus.id, jobId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) {
        const reason = data.reason;
        const msg = reason === "max_attempts"
          ? "Você já utilizou suas tentativas para esta etapa."
          : reason === "not_owner"
          ? "Esta candidatura não pertence à sua conta."
          : reason === "not_disqualified"
          ? "Esta etapa não está disponível para refazer."
          : "Não foi possível liberar a etapa. Tente novamente.";
        toast.error(msg);
        return;
      }
      toast.success("Etapa liberada! Você pode refazer agora.");
      // Reset local state that still marks steps as completed
      setLocallyRejected(false);
      setHasCompletedInterview(false);
      setInterviewScore(null);
      setHasCompletedDISC(false);
      setHasCompletedTechnicalInterview(false);
      setTechnicalScore(null);
      setTechnicalRecommendation("");
      setEvaluatingStep(null);
      if (evaluatingTimerRef.current) {
        clearTimeout(evaluatingTimerRef.current);
        evaluatingTimerRef.current = null;
      }
      await Promise.all([
        refetchAppStatus(),
        refetchExistingInterview(),
        refetchExistingDISC(),
        refetchExistingTechnical(),
      ]);
    } catch (err) {
      console.error("Retry error:", err);
      toast.error("Não foi possível liberar a etapa. Tente novamente.");
    } finally {
      setIsRetrying(false);
    }
  };

  // When orchestrator marks disqualified during evaluation, stop evaluating
  useEffect(() => {
    if (evaluatingStep && (applicationStatus?.status === "desqualificado")) {
      setEvaluatingStep(null);
      if (evaluatingTimerRef.current) {
        clearTimeout(evaluatingTimerRef.current);
        evaluatingTimerRef.current = null;
      }
    }
  }, [applicationStatus?.status, evaluatingStep]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (evaluatingTimerRef.current) clearTimeout(evaluatingTimerRef.current);
    };
  }, []);

  const hasCulturalStep = workflowSteps?.some((s) => s.step_type === "cultural");
  const hasDISCStep = workflowSteps?.some((s) => s.step_type === "disc");
  const hasTechnicalStep = workflowSteps?.some((s) => s.step_type === "technical");

  // Helper to build OR filter for candidate identification
  const idFilters: string[] = [];
  if (resolvedCandidateId) idFilters.push(`candidate_id.eq.${resolvedCandidateId}`);
  if (candidateProfileId) idFilters.push(`candidate_profile_id.eq.${candidateProfileId}`);
  const candidateOrFilter = idFilters.length > 0 ? idFilters.join(",") : null;

  // Check existing cultural interview
  const { data: existingInterview, isLoading: checkingInterview, refetch: refetchExistingInterview } = useQuery({
    queryKey: ["existing-interview", jobId, resolvedCandidateId, candidateProfileId],
    queryFn: async () => {
      if (!candidateOrFilter || !jobId) return null;
      const { data } = await (supabase
        .from("culture_interview_sessions")
        .select("id, status, matching_score") as any)
        .eq("job_id", jobId)
        .or(candidateOrFilter)
        .eq("status", "completed")
        .is("archived_at", null)
        .maybeSingle();
      return data;
    },
    enabled: (!!profile?.id || !!resolvedCandidateId) && !!jobId,
  });

  // Check existing DISC session
  const { data: existingDISCSession, refetch: refetchExistingDISC } = useQuery({
    queryKey: ["existing-disc-session", jobId, resolvedCandidateId, candidateProfileId],
    queryFn: async () => {
      if (!candidateOrFilter || !jobId) return null;
      const { data: session } = await (supabase
        .from("candidate_disc_sessions")
        .select("id, status") as any)
        .eq("job_id", jobId)
        .or(candidateOrFilter)
        .eq("status", "completed")
        .is("archived_at", null)
        .maybeSingle();

      if (!session) return null;

      const { data: result } = await supabase
        .from("candidate_disc_results")
        .select("match_score")
        .eq("session_id", session.id)
        .maybeSingle();

      return { ...session, match_score: result?.match_score ?? null };
    },
    enabled: (!!profile?.id || !!resolvedCandidateId) && !!jobId && !!hasDISCStep,
  });

  // Check existing technical interview
  const { data: existingTechnicalInterview, refetch: refetchExistingTechnical } = useQuery({
    queryKey: ["existing-technical-interview", jobId, resolvedCandidateId, candidateProfileId],
    queryFn: async () => {
      if (!candidateOrFilter || !jobId) return null;
      const { data } = await (supabase
        .from("technical_interview_sessions")
        .select("id, status, overall_score, recommendation") as any)
        .eq("job_id", jobId)
        .or(candidateOrFilter)
        .eq("status", "completed")
        .is("archived_at", null)
        .maybeSingle();
      return data;
    },
    enabled: (!!profile?.id || !!resolvedCandidateId) && !!jobId,
  });

  // Fetch interview responses
  const { data: interviewResponses } = useQuery({
    queryKey: ["interview-responses", existingInterview?.id],
    queryFn: async () => {
      if (!existingInterview?.id) return [];
      const { data } = await supabase
        .from("culture_interview_responses")
        .select("*")
        .eq("session_id", existingInterview.id)
        .order("question_index");
      return data || [];
    },
    enabled: !!existingInterview?.id,
  });

  // Sync states
  useEffect(() => {
    if (existingInterview) {
      setHasCompletedInterview(true);
      setInterviewScore(existingInterview.matching_score);
    }
  }, [existingInterview]);

  useEffect(() => {
    if (existingDISCSession?.status === "completed") {
      const matchScore = existingDISCSession.match_score;
      if (matchScore != null) {
        setHasCompletedDISC(true);
      } else {
        // Session completed but match_score not yet calculated — start polling
        startEvaluationPolling("disc");
      }
    }
  }, [existingDISCSession]);

  useEffect(() => {
    if (existingTechnicalInterview) {
      setHasCompletedTechnicalInterview(true);
      setTechnicalScore(existingTechnicalInterview.overall_score);
      setTechnicalRecommendation(existingTechnicalInterview.recommendation || "");
    }
  }, [existingTechnicalInterview]);

  // Defesa em profundidade: se a sessão já tem score abaixo do limiar, considera
  // desqualificado mesmo que `recruitment_applications.status` ainda não tenha
  // sido atualizado (race com orchestrator, ou row ainda não criada — caso do
  // candidato que abandona entrevista e watchdog finaliza com score baixo).
  const discThreshold = getStepThreshold("disc");
  const derivedDisqualified = useMemo(() => {
    const cuMin = culturalThreshold ?? 70;
    const teMin = technicalThreshold ?? 70;
    const dcMin = discThreshold ?? 70;
    if (
      existingInterview?.status === "completed" &&
      typeof existingInterview.matching_score === "number" &&
      existingInterview.matching_score < cuMin
    ) return true;
    if (
      existingDISCSession?.status === "completed" &&
      typeof (existingDISCSession as any).match_score === "number" &&
      (existingDISCSession as any).match_score < dcMin
    ) return true;
    if (
      existingTechnicalInterview?.status === "completed" &&
      typeof existingTechnicalInterview.overall_score === "number" &&
      existingTechnicalInterview.overall_score < teMin
    ) return true;
    return false;
  }, [existingInterview, existingDISCSession, existingTechnicalInterview, culturalThreshold, technicalThreshold, discThreshold]);

  const effectiveDisqualified = isDisqualified || derivedDisqualified;

  // Build stepper
  const completedTypes = useMemo(() => {
    const set = new Set<string>();
    if (hasCompletedInterview) set.add("cultural");
    if (hasCompletedDISC) set.add("disc");
    if (hasCompletedTechnicalInterview) set.add("technical");
    return set;
  }, [hasCompletedInterview, hasCompletedDISC, hasCompletedTechnicalInterview]);

  const stepperSteps = useMemo(() => {
    if (!workflowSteps || workflowSteps.length === 0) return [];
    const steps = buildStepperSteps(workflowSteps, completedTypes);
    // If disqualified, mark active/locked steps as "rejected"
    if (effectiveDisqualified) {
      return steps.map(s => 
        s.status === "active" || s.status === "locked" 
          ? { ...s, status: "rejected" as any } 
          : s
      );
    }
    // If evaluating, mark the next active step as "evaluating"
    if (evaluatingStep) {
      return steps.map(s => 
        s.status === "active" 
          ? { ...s, status: "evaluating" as any } 
          : s
      );
    }
    return steps;
  }, [workflowSteps, completedTypes, effectiveDisqualified, evaluatingStep]);

  const activeStepType = useMemo(() => {
    // If disqualified, no active step
    if (effectiveDisqualified) return null;
    // If evaluating, don't show next step yet
    if (evaluatingStep) return null;
    const active = stepperSteps.find((s) => s.status === "active");
    return active?.type || null;
  }, [stepperSteps, effectiveDisqualified, evaluatingStep]);

  const allStepsCompleted = useMemo(() => {
    if (!workflowSteps || workflowSteps.length === 0) return false;
    return workflowSteps.every((s) => completedTypes.has(s.step_type));
  }, [workflowSteps, completedTypes]);

  const startEvaluationPolling = useCallback((stepType: string) => {
    setEvaluatingStep(stepType);
    // After 30s, stop polling and allow advancement
    evaluatingTimerRef.current = setTimeout(() => {
      setEvaluatingStep(null);
      evaluatingTimerRef.current = null;
    }, 30000);
  }, []);

  const handleInterviewComplete = async (score: number, analysis: string) => {
    setHasCompletedInterview(true);
    setInterviewScore(score);
    toast.success("Entrevista cultural concluída com sucesso!");

    // Check threshold locally
    if (culturalThreshold != null && score < culturalThreshold) {
      setLocallyRejected(true);
      return;
    }

    // Start evaluation polling before advancing. A candidatura já foi criada
    // no carregamento da página via link-candidate-self.
    startEvaluationPolling("cultural");
  };

  const handleTechnicalInterviewComplete = (score: number, recommendation: string) => {
    setHasCompletedTechnicalInterview(true);
    setTechnicalScore(score);
    setTechnicalRecommendation(recommendation);
    toast.success("Avaliação técnica concluída com sucesso!");

    // Check threshold locally
    if (technicalThreshold != null && score < technicalThreshold) {
      setLocallyRejected(true);
      return;
    }

    startEvaluationPolling("technical");
  };

  // Cria a sessão cultural via edge function e redireciona para o fluxo unificado.
  // Substitui o antigo CultureInterviewModal — agora candidato e simulação usam a MESMA página.
  const startCulturalInterview = async () => {
    if (!jobId) return;
    if (!resolvedCandidateId) {
      toast.error("Não foi possível identificar seu cadastro. Recarregue a página.");
      return;
    }
    try {
      setStartingCulturalInterview(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("send-interview-invite", {
        body: {
          candidate_id: resolvedCandidateId,
          job_id: jobId,
          skip_notifications: true,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data?.token) {
        console.error("[AplicarVaga] start cultural session error:", error, data);
        toast.error("Não foi possível iniciar a entrevista cultural. Tente novamente.");
        return;
      }
      const returnPath = encodeURIComponent(`/candidato/aplicar/${jobId}`);
      navigate(`/interview/${data.token}?return=${returnPath}`);
    } catch (e) {
      console.error("[AplicarVaga] start cultural exception:", e);
      toast.error("Erro ao iniciar entrevista cultural.");
    } finally {
      setStartingCulturalInterview(false);
    }
  };

  const startTechnicalInterview = async () => {
    if (!jobId) return;
    if (!resolvedCandidateId || !company?.id) {
      toast.error("Não foi possível identificar seu cadastro. Recarregue a página.");
      return;
    }
    try {
      setStartingTechnicalInterview(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("send-technical-invitation", {
        body: {
          candidateId: resolvedCandidateId,
          jobId,
          accountId: company.id,
          skip_notifications: true,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data?.token) {
        console.error("[AplicarVaga] start technical session error:", error, data);
        toast.error("Não foi possível iniciar a entrevista técnica. Tente novamente.");
        return;
      }
      const returnPath = encodeURIComponent(`/candidato/aplicar/${jobId}`);
      navigate(`/interview/technical/${data.token}?return=${returnPath}`);
    } catch (e) {
      console.error("[AplicarVaga] start technical exception:", e);
      toast.error("Erro ao iniciar entrevista técnica.");
    } finally {
      setStartingTechnicalInterview(false);
    }
  };

  const handleDISCComplete = () => {
    setHasCompletedDISC(true);
    startEvaluationPolling("disc");
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case "recommended": return "Recomendado";
      case "conditional": return "Com Ressalvas";
      case "not_recommended": return "Não Recomendado";
      default: return rec;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
          <Button className="mt-4" onClick={() => navigate(`/vagas/${jobId}`)}>
            Voltar para a vaga
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = jobLoading || profileLoading || checkingInterview;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateNavbar user={{ email: user?.email, firstName: profile?.firstName, lastName: profile?.lastName }} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-40 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!jobData?.job) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateNavbar user={{ email: user?.email, firstName: profile?.firstName, lastName: profile?.lastName }} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Vaga não encontrada</h2>
              <p className="text-muted-foreground mb-6">
                Esta vaga pode ter sido fechada ou não está mais disponível.
              </p>
              <Button variant="outline" onClick={() => navigate("/candidate")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { job, company } = jobData;
  const candidateName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Candidato";

  // Determine what to render based on active step
  const renderActiveStepContent = () => {
    // If no profile, always show biography prompt
    if (!profile?.id) {
      return (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-5 text-center space-y-3">
              <User className="h-10 w-10 text-amber-500 mx-auto" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Complete sua biografia primeiro 😊
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Antes de iniciar, precisamos conhecer um pouquinho mais sobre você!
                </p>
              </div>
              <Button onClick={() => navigate(`/candidato/biografia?vaga=${jobId}`)}>
                Completar Minha Biografia
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Disqualified — check if candidate can retry
    if (effectiveDisqualified) {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive/70 mx-auto" />
            <h2 className="text-lg font-semibold">Processo Encerrado</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Infelizmente, seu perfil não avançou neste processo seletivo.
              Agradecemos sua participação e desejamos sucesso!
            </p>
            {canRetry && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                  Você tem a oportunidade de refazer a etapa. Deseja tentar novamente?
                </p>
                <Button
                  variant="default"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparando...</>
                  ) : (
                    <><RotateCcw className="h-4 w-4 mr-2" /> Tentar Novamente</>
                  )}
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate("/candidate")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Minhas Vagas
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Evaluating — waiting for orchestrator
    if (evaluatingStep) {
      return (
        <Card className="mb-6 border-amber-200 dark:border-amber-800/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Avaliando seu resultado...</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Estamos processando sua avaliação. Aguarde um momento enquanto analisamos seus resultados.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (allStepsCompleted) {
      return (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Candidatura Enviada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sua candidatura foi registrada. Acompanhe o status na sua área do candidato.
                </p>
              </div>
              <Button 
                size="lg"
                onClick={() => navigate("/candidate")}
                className="gap-2 min-w-[200px]"
              >
                <ArrowLeft className="h-5 w-5" />
                Ir para Minhas Candidaturas
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Active step: cultural
    if (activeStepType === "cultural") {
      return (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Matching Cultural</h2>
                <p className="text-sm text-muted-foreground">
                  Realize a entrevista por voz para avaliar sua compatibilidade cultural
                </p>
              </div>
            </div>

            {hasCompletedInterview ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Entrevista concluída!</p>
                      {interviewScore !== null && (culturalThreshold == null || interviewScore >= culturalThreshold) && (
                        <p className="text-sm text-green-600 dark:text-green-500">
                          Score de compatibilidade: {interviewScore}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {interviewResponses && interviewResponses.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="font-medium flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Perguntas e Respostas da Entrevista
                      </h3>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                      <div className="p-4 space-y-4">
                        {interviewResponses.map((response: any, index: number) => (
                          <div key={response.id} className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-primary">GENTIA:</p>
                                <p className="text-sm text-muted-foreground">{response.question_text}</p>
                              </div>
                            </div>
                            {response.candidate_response && (
                              <div className="flex items-start gap-2 ml-4">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Você:</p>
                                  <p className="text-sm text-muted-foreground">{response.candidate_response}</p>
                                </div>
                              </div>
                            )}
                            {index < interviewResponses.length - 1 && (
                              <div className="border-b pt-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Esta etapa é <span className="font-medium">obrigatória</span> para prosseguir com sua candidatura.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Certifique-se de estar em um ambiente silencioso</li>
                    <li>• Permita o acesso ao microfone quando solicitado</li>
                    <li>• Responda às perguntas de forma natural e honesta</li>
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={startCulturalInterview}
                  disabled={culturalGateState.kind !== "ready"}
                >
                  {startingCulturalInterview ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {startingCulturalInterview ? "Preparando entrevista..." : "Iniciar Matching Cultural"}
                </Button>
                <InterviewStartGateMessage state={culturalGateState} onRetry={() => refetchCandidateId()} onLinkCandidate={handleLinkCandidate} />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Active step: disc
    if (activeStepType === "disc") {
      if (discGateState.kind !== "ready") {
        return (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Fit Comportamental</h2>
                  <p className="text-sm text-muted-foreground">
                    Preparando sua candidatura antes de iniciar o assessment
                  </p>
                </div>
              </div>
              <InterviewStartGateMessage state={discGateState} onRetry={() => refetchCandidateId()} onLinkCandidate={handleLinkCandidate} />
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="mb-6">
          <DISCAssessmentInline
            jobId={jobId || ""}
            accountId={company?.id || ""}
            candidateProfileId={profile.id || ""}
            candidateId={resolvedCandidateId || undefined}
            candidateName={candidateName}
            onComplete={handleDISCComplete}
          />
        </div>
      );
    }


    // Active step: technical
    if (activeStepType === "technical") {
      return (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Code className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Avaliação Técnica</h2>
                <p className="text-sm text-muted-foreground">
                  Entrevista técnica por voz com IA adaptativa
                </p>
              </div>
            </div>

            {hasCompletedTechnicalInterview ? (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Avaliação técnica concluída!</p>
                    {technicalScore !== null && (technicalThreshold == null || technicalScore >= technicalThreshold) && (
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Score: {technicalScore}% • {getRecommendationLabel(technicalRecommendation)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    A IA fará perguntas técnicas adaptativas baseadas nas competências da vaga.
                    Duração estimada: 15-25 minutos.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• As perguntas se adaptam conforme suas respostas</li>
                    <li>• Fale naturalmente sobre suas experiências</li>
                    <li>• Exemplos práticos são valorizados</li>
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={startTechnicalInterview}
                  disabled={technicalGateState.kind !== "ready"}
                >
                  {startingTechnicalInterview ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Code className="h-5 w-5" />
                  )}
                  {startingTechnicalInterview ? "Preparando entrevista..." : "Iniciar Avaliação Técnica"}
                </Button>
                <InterviewStartGateMessage state={technicalGateState} onRetry={() => refetchCandidateId()} onLinkCandidate={handleLinkCandidate} />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateNavbar user={{ email: user?.email, firstName: profile?.firstName, lastName: profile?.lastName }} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(`/vagas/${jobId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para a vaga
        </Button>

        {/* Job Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary mb-1">{company?.name || "Empresa"}</p>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.location && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                  )}
                  {job.work_regime && (
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {WORK_REGIME_LABELS[job.work_regime] || job.work_regime}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stepper */}
        {stepperSteps.length > 0 && (
          <Card className="mb-6">
            <CardContent className="px-6 py-4">
              <ApplicationStepper steps={stepperSteps} />
            </CardContent>
          </Card>
        )}

        {/* Banner: previous attempt was interrupted (not disqualified) */}
        {hasAbandonedAttempt && !allStepsCompleted && (
          <Card className="mb-4 border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Sua tentativa anterior foi interrompida
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Pode iniciar uma nova tentativa abaixo — vamos retomar do início desta etapa.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Step Content */}
        {renderActiveStepContent()}
      </div>

      {/*
        Modais antigos (CultureInterviewModal/TechnicalInterviewModal) foram REMOVIDOS.
        O fluxo agora redireciona para /interview/:token e /interview/technical/:token,
        a mesma página usada pelo link via WhatsApp e pelo modo simulação — garantindo
        layout, voz, dicas, preflight, watchdog e VAD idênticos em todos os canais.
        Os componentes ficam arquivados em src/components/candidate/_archived/.
      */}
    </div>
  );
}
