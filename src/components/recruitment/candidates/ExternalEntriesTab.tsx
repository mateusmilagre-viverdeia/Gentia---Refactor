import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useExternalEntries, type ExternalEntry } from "@/hooks/useExternalEntries";
import { Inbox, MessageSquare, Mail, RefreshCw, FileText, ExternalLink, AlertCircle } from "lucide-react";

import { Link } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  processing: { label: "Processando", variant: "outline" },
  completed: { label: "Processado", variant: "default" },
  duplicate: { label: "Duplicado", variant: "outline" },
  failed: { label: "Falhou", variant: "destructive" },
  ignored: { label: "Ignorado", variant: "secondary" },
};

export function ExternalEntriesTab() {
  const [filters, setFilters] = useState<{ channel?: any; status?: string; search?: string }>({});
  const [selected, setSelected] = useState<ExternalEntry | null>(null);
  const { entries, isLoading, metrics, reprocess, isReprocessing } = useExternalEntries(filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard icon={Inbox} label="Total" value={metrics.total} />
        <MetricCard icon={MessageSquare} label="WhatsApp" value={metrics.whatsapp} />
        <MetricCard icon={Mail} label="E-mail" value={metrics.email} />
        <MetricCard icon={RefreshCw} label="Pendentes" value={metrics.pending} />
        <MetricCard icon={AlertCircle} label="Falharam" value={metrics.failed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="h-5 w-5" />
            Entradas Externas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              placeholder="Buscar remetente…"
              className="max-w-xs"
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Select value={filters.channel || "all"} onValueChange={(v) => setFilters({ ...filters, channel: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canais</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma entrada externa ainda.</p>
              <p className="text-xs mt-1">Configure os canais em Configurações → Canais de Entrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Remetente</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                    <TableCell>
                      {entry.channel === "whatsapp" ? (
                        <MessageSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.sender_name || entry.sender}</div>
                      {entry.sender_name && <div className="text-xs text-muted-foreground">{entry.sender}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBRT(new Date(entry.received_at), "dd/MM HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[entry.processing_status]?.variant || "secondary"}>
                        {STATUS_CONFIG[entry.processing_status]?.label || entry.processing_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {entry.processing_status === "failed" && (
                        <Button size="sm" variant="ghost" onClick={() => reprocess(entry.id)} disabled={isReprocessing}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      {entry.candidate_id && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/recruitment/candidates/${entry.candidate_id}`}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.channel === "whatsapp" ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  {selected.sender_name || selected.sender}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <DetailRow label="Remetente" value={selected.sender} />
                {selected.subject && <DetailRow label="Assunto" value={selected.subject} />}
                <DetailRow label="Recebido em" value={formatBRT(new Date(selected.received_at), "dd/MM/yyyy HH:mm")} />
                <DetailRow label="Status" value={STATUS_CONFIG[selected.processing_status]?.label || selected.processing_status} />

                {selected.file_name && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Anexo</div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selected.file_name}</span>
                    </div>
                  </div>
                )}

                {selected.raw_content && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Conteúdo</div>
                    <div className="text-sm p-3 bg-muted rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {selected.raw_content.slice(0, 1000)}
                    </div>
                  </div>
                )}

                {selected.extracted_data && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Dados extraídos</div>
                    <pre className="text-xs p-3 bg-muted rounded overflow-x-auto">
                      {JSON.stringify(selected.extracted_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.error_message && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                    {selected.error_message}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {selected.processing_status === "failed" && (
                    <Button onClick={() => reprocess(selected.id)} disabled={isReprocessing}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reprocessar
                    </Button>
                  )}
                  {selected.candidate_id && (
                    <Button variant="outline" asChild>
                      <Link to={`/recruitment/candidates/${selected.candidate_id}`}>
                        Ver candidato
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
