import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Mail, ShieldOff, Search, X } from "lucide-react";
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
import { useEmailSendLog, type EmailSendLogRow } from "@/hooks/useEmailSendLog";
import { formatBRT } from "@/lib/datetime";

type Range = "24h" | "7d" | "30d";
type StatusFilter = "all" | "sent" | "failed" | "suppressed" | "pending";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "sent") return "default";
  if (status === "dlq" || status === "failed" || status === "bounced" || status === "complained") return "destructive";
  if (status === "suppressed") return "secondary";
  return "outline";
}

function matchesStatusFilter(rowStatus: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "failed") return rowStatus === "dlq" || rowStatus === "failed" || rowStatus === "bounced" || rowStatus === "complained";
  return rowStatus === filter;
}

const PAGE_SIZE = 50;

export function EmailGatewayLogsTab() {
  const [range, setRange] = useState<Range>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const startDate = useMemo(() => {
    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
    return subDays(new Date(), days);
  }, [range]);

  const { data: rows = [], isLoading } = useEmailSendLog({ startDate });

  const templates = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.template_name && set.add(r.template_name));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesStatusFilter(r.status, statusFilter)) return false;
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (q) {
        const hay = `${r.recipient_email || ""} ${r.template_name || ""} ${r.error_message || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, templateFilter, search]);

  const stats = useMemo(() => {
    let sent = 0, failed = 0, suppressed = 0, pending = 0;
    filtered.forEach((r) => {
      if (r.status === "sent") sent++;
      else if (r.status === "dlq" || r.status === "failed" || r.status === "bounced" || r.status === "complained") failed++;
      else if (r.status === "suppressed") suppressed++;
      else if (r.status === "pending") pending++;
    });
    return { total: filtered.length, sent, failed, suppressed, pending };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTemplateFilter("all");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-mails (gateway transacional)
        </h2>
        <p className="text-muted-foreground text-sm">
          Auditoria de envios pelo gateway: auth, welcome, convites e e-mails transacionais.
          Cada linha representa um único e-mail (deduplicado por message_id).
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Total único</p><p className="text-xl font-semibold">{stats.total}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Enviados</p><p className="text-xl font-semibold">{stats.sent}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Falhas</p><p className="text-xl font-semibold">{stats.failed}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><ShieldOff className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Suprimidos</p><p className="text-xl font-semibold">{stats.suppressed}</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por destinatário, template, erro..."
            className="pl-9"
          />
        </div>

        <Select value={range} onValueChange={(v) => { setRange(v as Range); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="suppressed">Suprimido</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={templateFilter} onValueChange={(v) => { setTemplateFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || statusFilter !== "all" || templateFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Data</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Mail className="h-8 w-8" />
                    <p>Nenhum e-mail encontrado neste período.</p>
                    <p className="text-xs">E-mails de recrutamento (rejeição/avanço) ainda saem fora deste gateway — eles aparecem na aba "Recrutamento".</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r: EmailSendLogRow) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">
                    {formatBRT(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.template_name || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.recipient_email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <span className="line-clamp-2">{r.error_message || "-"}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page + 1} de {pageCount} — {filtered.length} e-mails
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
