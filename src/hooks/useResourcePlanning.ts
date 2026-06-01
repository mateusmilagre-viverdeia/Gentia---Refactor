import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { addWeeks, eachDayOfInterval, isWeekend, startOfWeek, subWeeks } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import type {
  ConsultantAvailabilityBlock,
  ConsultantCapacitySetting,
  CompanyHoliday,
  ProjectResourceRequirement,
  ProjectDemandRow,
  ConsultantResourceRow,
  ResourcePriority,
  ResourceWeek,
} from "@/types/resource-planning.types";

type CompanyLite = { id: string; name: string };
type ConsultantLite = { id: string; name: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function getStatus(utilizationPct: number): ConsultantResourceRow["status"] {
  if (utilizationPct < 50) return "underutilized";
  if (utilizationPct <= 80) return "optimal";
  return "overloaded";
}

export function useResourcePlanning(params: {
  weekStart?: Date;
  horizonWeeks?: number;
  projects?: CompanyLite[];
  consultants?: ConsultantLite[];
  selectedWeekIso?: string | null;
}) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  const horizonWeeks = params.horizonWeeks ?? 12;
  const baseWeekStart = startOfWeek(params.weekStart ?? new Date(), { weekStartsOn: 1 });

  const weeks: ResourceWeek[] = useMemo(() => {
    return Array.from({ length: horizonWeeks }).map((_, i) => {
      const weekStart = addWeeks(baseWeekStart, i);
      return {
        weekStart,
        iso: formatBRT(weekStart, "yyyy-MM-dd"),
        label: formatBRT(weekStart, "dd/MM"),
      };
    });
  }, [baseWeekStart, horizonWeeks]);

  const activeWeekIso = params.selectedWeekIso ?? weeks[0]?.iso ?? null;

  // Load consultants/projects when not provided
  const { data: consultants = [] } = useQuery({
    queryKey: ["resource-planning", "consultants"],
    queryFn: async (): Promise<ConsultantLite[]> => {
      if (params.consultants) return params.consultants;
      const { data, error } = await supabase
        .from("ep_consultants")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["resource-planning", "projects"],
    queryFn: async (): Promise<CompanyLite[]> => {
      if (params.projects) return params.projects;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const { data: capacitySettings = [], isLoading: loadingCapacity } = useQuery({
    queryKey: ["resource-planning", "capacity-settings"],
    queryFn: async (): Promise<ConsultantCapacitySetting[]> => {
      const { data, error } = await supabase
        .from("consultant_capacity_settings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const { data: manualRequirements = [], isLoading: loadingRequirements } = useQuery({
    queryKey: ["resource-planning", "requirements", weeks[0]?.iso, horizonWeeks],
    queryFn: async (): Promise<ProjectResourceRequirement[]> => {
      if (!weeks.length) return [];
      const from = weeks[0].iso;
      const to = weeks[weeks.length - 1].iso;
      const { data, error } = await supabase
        .from("project_resource_requirements")
        .select("*")
        .gte("week_start", from)
        .lte("week_start", to);
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: weeks.length > 0,
  });

  const { data: availabilityBlocks = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ["resource-planning", "availability", weeks[0]?.iso, horizonWeeks],
    queryFn: async (): Promise<ConsultantAvailabilityBlock[]> => {
      if (!weeks.length) return [];
      const from = weeks[0].iso;
      const to = weeks[weeks.length - 1].iso;
      // Overlap: start_date <= to AND end_date >= from
      const { data, error } = await supabase
        .from("consultant_availability_blocks")
        .select("*")
        .lte("start_date", to)
        .gte("end_date", from);
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: weeks.length > 0,
  });

  const { data: companyHolidays = [] } = useQuery({
    queryKey: ["resource-planning", "company-holidays-range", currentAccount?.id, weeks[0]?.iso, horizonWeeks],
    queryFn: async (): Promise<CompanyHoliday[]> => {
      if (!currentAccount?.id || !weeks.length) return [];
      const from = weeks[0].iso;
      const to = weeks[weeks.length - 1].iso;
      const { data, error } = await supabase
        .from("company_holidays")
        .select("*")
        .eq("account_id", currentAccount.id)
        .gte("holiday_date", from)
        .lte("holiday_date", to)
        .order("holiday_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!currentAccount?.id && weeks.length > 0,
  });

  // Historical time (last 8 weeks) -> suggestions (avg weekly per project) and logged avg per consultant
  const { data: timeEntries = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["resource-planning", "history", weeks[0]?.iso],
    queryFn: async () => {
      const since = formatBRT(subWeeks(baseWeekStart, 8), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("consultant_time_entries")
        .select("consultant_id, account_id, entry_date, duration_minutes")
        .gte("entry_date", since)
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const capacityByConsultantId = useMemo(() => {
    const map = new Map<string, ConsultantCapacitySetting>();
    capacitySettings.forEach((s) => map.set(s.consultant_id, s));
    return map;
  }, [capacitySettings]);

  const getCapacitySetting = (consultantId: string) => capacityByConsultantId.get(consultantId) ?? null;

  const blockedHoursByConsultantWeek = useMemo(() => {
    // consultantId -> weekIso -> blockedHours
    const result = new Map<string, Map<string, number>>();
    if (!availabilityBlocks.length || !weeks.length) return result;

    const weekStarts = weeks.map((w) => w.iso);

    for (const block of availabilityBlocks) {
      const byWeek = result.get(block.consultant_id) ?? new Map<string, number>();
      for (const weekIso of weekStarts) {
        const weekStart = startOfWeek(new Date(weekIso), { weekStartsOn: 1 });
        const weekEnd = addWeeks(weekStart, 1);
        const intervalStart = new Date(Math.max(new Date(block.start_date).getTime(), weekStart.getTime()));
        const intervalEnd = new Date(Math.min(new Date(block.end_date).getTime(), new Date(weekEnd.getTime() - 1).getTime()));
        if (intervalEnd < intervalStart) continue;

        const cap = capacityByConsultantId.get(block.consultant_id);
        const weekly = cap?.weekly_hours ?? 40;
        const hoursPerDay = block.hours_per_day ?? Math.round((weekly / 5) * 10) / 10;

        const days = eachDayOfInterval({ start: intervalStart, end: intervalEnd });
        const workingDays = days.filter((d) => !isWeekend(d)).length;
        if (workingDays <= 0) continue;
        const blocked = workingDays * hoursPerDay;
        byWeek.set(weekIso, (byWeek.get(weekIso) || 0) + blocked);
      }
      result.set(block.consultant_id, byWeek);
    }

    return result;
  }, [availabilityBlocks, weeks, capacityByConsultantId]);

  const holidayCountByWeekIso = useMemo(() => {
    const map = new Map<string, number>();
    if (!companyHolidays.length) return map;
    for (const h of companyHolidays) {
      // Safety: holidays on weekends should not reduce capacity.
      if (isWeekend(new Date(h.holiday_date))) continue;
      const weekIso = formatBRT(startOfWeek(new Date(h.holiday_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      map.set(weekIso, (map.get(weekIso) || 0) + 1);
    }
    return map;
  }, [companyHolidays]);

  const getEffectiveWeeklyCapacity = (consultantId: string, weekIso: string) => {
    const cap = capacityByConsultantId.get(consultantId);
    const weekly = cap?.weekly_hours ?? 40;
    const blocked = blockedHoursByConsultantWeek.get(consultantId)?.get(weekIso) ?? 0;

    const holidayCount = holidayCountByWeekIso.get(weekIso) ?? 0;
    const holidayHours = holidayCount > 0 ? holidayCount * round2(weekly / 5) : 0;

    return Math.max(0, round2(weekly - blocked - holidayHours));
  };

  const manualByAccountWeek = useMemo(() => {
    const map = new Map<string, ProjectResourceRequirement>();
    manualRequirements.forEach((r) => map.set(`${r.account_id}:${r.week_start}`, r));
    return map;
  }, [manualRequirements]);

  const suggestedHoursByAccountId = useMemo(() => {
    // avg weekly hours for the last 4 weeks per account
    const weeklyMap = new Map<string, Map<string, number>>();
    // accountId -> weekStartIso -> hours
    timeEntries.forEach((e: any) => {
      const week = formatBRT(startOfWeek(new Date(e.entry_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const byWeek = weeklyMap.get(e.account_id) ?? new Map<string, number>();
      byWeek.set(week, (byWeek.get(week) || 0) + (e.duration_minutes || 0) / 60);
      weeklyMap.set(e.account_id, byWeek);
    });

    const result = new Map<string, number>();
    weeklyMap.forEach((byWeek, accountId) => {
      const weekValues = Array.from(byWeek.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-4)
        .map(([, v]) => v);
      const avg = weekValues.length ? weekValues.reduce((s, v) => s + v, 0) / weekValues.length : 0;
      result.set(accountId, round2(avg));
    });
    return result;
  }, [timeEntries]);

  const avgLoggedByConsultantId = useMemo(() => {
    const weeklyByConsultant = new Map<string, Map<string, number>>();
    timeEntries.forEach((e: any) => {
      const week = formatBRT(startOfWeek(new Date(e.entry_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const byWeek = weeklyByConsultant.get(e.consultant_id) ?? new Map<string, number>();
      byWeek.set(week, (byWeek.get(week) || 0) + (e.duration_minutes || 0) / 60);
      weeklyByConsultant.set(e.consultant_id, byWeek);
    });

    const result = new Map<string, number>();
    weeklyByConsultant.forEach((byWeek, consultantId) => {
      const weekValues = Array.from(byWeek.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-4)
        .map(([, v]) => v);
      const avg = weekValues.length ? weekValues.reduce((s, v) => s + v, 0) / weekValues.length : 0;
      result.set(consultantId, round2(avg));
    });
    return result;
  }, [timeEntries]);

  const consultantRows: ConsultantResourceRow[] = useMemo(() => {
    return consultants.map((c) => {
      const cap = capacityByConsultantId.get(c.id);
      const weeklyCapacityHours = activeWeekIso
        ? getEffectiveWeeklyCapacity(c.id, activeWeekIso)
        : cap?.weekly_hours ?? 40;
      const avgLoggedHoursLast4Weeks = avgLoggedByConsultantId.get(c.id) ?? 0;
      const utilizationPct = weeklyCapacityHours > 0 ? clamp(Math.round((avgLoggedHoursLast4Weeks / weeklyCapacityHours) * 100), 0, 999) : 0;
      return {
        consultantId: c.id,
        consultantName: c.name,
        weeklyCapacityHours,
        avgLoggedHoursLast4Weeks,
        utilizationPct,
        status: getStatus(utilizationPct),
      };
    });
  }, [consultants, activeWeekIso, capacityByConsultantId, avgLoggedByConsultantId, blockedHoursByConsultantWeek, holidayCountByWeekIso]);

  const demandRowsByWeek = useMemo(() => {
    const map = new Map<string, ProjectDemandRow[]>();
    weeks.forEach((w) => {
      const rows: ProjectDemandRow[] = projects.map((p) => {
        const manual = manualByAccountWeek.get(`${p.id}:${w.iso}`);
        const suggested = suggestedHoursByAccountId.get(p.id) ?? 0;
        const manualHours = manual ? Number(manual.estimated_hours || 0) : null;
        const finalHours = manualHours ?? suggested;
        const priority = (manual?.priority ?? 2) as ResourcePriority;
        return {
          accountId: p.id,
          accountName: p.name,
          suggestedHours: round2(suggested),
          manualHours: manualHours === null ? null : round2(manualHours),
          finalHours: round2(finalHours),
          priority,
        };
      });
      map.set(w.iso, rows);
    });
    return map;
  }, [weeks, projects, manualByAccountWeek, suggestedHoursByAccountId]);

  const totals = useMemo(() => {
    const totalWeeklyCapacity = consultantRows.reduce((s, c) => s + c.weeklyCapacityHours, 0);
    const demandActiveWeek = activeWeekIso ? demandRowsByWeek.get(activeWeekIso) || [] : [];
    const totalDemandActiveWeek = demandActiveWeek.reduce((s, r) => s + (r.finalHours || 0), 0);
    const overloaded = consultantRows.filter((c) => c.status === "overloaded").length;
    const optimal = consultantRows.filter((c) => c.status === "optimal").length;
    const underutilized = consultantRows.filter((c) => c.status === "underutilized").length;
    return {
      totalWeeklyCapacity: round2(totalWeeklyCapacity),
      totalDemandWeek0: round2(totalDemandActiveWeek),
      overloaded,
      optimal,
      underutilized,
    };
  }, [consultantRows, activeWeekIso, demandRowsByWeek]);

  const upsertCapacity = useMutation({
    mutationFn: async (input: { consultantId: string; weeklyHours: number; maxProjects: number }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const row = {
        consultant_id: input.consultantId,
        weekly_hours: Math.max(0, Math.round(input.weeklyHours)),
        max_projects: Math.max(0, Math.round(input.maxProjects)),
        updated_by: user.id,
      };
      const { error } = await supabase
        .from("consultant_capacity_settings")
        .upsert(row, { onConflict: "consultant_id" });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "capacity-settings"] });
    },
  });

  const upsertRequirement = useMutation({
    mutationFn: async (input: {
      accountId: string;
      weekStart: string;
      estimatedHours: number;
      priority: ResourcePriority;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const row = {
        account_id: input.accountId,
        week_start: input.weekStart,
        estimated_hours: Math.max(0, input.estimatedHours),
        priority: input.priority,
        updated_by: user.id,
        created_by: user.id,
      };
      const { error } = await supabase
        .from("project_resource_requirements")
        .upsert(row, { onConflict: "account_id,week_start" });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "requirements"] });
    },
  });

  const saveSnapshot = useMutation({
    mutationFn: async (label?: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const snapshot = {
        weeks: weeks.map((w) => ({ iso: w.iso, label: w.label })),
        consultants: consultantRows,
        demandByWeek: Object.fromEntries(Array.from(demandRowsByWeek.entries())),
        totals,
      };

      // NOTE: keep insert payload loosely typed to avoid Json typing friction
      const { error } = await supabase
        .from("resource_allocation_history")
        .insert({
          week_start: weeks[0]?.iso,
          horizon_weeks: horizonWeeks,
          label: label?.trim() || null,
          snapshot: snapshot as any,
          created_by: user.id,
        } as any);
      if (error) throw error;
      return true;
    },
  });

  return {
    weekStart: baseWeekStart,
    horizonWeeks,
    weeks,
    consultants,
    projects,
    capacitySettings,
    getCapacitySetting,
    availabilityBlocks,
    companyHolidays,
    getEffectiveWeeklyCapacity,
    consultantRows,
    demandRowsByWeek,
    totals,
    loading: loadingCapacity || loadingRequirements || loadingHistory || loadingAvailability,
    upsertCapacity: upsertCapacity.mutateAsync,
    upsertRequirement: upsertRequirement.mutateAsync,
    saveSnapshot: saveSnapshot.mutateAsync,
    savingSnapshot: saveSnapshot.isPending,
  };
}
