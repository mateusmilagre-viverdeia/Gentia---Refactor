import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Mail, MessageSquareText, RefreshCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccount } from "@/hooks/useAccount";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { CandidateContactDialog } from "@/components/recruitment/CandidateContactDialog";
import { ForceSendConfirmDialog } from "@/components/recruitment/ForceSendConfirmDialog";
import { formatBRT } from "@/lib/datetime";

type CommunicationLogRow = Database["public"]["Tables"]["recruitment_communications_log"]["Row"] & {
  job?: { id: string; title: string } | null;
};

type ReminderDay = 1 | 3 | 5;

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "sent") return "default";
  if (status === "failed") return "destructive";
  if (status === "skipped") return "secondary";
  return "outline";
}

function getDetailFromLog(log: CommunicationLogRow): string {
  if (log.status === "failed") return log.error_message || log.error_code || "Falha sem detalhe";
  if (log.status === "skipped") {
    const meta = log.metadata as any;
    if (meta && typeof meta === "object" && "skipped_reason" in meta) return String(meta.skipped_reason);
    return "Skip";
  }
  const meta = log.metadata as any;
  if (meta && typeof meta === "object" && "reminder_day" in meta) return `reminder_day=${String(meta.reminder_day)}`;
  return "-";
}

function isOptOutOverridden(log: CommunicationLogRow): boolean {
  const meta = log.metadata as any;
  return Boolean(meta && typeof meta === "object" && meta.opt_out_overridden);
}

interface CandidateCommunicationsSectionProps {
  candidateId: string;
  candidateLabel?: string;
  applications: Array<{ job_id: string; recruitment_jobs?: { title: string } | null }>;
}

export function CandidateCommunicationsSection({
  candidateId,
  candidateLabel,
  applications,
}: CandidateCommunicationsSectionProps) {
  const { currentAccount } = useOrganization();
  const { canManageRH } = useAccount();

  const jobOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const app of applications) {
      if (!app.job_id) continue;
      unique.set(app.job_id, app.recruitment_jobs?.title || "Vaga");
    }
    return Array.from(unique.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  const [selectedJobId, setSelectedJobId] = useState<string>(jobOptions[0]?.id ?? "");

  useEffect(() => {
    if (selectedJobId) return;
    if (jobOptions.length === 0) return;
    setSelectedJobId(jobOptions[0].id);
  }, [jobOptions, selectedJobId]);
  const selectedJobLabel = useMemo(
    () => jobOptions.find((j) => j.id === selectedJobId)?.title,
    [jobOptions, selectedJobId]
  );

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [pendingForceAction, setPendingForceAction] = useState<null | (() => Promise<void>)>(null);
  const [reminderDay, setReminderDay] = useState<ReminderDay>(1);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["candidate-communication-logs", currentAccount?.id, candidateId],
    queryFn: async (): Promise<CommunicationLogRow[]> => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_communications_log")
        .select(
          `
          id,
          created_at,
          account_id,
          candidate_id,
          job_id,
          application_id,
          session_id,
          channel,
          status,
          message_type,
          recipient,
          subject,
          provider,
          provider_message_id,
          error_code,
          error_message,
          metadata,
          job:recruitment_jobs(id, title)
        `
        )
        .eq("account_id", currentAccount.id)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as CommunicationLogRow[];
    },
    enabled: !!currentAccount?.id && !!candidateId,
  });

  const { data: latestDiscSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["candidate-latest-disc-session", currentAccount?.id, candidateId, selectedJobId],
    queryFn: async () => {
      if (!currentAccount?.id || !selectedJobId) return null;
      const { data, error } = await supabase
        .from("candidate_disc_sessions")
        .select("id, status, created_at")
        .eq("account_id", currentAccount.id)
        .eq("candidate_id", candidateId)
        .eq("job_id", selectedJobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string; created_at: string } | null;
    },
    enabled: !!currentAccount?.id && !!candidateId && !!selectedJobId,
  });

  const doResendInvite = async (force: boolean) => {
    if (!currentAccount?.id) return;
    if (!selectedJobId) {
      toast.error("Selecione uma vaga para reenviar o convite.");
      return;
    }

    const { error } = await invokeAuthenticatedFunction("send-disc-invitation", {
      accountId: currentAccount.id,
      candidateId,
      jobId: selectedJobId,
      force,
      manual: true,
    });

    if (error) {
      toast.error("Falha ao reenviar convite DISC.");
      return;
    }

    toast.success(force ? "Convite DISC reenviado (forçado)." : "Convite DISC reenviado.");
  };

  const doResendReminder = async (day: ReminderDay, force: boolean) => {
    if (!currentAccount?.id) return;
    if (!selectedJobId) {
      toast.error("Selecione uma vaga para reenviar o lembrete.");
      return;
    }
    if (!latestDiscSession?.id) {
      toast.error("Não encontrei uma sessão DISC para esta vaga.");
      return;
    }

    const { error } = await invokeAuthenticatedFunction("send-disc-reminder-manual", {
      accountId: currentAccount.id,
      sessionId: latestDiscSession.id,
      reminder_day: day,
      force,
    });

    if (error) {
      toast.error("Falha ao reenviar lembrete DISC.");
      return;
    }

    toast.success(force ? `Lembrete DISC D+${day} reenviado (forçado).` : `Lembrete DISC D+${day} reenviado.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <MessageSquareText className="h-3.5 w-3.5" />
            Últimos envios
          </Badge>
          {candidateLabel ? <span className="text-sm text-muted-foreground">{candidateLabel}</span> : null}
        </div>

        {canManageRH ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setContactDialogOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Preferências
            </Button>
          </div>
        ) : null}
      </div>

      {canManageRH ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ações rápidas</span>
              <span className="text-xs text-muted-foreground">
                (requer vaga; force ignora opt-out e janela 24h)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="Selecione uma vaga" />
                </SelectTrigger>
                <SelectContent>
                  {jobOptions.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(reminderDay)} onValueChange={(v) => setReminderDay(Number(v) as ReminderDay)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="D+" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">D+1</SelectItem>
                  <SelectItem value="3">D+3</SelectItem>
                  <SelectItem value="5">D+5</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground">
                Sessão DISC: {sessionLoading ? "carregando…" : latestDiscSession?.status ? latestDiscSession.status : "-"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void doResendInvite(false);
                }}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Convite
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPendingForceAction(() => async () => doResendInvite(true));
                  setForceDialogOpen(true);
                }}
              >
                Forçar convite
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void doResendReminder(reminderDay, false);
                }}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Lembrete
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPendingForceAction(() => async () => doResendReminder(reminderDay, true));
                  setForceDialogOpen(true);
                }}
              >
                Forçar lembrete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-72 mt-2" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum log de comunicação encontrado para este candidato.
          </div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatBRT(new Date(l.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                  <Badge variant="outline">{l.message_type}</Badge>
                  <Badge variant={statusBadgeVariant(l.status)}>{l.status}</Badge>
                  {isOptOutOverridden(l) ? <Badge variant="secondary">override</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.job?.title || "-"} • {l.channel}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{getDetailFromLog(l)}</div>
            </div>
          ))
        )}
      </div>

      <CandidateContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        accountId={currentAccount?.id || ""}
        candidateId={candidateId}
        candidateLabel={candidateLabel}
        jobId={selectedJobId || null}
        jobLabel={selectedJobLabel}
      />

      <ForceSendConfirmDialog
        open={forceDialogOpen}
        onOpenChange={setForceDialogOpen}
        onConfirm={async () => {
          if (!pendingForceAction) return;
          await pendingForceAction();
          setForceDialogOpen(false);
          setPendingForceAction(null);
        }}
      />
    </div>
  );
}
