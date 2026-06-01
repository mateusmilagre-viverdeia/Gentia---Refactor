import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AlertTriangle, CheckCircle2, Radio, ScrollText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { exportCommunicationLogsMultiCSV } from "@/utils/exportCommunicationLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailGatewayLogsTab } from "./EmailGatewayLogsTab";
import { formatBRT } from "@/lib/datetime";

type CommunicationLogRow = Database["public"]["Tables"]["recruitment_communications_log"]["Row"] & {
  candidate?: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
  job?: { id: string; title: string } | null;
};

type StatusFilter = "all" | "sent" | "failed" | "skipped";
type ChannelFilter = "all" | "whatsapp" | "email" | "job_distribution";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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

export function LogsSettingsTab() {
  const { currentAccount } = useOrganization();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [messageType, setMessageType] = useState<string>("all");

  const { data: messageTypes = [] } = useQuery({
    queryKey: ["communication-logs-message-types", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [] as string[];
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

      let rows = (data || []) as CommunicationLogRow[];

      if (channel === "all" || channel === "job_distribution") {
        const { data: distributionLogs, error: distributionError } = await supabase
          .from("job_distribution_logs")
          .select(`
            id,
            created_at,
            job_id,
            channel_name,
            status,
            error_message,
            metadata,
            distributed_at,
            removed_at,
            external_posting_id,
            job:recruitment_jobs!inner(id, title, account_id)
          `)
          .eq("job.account_id", currentAccount.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (distributionError) throw distributionError;

        const mappedDistributionLogs = (distributionLogs || []).map((log: any) => ({
          id: log.id,
          created_at: log.created_at || log.distributed_at || log.removed_at,
          account_id: currentAccount.id,
          candidate_id: null,
          job_id: log.job_id,
          application_id: null,
          session_id: null,
          channel: "job_distribution",
          status: log.status === "active" || log.status === "removed" ? "sent" : log.status === "error" ? "failed" : "pending",
          message_type: `publicacao_${log.channel_name}`,
          recipient: log.channel_name,
          subject: null,
          body: null,
          provider: log.channel_name,
          provider_message_id: log.external_posting_id,
          error_code: null,
          error_message: log.error_message,
          metadata: log.metadata || {},
          candidate: null,
          job: log.job,
        })) as CommunicationLogRow[];

        rows = channel === "job_distribution" ? mappedDistributionLogs : [...rows, ...mappedDistributionLogs];
      }

      return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const summary = useMemo(() => {
    const success = logs.filter((l) => l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const channelsWithErrors = new Set(logs.filter((l) => l.status === "failed").map((l) => l.channel)).size;
    return { success, failed, channelsWithErrors, latest: logs[0]?.created_at || null };
  }, [logs]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setChannel("all");
    setMessageType("all");
  };

  return (
    <Tabs defaultValue="recruitment" className="space-y-6">
      <TabsList>
        <TabsTrigger value="recruitment">Recrutamento</TabsTrigger>
        <TabsTrigger value="email-gateway">E-mails (gateway)</TabsTrigger>
      </TabsList>

      <TabsContent value="email-gateway">
        <EmailGatewayLogsTab />
      </TabsContent>

      <TabsContent value="recruitment" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Logs de Comunicações
          </h2>
          <p className="text-muted-foreground">
            Auditoria de envios, WhatsApp, e-mail e publicação de vagas
          </p>
        </div>

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Sucessos</p><p className="text-xl font-semibold">{summary.success}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Falhas</p><p className="text-xl font-semibold">{summary.failed}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Radio className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Canais com erro</p><p className="text-xl font-semibold">{summary.channelsWithErrors}</p></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Última tentativa</p><p className="text-sm font-medium">{summary.latest ? formatBRT(new Date(summary.latest), "dd/MM/yyyy HH:mm") : "-"}</p></CardContent></Card>
      </div>

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
            <SelectItem value="job_distribution">Publicação</SelectItem>
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
                <TableCell colSpan={7} className="h-32 text-center">
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      </TabsContent>
    </Tabs>
  );
}
