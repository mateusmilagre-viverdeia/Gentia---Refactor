import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import {
  DeliveriesPeriod,
  PulseNotificationDelivery,
  PulseNotificationDeliveryStatus,
  usePulseNotificationDeliveries,
} from '@/hooks/usePulseNotificationDeliveries';
import type { PulseNotificationChannel } from '@/hooks/usePulseNotificationChannels';

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function statusBadgeVariant(status: PulseNotificationDeliveryStatus) {
  return status === 'success' ? 'default' : 'destructive';
}

function truncateText(value: string | null, max = 140) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function PulseNotificationMetricsPanel({
  accountId,
  channels,
}: {
  accountId: string | null;
  channels: PulseNotificationChannel[];
}) {
  const [period, setPeriod] = useState<DeliveriesPeriod>('30d');
  const [status, setStatus] = useState<PulseNotificationDeliveryStatus | 'all'>('all');
  const [channelId, setChannelId] = useState<string | 'all'>('all');
  const [details, setDetails] = useState<PulseNotificationDelivery | null>(null);

  const deliveriesHook = usePulseNotificationDeliveries(accountId);

  useEffect(() => {
    if (!accountId) return;
    deliveriesHook.fetchDeliveries({ period, status, channelId, limit: 80 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, period, status, channelId]);

  const byChannelTypeRows = useMemo(() => {
    const entries = Object.entries(deliveriesHook.metrics.byChannelType);
    return entries
      .map(([channel_type, v]) => {
        const ok = v.total - v.failed;
        const rate = v.total > 0 ? Math.round((ok / v.total) * 1000) / 10 : 0;
        return { channel_type, total: v.total, failed: v.failed, rate };
      })
      .sort((a, b) => b.total - a.total);
  }, [deliveriesHook.metrics.byChannelType]);

  const lastSuccess = useMemo(() => {
    return deliveriesHook.deliveries.find((d) => d.status === 'success') || null;
  }, [deliveriesHook.deliveries]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Métricas e Logs de Notificação
            </CardTitle>
            <CardDescription>
              Últimos envios do Pulse ({period === '7d' ? '7 dias' : '30 dias'}). Visível para Owner e Admin RH.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => deliveriesHook.fetchDeliveries({ period, status, channelId, limit: 80 })}
            disabled={deliveriesHook.loading}
            aria-label="Recarregar logs"
          >
            <RefreshCw className={deliveriesHook.loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">Total de envios</div>
            <div className="mt-1 text-2xl font-semibold">{deliveriesHook.metrics.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">Falhas</div>
            <div className="mt-1 text-2xl font-semibold">{deliveriesHook.metrics.failed}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">Taxa de entrega</div>
            <div className="mt-1 text-2xl font-semibold">{deliveriesHook.metrics.deliveryRate}%</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">Último sucesso</div>
            <div className="mt-1 text-sm font-medium">{lastSuccess ? formatDateTime(lastSuccess.created_at) : '—'}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="text-sm font-medium">Taxa por canal</div>
              <Badge variant="secondary">{period}</Badge>
            </div>
            <div className="p-4">
              {byChannelTypeRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem dados no período.</div>
              ) : (
                <div className="space-y-2">
                  {byChannelTypeRows.map((row) => (
                    <div key={row.channel_type} className="flex items-center justify-between">
                      <div className="text-sm">{row.channel_type}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{row.total} envios</span>
                        <Badge variant={row.failed > 0 ? 'destructive' : 'default'}>
                          {row.rate}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Erros recentes
              </div>
              <Badge variant="secondary">top 5</Badge>
            </div>
            <div className="p-4">
              {deliveriesHook.metrics.recentErrors.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma falha recente.</div>
              ) : (
                <div className="space-y-3">
                  {deliveriesHook.metrics.recentErrors.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDetails(d)}
                      className="w-full rounded-md border bg-background p-3 text-left hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{d.channel_name || d.channel_type}</div>
                        <span className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {truncateText(d.error_message || d.response_body, 160) || 'Falha sem mensagem'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as DeliveriesPeriod)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={channelId} onValueChange={(v) => setChannelId(v as any)}>
            <SelectTrigger className="min-w-[220px]">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <div className="text-sm font-medium">Últimos envios</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Clique em uma linha para ver payload e resposta.
            </div>
          </div>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveriesHook.deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Nenhum envio encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveriesHook.deliveries.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => setDetails(d)}
                    >
                      <TableCell className="whitespace-nowrap">{formatDateTime(d.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.event}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.channel_name || d.channel_type}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(d.status)}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{d.http_status ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes do envio</DialogTitle>
              <DialogDescription>
                {details ? `${details.event} • ${details.channel_name || details.channel_type} • ${formatDateTime(details.created_at)}` : ''}
              </DialogDescription>
            </DialogHeader>

            {details && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusBadgeVariant(details.status)}>{details.status}</Badge>
                  <Badge variant="secondary">HTTP {details.http_status ?? '—'}</Badge>
                  <Badge variant="secondary">{details.duration_ms ? `${details.duration_ms}ms` : '—'}</Badge>
                </div>

                {details.error_message ? (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs font-medium">Erro</div>
                    <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{details.error_message}</div>
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs font-medium">Payload</div>
                    <pre className="mt-2 max-h-[320px] overflow-auto text-xs">
{JSON.stringify(details.payload ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs font-medium">Resposta</div>
                    <pre className="mt-2 max-h-[320px] overflow-auto text-xs whitespace-pre-wrap">
{details.response_body || ''}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
