import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { MoreHorizontal, ScrollText, Search, X } from "lucide-react";

import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Database } from "@/integrations/supabase/types";

import { useAccount } from "@/hooks/useAccount";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";
import { CandidateContactDialog } from "@/components/recruitment/CandidateContactDialog";
import { ForceSendConfirmDialog } from "@/components/recruitment/ForceSendConfirmDialog";
import { exportCommunicationLogsMultiCSV } from "@/utils/exportCommunicationLogs";
import { formatBRT } from "@/lib/datetime";

type CommunicationLogRow = Database["public"]["Tables"]["recruitment_communications_log"]["Row"] & {
  candidate?: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
  job?: { id: string; title: string } | null;
};

type StatusFilter = "all" | "sent" | "failed" | "skipped";
type ChannelFilter = "all" | "whatsapp" | "email";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  // Mantém tudo em tokens do design system (sem cores hardcoded)
  if (status === "sent") return "default";
  if (status === "failed") return "destructive";
  if (status === "skipped") return "secondary";
  return "outline";
}

function safeJsonString(value: unknown): string {
  try {
    if (!value) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export default function CommunicationLogsPage() {
  const { currentAccount } = useOrganization();
  const { canManageRH } = useAccount();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [messageType, setMessageType] = useState<string>("all");

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactDialogCandidateId, setContactDialogCandidateId] = useState<string | null>(null);
  const [contactDialogCandidateLabel, setContactDialogCandidateLabel] = useState<string | undefined>(undefined);
  const [contactDialogJobId, setContactDialogJobId] = useState<string | null>(null);
  const [contactDialogJobLabel, setContactDialogJobLabel] = useState<string | undefined>(undefined);

  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [pendingForceAction, setPendingForceAction] = useState<null | (() => Promise<void>)>(null);

  const { data: messageTypes = [] } = useQuery({
    queryKey: ["communication-logs-message-types", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [] as string[];
      // Sem distinct direto: pegamos uma janela e extraímos os tipos.
      const { data, error } = await supabase
        .from("recruitment_communications_log")
        .select("message_type")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const unique = Array.from(new Set((data || []).map((r) => r.message_type).filter(Boolean)));
      unique.sort();
      return unique;
    },
    enabled: !!currentAccount?.id,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["communication-logs", currentAccount?.id, status, channel, messageType],
    queryFn: async (): Promise<CommunicationLogRow[]> => {
      if (!currentAccount?.id) return [];

      let q = supabase
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
          body,
          provider,
          provider_message_id,
          error_code,
          error_message,
          metadata,
          candidate:recruitment_candidates(id, first_name, last_name, email, phone),
          job:recruitment_jobs(id, title)
        `,
        )
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (status !== "all") q = q.eq("status", status);
      if (channel !== "all") q = q.eq("channel", channel);
      if (messageType !== "all") q = q.eq("message_type", messageType);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CommunicationLogRow[];
    },
    enabled: !!currentAccount?.id,
  });

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const candidateName = `${l.candidate?.first_name || ""} ${l.candidate?.last_name || ""}`.trim().toLowerCase();
      const candidateEmail = (l.candidate?.email || "").toLowerCase();
      const candidatePhone = (l.candidate?.phone || "").toLowerCase();
      const jobTitle = (l.job?.title || "").toLowerCase();
      const recipient = (l.recipient || "").toLowerCase();
      const errorMessage = (l.error_message || "").toLowerCase();
      const meta = safeJsonString(l.metadata).toLowerCase();

      return (
        candidateName.includes(q) ||
        candidateEmail.includes(q) ||
        candidatePhone.includes(q) ||
        jobTitle.includes(q) ||
        recipient.includes(q) ||
        errorMessage.includes(q) ||
        meta.includes(q)
      );
    });
  }, [logs, search]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setChannel("all");
    setMessageType("all");
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Logs de Comunicações</h1>
            <p className="text-muted-foreground">
              Auditoria de envios e automações (WhatsApp/Email)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportRows = filtered.map((l) => {
                  const candidateName = l.candidate
                    ? `${l.candidate.first_name || ""} ${l.candidate.last_name || ""}`.trim() || "Candidato"
                    : "Candidato";

                  return {
                    created_at: l.created_at,
                    candidate_name: candidateName,
                    job_title: l.job?.title || "",
                    channel: l.channel,
                    status: l.status,
                    message_type: l.message_type,
                    recipient: l.recipient,
                    provider: l.provider,
                    provider_message_id: l.provider_message_id,
                    error_code: l.error_code,
                    error_message: l.error_message,
                    metadata: l.metadata,
                  };
                });

                const filename = `communication_logs_${formatBRT(new Date(), "yyyyMMdd_HHmm")}`;
                exportCommunicationLogsMultiCSV(exportRows, filename);
                toast.success(`Export iniciado (${exportRows.length} linhas).`);
              }}
              disabled={filtered.length === 0}
            >
              Exportar CSV
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por candidato, vaga, destinatário, erro..."
                className="pl-9"
              />
            </div>

            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="skipped">Skip</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channel} onValueChange={(v) => setChannel(v as ChannelFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>

            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {messageTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || status !== "all" || channel !== "all" || messageType !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Data</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead className="w-[120px]">Canal</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead>Detalhe</TableHead>
                  {canManageRH ? <TableHead className="w-[90px] text-right">Ações</TableHead> : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-72" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageRH ? 8 : 7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ScrollText className="h-8 w-8" />
                        <p>Nenhum log encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => {
                    const candidateName = l.candidate
                      ? `${l.candidate.first_name || ""} ${l.candidate.last_name || ""}`.trim() || "Candidato"
                      : "Candidato";
                    const detail =
                      l.status === "failed"
                        ? l.error_message || l.error_code || "Falha sem detalhe"
                        : l.status === "skipped"
                          ? (typeof l.metadata === "object" && l.metadata && "skipped_reason" in l.metadata
                              ? String((l.metadata as any).skipped_reason)
                              : "Skip")
                          : (typeof l.metadata === "object" && l.metadata && "reminder_day" in l.metadata
                              ? `reminder_day=${String((l.metadata as any).reminder_day)}`
                              : "-");

                    const candidateId = l.candidate_id;
                    const jobId = l.job_id;
                    const sessionId = l.session_id;

                    const openContactDialog = () => {
                      setContactDialogCandidateId(candidateId);
                      setContactDialogCandidateLabel(candidateName);
                      setContactDialogJobId(jobId);
                      setContactDialogJobLabel(l.job?.title || undefined);
                      setContactDialogOpen(true);
                    };

                    const doResendInvite = async (force: boolean) => {
                      if (!currentAccount?.id) return;
                      if (!candidateId || !jobId) {
                        toast.error("Este log não possui candidato/vaga suficientes para reenviar.");
                        return;
                      }

                      const { error } = await invokeAuthenticatedFunction("send-disc-invitation", {
                        accountId: currentAccount.id,
                        candidateId,
                        jobId,
                        force,
                        manual: true,
                      });

                      if (error) {
                        toast.error("Falha ao reenviar convite DISC.");
                        return;
                      }

                      toast.success(force ? "Convite DISC reenviado (forçado)." : "Convite DISC reenviado.");
                    };

                    const doResendReminder = async (reminder_day: 1 | 3 | 5, force: boolean) => {
                      if (!currentAccount?.id) return;
                      if (!sessionId) {
                        toast.error("Este log não possui session_id para reenviar lembrete.");
                        return;
                      }

                      const { error } = await invokeAuthenticatedFunction("send-disc-reminder-manual", {
                        accountId: currentAccount.id,
                        sessionId,
                        reminder_day,
                        force,
                      });

                      if (error) {
                        toast.error("Falha ao reenviar lembrete DISC.");
                        return;
                      }

                      toast.success(
                        force
                          ? `Lembrete DISC D+${reminder_day} reenviado (forçado).`
                          : `Lembrete DISC D+${reminder_day} reenviado.`
                      );
                    };

                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-muted-foreground">
                          {formatBRT(new Date(l.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{candidateName}</div>
                            <div className="text-xs text-muted-foreground">
                              {l.candidate?.email || l.recipient}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{l.job?.title || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.message_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{l.channel}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(l.status)}>{l.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="line-clamp-2">{detail}</span>
                        </TableCell>

                        {canManageRH ? (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Ações">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuItem onSelect={openContactDialog}>
                                  Preferências de contato
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                {l.message_type === "disc_invite" ? (
                                  <>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        void doResendInvite(false);
                                      }}
                                    >
                                      Reenviar convite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setPendingForceAction(() => async () => doResendInvite(true));
                                        setForceDialogOpen(true);
                                      }}
                                    >
                                      Forçar reenvio
                                    </DropdownMenuItem>
                                  </>
                                ) : null}

                                {l.message_type === "disc_reminder" ? (
                                  <>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        void doResendReminder(1, false);
                                      }}
                                    >
                                      Reenviar lembrete D+1
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        void doResendReminder(3, false);
                                      }}
                                    >
                                      Reenviar lembrete D+3
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        void doResendReminder(5, false);
                                      }}
                                    >
                                      Reenviar lembrete D+5
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setPendingForceAction(() => async () => doResendReminder(1, true));
                                        setForceDialogOpen(true);
                                      }}
                                    >
                                      Forçar D+1
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setPendingForceAction(() => async () => doResendReminder(3, true));
                                        setForceDialogOpen(true);
                                      }}
                                    >
                                      Forçar D+3
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setPendingForceAction(() => async () => doResendReminder(5, true));
                                        setForceDialogOpen(true);
                                      }}
                                    >
                                      Forçar D+5
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {currentAccount?.id && contactDialogCandidateId ? (
            <CandidateContactDialog
              open={contactDialogOpen}
              onOpenChange={setContactDialogOpen}
              accountId={currentAccount.id}
              candidateId={contactDialogCandidateId}
              candidateLabel={contactDialogCandidateLabel}
              jobId={contactDialogJobId}
              jobLabel={contactDialogJobLabel}
            />
          ) : null}

          <ForceSendConfirmDialog
            open={forceDialogOpen}
            onOpenChange={setForceDialogOpen}
            onConfirm={async () => {
              const fn = pendingForceAction;
              setForceDialogOpen(false);
              setPendingForceAction(null);
              if (fn) await fn();
            }}
          />
        </section>
      </div>
    </RecruitmentLayout>
  );
}

