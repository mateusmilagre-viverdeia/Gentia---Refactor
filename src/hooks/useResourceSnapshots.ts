import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ResourceSnapshotRow = {
  id: string;
  week_start: string;
  horizon_weeks: number;
  label: string | null;
  snapshot: any;
  created_by: string | null;
  created_at: string;
};

export function useResourceSnapshots(params?: { limit?: number }) {
  const queryClient = useQueryClient();
  const limit = params?.limit ?? 25;

  const snapshotsQuery = useQuery({
    queryKey: ["resource-planning", "snapshots", limit],
    queryFn: async (): Promise<ResourceSnapshotRow[]> => {
      const { data, error } = await supabase
        .from("resource_allocation_history")
        .select("id, week_start, horizon_weeks, label, snapshot, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as any;
    },
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase.from("resource_allocation_history").delete().eq("id", snapshotId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "snapshots"] });
    },
  });

  return {
    snapshots: snapshotsQuery.data ?? [],
    loading: snapshotsQuery.isLoading,
    error: snapshotsQuery.error as any,
    refetch: snapshotsQuery.refetch,
    deleteSnapshot: deleteSnapshot.mutateAsync,
    deleting: deleteSnapshot.isPending,
  };
}
