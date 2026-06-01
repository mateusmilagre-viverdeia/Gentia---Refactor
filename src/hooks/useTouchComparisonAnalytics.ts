import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { getSourceLabel, SOURCE_COLORS } from "@/hooks/useSourceAttribution";
import { subDays } from "date-fns";

export interface TouchComparisonData {
  source: string;
  sourceLabel: string;
  color: string;
  firstTouch: number;
  lastTouch: number;
  difference: number;
}

export function useTouchComparisonAnalytics(period: DashboardPeriod) {
  const { account } = useAccount();

  return useQuery({
    queryKey: ["touch-comparison", account?.id, period],
    queryFn: async () => {
      if (!account?.id) return [];

      // Calculate date range
      const days = period === "7d" ? 7 : 30;
      const startDate = subDays(new Date(), days).toISOString();

      // Fetch candidates who were hired within the period
      const { data: hiredCandidates, error } = await supabase
        .from("recruitment_candidates")
        .select(`
          id,
          first_touch_source,
          last_touch_source,
          recruitment_applications!inner (
            id,
            status,
            updated_at
          )
        `)
        .eq("account_id", account.id)
        .eq("recruitment_applications.status", "hired")
        .gte("recruitment_applications.updated_at", startDate);

      if (error) {
        console.error("Error fetching touch comparison data:", error);
        return [];
      }

      if (!hiredCandidates || hiredCandidates.length === 0) {
        return [];
      }

      // Count by first touch and last touch
      const firstTouchCounts: Record<string, number> = {};
      const lastTouchCounts: Record<string, number> = {};

      hiredCandidates.forEach((c) => {
        const first = c.first_touch_source || "unknown";
        const last = c.last_touch_source || c.first_touch_source || "unknown";

        firstTouchCounts[first] = (firstTouchCounts[first] || 0) + 1;
        lastTouchCounts[last] = (lastTouchCounts[last] || 0) + 1;
      });

      // Combine into chart format
      const sources = new Set([
        ...Object.keys(firstTouchCounts),
        ...Object.keys(lastTouchCounts),
      ]);

      const result: TouchComparisonData[] = Array.from(sources)
        .map((source) => ({
          source,
          sourceLabel: getSourceLabel(source),
          color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
          firstTouch: firstTouchCounts[source] || 0,
          lastTouch: lastTouchCounts[source] || 0,
          difference: (lastTouchCounts[source] || 0) - (firstTouchCounts[source] || 0),
        }))
        .sort((a, b) => (b.firstTouch + b.lastTouch) - (a.firstTouch + a.lastTouch));

      return result;
    },
    enabled: !!account?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
