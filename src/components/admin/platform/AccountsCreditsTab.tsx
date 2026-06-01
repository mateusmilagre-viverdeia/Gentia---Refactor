import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Search, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { differenceInDays } from "date-fns";
import { formatBRT } from '@/lib/datetime';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import { AccountDetailModal } from './AccountDetailModal';

interface AccountRow {
  id: string;
  name: string;
  created_at: string | null;
  billing_status: string;
  stripe_status: string | null;
  has_grant: boolean;
  hunting: number;
  enrichment: number;
  ai_interview: number;
  grant_expires_at: string | null;
  outreach: number;
  marketplace: number;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }> = {
  active: { label: 'Ativo', variant: 'success' },
  trialing: { label: 'Trial', variant: 'info' },
  past_due: { label: 'Inadimplente', variant: 'warning' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'secondary' },
  pending: { label: 'Pendente', variant: 'outline' },
  unpaid: { label: 'Não pago', variant: 'destructive' },
  incomplete: { label: 'Incompleto', variant: 'warning' },
};

export function AccountsCreditsTab() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await invokeAuthenticatedFunction<{ accounts: AccountRow[] }>('platform-admin-stripe', {
        action: 'list-accounts-billing',
      });
      if (error) throw new Error(error);
      const rows = (data?.accounts || []).sort((a, b) => a.name.localeCompare(b.name));
      setAccounts(rows);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingCount = accounts.filter(a => a.billing_status === 'pending').length;

  const filtered = accounts.filter(a => {
    if (statusFilter !== 'all' && a.billing_status !== statusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Contas & Créditos</CardTitle>
                {pendingCount > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <CardDescription>Visão geral de todas as empresas, planos e saldos de créditos.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending alert banner */}
          {pendingCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                <strong>{pendingCount}</strong> empresa{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} — sem plano ou pagamento registrado. Clique na linha para mais detalhes.
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Inadimplente</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">{filtered.length} empresa(s)</div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="w-[100px]">Cadastro</TableHead>
                      <TableHead className="w-[130px]">Plano</TableHead>
                      <TableHead className="w-[130px]">Acesso</TableHead>
                      <TableHead className="text-center w-[80px]">Hunting</TableHead>
                      <TableHead className="text-center w-[90px]">Enrichment</TableHead>
                      <TableHead className="text-center w-[100px]">AI Interview</TableHead>
                      <TableHead className="text-center w-[80px]">Outreach</TableHead>
                      <TableHead className="text-center w-[95px]">Marketplace</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhuma empresa encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(a => {
                        const st = STATUS_MAP[a.billing_status] || STATUS_MAP.pending;
                        const isPending = a.billing_status === 'pending';
                        return (
                          <TableRow
                            key={a.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedOrg({ id: a.id, name: a.name })}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isPending && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                {a.has_grant && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                                <span>{a.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatBRT(a.created_at, 'dd/MM/yy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {a.has_grant ? (
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="purple">Grant</Badge>
                                  {a.grant_expires_at && (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      expira em {differenceInDays(new Date(a.grant_expires_at), new Date())}d
                                    </span>
                                  )}
                                </div>
                              ) : a.billing_status === 'blocked' ? (
                                <Badge variant="destructive">Restrito</Badge>
                              ) : (
                                <Badge variant="success">Ativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{Number(a.hunting).toFixed(1)}</TableCell>
                            <TableCell className="text-center tabular-nums">{Number(a.enrichment).toFixed(1)}</TableCell>
                            <TableCell className="text-center tabular-nums">{Number(a.ai_interview).toFixed(1)}</TableCell>
                            <TableCell className="text-center tabular-nums">{Number(a.outreach).toFixed(1)}</TableCell>
                            <TableCell className="text-center tabular-nums">{Number(a.marketplace).toFixed(1)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AccountDetailModal
        orgId={selectedOrg?.id || null}
        orgName={selectedOrg?.name || ''}
        open={!!selectedOrg}
        onOpenChange={(open) => { if (!open) setSelectedOrg(null); }}
        onActionComplete={fetchData}
      />
    </>
  );
}
