import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldOff, ShieldCheck, AlertTriangle, ExternalLink, FileText, Users, Calendar, Building2 } from 'lucide-react';
import { formatBRT } from '@/lib/datetime';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import { toast } from 'sonner';

interface AccountDetailModalProps {
  orgId: string | null;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
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

export function AccountDetailModal({ orgId, orgName, open, onOpenChange, onActionComplete }: AccountDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [grantDays, setGrantDays] = useState('7');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && orgId) {
      loadDetails();
    } else {
      setDetails(null);
    }
  }, [open, orgId]);

  const loadDetails = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
        action: 'get-account-details',
        org_id: orgId,
      });
      if (error) throw new Error(error);
      setDetails(data);
    } catch (err: any) {
      toast.error('Erro ao carregar detalhes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!orgId) return;
    setActionLoading(true);
    try {
      const { error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
        action: 'block-account',
        org_id: orgId,
      });
      if (error) throw new Error(error);
      toast.success('Acesso restrito com sucesso');
      setBlockDialogOpen(false);
      onActionComplete();
      loadDetails();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!orgId) return;
    setActionLoading(true);
    try {
      const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
        action: 'reactivate-account',
        org_id: orgId,
        grant_days: isCompliant ? undefined : Number(grantDays),
      });
      if (error) throw new Error(error);
      const d = data as any;
      if (d.method === 'direct') {
        toast.success('Acesso reativado com sucesso');
      } else {
        toast.success(`Acesso temporário concedido por ${d.days} dias (até ${formatBRT(d.expires_at, 'dd/MM/yyyy')})`);
      }
      setReactivateDialogOpen(false);
      onActionComplete();
      loadDetails();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const effectiveStatus = details?.stripe_status || details?.billing?.status || 'pending';
  const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending;
  const isBlocked = effectiveStatus === 'blocked';
  const isCompliant = ['active', 'trialing'].includes(details?.stripe_status || '');

  // Merge invoices from stripe and DB, deduplicate by stripe_invoice_id
  const allInvoices = (() => {
    if (!details) return [];
    const dbMap = new Map<string, any>();
    (details.db_invoices || []).forEach((inv: any) => {
      if (inv.stripe_invoice_id) dbMap.set(inv.stripe_invoice_id, inv);
    });

    const merged: any[] = [];
    (details.stripe_invoices || []).forEach((inv: any) => {
      const dbInv = dbMap.get(inv.id);
      merged.push({
        id: inv.id,
        date: new Date(inv.created * 1000),
        amount: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        description: inv.description || dbInv?.description,
        invoice_url: inv.hosted_invoice_url,
        pdf_url: inv.invoice_pdf,
      });
      dbMap.delete(inv.id);
    });

    // Add DB-only invoices
    dbMap.forEach((inv) => {
      merged.push({
        id: inv.id,
        date: new Date(inv.created_at),
        amount: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        currency: inv.currency || 'brl',
        status: inv.status,
        description: inv.description,
        invoice_url: inv.hosted_invoice_url,
        pdf_url: inv.invoice_pdf,
      });
    });

    // Also add remaining DB invoices without stripe_invoice_id
    (details.db_invoices || []).filter((inv: any) => !inv.stripe_invoice_id).forEach((inv: any) => {
      merged.push({
        id: inv.id,
        date: new Date(inv.created_at),
        amount: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        currency: inv.currency || 'brl',
        status: inv.status,
        description: inv.description,
        invoice_url: inv.hosted_invoice_url,
        pdf_url: inv.invoice_pdf,
      });
    });

    merged.sort((a, b) => b.date.getTime() - a.date.getTime());
    return merged;
  })();

  const activeGrants = (details?.grants || []).filter((g: any) => g.is_active);

  const invoiceStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
    paid: { label: 'Pago', variant: 'success' },
    open: { label: 'Aberto', variant: 'warning' },
    void: { label: 'Cancelado', variant: 'secondary' },
    uncollectible: { label: 'Irrecuperável', variant: 'destructive' },
    draft: { label: 'Rascunho', variant: 'outline' },
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {orgName}
            </DialogTitle>
            <DialogDescription>
              Detalhes da empresa, histórico de pagamentos e ações administrativas.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Company Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={st.variant} className="mt-1">{st.label}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Membros ativos</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{details.members_count}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {formatBRT(details.company?.created_at, 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <span className="text-sm mt-1 block">{details.company?.cnpj || '—'}</span>
                </div>
              </div>

              {/* Active Grants */}
              {activeGrants.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      Grants Ativos ({activeGrants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2">
                    {activeGrants.map((g: any) => (
                      <div key={g.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{g.reason}</span>
                        <span className="text-xs font-medium">
                          até {formatBRT(g.expires_at, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {!isBlocked ? (
                  <Button variant="destructive" size="sm" onClick={() => setBlockDialogOpen(true)}>
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Restringir Acesso
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={() => setReactivateDialogOpen(true)}>
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Reativar Acesso
                  </Button>
                )}
              </div>

              {/* Payment History */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Histórico de Pagamentos ({allInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {allInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum pagamento registrado.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allInvoices.map((inv: any) => {
                            const invSt = invoiceStatusMap[inv.status] || { label: inv.status, variant: 'outline' as const };
                            return (
                              <TableRow key={inv.id}>
                                <TableCell className="text-xs">{formatBRT(inv.date, 'dd/MM/yy')}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">{inv.description || '—'}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-medium">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: inv.currency?.toUpperCase() || 'BRL' }).format(inv.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={invSt.variant} className="text-[9px]">{invSt.label}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {inv.invoice_url && (
                                      <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </a>
                                    )}
                                    {inv.pdf_url && (
                                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </a>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Block Confirmation */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restringir Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja restringir o acesso da empresa <strong>{orgName}</strong>? Os usuários não poderão acessar a plataforma até a reativação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Restringir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Acesso</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {isCompliant ? (
                  <p>A empresa <strong>{orgName}</strong> está adimplente no Stripe. O acesso será reativado imediatamente.</p>
                ) : (
                  <>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        A empresa <strong>{orgName}</strong> <strong>não está adimplente</strong>. Para reativar, informe por quantos dias deseja conceder acesso temporário. Após esse período, o acesso será restrito novamente automaticamente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">Dias de acesso:</span>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={grantDays}
                        onChange={e => setGrantDays(e.target.value)}
                        className="w-24"
                      />
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isCompliant ? 'Reativar' : `Conceder ${grantDays} dias`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
