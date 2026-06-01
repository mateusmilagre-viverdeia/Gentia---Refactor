import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CopilotScope = "candidate" | "job" | "global";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  sources?: Array<{ type: string; id: string }> | null;
  credits_consumed?: number | null;
  tier?: "fast" | "advanced" | "deep" | null;
  model_used?: string | null;
  created_at: string;
}

interface UseCopilotParams {
  accountId: string | undefined;
  scope: CopilotScope;
  candidateId?: string;
  jobId?: string;
  open: boolean;
}

export function useCopilot({ accountId, scope, candidateId, jobId, open }: UseCopilotParams) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [sending, setSending] = useState(false);

  // Find or reset thread when context changes
  useEffect(() => {
    if (!open || !accountId) return;
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("recruiter_copilot_threads")
        .select("id")
        .eq("account_id", accountId)
        .eq("scope", scope)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (candidateId) q = q.eq("candidate_id", candidateId);
      else q = q.is("candidate_id", null);
      if (jobId) q = q.eq("job_id", jobId);
      else q = q.is("job_id", null);
      const { data } = await q;
      if (cancelled) return;
      const tid = data?.[0]?.id ?? null;
      setThreadId(tid);
      if (tid) {
        const { data: msgs } = await supabase
          .from("recruiter_copilot_messages")
          .select("id, role, content, sources, credits_consumed, tier, model_used, created_at")
          .eq("thread_id", tid)
          .in("role", ["user", "assistant"])
          .order("created_at", { ascending: true });
        if (!cancelled) setMessages((msgs || []) as CopilotMessage[]);
      } else {
        setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open, accountId, scope, candidateId, jobId]);

  const send = useCallback(async (text: string, mode: "auto" | "deep" = "auto") => {
    if (!accountId || !text.trim() || sending) return;
    setSending(true);
    const tempUser: CopilotMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);
    try {
      const { data, error } = await supabase.functions.invoke("recruiter-copilot", {
        body: {
          thread_id: threadId,
          account_id: accountId,
          scope,
          candidate_id: candidateId,
          job_id: jobId,
          message: text,
          mode,
        },
      });
      if (error) {
        const ctx: any = (error as any).context;
        const status = ctx?.status;
        if (status === 402) {
          toast.error("Créditos insuficientes. Recarregue para continuar usando o Copilot.");
        } else if (status === 429) {
          toast.error("Muitas chamadas. Aguarde alguns segundos.");
        } else {
          toast.error("Erro ao consultar o Copilot.");
        }
        setMessages((m) => m.filter((x) => x.id !== tempUser.id));
        return;
      }
      if (data?.thread_id && data.thread_id !== threadId) setThreadId(data.thread_id);
      const assistantMsg: CopilotMessage = {
        id: data.message_id || `temp-a-${Date.now()}`,
        role: "assistant",
        content: data.content || "",
        sources: data.sources,
        credits_consumed: data.credits_consumed,
        tier: data.tier ?? null,
        model_used: data.model ?? null,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      toast.error("Erro inesperado.");
      setMessages((m) => m.filter((x) => x.id !== tempUser.id));
    } finally {
      setSending(false);
    }
  }, [accountId, scope, candidateId, jobId, threadId, sending]);

  return { messages, sending, send, threadId };
}
