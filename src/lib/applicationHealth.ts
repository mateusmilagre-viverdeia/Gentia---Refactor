import type { UnifiedSession } from "@/hooks/useRecruitmentSessions";

export type ApplicationStage =
  | "new"
  | "applied"
  | "screening"
  | "disc"
  | "cultural_fit"
  | "technical"
  | "evaluation"
  | "offer"
  | "hired"
  | "desqualificado"
  | "rejected";

export const STAGE_LABEL: Record<string, string> = {
  new: "Novo",
  applied: "Aplicado",
  screening: "Triagem",
  disc: "Fit Comportamental",
  cultural_fit: "Fit Cultural",
  interview: "Entrevista",
  technical: "Entrevista Técnica",
  evaluation: "Em Avaliação",
  offer: "Proposta",
  hired: "Contratado",
  desqualificado: "Desqualificado",
  rejected: "Rejeitado",
};

export interface SessionsByCandidateJob {
  cultural: UnifiedSession[];
  disc: UnifiedSession[];
  technical: UnifiedSession[];
}

export const EMPTY_SESSIONS: SessionsByCandidateJob = {
  cultural: [],
  disc: [],
  technical: [],
};

export function indexSessionsByCandidateJob(
  sessions: UnifiedSession[] = []
): Map<string, SessionsByCandidateJob> {
  const map = new Map<string, SessionsByCandidateJob>();
  for (const s of sessions) {
    if (!s.candidateId || !s.jobId) continue;
    const key = `${s.candidateId}-${s.jobId}`;
    const bucket = map.get(key) ?? {
      cultural: [],
      disc: [],
      technical: [],
    };
    bucket[s.type].push(s);
    map.set(key, bucket);
  }
  return map;
}

export type HealthLevel = "healthy" | "warning" | "critical";

export interface HealthSummary {
  level: HealthLevel;
  reasons: string[];
  ageHours: number;
  failedSession: UnifiedSession | null;
  partialSession: UnifiedSession | null;
}

const TERMINAL_STATUSES = new Set(["hired", "desqualificado", "rejected"]);

export function summarizeHealth(
  status: string,
  updatedAt: Date,
  sessions: SessionsByCandidateJob,
  doNotReapproach = false
): HealthSummary {
  const reasons: string[] = [];
  const ageHours = (Date.now() - updatedAt.getTime()) / 3_600_000;
  const isTerminal = TERMINAL_STATUSES.has(status);

  const allSessions = [
    ...sessions.cultural,
    ...sessions.disc,
    ...sessions.technical,
  ];

  const failedSession =
    allSessions.find(
      (s) =>
        s.status === "abandoned" ||
        s.status === "failed" ||
        s.status === "failed_technical"
    ) ?? null;

  const partialSession = allSessions.find((s) => s.isPartial) ?? null;

  if (!isTerminal) {
    if (ageHours > 72) {
      reasons.push(`Parada há ${Math.floor(ageHours / 24)} dia(s)`);
    } else if (ageHours > 24) {
      reasons.push(`Sem atividade há ${Math.floor(ageHours)}h`);
    }
  }

  if (failedSession) {
    reasons.push(`Sessão ${failedSession.type} interrompida`);
  }
  if (partialSession) {
    reasons.push(`Avaliação ${partialSession.type} parcial`);
  }
  if (doNotReapproach) {
    reasons.push("Marcado como “não reabordar”");
  }

  let level: HealthLevel = "healthy";
  if (failedSession || doNotReapproach || (!isTerminal && ageHours > 72)) {
    level = "critical";
  } else if (reasons.length > 0) {
    level = "warning";
  }

  return { level, reasons, ageHours, failedSession, partialSession };
}

export function getAttemptCount(sessions: SessionsByCandidateJob): number {
  return (
    sessions.cultural.length + sessions.disc.length + sessions.technical.length
  );
}

export function bucketAgeHours(ageHours: number): "fresh" | "recent" | "week" | "old" {
  if (ageHours <= 24) return "fresh";
  if (ageHours <= 72) return "recent";
  if (ageHours <= 168) return "week";
  return "old";
}
