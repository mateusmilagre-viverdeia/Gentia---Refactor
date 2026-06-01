import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { getSourceLabel, getMediumLabel } from "./useSourceAttribution";

export interface FunnelStep {
  event: string;
  eventLabel: string;
  count: number;
  conversionFromPrevious: number | null;
  conversionFromFirst: number;
}

export interface FunnelBySource {
  source: string;
  sourceLabel: string;
  steps: FunnelStep[];
  totalCandidates: number;
  totalHired: number;
  overallConversion: number;
  color: string;
}

const SOURCE_COLORS: Record<string, string> = {
  linkedin: "hsl(201, 89%, 48%)",
  indeed: "hsl(212, 68%, 44%)",
  google: "hsl(4, 90%, 58%)",
  hunting: "hsl(280, 68%, 52%)",
  careers_page: "hsl(142, 76%, 36%)",
  direct: "hsl(215, 16%, 47%)",
  whatsapp: "hsl(142, 69%, 58%)",
  referral: "hsl(38, 92%, 50%)",
  other: "hsl(215, 14%, 34%)",
};

const EVENT_LABELS: Record<string, string> = {
  submitted_application: "Candidaturas",
  qualified: "Qualificados",
  completed_interview: "Entrevistados",
  hired: "Contratados",
};

const FUNNEL_EVENTS = ["submitted_application", "qualified", "completed_interview", "hired"];

export function useFunnelBySourceAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));

  return useQuery({
    queryKey: ["funnel-by-source-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<FunnelBySource[]> => {
      if (!currentAccount?.id) {
        return [];
      }

      // Fetch all tracking events for the period
      const { data: events, error } = await supabase
        .from("candidate_tracking_events")
        .select("id, candidate_id, event_type, source, created_at")
        .eq("account_id", currentAccount.id)
        .gte("created_at", startDate.toISOString())
        .in("event_type", FUNNEL_EVENTS);

      if (error) {
        console.error("[FunnelBySource] Error fetching events:", error);
        throw error;
      }

      if (!events || events.length === 0) {
        // Fallback: use application data if no events yet
        return await getFunnelFromApplications(currentAccount.id, startDate);
      }

      // Group events by source
      const sourceEvents: Record<string, { candidates: Set<string>; events: Record<string, Set<string>> }> = {};

      for (const event of events) {
        const source = event.source || "other";
        
        if (!sourceEvents[source]) {
          sourceEvents[source] = {
            candidates: new Set(),
            events: {},
          };
        }

        sourceEvents[source].candidates.add(event.candidate_id);

        if (!sourceEvents[source].events[event.event_type]) {
          sourceEvents[source].events[event.event_type] = new Set();
        }
        sourceEvents[source].events[event.event_type].add(event.candidate_id);
      }

      // Build funnel data for each source
      const funnelData: FunnelBySource[] = [];

      for (const [source, data] of Object.entries(sourceEvents)) {
        const steps: FunnelStep[] = [];
        let previousCount = data.candidates.size;

        for (let i = 0; i < FUNNEL_EVENTS.length; i++) {
          const event = FUNNEL_EVENTS[i];
          const count = data.events[event]?.size || 0;
          
          const conversionFromPrevious = i === 0 
            ? null 
            : previousCount > 0 
              ? Math.round((count / previousCount) * 100) 
              : 0;
          
          const conversionFromFirst = data.candidates.size > 0
            ? Math.round((count / data.candidates.size) * 100)
            : 0;

          steps.push({
            event,
            eventLabel: EVENT_LABELS[event] || event,
            count,
            conversionFromPrevious,
            conversionFromFirst,
          });

          if (count > 0) {
            previousCount = count;
          }
        }

        const hiredCount = data.events["hired"]?.size || 0;
        const overallConversion = data.candidates.size > 0
          ? Math.round((hiredCount / data.candidates.size) * 100 * 10) / 10
          : 0;

        funnelData.push({
          source,
          sourceLabel: getSourceLabel(source),
          steps,
          totalCandidates: data.candidates.size,
          totalHired: hiredCount,
          overallConversion,
          color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
        });
      }

      // Sort by total candidates descending
      return funnelData.sort((a, b) => b.totalCandidates - a.totalCandidates);
    },
    enabled: !!currentAccount?.id,
  });
}

/**
 * Fallback: Build funnel from applications if no tracking events exist yet
 */
async function getFunnelFromApplications(accountId: string, startDate: Date): Promise<FunnelBySource[]> {
  // Fetch jobs for this account
  const { data: jobs } = await supabase
    .from("recruitment_jobs")
    .select("id")
    .eq("account_id", accountId);

  const jobIds = jobs?.map(j => j.id) || [];
  if (jobIds.length === 0) return [];

  // Fetch applications
  const { data: applications } = await supabase
    .from("recruitment_applications")
    .select("id, candidate_id, status, source, applied_at")
    .in("job_id", jobIds)
    .neq("source", "test-e2e")
    .gte("applied_at", startDate.toISOString());

  if (!applications || applications.length === 0) return [];

  // Group by source
  const sourceData: Record<string, { 
    candidates: Set<string>;
    submitted: number;
    qualified: number;
    interviewed: number;
    hired: number;
  }> = {};

  const qualifiedStatuses = ["fit_cultural", "disc", "fit_tecnico", "avaliacao_final", "referencias", "proposta", "hired"];
  const interviewedStatuses = ["avaliacao_final", "referencias", "proposta", "hired"];

  for (const app of applications) {
    const source = app.source || "other";
    
    if (!sourceData[source]) {
      sourceData[source] = {
        candidates: new Set(),
        submitted: 0,
        qualified: 0,
        interviewed: 0,
        hired: 0,
      };
    }

    sourceData[source].candidates.add(app.candidate_id);
    sourceData[source].submitted++;

    if (qualifiedStatuses.includes(app.status)) {
      sourceData[source].qualified++;
    }
    if (interviewedStatuses.includes(app.status)) {
      sourceData[source].interviewed++;
    }
    if (app.status === "hired") {
      sourceData[source].hired++;
    }
  }

  // Build funnel data
  const funnelData: FunnelBySource[] = [];

  for (const [source, data] of Object.entries(sourceData)) {
    const totalCandidates = data.submitted;
    
    const steps: FunnelStep[] = [
      {
        event: "submitted_application",
        eventLabel: "Candidaturas",
        count: data.submitted,
        conversionFromPrevious: null,
        conversionFromFirst: 100,
      },
      {
        event: "qualified",
        eventLabel: "Qualificados",
        count: data.qualified,
        conversionFromPrevious: totalCandidates > 0 ? Math.round((data.qualified / totalCandidates) * 100) : 0,
        conversionFromFirst: totalCandidates > 0 ? Math.round((data.qualified / totalCandidates) * 100) : 0,
      },
      {
        event: "completed_interview",
        eventLabel: "Entrevistados",
        count: data.interviewed,
        conversionFromPrevious: data.qualified > 0 ? Math.round((data.interviewed / data.qualified) * 100) : 0,
        conversionFromFirst: totalCandidates > 0 ? Math.round((data.interviewed / totalCandidates) * 100) : 0,
      },
      {
        event: "hired",
        eventLabel: "Contratados",
        count: data.hired,
        conversionFromPrevious: data.interviewed > 0 ? Math.round((data.hired / data.interviewed) * 100) : 0,
        conversionFromFirst: totalCandidates > 0 ? Math.round((data.hired / totalCandidates) * 100) : 0,
      },
    ];

    const overallConversion = totalCandidates > 0
      ? Math.round((data.hired / totalCandidates) * 100 * 10) / 10
      : 0;

    funnelData.push({
      source,
      sourceLabel: getSourceLabel(source),
      steps,
      totalCandidates,
      totalHired: data.hired,
      overallConversion,
      color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
    });
  }

  return funnelData.sort((a, b) => b.totalCandidates - a.totalCandidates);
}
