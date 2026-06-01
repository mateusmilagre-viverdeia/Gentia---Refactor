import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortalJobs } from "./usePortalData";

/**
 * Extends usePortalJobs with realtime subscription on recruitment_applications.
 * Invalidates queries on UPDATE/INSERT for jobs of this client.
 */
export const usePortalJobsRealtime = (clienteId: string | undefined, accountId: string | undefined) => {
  const query = usePortalJobs(clienteId, accountId);
  const queryClient = useQueryClient();
  const jobs = query.data || [];
  const jobIds = jobs.map((j: any) => j.id).filter(Boolean);
  const jobIdsKey = jobIds.join(",");

  useEffect(() => {
    if (!clienteId || jobIds.length === 0) return;

    const channel = supabase
      .channel(`portal-realtime-${clienteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recruitment_applications",
          filter: `job_id=in.(${jobIds.join(",")})`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["portal-jobs", clienteId] });
          queryClient.invalidateQueries({ queryKey: ["portal-candidates", clienteId] });
          queryClient.invalidateQueries({ queryKey: ["portal-funnel-counts"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_portal_activity_log",
          filter: `cliente_id=eq.${clienteId}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["portal-activity-log"] });
          if (payload?.new?.event_type === "shortlist_ready") {
            const data = payload.new.event_data || {};
            const jobTitle = data.job_title || "Vaga";
            const count = data.shortlist_count ?? data.candidate_count ?? 0;
            toast.success("✨ Shortlist pronta!", {
              description: `${jobTitle} — ${count} candidato${count === 1 ? "" : "s"} qualificado${count === 1 ? "" : "s"} aguardam seu feedback.`,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, jobIdsKey]);

  return query;
};
