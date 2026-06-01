import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  TimeEntry,
  TimeEntryWithRelations,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntrySummary,
  TimeFilters,
  TimeEntryCategory,
  TIME_CATEGORIES,
} from "@/types/time-tracking.types";

export function useConsultantTimeTracking(filters?: TimeFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get consultant ID for current user
  const { data: consultant } = useQuery({
    queryKey: ["current-consultant", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("ep_consultants")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch time entries
  const {
    data: entries = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["time-entries", consultant?.id, filters],
    queryFn: async (): Promise<TimeEntryWithRelations[]> => {
      if (!consultant?.id) return [];

      let query = supabase
        .from("consultant_time_entries")
        .select(`
          *,
          account:companies(id, name),
          checkpoint:project_checkpoints(id, topic)
        `)
        .eq("consultant_id", consultant.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }
      if (filters?.accountId) {
        query = query.eq("account_id", filters.accountId);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.billable !== undefined) {
        query = query.eq("billable", filters.billable);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((entry) => ({
        ...entry,
        category: entry.category as TimeEntryCategory,
        consultant: { id: consultant.id, name: consultant.name },
      }));
    },
    enabled: !!consultant?.id,
  });

  // Create time entry
  const createEntry = useMutation({
    mutationFn: async (input: CreateTimeEntryInput) => {
      if (!consultant?.id || !user?.id) throw new Error("Consultor não identificado");

      const { data, error } = await supabase
        .from("consultant_time_entries")
        .insert({
          consultant_id: consultant.id,
          account_id: input.account_id,
          entry_date: input.entry_date,
          start_time: input.start_time || null,
          end_time: input.end_time || null,
          duration_minutes: input.duration_minutes,
          category: input.category,
          description: input.description || null,
          checkpoint_id: input.checkpoint_id || null,
          billable: input.billable ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Tempo registrado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar tempo: ${error.message}`);
    },
  });

  // Update time entry
  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeEntryInput }) => {
      const { error } = await supabase
        .from("consultant_time_entries")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Registro atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete time entry
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("consultant_time_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Registro excluído");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Calculate summary from entries
  const getSummary = (customEntries?: TimeEntryWithRelations[]): TimeEntrySummary => {
    const data = customEntries || entries;
    
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

    data.forEach((entry) => {
      byCategory[entry.category] += entry.duration_minutes;

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
  };

  return {
    entries,
    isLoading,
    error: error?.message || null,
    consultant,
    createEntry: createEntry.mutateAsync,
    updateEntry: (id: string, data: UpdateTimeEntryInput) =>
      updateEntry.mutateAsync({ id, data }),
    deleteEntry: deleteEntry.mutateAsync,
    isCreating: createEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
    getSummary,
  };
}
