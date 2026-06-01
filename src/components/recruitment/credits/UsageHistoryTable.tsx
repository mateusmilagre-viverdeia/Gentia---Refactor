import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  History, ArrowDownCircle, ArrowUpCircle, Gift, RotateCcw, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatBRT } from '@/lib/datetime';

interface UsageLogEntry {
  id: string;
  credit_type: string;
  operation: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

interface UsageHistoryTableProps {
  creditType?: string;
  limit?: number;
}

interface SessionInfo {
  candidate_id: string | null;
  duration_seconds: number | null;
}

interface CandidateInfo {
  name: string | null;
  email: string | null;
}

const OPERATION_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  consume: { label: 'Consumo', icon: ArrowDownCircle, variant: 'destructive' },
  purchase: { label: 'Compra', icon: ArrowUpCircle, variant: 'default' },
  bonus: { label: 'Bônus', icon: Gift, variant: 'secondary' },
  refund: { label: 'Reembolso', icon: RotateCcw, variant: 'outline' },
  monthly_reset: { label: 'Reset Mensal', icon: RefreshCw, variant: 'outline' },
};

const isCultureRef = (t: string | null) => !!t && t.startsWith('culture_interview');
const isTechRef = (t: string | null) => !!t && t.startsWith('technical_interview');

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}min ${s}s`;
}

export function UsageHistoryTable({ limit = 20 }: UsageHistoryTableProps) {
  const { currentOrganization } = useOrganization();
  const [logs, setLogs] = useState<UsageLogEntry[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});
  const [candidates, setCandidates] = useState<Record<string, CandidateInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      if (!currentOrganization?.id) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('recruitment_usage_log')
          .select('*')
          .eq('account_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .range(page * limit, (page + 1) * limit);

        if (error) throw error;

        const pageLogs = ((data as UsageLogEntry[]) || []).slice(0, limit);
        setLogs(pageLogs);
        setHasMore((data?.length || 0) > limit);

        // Coletar reference_ids por tipo
        const cultureIds = pageLogs
          .filter(l => isCultureRef(l.reference_type) && l.reference_id)
          .map(l => l.reference_id as string);
        const techIds = pageLogs
          .filter(l => isTechRef(l.reference_type) && l.reference_id)
          .map(l => l.reference_id as string);

        const [cultureRes, techRes] = await Promise.all([
          cultureIds.length
            ? supabase
                .from('culture_interview_sessions')
                .select('id, candidate_id, duration_seconds')
                .in('id', cultureIds)
            : Promise.resolve({ data: [] as any[], error: null }),
          techIds.length
            ? supabase
                .from('technical_interview_sessions')
                .select('id, candidate_id, duration_seconds')
                .in('id', techIds)
            : Promise.resolve({ data: [] as any[], error: null }),
        ]);

        const sessMap: Record<string, SessionInfo> = {};
        for (const row of (cultureRes.data || []) as any[]) {
          sessMap[row.id] = { candidate_id: row.candidate_id, duration_seconds: row.duration_seconds };
        }
        for (const row of (techRes.data || []) as any[]) {
          sessMap[row.id] = { candidate_id: row.candidate_id, duration_seconds: row.duration_seconds };
        }
        setSessions(sessMap);

        const candIds = Array.from(
          new Set(Object.values(sessMap).map(s => s.candidate_id).filter(Boolean) as string[])
        );
        if (candIds.length) {
          const { data: candData } = await supabase
            .from('recruitment_candidates')
            .select('id, first_name, last_name, email')
            .in('id', candIds);
          const candMap: Record<string, CandidateInfo> = {};
          for (const c of (candData || []) as any[]) {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || null;
            candMap[c.id] = { name, email: c.email };
          }
          setCandidates(candMap);
        } else {
          setCandidates({});
        }

      } catch (err) {
        console.error('Error fetching usage logs:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [currentOrganization?.id, page, limit]);

  const formatDate = (dateStr: string) => formatBRT(dateStr, "dd MMM yyyy 'às' HH:mm");

  const cleanDescription = (desc: string | null) =>
    desc?.replace(/\s*\(R\$[^)]*\)\s*$/i, '').trim() || null;

  const getRowExtras = (log: UsageLogEntry) => {
    if (!log.reference_id) return { candidate: null as CandidateInfo | null, duration: null as number | null };
    const sess = sessions[log.reference_id];
    if (!sess) return { candidate: null, duration: null };
    const cand = sess.candidate_id ? candidates[sess.candidate_id] || null : null;
    return { candidate: cand, duration: sess.duration_seconds };
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro de uso encontrado</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">Duração real</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Tempo de áudio realmente processado pela OpenAI (não inclui ociosidade nem watchdog).
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const opInfo = OPERATION_INFO[log.operation] || {
                        label: log.operation,
                        icon: History,
                        variant: 'outline' as const,
                      };
                      const OpIcon = opInfo.icon;
                      const { candidate, duration } = getRowExtras(log);

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <OpIcon className="h-4 w-4" />
                              <Badge variant={opInfo.variant} className="text-xs">
                                {opInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={log.operation === 'consume' ? 'text-red-500' : 'text-green-500'}>
                              {log.operation === 'consume' ? '-' : '+'}{Number(log.amount).toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {Number(log.balance_after).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {candidate ? (
                              candidate.email ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{candidate.name || '—'}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{candidate.email}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span>{candidate.name || '—'}</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDuration(duration)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {cleanDescription(log.description) || log.reference_type || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page + 1}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
