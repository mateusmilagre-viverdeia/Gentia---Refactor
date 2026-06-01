import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortalActivityEvent {
  id: string;
  cliente_id: string;
  job_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  seen_by_client: boolean;
  created_at: string;
}

export const usePortalActivityLog = (token: string | undefined, limit = 50) => {
  return useQuery({
    queryKey: ["portal-activity-log", token, limit],
    queryFn: async () => {
      if (!token) return [] as PortalActivityEvent[];
      const { data, error } = await supabase.rpc("get_portal_activity_by_token", {
        p_token: token,
        p_limit: limit,
      });
      if (error) {
        console.error("activity log error:", error);
        return [] as PortalActivityEvent[];
      }
      return (data as PortalActivityEvent[]) || [];
    },
    enabled: !!token,
  });
};

export const useMarkPortalEventsSeen = (token: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      if (!token || eventIds.length === 0) return 0;
      const { data, error } = await supabase.rpc("mark_portal_events_seen", {
        p_token: token,
        p_event_ids: eventIds,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-activity-log", token] });
    },
  });
};
