import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, Mail, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

interface PlatformCommLogsProps {
  channel: "email" | "whatsapp";
  title?: string;
  description?: string;
}

interface CommLog {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string | null;
  status: string;
  provider: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  account_id: string | null;
  candidate_id: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Enviado", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  pending: { label: "Pendente", variant: "secondary" },
  queued: { label: "Na fila", variant: "secondary" },
  read: { label: "Lido", variant: "default" },
};

async function fetchLogs(channel: string, page: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const functionName = channel === "email" ? "platform-admin-email" : "platform-admin-whatsapp";
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}?action=logs&page=${page}&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );

  if (!response.ok) throw new Error("Erro ao buscar logs");
  return response.json();
}

export function PlatformCommLogs({ channel, title, description }: PlatformCommLogsProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-comm-logs", channel, page],
    queryFn: () => fetchLogs(channel, page),
  });

  const logs: CommLog[] = data?.logs || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const defaultTitle = channel === "email" ? "Logs de Disparos de Email" : "Logs de Disparos de WhatsApp";
  const defaultDescription = channel === "email"
    ? "Todos os emails enviados pela plataforma, de todas as contas"
    : "Todas as mensagens WhatsApp enviadas pela plataforma, de todas as contas";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {channel === "email" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {title || defaultTitle}
          </CardTitle>
          <CardDescription className="mt-1">{description || defaultDescription}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum disparo registrado ainda.
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Destinatário</TableHead>
                    {channel === "email" && <TableHead>Assunto</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const statusInfo = STATUS_MAP[log.status] || { label: log.status, variant: "outline" as const };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatBRT(log.created_at, "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-mono max-w-[180px] truncate">
                          {log.recipient}
                        </TableCell>
                        {channel === "email" && (
                          <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">
                            {log.subject || "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.provider || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {total} registros · Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
