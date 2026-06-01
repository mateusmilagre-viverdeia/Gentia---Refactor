import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortalFunnelCounts {
  searching: number;
  screening: number;
  cultural: number;
  disc: number;
  technical: number;
  shortlist: number;
}

const EMPTY: PortalFunnelCounts = {
  searching: 0,
  screening: 0,
  cultural: 0,
  disc: 0,
  technical: 0,
  shortlist: 0,
};

export const usePortalJobFunnel = (token: string | undefined, jobId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-funnel-counts", token, jobId],
    queryFn: async () => {
      if (!token || !jobId) return EMPTY;
      const { data, error } = await supabase.rpc("get_portal_funnel_counts", {
        p_token: token,
        p_job_id: jobId,
      });
      if (error) {
        console.error("funnel counts error:", error);
        return EMPTY;
      }
      return { ...EMPTY, ...(data as Partial<PortalFunnelCounts>) };
    },
    enabled: !!token && !!jobId,
    refetchInterval: 30000, // safety net every 30s
  });
};
