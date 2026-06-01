import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface JobCostData {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  totalCandidates: number;
  hiredCount: number;
  totalCredits: number;
  totalCostBrl: number;
  costPerHire: number | null;
}

export interface JobCostSummary {
  jobs: JobCostData[];
  avgCostPerHire: number | null;
  totalCreditsConsumed: number;
  totalCostBrl: number;
  totalHires: number;
}

export function useJobCostAnalytics() {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["job-cost-analytics", currentAccount?.id],
    queryFn: async (): Promise<JobCostSummary> => {
      if (!currentAccount?.id) throw new Error("No account");

      // 1. Fetch usage logs for AI interviews
      const { data: usageLogs } = await supabase
        .from("recruitment_usage_log")
        .select("reference_id, reference_type, amount, created_at")
        .eq("account_id", currentAccount.id)
        .eq("credit_type", "ai_interview")
        .eq("operation", "consumption");

      // 2. Fetch credit config for BRL conversion
      const { data: creditConfig } = await supabase
        .from("platform_credit_config")
        .select("usd_to_brl, margin_percent, credit_value_brl")
        .single();

      const creditValueBrl = creditConfig?.credit_value_brl || 1;

      // 3. Get session->job mappings for each type
      const cultureRefs = usageLogs?.filter(l => l.reference_type === "culture_interview").map(l => l.reference_id).filter(Boolean) as string[] || [];
      const technicalRefs = usageLogs?.filter(l => l.reference_type === "technical_interview").map(l => l.reference_id).filter(Boolean) as string[] || [];
      const discRefs = usageLogs?.filter(l => l.reference_type === "disc_assessment").map(l => l.reference_id).filter(Boolean) as string[] || [];

      const [cultureRes, technicalRes, discRes] = await Promise.all([
        cultureRefs.length > 0
          ? supabase.from("culture_interview_sessions").select("id, job_id").in("id", cultureRefs)
          : Promise.resolve({ data: [] }),
        technicalRefs.length > 0
          ? supabase.from("technical_interview_sessions").select("id, job_id").in("id", technicalRefs)
          : Promise.resolve({ data: [] }),
        discRefs.length > 0
          ? supabase.from("candidate_disc_sessions").select("id, job_id").in("id", discRefs)
          : Promise.resolve({ data: [] }),
      ]);

      // Build reference_id -> job_id map
      const refToJob = new Map<string, string>();
      [...(cultureRes.data || []), ...(technicalRes.data || []), ...(discRes.data || [])].forEach(s => {
        if (s.job_id) refToJob.set(s.id, s.job_id);
      });

      // 4. Aggregate credits by job_id
      const jobCredits = new Map<string, number>();
      usageLogs?.forEach(log => {
        if (!log.reference_id) return;
        const jobId = refToJob.get(log.reference_id);
        if (!jobId) return;
        const current = jobCredits.get(jobId) || 0;
        jobCredits.set(jobId, current + Math.abs(Number(log.amount)));
      });

      // 5. Fetch job details and application counts
      const jobIds = Array.from(jobCredits.keys());
      if (jobIds.length === 0) {
        return { jobs: [], avgCostPerHire: null, totalCreditsConsumed: 0, totalCostBrl: 0, totalHires: 0 };
      }

      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status")
        .in("id", jobIds);

      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("job_id, status")
        .in("job_id", jobIds);

      // Count candidates and hires per job
      const jobAppStats = new Map<string, { candidates: number; hired: number }>();
      applications?.forEach(app => {
        const stats = jobAppStats.get(app.job_id) || { candidates: 0, hired: 0 };
        stats.candidates++;
        if (app.status === "hired") stats.hired++;
        jobAppStats.set(app.job_id, stats);
      });

      // 6. Build final data
      let totalCredits = 0;
      let totalHires = 0;

      const jobCostData: JobCostData[] = (jobs || []).map(job => {
        const credits = jobCredits.get(job.id) || 0;
        const costBrl = credits * creditValueBrl;
        const stats = jobAppStats.get(job.id) || { candidates: 0, hired: 0 };
        const costPerHire = stats.hired > 0 ? costBrl / stats.hired : null;

        totalCredits += credits;
        totalHires += stats.hired;

        return {
          jobId: job.id,
          jobTitle: job.title,
          jobStatus: job.status,
          totalCandidates: stats.candidates,
          hiredCount: stats.hired,
          totalCredits: Math.round(credits * 10) / 10,
          totalCostBrl: Math.round(costBrl * 100) / 100,
          costPerHire: costPerHire !== null ? Math.round(costPerHire * 100) / 100 : null,
        };
      }).sort((a, b) => b.totalCredits - a.totalCredits);

      const totalCostBrl = totalCredits * creditValueBrl;

      return {
        jobs: jobCostData,
        avgCostPerHire: totalHires > 0 ? Math.round((totalCostBrl / totalHires) * 100) / 100 : null,
        totalCreditsConsumed: Math.round(totalCredits * 10) / 10,
        totalCostBrl: Math.round(totalCostBrl * 100) / 100,
        totalHires,
      };
    },
    enabled: !!currentAccount?.id,
  });
}
