import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface NpsRecord {
  id: string;
  account_id: string;
  candidate_id: string;
  job_id: string | null;
  application_id: string | null;
  score: number | null;
  category: "promoter" | "neutral" | "detractor" | null;
  feedback_text: string | null;
  trigger: "exit" | "hired";
  exit_stage: string | null;
  send_channel: "whatsapp" | "email" | null;
  send_status: "pending" | "sent" | "answered" | "expired" | "failed";
  send_error: string | null;
  response_token: string;
  alert_resolved: boolean;
  alert_resolution_note: string | null;
  alert_resolved_at: string | null;
  alert_resolved_by: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NpsEnriched extends NpsRecord {
  candidate_name?: string;
  job_title?: string;
}

export interface NpsMetrics {
  score: number; // -100..100
  total_answered: number;
  total_sent: number;
  response_rate: number; // 0..1
  promoters: number;
  neutrals: number;
  detractors: number;
  promoters_pct: number;
  neutrals_pct: number;
  detractors_pct: number;
}

export const useNpsList = (filters?: {
  category?: string;
  status?: string;
  job_id?: string;
}) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["nps", "list", accountId, filters],
    queryFn: async (): Promise<NpsEnriched[]> => {
      if (!accountId) return [];
      let query = (supabase as any)
        .from("candidate_nps")
        .select("*, recruitment_candidates:candidate_id(first_name, last_name), recruitment_jobs:job_id(title)")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (filters?.category) query = query.eq("category", filters.category);
      if (filters?.status) query = query.eq("send_status", filters.status);
      if (filters?.job_id) query = query.eq("job_id", filters.job_id);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((n: any) => ({
        ...n,
        candidate_name: [n.recruitment_candidates?.first_name, n.recruitment_candidates?.last_name].filter(Boolean).join(" ") || undefined,
        job_title: n.recruitment_jobs?.title,
      }));
    },
    enabled: !!accountId,
  });
};

export const useNpsByCandidate = (candidateId: string | undefined) => {
  return useQuery({
    queryKey: ["nps", "candidate", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await (supabase as any)
        .from("candidate_nps")
        .select("*, recruitment_jobs:job_id(title)")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!candidateId,
  });
};

export const useNpsByClient = (clientId: string | undefined) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["nps", "client", clientId],
    queryFn: async () => {
      if (!clientId || !accountId) return [];
      // Buscar vagas do cliente, depois NPS dessas vagas
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("cliente_id", clientId)
        .eq("account_id", accountId);
      const jobIds = (jobs || []).map((j) => j.id);
      if (jobIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("candidate_nps")
        .select("*")
        .in("job_id", jobIds)
        .eq("send_status", "answered");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && !!accountId,
  });
};

export const useNpsMetrics = () => {
  const { data: list = [] } = useNpsList();

  return {
    metrics: computeMetrics(list),
    monthly: computeMonthly(list),
    byStage: computeByStage(list),
    list,
  };
};

export function computeMetrics(records: NpsRecord[]): NpsMetrics {
  const answered = records.filter((r) => r.send_status === "answered" && r.score !== null);
  const sent = records.filter((r) => ["sent", "answered", "expired"].includes(r.send_status));
  const total_answered = answered.length;
  const total_sent = sent.length;
  const promoters = answered.filter((r) => r.category === "promoter").length;
  const neutrals = answered.filter((r) => r.category === "neutral").length;
  const detractors = answered.filter((r) => r.category === "detractor").length;
  const score = total_answered > 0
    ? Math.round(((promoters - detractors) / total_answered) * 100)
    : 0;
  return {
    score,
    total_answered,
    total_sent,
    response_rate: total_sent > 0 ? total_answered / total_sent : 0,
    promoters,
    neutrals,
    detractors,
    promoters_pct: total_answered > 0 ? Math.round((promoters / total_answered) * 100) : 0,
    neutrals_pct: total_answered > 0 ? Math.round((neutrals / total_answered) * 100) : 0,
    detractors_pct: total_answered > 0 ? Math.round((detractors / total_answered) * 100) : 0,
  };
}

export function computeMonthly(records: NpsRecord[]): { month: string; score: number; count: number }[] {
  const answered = records.filter((r) => r.send_status === "answered" && r.score !== null && r.answered_at);
  const groups = new Map<string, NpsRecord[]>();
  for (const r of answered) {
    const m = (r.answered_at as string).slice(0, 7); // YYYY-MM
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(r);
  }
  const months = Array.from(groups.keys()).sort();
  return months.map((m) => {
    const items = groups.get(m)!;
    const p = items.filter((x) => x.category === "promoter").length;
    const d = items.filter((x) => x.category === "detractor").length;
    const score = items.length > 0 ? Math.round(((p - d) / items.length) * 100) : 0;
    return { month: m, score, count: items.length };
  });
}

export function computeByStage(records: NpsRecord[]): { stage: string; score: number; count: number }[] {
  const answered = records.filter((r) => r.send_status === "answered" && r.score !== null);
  const groups = new Map<string, NpsRecord[]>();
  for (const r of answered) {
    const s = r.exit_stage || (r.trigger === "hired" ? "contratado" : "outro");
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s)!.push(r);
  }
  return Array.from(groups.entries()).map(([stage, items]) => {
    const p = items.filter((x) => x.category === "promoter").length;
    const d = items.filter((x) => x.category === "detractor").length;
    const score = items.length > 0 ? Math.round(((p - d) / items.length) * 100) : 0;
    return { stage, score, count: items.length };
  });
}

export const useResolveNpsAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; note: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("candidate_nps")
        .update({
          alert_resolved: true,
          alert_resolution_note: params.note,
          alert_resolved_at: new Date().toISOString(),
          alert_resolved_by: user?.id || null,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nps"] });
      toast.success("Alerta marcado como resolvido");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
};

export const useTriggerNpsSend = () => {
  return useMutation({
    mutationFn: async (params: {
      candidate_id: string;
      job_id?: string | null;
      trigger: "exit" | "hired";
      exit_stage?: string | null;
      application_id?: string | null;
      account_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("nps-send", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
  });
};
