import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useROIReportForJob(jobId: string) {
  return useQuery({
    queryKey: ["roi-report", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await supabase
        .from("process_roi_reports")
        .select("id, public_token, views, last_viewed_at, generated_at, client_id")
        .eq("job_id", jobId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function useROIReportsForClient(clientId: string) {
  return useQuery({
    queryKey: ["roi-reports-client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("process_roi_reports")
        .select("id, public_token, views, last_viewed_at, generated_at, job_id, report_data")
        .eq("client_id", clientId)
        .order("generated_at", { ascending: false });
      return data || [];
    },
  });
}

export function useGenerateROIReport(jobId: string, accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (generated_by: string) => {
      const { data, error } = await supabase.functions.invoke("generate-roi-report", {
        body: { job_id: jobId, account_id: accountId, generated_by },
      });
      if (error) throw error;
      return data as { report_id: string; public_token: string; report_url: string; client_id?: string };
    },
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.report_url}`;
      toast.success("Relatório gerado!", {
        description: fullUrl,
        action: {
          label: "Copiar link",
          onClick: () => navigator.clipboard?.writeText(fullUrl),
        },
        duration: 8000,
      });
      qc.invalidateQueries({ queryKey: ["roi-report", jobId] });
      if (data.client_id) qc.invalidateQueries({ queryKey: ["roi-reports-client", data.client_id] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao gerar relatório"),
  });
}
