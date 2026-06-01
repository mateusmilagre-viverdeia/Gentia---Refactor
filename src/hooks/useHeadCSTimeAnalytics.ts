import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConsultantTimeSummary, TimeEntryCategory, TimeEntrySummary } from "@/types/time-tracking.types";
import { startOfWeek, endOfWeek, subDays } from "date-fns";

interface TimeAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  consultantId?: string;
}

export function useTimeAnalytics(filters?: TimeAnalyticsFilters) {
  // Fetch all consultants time entries (for Head CS / Super Admin)
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["all-time-entries", filters],
    queryFn: async () => {
      let query = supabase
        .from("consultant_time_entries")
        .select(`
          *,
          consultant:ep_consultants(id, name),
          account:companies(id, name)
        `)
        .order("entry_date", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }
      if (filters?.consultantId) {
        query = query.eq("consultant_id", filters.consultantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate per-consultant summaries
  const consultantSummaries: ConsultantTimeSummary[] = (() => {
    const consultantMap = new Map<string, {
      name: string;
      totalMinutes: number;
      billableMinutes: number;
      projectIds: Set<string>;
    }>();

    entries.forEach((entry: any) => {
      const consultantId = entry.consultant_id;
      const existing = consultantMap.get(consultantId);
      
      if (existing) {
        existing.totalMinutes += entry.duration_minutes;
        if (entry.billable) {
          existing.billableMinutes += entry.duration_minutes;
        }
        existing.projectIds.add(entry.account_id);
      } else {
        consultantMap.set(consultantId, {
          name: entry.consultant?.name || "Consultor",
          totalMinutes: entry.duration_minutes,
          billableMinutes: entry.billable ? entry.duration_minutes : 0,
          projectIds: new Set([entry.account_id]),
        });
      }
    });

    return Array.from(consultantMap.entries()).map(([id, data]) => ({
      consultantId: id,
      consultantName: data.name,
      totalHours: Math.round((data.totalMinutes / 60) * 100) / 100,
      projectCount: data.projectIds.size,
      avgHoursPerProject: data.projectIds.size > 0 
        ? Math.round((data.totalMinutes / 60 / data.projectIds.size) * 100) / 100 
        : 0,
      billablePercentage: data.totalMinutes > 0 
        ? Math.round((data.billableMinutes / data.totalMinutes) * 100) 
        : 0,
    }));
  })();

  // Overall summary
  const overallSummary: TimeEntrySummary = (() => {
    const byCategory: Record<TimeEntryCategory, number> = {
      checkpoint: 0,
      preparation: 0,
      follow_up: 0,
      documentation: 0,
      training: 0,
      other: 0,
    };

    const projectMap = new Map<string, { name: string; minutes: number }>();
    let billableMinutes = 0;
    let nonBillableMinutes = 0;

    entries.forEach((entry: any) => {
      const category = entry.category as TimeEntryCategory;
      if (byCategory[category] !== undefined) {
        byCategory[category] += entry.duration_minutes;
      }

      if (entry.billable) {
        billableMinutes += entry.duration_minutes;
      } else {
        nonBillableMinutes += entry.duration_minutes;
      }

      const existing = projectMap.get(entry.account_id);
      if (existing) {
        existing.minutes += entry.duration_minutes;
      } else {
        projectMap.set(entry.account_id, {
          name: entry.account?.name || "Desconhecido",
          minutes: entry.duration_minutes,
        });
      }
    });

    const totalMinutes = billableMinutes + nonBillableMinutes;

    return {
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      byCategory,
      byProject: Array.from(projectMap.entries()).map(([accountId, data]) => ({
        accountId,
        name: data.name,
        minutes: data.minutes,
      })),
      billableMinutes,
      nonBillableMinutes,
    };
  })();

  return {
    entries,
    isLoading,
    error: error?.message || null,
    consultantSummaries,
    overallSummary,
    totalConsultants: consultantSummaries.length,
    totalProjects: overallSummary.byProject.length,
  };
}
