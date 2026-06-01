import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";

const STAGE_CONFIG = [
  { id: "applied", name: "Aplicado" },
  { id: "fit_cultural", name: "Fit Cultural" },
  { id: "disc", name: "DISC" },
  { id: "fit_tecnico", name: "Fit Técnico" },
  { id: "avaliacao_final", name: "Avaliação Final" },
  { id: "referencias", name: "Referências" },
  { id: "proposta", name: "Proposta" },
  { id: "hired", name: "Contratado" },
];

export interface StageQualityMetrics {
  stageId: string;
  stageName: string;
  candidatesCount: number;
  avgCulturalScore: number | null;
  avgDiscMatch: number | null;
  avgEvaluationScore: number | null;
}

export interface PipelineQualityMetrics {
  stages: StageQualityMetrics[];
  overallQuality: {
    avgCulturalScore: number | null;
    avgDiscMatch: number | null;
    avgEvaluationScore: number | null;
  };
  hiredCandidatesQuality: {
    avgCulturalScore: number | null;
    avgDiscMatch: number | null;
    avgEvaluationScore: number | null;
  };
  qualityComparison: {
    culturalDiff: number | null;
    discDiff: number | null;
    evaluationDiff: number | null;
  };
  insights: string[];
}

const periodDays: Record<DashboardPeriod, number> = {
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
};

export function usePipelineQualityMetrics(
  period: DashboardPeriod = "30d",
  jobId?: string
) {
  const { currentAccount } = useOrganization();

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));

  return useQuery({
    queryKey: ["pipeline-quality-metrics", currentAccount?.id, period, jobId],
    queryFn: async (): Promise<PipelineQualityMetrics> => {
      if (!currentAccount?.id) {
        return getEmptyMetrics();
      }

      // Get job IDs
      let jobIds: string[] = [];
      if (jobId) {
        jobIds = [jobId];
      } else {
        const { data: jobs } = await supabase
          .from("recruitment_jobs")
          .select("id")
          .eq("account_id", currentAccount.id);
        jobIds = jobs?.map((j) => j.id) || [];
      }

      if (jobIds.length === 0) {
        return getEmptyMetrics();
      }

      // Fetch applications
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, candidate_id, job_id")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString());

      const appsList = applications || [];
      const candidateIds = [...new Set(appsList.map((a) => a.candidate_id).filter(Boolean))] as string[];

      // Fetch cultural interview scores
      const { data: culturalSessions } = await supabase
        .from("culture_interview_sessions")
        .select("candidate_id, matching_score, job_id")
        .in("job_id", jobIds)
        .not("matching_score", "is", null);

      // Fetch DISC results with match scores
      const { data: discSessions } = await supabase
        .from("candidate_disc_sessions")
        .select(`
          candidate_id,
          job_id,
          candidate_disc_results (match_score)
        `)
        .in("job_id", jobIds)
        .eq("status", "completed");

      // Fetch evaluations
      const appIds = appsList.map((a) => a.id);
      const { data: evaluations } = appIds.length > 0
        ? await supabase
            .from("recruitment_evaluations")
            .select("application_id, overall_score")
            .in("application_id", appIds)
            .not("overall_score", "is", null)
        : { data: [] };

      // Create maps for quick lookups
      const culturalScoreMap = new Map<string, number[]>();
      (culturalSessions || []).forEach((s) => {
        if (s.candidate_id && s.matching_score != null) {
          const key = s.candidate_id;
          if (!culturalScoreMap.has(key)) culturalScoreMap.set(key, []);
          culturalScoreMap.get(key)!.push(s.matching_score);
        }
      });

      const discScoreMap = new Map<string, number[]>();
      (discSessions || []).forEach((s) => {
        if (s.candidate_id && s.candidate_disc_results) {
          const results = s.candidate_disc_results as any;
          const matchScore = Array.isArray(results) 
            ? results[0]?.match_score 
            : results?.match_score;
          if (matchScore != null) {
            const key = s.candidate_id;
            if (!discScoreMap.has(key)) discScoreMap.set(key, []);
            discScoreMap.get(key)!.push(matchScore);
          }
        }
      });

      const evalScoreMap = new Map<string, number[]>();
      (evaluations || []).forEach((e) => {
        if (e.application_id && e.overall_score != null) {
          const app = appsList.find((a) => a.id === e.application_id);
          if (app?.candidate_id) {
            const key = app.candidate_id;
            if (!evalScoreMap.has(key)) evalScoreMap.set(key, []);
            evalScoreMap.get(key)!.push(e.overall_score);
          }
        }
      });

      // Calculate metrics by stage
      const stageOrder = STAGE_CONFIG.map((s) => s.id);
      
      const stages: StageQualityMetrics[] = STAGE_CONFIG.map((stage) => {
        const stageIndex = stageOrder.indexOf(stage.id);
        
        // Candidates at or past this stage
        const stageCandidates = appsList.filter((app) => {
          const appStageIndex = stageOrder.indexOf(app.status || "applied");
          return appStageIndex >= stageIndex;
        });

        const candidateIdsInStage = [...new Set(stageCandidates.map((a) => a.candidate_id).filter(Boolean))] as string[];

        const culturalScores = candidateIdsInStage
          .flatMap((id) => culturalScoreMap.get(id) || []);
        const discScores = candidateIdsInStage
          .flatMap((id) => discScoreMap.get(id) || []);
        const evalScores = candidateIdsInStage
          .flatMap((id) => evalScoreMap.get(id) || []);

        return {
          stageId: stage.id,
          stageName: stage.name,
          candidatesCount: stageCandidates.length,
          avgCulturalScore: culturalScores.length > 0
            ? Math.round(culturalScores.reduce((a, b) => a + b, 0) / culturalScores.length)
            : null,
          avgDiscMatch: discScores.length > 0
            ? Math.round(discScores.reduce((a, b) => a + b, 0) / discScores.length)
            : null,
          avgEvaluationScore: evalScores.length > 0
            ? Math.round((evalScores.reduce((a, b) => a + b, 0) / evalScores.length) * 10) / 10
            : null,
        };
      });

      // Overall quality (all candidates)
      const allCultural = candidateIds.flatMap((id) => culturalScoreMap.get(id) || []);
      const allDisc = candidateIds.flatMap((id) => discScoreMap.get(id) || []);
      const allEval = candidateIds.flatMap((id) => evalScoreMap.get(id) || []);

      const overallQuality = {
        avgCulturalScore: allCultural.length > 0
          ? Math.round(allCultural.reduce((a, b) => a + b, 0) / allCultural.length)
          : null,
        avgDiscMatch: allDisc.length > 0
          ? Math.round(allDisc.reduce((a, b) => a + b, 0) / allDisc.length)
          : null,
        avgEvaluationScore: allEval.length > 0
          ? Math.round((allEval.reduce((a, b) => a + b, 0) / allEval.length) * 10) / 10
          : null,
      };

      // Hired candidates quality
      const hiredApps = appsList.filter((a) => a.status === "hired");
      const hiredCandidateIds = [...new Set(hiredApps.map((a) => a.candidate_id).filter(Boolean))] as string[];

      const hiredCultural = hiredCandidateIds.flatMap((id) => culturalScoreMap.get(id) || []);
      const hiredDisc = hiredCandidateIds.flatMap((id) => discScoreMap.get(id) || []);
      const hiredEval = hiredCandidateIds.flatMap((id) => evalScoreMap.get(id) || []);

      const hiredCandidatesQuality = {
        avgCulturalScore: hiredCultural.length > 0
          ? Math.round(hiredCultural.reduce((a, b) => a + b, 0) / hiredCultural.length)
          : null,
        avgDiscMatch: hiredDisc.length > 0
          ? Math.round(hiredDisc.reduce((a, b) => a + b, 0) / hiredDisc.length)
          : null,
        avgEvaluationScore: hiredEval.length > 0
          ? Math.round((hiredEval.reduce((a, b) => a + b, 0) / hiredEval.length) * 10) / 10
          : null,
      };

      // Quality comparison (hired vs overall)
      const qualityComparison = {
        culturalDiff: overallQuality.avgCulturalScore && hiredCandidatesQuality.avgCulturalScore
          ? Math.round(((hiredCandidatesQuality.avgCulturalScore - overallQuality.avgCulturalScore) / overallQuality.avgCulturalScore) * 100)
          : null,
        discDiff: overallQuality.avgDiscMatch && hiredCandidatesQuality.avgDiscMatch
          ? Math.round(((hiredCandidatesQuality.avgDiscMatch - overallQuality.avgDiscMatch) / overallQuality.avgDiscMatch) * 100)
          : null,
        evaluationDiff: overallQuality.avgEvaluationScore && hiredCandidatesQuality.avgEvaluationScore
          ? Math.round(((hiredCandidatesQuality.avgEvaluationScore - overallQuality.avgEvaluationScore) / overallQuality.avgEvaluationScore) * 100)
          : null,
      };

      // Generate insights
      const insights: string[] = [];
      
      if (qualityComparison.culturalDiff && qualityComparison.culturalDiff > 10) {
        insights.push(`Candidatos contratados têm score cultural ${qualityComparison.culturalDiff}% acima da média`);
      }
      
      if (qualityComparison.discDiff && qualityComparison.discDiff > 15) {
        insights.push(`Match DISC dos contratados é ${qualityComparison.discDiff}% superior ao geral`);
      }

      if (hiredCandidatesQuality.avgCulturalScore && hiredCandidatesQuality.avgCulturalScore >= 75) {
        insights.push(`Candidatos com score cultural ≥75 têm maior probabilidade de contratação`);
      }

      if (insights.length === 0 && appsList.length > 0) {
        insights.push("Colete mais dados para gerar insights de qualidade");
      }

      return {
        stages,
        overallQuality,
        hiredCandidatesQuality,
        qualityComparison,
        insights,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyMetrics(): PipelineQualityMetrics {
  return {
    stages: [],
    overallQuality: {
      avgCulturalScore: null,
      avgDiscMatch: null,
      avgEvaluationScore: null,
    },
    hiredCandidatesQuality: {
      avgCulturalScore: null,
      avgDiscMatch: null,
      avgEvaluationScore: null,
    },
    qualityComparison: {
      culturalDiff: null,
      discDiff: null,
      evaluationDiff: null,
    },
    insights: [],
  };
}
