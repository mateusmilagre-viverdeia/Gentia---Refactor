import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import type { CandidateComparisonData, CandidateComparison, DEFAULT_COMPARISON_CRITERIA } from "@/types/candidate-comparison.types";
import { DISCDimension } from "@/types/disc.types";

interface UseCandidateComparisonParams {
  applicationIds: string[];
  enabled?: boolean;
}

export function useCandidateComparison({ applicationIds, enabled = true }: UseCandidateComparisonParams) {
  return useQuery({
    queryKey: ["candidate-comparison", applicationIds],
    queryFn: async (): Promise<CandidateComparison | null> => {
      if (applicationIds.length < 2 || applicationIds.length > 4) {
        return null;
      }

      // Fetch applications with candidate and job data
      const { data: applications, error: appError } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          source,
          tags,
          job_id,
          candidate_id,
          recruitment_jobs (
            id,
            title
          ),
          recruitment_candidates (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        `)
        .in("id", applicationIds);

      if (appError) throw appError;
      if (!applications || applications.length === 0) return null;

      // Get unique job - comparison should be for same job
      const jobIds = [...new Set(applications.map((a) => a.job_id))];
      const jobId = jobIds[0];
      const jobTitle = applications[0]?.recruitment_jobs?.title || "Vaga";

      // Fetch cultural interview scores
      const candidateIds = applications.map((a) => a.candidate_id).filter(Boolean);
      
      const { data: culturalSessions } = await supabase
        .from("culture_interview_sessions")
        .select("candidate_profile_id, matching_score, job_id")
        .in("candidate_profile_id", candidateIds)
        .eq("status", "completed");

      // Fetch DISC results
      const { data: discSessions } = await supabase
        .from("candidate_disc_sessions")
        .select(`
          candidate_id,
          job_id,
          candidate_disc_results (
            d_normalized,
            i_normalized,
            s_normalized,
            c_normalized,
            primary_profile,
            secondary_profile,
            match_score
          )
        `)
        .in("candidate_id", candidateIds)
        .eq("status", "completed");

      // Fetch technical evaluations
      const { data: evaluations } = await supabase
        .from("recruitment_evaluations")
        .select("application_id, overall_score")
        .in("application_id", applicationIds);

      // Fetch evaluation counts
      const { data: evalCounts } = await supabase
        .from("recruitment_evaluations")
        .select("application_id")
        .in("application_id", applicationIds);

      const evalCountMap = new Map<string, number>();
      evalCounts?.forEach((e) => {
        evalCountMap.set(e.application_id, (evalCountMap.get(e.application_id) || 0) + 1);
      });

      // Build comparison data
      const candidates: CandidateComparisonData[] = applications.map((app) => {
        const candidate = app.recruitment_candidates;
        const candidateId = app.candidate_id;

        // Get cultural score
        const culturalSession = culturalSessions?.find(
          (s) => s.candidate_profile_id === candidateId && s.job_id === app.job_id
        );
        const culturalScore = culturalSession?.matching_score || null;

        // Get DISC data
        const discSession = discSessions?.find(
          (s) => s.candidate_id === candidateId && s.job_id === app.job_id
        );
        const discResult = discSession?.candidate_disc_results?.[0];
        const discData = discResult
          ? {
              d: discResult.d_normalized,
              i: discResult.i_normalized,
              s: discResult.s_normalized,
              c: discResult.c_normalized,
              primary: discResult.primary_profile as DISCDimension,
              secondary: discResult.secondary_profile as DISCDimension | null,
              matchScore: discResult.match_score,
            }
          : null;

        // Get technical score (average of all evaluations)
        const appEvaluations = evaluations?.filter((e) => e.application_id === app.id) || [];
        const technicalScore =
          appEvaluations.length > 0
            ? Math.round(
                appEvaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) /
                  appEvaluations.length
              )
            : null;

        // Calculate overall score
        const scores = [culturalScore, discData?.matchScore, technicalScore].filter(
          (s): s is number => s !== null
        );
        const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        // Calculate time in pipeline
        const timeInPipeline = differenceInDays(new Date(), new Date(app.applied_at));

        return {
          id: candidateId,
          applicationId: app.id,
          name: `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() || "Candidato",
          email: candidate?.email || "",
          phone: candidate?.phone,
          avatarUrl: candidate?.avatar_url,
          source: app.source,
          appliedAt: app.applied_at,
          currentStage: app.status,
          timeInPipeline,
          evaluationsCount: evalCountMap.get(app.id) || 0,
          tags: (app.tags as string[]) || [],
          scores: {
            cultural: culturalScore,
            disc: discData,
            technical: technicalScore,
            overall: overallScore,
          },
          jobTitle,
          jobId: app.job_id,
        };
      });

      return {
        candidates,
        criteria: [
          { key: "scores.overall", label: "Score Geral", type: "score", higherIsBetter: true },
          { key: "scores.cultural", label: "Fit Cultural", type: "score", higherIsBetter: true },
          { key: "scores.disc.matchScore", label: "Match DISC", type: "score", higherIsBetter: true },
          { key: "scores.technical", label: "Avaliação Técnica", type: "score", higherIsBetter: true },
          { key: "timeInPipeline", label: "Dias no Pipeline", type: "number", higherIsBetter: false },
          { key: "evaluationsCount", label: "Avaliações", type: "number", higherIsBetter: true },
        ],
        generatedAt: new Date().toISOString(),
        jobId,
        jobTitle,
      };
    },
    enabled: enabled && applicationIds.length >= 2 && applicationIds.length <= 4,
    staleTime: 30000,
  });
}

// Helper to get nested value from object
export function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

// Helper to find best value among candidates for a criterion
export function findBestCandidateId(
  candidates: CandidateComparisonData[],
  path: string,
  higherIsBetter: boolean
): string | null {
  const values = candidates.map((c) => ({
    id: c.id,
    value: getNestedValue(c, path),
  }));

  const validValues = values.filter((v) => v.value !== null && v.value !== undefined);
  if (validValues.length === 0) return null;

  const best = validValues.reduce((best, current) => {
    if (higherIsBetter) {
      return current.value > best.value ? current : best;
    }
    return current.value < best.value ? current : best;
  });

  return best.id;
}
