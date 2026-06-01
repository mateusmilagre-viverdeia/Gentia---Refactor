import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import type { TalentPoolEntry } from "./useTalentPool";

export interface TalentPoolScore {
  entryId: string;
  overallScore: number;
  breakdown: {
    recencyScore: number;      // How recently they joined (0-25)
    completenessScore: number; // Profile completeness (0-25)
    engagementScore: number;   // Interactions/updates (0-25)
    matchScore: number;        // Match with open jobs (0-25)
  };
  matchingJobs: Array<{
    jobId: string;
    jobTitle: string;
    matchPercentage: number;
  }>;
  recommendations: string[];
  lastCalculated: string;
}

interface ScoringResult {
  entries: Array<TalentPoolEntry & { score: TalentPoolScore }>;
  averageScore: number;
  topCandidates: number;
}

/**
 * Calculate scores for talent pool entries
 */
function calculateEntryScore(
  entry: TalentPoolEntry,
  openJobs: Array<{ id: string; title: string; requirements?: string[] }>,
  activities: Record<string, number>
): TalentPoolScore {
  const now = new Date();
  const createdAt = new Date(entry.created_at);
  const daysSinceCreated = differenceInDays(now, createdAt);

  // Recency score (0-25): Higher for more recent entries
  let recencyScore = 25;
  if (daysSinceCreated > 7) recencyScore = 20;
  if (daysSinceCreated > 30) recencyScore = 15;
  if (daysSinceCreated > 90) recencyScore = 10;
  if (daysSinceCreated > 180) recencyScore = 5;
  if (daysSinceCreated > 365) recencyScore = 2;

  // Completeness score (0-25)
  let completenessScore = 0;
  if (entry.name) completenessScore += 5;
  if (entry.email) completenessScore += 5;
  if (entry.phone) completenessScore += 4;
  if (entry.linkedin_url) completenessScore += 4;
  if (entry.resume_url) completenessScore += 4;
  if (entry.areas_of_interest?.length > 0) completenessScore += 3;

  // Engagement score (0-25): Based on activities/interactions
  const activityCount = activities[entry.id] || 0;
  let engagementScore = Math.min(25, activityCount * 5);

  // Match score (0-25): Based on areas of interest matching job requirements
  const matchingJobs: TalentPoolScore["matchingJobs"] = [];
  let totalMatchScore = 0;

  if (entry.areas_of_interest?.length > 0 && openJobs.length > 0) {
    const entryInterests = entry.areas_of_interest.map((i) => i.toLowerCase());

    openJobs.forEach((job) => {
      const jobKeywords = [
        job.title.toLowerCase(),
        ...(job.requirements || []).map((r) => r.toLowerCase()),
      ];

      let matches = 0;
      entryInterests.forEach((interest) => {
        if (jobKeywords.some((kw) => kw.includes(interest) || interest.includes(kw))) {
          matches++;
        }
      });

      if (matches > 0) {
        const matchPercentage = Math.min(100, (matches / entryInterests.length) * 100);
        matchingJobs.push({
          jobId: job.id,
          jobTitle: job.title,
          matchPercentage: Math.round(matchPercentage),
        });
        totalMatchScore += matchPercentage;
      }
    });

    if (matchingJobs.length > 0) {
      totalMatchScore = Math.min(25, (totalMatchScore / matchingJobs.length) * 0.25);
    }
  }
  const matchScore = Math.round(totalMatchScore);

  // Generate recommendations
  const recommendations: string[] = [];
  if (!entry.resume_url) {
    recommendations.push("Solicitar currículo para melhor avaliação");
  }
  if (!entry.linkedin_url) {
    recommendations.push("Validar perfil LinkedIn para completar análise");
  }
  if (daysSinceCreated > 30 && activityCount === 0) {
    recommendations.push("Fazer follow-up - sem contato há mais de 30 dias");
  }
  if (matchingJobs.length > 0) {
    recommendations.push(`Considerar para ${matchingJobs.length} vaga(s) em aberto`);
  }
  if (entry.status === "novo" && daysSinceCreated > 7) {
    recommendations.push("Atualizar status - entrada pendente há mais de 1 semana");
  }

  const overallScore = recencyScore + completenessScore + engagementScore + matchScore;

  return {
    entryId: entry.id,
    overallScore: Math.min(100, overallScore),
    breakdown: {
      recencyScore,
      completenessScore,
      engagementScore,
      matchScore,
    },
    matchingJobs: matchingJobs.slice(0, 5), // Top 5 matches
    recommendations: recommendations.slice(0, 3),
    lastCalculated: now.toISOString(),
  };
}

/**
 * Hook to calculate and fetch talent pool scores
 */
export function useTalentPoolScoring(entries: TalentPoolEntry[]) {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["talent-pool-scoring", currentAccount?.id, entries.map((e) => e.id).join(",")],
    queryFn: async (): Promise<ScoringResult> => {
      if (!currentAccount?.id || entries.length === 0) {
        return { entries: [], averageScore: 0, topCandidates: 0 };
      }

      // Fetch open jobs for matching
      const { data: openJobs } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", currentAccount.id)
        .eq("status", "active");

      // Fetch activities for engagement scoring (simplified - count per entry)
      const { data: activities } = await supabase
        .from("recruitment_activities")
        .select("candidate_id")
        .in(
          "candidate_id",
          entries.map((e) => e.id)
        );

      // Count activities per entry ID
      const activityCounts: Record<string, number> = {};
      (activities || []).forEach((a) => {
        if (a.candidate_id) {
          activityCounts[a.candidate_id] = (activityCounts[a.candidate_id] || 0) + 1;
        }
      });

      // Calculate scores for each entry
      const scoredEntries = entries.map((entry) => ({
        ...entry,
        score: calculateEntryScore(entry, openJobs || [], activityCounts),
      }));

      // Sort by score descending
      scoredEntries.sort((a, b) => b.score.overallScore - a.score.overallScore);

      // Calculate stats
      const totalScore = scoredEntries.reduce((sum, e) => sum + e.score.overallScore, 0);
      const averageScore = scoredEntries.length > 0 ? Math.round(totalScore / scoredEntries.length) : 0;
      const topCandidates = scoredEntries.filter((e) => e.score.overallScore >= 70).length;

      return {
        entries: scoredEntries,
        averageScore,
        topCandidates,
      };
    },
    enabled: !!currentAccount?.id && entries.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to convert talent pool entry to candidate/application
 */
export function useConvertToCandidate() {
  const queryClient = useQueryClient();
  const { currentAccount } = useOrganization();

  return useMutation({
    mutationFn: async ({
      entry,
      jobId,
      notes,
    }: {
      entry: TalentPoolEntry;
      jobId?: string;
      notes?: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Check if candidate already exists by email
      const { data: existingCandidate } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("account_id", currentAccount.id)
        .eq("email", entry.email)
        .maybeSingle();

      let candidateId: string;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        // Create new candidate
        const nameParts = entry.name.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const { data: newCandidate, error: candidateError } = await supabase
          .from("recruitment_candidates")
          .insert({
            account_id: currentAccount.id,
            first_name: firstName,
            last_name: lastName,
            email: entry.email,
            phone: entry.phone,
            linkedin_url: entry.linkedin_url,
            source: "talent_pool",
            notes: notes || entry.message,
            tags: entry.areas_of_interest,
            status: "active",
          })
          .select("id")
          .single();

        if (candidateError) throw candidateError;
        candidateId = newCandidate.id;
      }

      // If a job is specified, create application
      let applicationId: string | null = null;
      if (jobId) {
        // Check if application already exists
        const { data: existingApp } = await supabase
          .from("recruitment_applications")
          .select("id")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .maybeSingle();

        if (!existingApp) {
          const { data: newApp, error: appError } = await supabase
            .from("recruitment_applications")
            .insert({
              account_id: currentAccount.id,
              candidate_id: candidateId,
              job_id: jobId,
              status: "applied",
              source: "talent_pool",
              notes: `Convertido do Talent Pool: ${entry.name}`,
            })
            .select("id")
            .single();

          if (appError) throw appError;
          applicationId = newApp.id;

          // Register activity
          await supabase.from("recruitment_activities").insert({
            account_id: currentAccount.id,
            candidate_id: candidateId,
            application_id: applicationId,
            activity_type: "converted_from_pool",
            description: `Candidato convertido do Talent Pool para vaga`,
            created_by: userData.user.id,
            metadata: { talent_pool_entry_id: entry.id },
          });
        } else {
          applicationId = existingApp.id;
        }
      }

      // Update talent pool entry status
      await supabase
        .from("talent_pool")
        .update({ status: "converted" })
        .eq("id", entry.id);

      return { candidateId, applicationId, isExisting: !!existingCandidate };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });

      if (data.isExisting) {
        toast.success("Candidato já existia - aplicação criada!");
      } else {
        toast.success("Candidato convertido com sucesso!");
      }
    },
    onError: (error) => {
      console.error("Error converting to candidate:", error);
      toast.error("Erro ao converter candidato");
    },
  });
}
