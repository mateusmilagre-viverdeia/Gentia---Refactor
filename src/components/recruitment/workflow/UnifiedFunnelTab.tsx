import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useJobWorkflow } from "@/hooks/useJobWorkflow";
import { CandidateProfileModal } from "@/components/recruitment/CandidateProfileModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { calculateCompositeScore, getCompositeScoreBadgeVariant } from "@/lib/compositeScore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  Brain,
  TestTubeDiagonal,
  CheckCircle2,
  Eye,
  ArrowRight,
  Users,
  XCircle,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronDown,
  Mail,
  Phone,
  ArrowUpDown,
  Filter,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompareFinalistsButton } from "./CompareFinalistsButton";
import { formatBRT } from "@/lib/datetime";


interface UnifiedFunnelTabProps {
  jobId: string;
}

interface UnifiedCandidate {
  candidateId: string;
  candidateProfileId: string | null;
  name: string;
  email: string;
  applicationId: string | null;
  applicationStatus: string | null;
  screeningCompleted: boolean;
  screeningPassed: boolean;
  cultureCompleted: boolean;
  discCompleted: boolean;
  techCompleted: boolean;
  cultureScore: number | null;
  discScore: number | null;
  techScore: number | null;
  cultureReused: boolean;
  discReused: boolean;
  cultureSessionId: string | null;
  // V2 culture qualitative recommendation (RECOMENDADO | RECOMENDADO_COM_RESSALVAS | NAO_RECOMENDADO)
  cultureRecommendation: 'RECOMENDADO' | 'RECOMENDADO_COM_RESSALVAS' | 'NAO_RECOMENDADO' | null;
  cultureAuditTrail: any | null;
  cultureCompletedAt: string | null;
  cultureAppliesV2Gate: boolean;
  // V2 technical qualitative recommendation
  techRecommendation: 'recommended' | 'conditional' | 'not_recommended' | null;
  techCompletedAt: string | null;
  techSeniorityTarget: 'junior' | 'pleno' | 'senior' | 'lead' | null;
  techAppliesV2Gate: boolean;
  appliedAt: Date;
  currentStage: string;
  isDisqualified: boolean;
  disqualifiedAtStage: string | null;
  disqualifiedReason: string | null;
  compositeScore: number | null;
  compositeComplete: boolean;
}

/**
 * Cutoff de ativação do Dual Gate V2 (score + recommendation) no Kanban cultural.
 * Sessões concluídas ANTES desta data mantêm o comportamento antigo (só score),
 * preservando candidatos já aprovados/desqualificados. Sessões a partir deste
 * instante passam a aplicar AND entre score e recommendation.
 * 2026-05-25 00:00 BRT = 2026-05-25 03:00 UTC.
 */
const V2_GATE_CUTOFF = new Date('2026-05-25T03:00:00Z');
const V2_TECH_GATE_CUTOFF = new Date('2026-05-26T03:00:00Z');

function inferSeniorityFromTitle(title: string | null | undefined): 'junior' | 'pleno' | 'senior' | 'lead' | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (/\b(staff|principal|lead|líder|head|coordenador|gerente)\b/.test(t)) return 'lead';
  if (/\b(s[êe]nior|sr\.?|specialist|especialista)\b/.test(t)) return 'senior';
  if (/\b(j[úu]nior|jr\.?|trainee|estagi[áa]rio|estagio)\b/.test(t)) return 'junior';
  return 'pleno';
}

const STEP_LABELS: Record<string, string> = {
  _application: "Candidatura",
  screening: "Triagem",
  cultural: "Fit Cultural",
  disc: "DISC",
  technical: "Técnico",
  _approved: "Aprovados",
};

const STEP_ICONS: Record<string, typeof Bot> = {
  _application: FileText,
  screening: Filter,
  cultural: Bot,
  disc: Brain,
  technical: TestTubeDiagonal,
  _approved: CheckCircle2,
};

const STEP_COLORS: Record<string, string> = {
  _application: "hsl(215, 20%, 65%)",
  screening: "hsl(38, 92%, 50%)",
  cultural: "hsl(271, 91%, 65%)",
  disc: "hsl(260, 80%, 55%)",
  technical: "hsl(200, 85%, 50%)",
  _approved: "hsl(142, 76%, 36%)",
};

const STEP_BG_COLORS: Record<string, string> = {
  _application: "bg-slate-500",
  screening: "bg-amber-500",
  cultural: "bg-purple-500",
  disc: "bg-indigo-500",
  technical: "bg-cyan-500",
  _approved: "bg-green-500",
};

export function UnifiedFunnelTab({ jobId }: UnifiedFunnelTabProps) {
  const { currentAccount } = useOrganization();
  const { steps: workflowSteps, isLoading: stepsLoading } = useJobWorkflow({
    jobId,
    accountId: currentAccount?.id,
  });

  const [viewMode, setViewMode] = useState<"active" | "lost">("active");
  const [sortByRanking, setSortByRanking] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch all data
  const { data: sessionData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["unified-funnel-sessions", jobId],
    queryFn: async () => {
      const [culture, disc, tech, apps, screening, jobRes] = await Promise.all([
        supabase
          .from("culture_interview_sessions")
          .select("id, candidate_id, status, matching_score, recommendation, evaluation_audit_trail, completed_at, created_at, reused_from_session_id, candidate:candidate_profiles(id, full_name)")
          .eq("job_id", jobId),
        supabase
          .from("candidate_disc_sessions")
          .select("id, candidate_id, status, created_at, reused_from_session_id, candidate:candidate_profiles!candidate_disc_sessions_candidate_profile_id_fkey(id, full_name)")
          .eq("job_id", jobId),
        supabase
          .from("technical_interview_sessions")
          .select("id, candidate_id, candidate_profile_id, status, overall_score, recommendation, completed_at, seniority_target, created_at")
          .eq("job_id", jobId),
        supabase
          .from("recruitment_applications")
          .select("id, candidate_id, status, applied_at, candidate:recruitment_candidates(id, first_name, last_name, email)")
          .eq("job_id", jobId),
        supabase
          .from("recruitment_screening_results")
          .select("id, candidate_id, application_id, passed, completed_at, created_at")
          .eq("job_id", jobId),
        supabase
          .from("recruitment_jobs")
          .select("id, title, seniority_target")
          .eq("id", jobId)
          .maybeSingle(),
      ]);
      // Fetch DISC scores via SECURITY DEFINER RPC to avoid nested RLS issues
      const discSessionIds = (disc.data || []).map(s => s.id);
      const discScoresRes = discSessionIds.length > 0
        ? await supabase.rpc('get_disc_match_scores', { p_session_ids: discSessionIds })
        : { data: [] };
      const discScoreMap = new Map((discScoresRes.data || []).map((r: any) => [r.session_id, r.match_score]));

      return {
        cultureSessions: culture.data || [],
        discSessions: disc.data || [],
        techSessions: tech.data || [],
        applications: apps.data || [],
        screeningResults: screening.data || [],
        discScoreMap,
        job: jobRes.data || null,
      };

    },
    enabled: !!jobId && !stepsLoading,
    staleTime: 30_000,
  });

  // Build unified candidate list
  const unifiedCandidates = useMemo(() => {
    if (!sessionData) return [];
    const { cultureSessions, discSessions, techSessions, applications, screeningResults, discScoreMap, job } = sessionData;
    const jobSeniority = (job?.seniority_target as 'junior'|'pleno'|'senior'|null) ?? null;
    const jobTitleFallback = job?.title ?? null;
    const candidateMap = new Map<string, UnifiedCandidate>();
    const stepTypes = workflowSteps.map(s => s.step_type);

    const createEmpty = (cid: string): UnifiedCandidate => ({
      candidateId: cid,
      candidateProfileId: null,
      name: "Candidato",
      email: "",
      applicationId: null,
      applicationStatus: null,
      screeningCompleted: false,
      screeningPassed: false,
      cultureCompleted: false,
      discCompleted: false,
      techCompleted: false,
      cultureScore: null,
      discScore: null,
      techScore: null,
      cultureReused: false,
      discReused: false,
      cultureSessionId: null,
      cultureRecommendation: null,
      cultureAuditTrail: null,
      cultureCompletedAt: null,
      cultureAppliesV2Gate: false,
      techRecommendation: null,
      techCompletedAt: null,
      techSeniorityTarget: null,
      techAppliesV2Gate: false,
      appliedAt: new Date(),
      currentStage: stepTypes[0] || "cultural",
      isDisqualified: false,
      disqualifiedAtStage: null,
      disqualifiedReason: null,
      compositeScore: null,
      compositeComplete: false,
    });

    for (const s of cultureSessions as any[]) {
      const cid = s.candidate_id;
      if (!cid) continue;
      if (!candidateMap.has(cid)) candidateMap.set(cid, createEmpty(cid));
      const c = candidateMap.get(cid)!;
      c.candidateProfileId = s.candidate?.id || c.candidateProfileId;
      c.name = s.candidate?.full_name || c.name;
      if (s.status === "completed") {
        c.cultureCompleted = true;
        c.cultureScore = s.matching_score;
        c.cultureSessionId = s.id;
        c.cultureRecommendation = s.recommendation ?? null;
        c.cultureAuditTrail = s.evaluation_audit_trail ?? null;
        c.cultureCompletedAt = s.completed_at ?? null;
        // V2 dual-gate só vale para sessões concluídas a partir do cutoff (grandfathering).
        // Sessões antigas mantêm comportamento score-only.
        c.cultureAppliesV2Gate = s.completed_at
          ? new Date(s.completed_at) >= V2_GATE_CUTOFF
          : false;
        if (s.reused_from_session_id) c.cultureReused = true;
      }
    }

    for (const s of discSessions as any[]) {
      const cid = s.candidate_id;
      if (!cid) continue;
      if (!candidateMap.has(cid)) candidateMap.set(cid, createEmpty(cid));
      const c = candidateMap.get(cid)!;
      c.candidateProfileId = s.candidate?.id || c.candidateProfileId;
      c.name = s.candidate?.full_name || c.name;
      if (s.status === "completed") {
        const matchScore = discScoreMap.get(s.id) ?? null;
        if (matchScore != null) {
          c.discCompleted = true;
          c.discScore = matchScore;
          if (s.reused_from_session_id) c.discReused = true;
        }
      }
    }

    const profileToCandidateMap = new Map<string, string>();
    for (const [cid, entry] of candidateMap.entries()) {
      if (entry.candidateProfileId) profileToCandidateMap.set(entry.candidateProfileId, cid);
    }

    for (const s of techSessions as any[]) {
      let cid = s.candidate_id;
      if (!cid && s.candidate_profile_id) cid = profileToCandidateMap.get(s.candidate_profile_id) || null;
      if (!cid) continue;
      if (!candidateMap.has(cid)) candidateMap.set(cid, createEmpty(cid));
      const c = candidateMap.get(cid)!;
      c.candidateProfileId = s.candidate_profile_id || c.candidateProfileId;
      if (s.status === "completed") {
        c.techCompleted = true;
        c.techScore = s.overall_score;
        c.techRecommendation = s.recommendation ?? null;
        c.techCompletedAt = s.completed_at ?? null;
        // Senioridade efetiva: sessão > job.seniority_target > inferência do título (fallback)
        const sessSen = (s.seniority_target as 'junior'|'pleno'|'senior'|'lead'|null) ?? null;
        c.techSeniorityTarget = sessSen ?? jobSeniority ?? inferSeniorityFromTitle(jobTitleFallback);
        // V2 tech gate: precisa ter recommendation + senioridade + completed_at >= cutoff
        c.techAppliesV2Gate = !!(
          s.completed_at &&
          s.recommendation &&
          c.techSeniorityTarget &&
          new Date(s.completed_at) >= V2_TECH_GATE_CUTOFF
        );
      }
    }

    for (const app of applications as any[]) {
      const cid = app.candidate?.id;
      if (!cid) continue;
      // Create candidate entry if not yet in the map (no sessions exist)
      if (!candidateMap.has(cid)) {
        candidateMap.set(cid, createEmpty(cid));
      }
      const c = candidateMap.get(cid)!;
      c.applicationId = app.id;
      c.applicationStatus = app.status;
      c.name = app.candidate ? `${app.candidate.first_name || ''} ${app.candidate.last_name || ''}`.trim() || c.name : c.name;
      c.email = app.candidate?.email || c.email;
      c.appliedAt = new Date(app.applied_at);
      if (app.status === "desqualificado" || app.status === "rejected") {
        c.isDisqualified = true;
      }
    }

    // Process screening results
    for (const sr of screeningResults as any[]) {
      const cid = sr.candidate_id;
      if (!cid) continue;
      const c = candidateMap.get(cid);
      if (c) {
        c.screeningCompleted = true;
        c.screeningPassed = sr.passed === true;
      }
    }

    // Build threshold map from workflow steps
    const thresholdMap: Record<string, number> = {};
    for (const ws of workflowSteps) {
      const cfg = ws.threshold_config || {};
      if (ws.step_type === "disc") {
        thresholdMap[ws.step_type] = cfg.min_match ?? 0;
      } else {
        thresholdMap[ws.step_type] = cfg.min_score ?? 0;
      }
    }

    // Helper: get score for a step type
    const getStepData = (c: UnifiedCandidate, st: string): { completed: boolean; score: number | null } => {
      if (st === "screening") return { completed: c.screeningCompleted, score: c.screeningPassed ? 100 : (c.screeningCompleted ? 0 : null) };
      if (st === "cultural") return { completed: c.cultureCompleted, score: c.cultureScore };
      if (st === "disc") return { completed: c.discCompleted, score: c.discScore };
      if (st === "technical") return { completed: c.techCompleted, score: c.techScore };
      return { completed: false, score: null };
    };

    // Compute currentStage for each candidate using score-based advancement
    for (const c of candidateMap.values()) {
      let stage = "_approved";
      // Only treat as disqualified if app status is explicitly rejected, not "evaluation" or "desqualificado" without a real score-based decision
      let disqualified = c.applicationStatus === "rejected" || c.applicationStatus === "desqualificado";
      let disqualifiedAt: string | null = null;
      let disqualifiedReason: string | null = null;

      for (const st of stepTypes) {
        const { completed, score } = getStepData(c, st);
        const threshold = thresholdMap[st] ?? 0;

        if (!completed) {
          // Not yet completed this step — candidate is at this stage
          stage = st;
          break;
        }

        // V2 qualitative gate (cultural): NAO_RECOMENDADO disqualifies regardless of score.
        // Aplicado apenas a sessões a partir do cutoff (grandfathering).
        if (st === "cultural" && c.cultureAppliesV2Gate && c.cultureRecommendation === "NAO_RECOMENDADO") {
          stage = st;
          disqualified = true;
          disqualifiedAt = st;
          disqualifiedReason = "Não recomendado pela IA (red flag / eliminador crítico)";
          break;
        }

        // V2 qualitative gate (técnico): pleno/sênior + not_recommended → Perdidos.
        // Júnior + not_recommended → AVANÇA com badge "Requer ramp-up" (potencial > experiência).
        // Conditional → AVANÇA com badge.
        if (st === "technical" && c.techAppliesV2Gate && c.techRecommendation === "not_recommended") {
          const isJunior = c.techSeniorityTarget === "junior";
          if (!isJunior) {
            stage = st;
            disqualified = true;
            disqualifiedAt = st;
            disqualifiedReason = "Não recomendado pela IA (gap em skill obrigatória)";
            break;
          }
          // júnior + not_recommended → segue adiante (badge é renderizado no card)
        }

        // Quantitative gate: score must reach job's min_score
        const actualScore = score ?? 100;
        if (threshold > 0 && actualScore < threshold) {
          stage = st;
          disqualified = true;
          disqualifiedAt = st;
          disqualifiedReason = `Score ${Math.round(actualScore)} abaixo do mínimo (${threshold}) da vaga`;
          break;
        }
        // Passed both gates — continue to next step
      }

      c.currentStage = stage;
      c.isDisqualified = disqualified;
      c.disqualifiedAtStage = disqualified ? (disqualifiedAt || c.currentStage) : null;
      c.disqualifiedReason = disqualifiedReason;

      // Calculate composite score
      const result = calculateCompositeScore(c.cultureScore, c.discScore, c.techScore);
      c.compositeScore = result.score;
      c.compositeComplete = result.isComplete;
    }

    return Array.from(candidateMap.values());
  }, [sessionData, workflowSteps]);

  // Filter candidates
  const activeCandidates = useMemo(() => unifiedCandidates.filter(c => !c.isDisqualified), [unifiedCandidates]);
  const lostCandidates = useMemo(() => unifiedCandidates.filter(c => c.isDisqualified), [unifiedCandidates]);
  const displayedCandidates = viewMode === "active" ? activeCandidates : lostCandidates;

  // Build columns
  const stageKeys = useMemo((): string[] => {
    const keys: string[] = ["_application", ...workflowSteps.map(s => s.step_type)];
    keys.push("_approved");
    return keys;
  }, [workflowSteps]);

  // Kanban keys exclude _application (it's just a funnel bar metric)
  const kanbanKeys = useMemo(() => stageKeys.filter(k => k !== "_application"), [stageKeys]);

  const columnData = useMemo(() => {
    const cols: Record<string, UnifiedCandidate[]> = {};
    for (const key of kanbanKeys) cols[key] = [];
    for (const c of displayedCandidates) {
      const stage = c.currentStage;
      if (cols[stage]) cols[stage].push(c);
      else if (cols[kanbanKeys[0]]) cols[kanbanKeys[0]].push(c);
    }
    // Sort by ranking if enabled
    if (sortByRanking) {
      for (const key of kanbanKeys) {
        cols[key].sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
      }
    }
    return cols;
  }, [kanbanKeys, displayedCandidates, sortByRanking]);

  // Funnel metrics
  const funnelMetrics = useMemo(() => {
    const total = activeCandidates.length + lostCandidates.length;
    const stages = stageKeys.map((key, i) => {
      const atOrBeyond = stageKeys.slice(i).reduce(
        (sum, k) => sum + (activeCandidates.filter(c => c.currentStage === k).length),
        0
      );
      return { key, count: atOrBeyond };
    });

    const conversions: (number | null)[] = stages.map((s, i) => {
      if (i === 0) return null;
      return stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : 0;
    });

    // Bottleneck
    let bottleneck: string | null = null;
    let lowestRate = 101;
    for (let i = 1; i < conversions.length; i++) {
      const rate = conversions[i];
      if (rate !== null && rate < lowestRate && rate > 0) {
        lowestRate = rate;
        bottleneck = stageKeys[i] as string;
      }
    }

    const approved = activeCandidates.filter(c => c.currentStage === "_approved").length;
    const overallConversion = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { stages, conversions, bottleneck, total, approved, overallConversion, lostCount: lostCandidates.length };
  }, [activeCandidates, lostCandidates, stageKeys]);

  const handleViewDetails = (candidate: UnifiedCandidate) => {
    setSelectedSessionId(candidate.cultureSessionId || null);
    setSelectedApplicationId(candidate.applicationId || null);
    setModalOpen(true);
  };

  if (stepsLoading || sessionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 flex-1" />)}
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
    <div className="space-y-5">
      {/* Funnel Summary Bar */}
      <div className="bg-background border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          {/* KPI chips */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{funnelMetrics.total}</span>
              <span className="text-muted-foreground">candidatos</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{funnelMetrics.overallConversion}%</span>
              <span className="text-emerald-600/70 dark:text-emerald-400/70">conversão</span>
            </div>
            {funnelMetrics.lostCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">{funnelMetrics.lostCount}</span>
                <span className="text-red-500/70">perdidos</span>
              </div>
            )}
            {funnelMetrics.bottleneck && funnelMetrics.bottleneck !== "_approved" && (
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600/70 dark:text-amber-400/70">Gargalo:</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">{STEP_LABELS[funnelMetrics.bottleneck] || funnelMetrics.bottleneck}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual funnel bar */}
        <div className="flex items-center gap-1">
          {funnelMetrics.stages.map((stage, i) => {
            const maxCount = funnelMetrics.stages[0]?.count || 1;
            const widthPercent = Math.max(maxCount > 0 ? (stage.count / maxCount) * 100 : 20, 15);
            const conversion = funnelMetrics.conversions[i];
            const Icon = STEP_ICONS[stage.key] || Bot;

            return (
              <div key={stage.key} className="flex items-center" style={{ flex: widthPercent }}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="relative h-10 rounded-lg flex items-center justify-between px-3 cursor-default transition-all hover:brightness-110 w-full"
                        style={{ backgroundColor: STEP_COLORS[stage.key] || "hsl(var(--muted))" }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-white/80 shrink-0" />
                          <span className="text-white font-medium text-xs truncate">
                            {STEP_LABELS[stage.key] || stage.key}
                          </span>
                        </div>
                        <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ml-1">
                          {stage.count}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{STEP_LABELS[stage.key]}: {stage.count} candidatos</p>
                      {conversion !== null && <p>Conversão: {conversion}%</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {i < funnelMetrics.stages.length - 1 && (
                  <div className="flex flex-col items-center mx-0.5 shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    {funnelMetrics.conversions[i + 1] !== null && (
                      <span className={cn(
                        "text-[9px] font-semibold",
                        (funnelMetrics.conversions[i + 1] ?? 0) >= 70 ? "text-emerald-600" :
                        (funnelMetrics.conversions[i + 1] ?? 0) >= 40 ? "text-amber-600" :
                        "text-red-500"
                      )}>
                        {funnelMetrics.conversions[i + 1]}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle: Ativos / Perdidos + Ranking */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("active")}
          className="gap-1.5 h-8 text-xs"
        >
          <Users className="h-3.5 w-3.5" />
          Ativos ({activeCandidates.length})
        </Button>
        <Button
          variant={viewMode === "lost" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setViewMode("lost")}
          className="gap-1.5 h-8 text-xs"
        >
          <XCircle className="h-3.5 w-3.5" />
          Perdidos ({lostCandidates.length})
        </Button>
        <div className="ml-auto">
          <Button
            variant={sortByRanking ? "default" : "outline"}
            size="sm"
            onClick={() => setSortByRanking(prev => !prev)}
            className="gap-1.5 h-8 text-xs"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortByRanking ? "Ranking ativo" : "Ordenar por ranking"}
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanKeys.map((key) => {
          const Icon = STEP_ICONS[key] || Bot;
          const candidates = columnData[key] || [];
          const isApproved = key === "_approved";

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col w-72 min-h-[350px] rounded-lg border bg-muted/30 flex-shrink-0",
                isApproved && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
              )}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 p-3 border-b">
                <div className={cn("w-2 h-2 rounded-full", STEP_BG_COLORS[key] || "bg-muted-foreground")} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{STEP_LABELS[key] || key}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {candidates.length}
                </span>
              </div>
              {isApproved && viewMode === "active" && (
                <div className="px-3 py-2 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CompareFinalistsButton
                    jobId={jobId}
                    finalists={candidates.map((c) => ({
                      candidateId: c.candidateId,
                      name: c.name,
                      cultureScore: c.cultureScore,
                      discScore: c.discScore,
                      techScore: c.techScore,
                      compositeScore: c.compositeScore,
                    }))}
                  />
                </div>
              )}

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {candidates.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    {viewMode === "lost" ? "Nenhum perdido nesta etapa" : "Nenhum candidato nesta etapa"}
                  </div>
                ) : (
                  candidates.map((candidate, idx) => (
                    <CandidateFunnelCard
                      key={candidate.candidateId}
                      candidate={candidate}
                      viewMode={viewMode}
                      onViewDetails={() => handleViewDetails(candidate)}
                      rankPosition={sortByRanking ? idx + 1 : undefined}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications Section - Collapsible */}
      <NotificationsSection jobId={jobId} />

      <CandidateProfileModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sessionId={selectedSessionId}
        applicationId={selectedApplicationId}
      />
    </div>
  );
}

// --- Notifications Section ---

function NotificationsSection({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["funnel-notifications", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_scheduled_notifications")
        .select(`
          id, notification_type, status, scheduled_for, processed_at,
          candidate:recruitment_candidates(
            id, 
            candidate_profile:candidate_profiles(full_name, phone)
          )
        `)
        .eq("job_id", jobId)
        .order("scheduled_for", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-12 w-full rounded-xl" />;
  if (notifications.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Últimos Disparos
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {notifications.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notif: any) => {
                  const candidate = notif.candidate?.candidate_profile;
                  const candidateName = candidate?.full_name || "—";
                  const phone = candidate?.phone;
                  const isEmail = notif.notification_type === "email";

                  return (
                    <TableRow key={notif.id}>
                      <TableCell className="text-sm font-medium">{candidateName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {isEmail ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                          {phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isEmail ? "info" : "success"} className="text-[10px]">
                          {isEmail ? "Email" : "WhatsApp"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatBRT(new Date(notif.scheduled_for), "dd/MM HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={notif.status === "processed" ? "success" : notif.status === "pending" ? "warning" : "secondary"}
                          className="text-[10px]"
                        >
                          {notif.status === "processed" ? "Enviado" : notif.status === "pending" ? "Pendente" : notif.status || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// --- Candidate Card ---

function CandidateFunnelCard({
  candidate,
  viewMode,
  onViewDetails,
  rankPosition,
}: {
  candidate: UnifiedCandidate;
  viewMode: "active" | "lost";
  onViewDetails: () => void;
  rankPosition?: number;
}) {
  const initials = candidate.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const scoreBadgeVariant = getCompositeScoreBadgeVariant(candidate.compositeScore);

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
        viewMode === "lost" && "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10"
      )}
      onClick={onViewDetails}
    >
      <div className="flex items-start gap-2.5">
        {rankPosition && (
          <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-1">
            {rankPosition}
          </span>
        )}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{candidate.name}</p>
            {candidate.compositeScore !== null && (
              <Badge variant={scoreBadgeVariant} className="text-[9px] px-1.5 py-0 shrink-0">
                {candidate.compositeScore}%
              </Badge>
            )}
          </div>

          {/* Score indicators */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <ScorePill label="C" score={candidate.cultureScore} completed={candidate.cultureCompleted} />
            <ScorePill label="D" score={candidate.discScore} completed={candidate.discCompleted} />
            <ScorePill label="T" score={candidate.techScore} completed={candidate.techCompleted} />
          </div>

          {/* V2 Ressalvas badge — advances but flagged for recruiter review */}
          {viewMode === "active" && candidate.cultureAppliesV2Gate && candidate.cultureRecommendation === "RECOMENDADO_COM_RESSALVAS" && (
            <div className="mt-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 gap-1 bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-400 cursor-help"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Com ressalvas
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium text-xs mb-1">Recomendado com ressalvas</p>
                    <RessalvasReasons auditTrail={candidate.cultureAuditTrail} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* V2 Tech "Requer ramp-up" badge — conditional ou júnior+not_recommended */}
          {viewMode === "active" && candidate.techAppliesV2Gate && (
            candidate.techRecommendation === "conditional" ||
            (candidate.techRecommendation === "not_recommended" && candidate.techSeniorityTarget === "junior")
          ) && (
            <div className="mt-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 gap-1 bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-400 cursor-help"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Requer ramp-up
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium text-xs mb-1">Avaliação técnica com ressalvas</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.techRecommendation === "conditional"
                        ? "IA recomendou condicionalmente — há gaps em skills que podem ser desenvolvidos."
                        : "Júnior sem domínio completo das skills obrigatórias — potencial avaliado acima da experiência."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Reused assessment badges */}
          {(candidate.cultureReused || candidate.discReused) && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {candidate.cultureReused && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0" title="Fit Cultural reaproveitado de outra vaga desta empresa">
                  ♻ Cultural
                </Badge>
              )}
              {candidate.discReused && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0" title="DISC reaproveitado de outra vaga desta empresa">
                  ♻ DISC
                </Badge>
              )}
            </div>
          )}

          {/* Lost badge */}
          {viewMode === "lost" && candidate.disqualifiedAtStage && (
            <div className="mt-1.5 space-y-1">
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                Saiu em {STEP_LABELS[candidate.disqualifiedAtStage] || candidate.disqualifiedAtStage}
              </Badge>
              {candidate.disqualifiedReason && (
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {candidate.disqualifiedReason}
                </p>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// --- Score Pill ---

function ScorePill({ label, score, completed }: { label: string; score: number | null; completed: boolean }) {
  if (!completed || score == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
        {label}
        <Clock className="h-2.5 w-2.5" />
      </span>
    );
  }

  const variant = score >= 70 ? "success" : score >= 40 ? "warning" : "destructive";

  return (
    <Badge variant={variant} className="text-[9px] px-1.5 py-0 gap-0.5">
      {label} {score}%
    </Badge>
  );
}

// --- Ressalvas reasons (from V2 audit_trail) ---

function RessalvasReasons({ auditTrail }: { auditTrail: any }) {
  // Try to extract top reasons from V2 audit_trail structure
  const reasons: string[] = [];
  if (auditTrail && typeof auditTrail === "object") {
    const failed = Array.isArray(auditTrail.failed_criteria) ? auditTrail.failed_criteria : [];
    for (const f of failed.slice(0, 3)) {
      if (typeof f === "string") reasons.push(f);
      else if (f?.name) reasons.push(`${f.name}${f.score != null ? ` (${Math.round(f.score)})` : ""}`);
    }
    if (reasons.length === 0 && Array.isArray(auditTrail.warnings)) {
      reasons.push(...auditTrail.warnings.slice(0, 3).map((w: any) => String(w)));
    }
    if (reasons.length === 0 && auditTrail.summary) {
      reasons.push(String(auditTrail.summary));
    }
  }

  if (reasons.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Avança no funil, mas requer revisão do recrutador antes da próxima etapa.
      </p>
    );
  }

  return (
    <ul className="text-[11px] space-y-0.5 list-disc list-inside text-muted-foreground">
      {reasons.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
}
