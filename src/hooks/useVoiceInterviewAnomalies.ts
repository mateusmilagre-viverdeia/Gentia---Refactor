import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";

export interface VoiceInterviewAnomaly {
  id: string;
  account_id: string;
  session_id: string;
  session_type: "cultural" | "technical" | "disc";
  candidate_id: string | null;
  candidate_profile_id: string | null;
  job_id: string | null;
  agent_id: string | null;
  severity: "info" | "warning" | "critical";
  rule_code: string;
  description: string;
  suggestion: string | null;
  metrics: Record<string, unknown>;
  ai_classification: string | null;
  ai_reasoning: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  // joined
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
}

export const VOICE_ANOMALIES_KEY = ["voice-interview-anomalies"];

export function useVoiceInterviewAnomalies(opts?: {
  scope?: "all" | "account";
  onlyOpen?: boolean;
}) {
  const { account } = useAccount();
  const { isSuperAdmin } = useSuperAdmin();
  const scope = opts?.scope ?? (isSuperAdmin ? "all" : "account");
  const onlyOpen = opts?.onlyOpen ?? true;

  return useQuery({
    queryKey: [...VOICE_ANOMALIES_KEY, scope, onlyOpen, account?.id ?? null],
    enabled: scope === "all" ? isSuperAdmin : !!account?.id,
    queryFn: async (): Promise<VoiceInterviewAnomaly[]> => {
      let q = supabase
        .from("voice_interview_anomalies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (scope === "account" && account?.id) q = q.eq("account_id", account.id);
      if (onlyOpen) q = q.is("resolved_at", null);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as VoiceInterviewAnomaly[];

      // Enrich with candidate + job names (best-effort)
      const candidateIds = Array.from(
        new Set(rows.map((r) => r.candidate_id).filter(Boolean) as string[]),
      );
      const profileIds = Array.from(
        new Set(rows.map((r) => r.candidate_profile_id).filter(Boolean) as string[]),
      );
      const jobIds = Array.from(new Set(rows.map((r) => r.job_id).filter(Boolean) as string[]));

      const [candRes, profRes, jobRes] = await Promise.all([
        candidateIds.length
          ? supabase
              .from("recruitment_candidates")
              .select("id, full_name, email")
              .in("id", candidateIds)
          : Promise.resolve({ data: [] as any[] }),
        profileIds.length
          ? supabase
              .from("candidate_profiles")
              .select("id, full_name, email")
              .in("id", profileIds)
          : Promise.resolve({ data: [] as any[] }),
        jobIds.length
          ? supabase.from("recruitment_jobs").select("id, title").in("id", jobIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const candMap = new Map<string, any>(((candRes as any).data ?? []).map((c: any) => [c.id, c]));
      const profMap = new Map<string, any>(((profRes as any).data ?? []).map((c: any) => [c.id, c]));
      const jobMap = new Map<string, any>(((jobRes as any).data ?? []).map((j: any) => [j.id, j]));

      return rows.map((r) => {
        const c = (r.candidate_id && candMap.get(r.candidate_id)) || null;
        const p = (r.candidate_profile_id && profMap.get(r.candidate_profile_id)) || null;
        const j = (r.job_id && jobMap.get(r.job_id)) || null;
        return {
          ...r,
          candidate_name: c?.full_name ?? p?.full_name ?? null,
          candidate_email: c?.email ?? p?.email ?? null,
          job_title: j?.title ?? null,
        };
      });
    },
  });
}

export function useResolveAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; note?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("voice_interview_anomalies")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: u.user?.id ?? null,
          resolution_note: params.note ?? null,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anomalia marcada como resolvida");
      qc.invalidateQueries({ queryKey: VOICE_ANOMALIES_KEY });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao resolver"),
  });
}

export function useAnalyseAnomalySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      sessionType: "cultural" | "technical";
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "detect-voice-interview-anomalies",
        { body: { sessionId: params.sessionId, sessionType: params.sessionType } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Análise concluída — ${data?.anomalies_created ?? 0} anomalia(s) detectada(s)`,
      );
      qc.invalidateQueries({ queryKey: VOICE_ANOMALIES_KEY });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro na análise"),
  });
}
