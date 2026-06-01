// Wrapper for the existing PendingInvites page functionality
// Uses the ConsultoriaLayout instead of AppLayout

import { useState, useEffect, useCallback } from 'react';
import { Mail, Send, Loader2, Building2, Search, Filter, CheckSquare, Square, RefreshCw, AlertCircle, Armchair } from 'lucide-react';
import { ConsultoriaLayout } from '@/components/consultoria';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEPRole } from '@/hooks/useEPRole';
import { toast } from 'sonner';

import { Navigate, useNavigate } from 'react-router-dom';
import { formatBRT } from "@/lib/datetime";

interface PendingInvite {
  id: string;
  email: string;
  status: string;
  role: string;
  created_at: string;
  org_id: string;
  org_name: string;
  seat_summary: {
    total: number;
    used: number;
    pending: number;
    available: number;
  };
}

interface Organization {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'awaiting_payment', label: 'Aguardando pagamento' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid_ready_to_send', label: 'Pago - Pronto para enviar' },
  { value: 'sent', label: 'Enviado' },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  awaiting_payment: { label: 'Aguardando Pgto', variant: 'secondary' },
  pending: { label: 'Pendente', variant: 'outline' },
  paid_ready_to_send: { label: 'Pronto', variant: 'default' },
  sent: { label: 'Enviado', variant: 'default' },
};

export default function ConsultoriaConvites() {
  const { session } = useAuth();
  const { isSuperAdmin, isHeadCS, loading: roleLoading } = useEPRole();
  const navigate = useNavigate();
  
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReleasing, setIsReleasing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [releaseResult, setReleaseResult] = useState<{ sent: string[]; skipped: Array<{ id: string; reason: string }> } | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  // Filters
  const [orgFilter, setOrgFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [onlyOverLimit, setOnlyOverLimit] = useState(false);

  const canAccess = isSuperAdmin || isHeadCS;

  const fetchInvites = useCallback(async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      
      const response = await supabase.functions.invoke('admin-list-pending-invites', {
        body: {
          org_id: orgFilter !== 'all' ? orgFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search_email: emailSearch.trim() || undefined,
          only_over_limit: onlyOverLimit,
          limit: 100,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setInvites(response.data?.invites || []);
    } catch (err: any) {
      console.error('Error fetching pending invites:', err);
      toast.error('Erro ao carregar convites pendentes');
    } finally {
      setIsLoading(false);
    }
  }, [session, orgFilter, statusFilter, emailSearch, onlyOverLimit]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  useEffect(() => {
    if (canAccess) {
      fetchOrganizations();
    }
  }, [canAccess]);

  useEffect(() => {
    if (canAccess) {
      const debounce = setTimeout(() => {
        fetchInvites();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [canAccess, fetchInvites]);

  const handleSelectAll = () => {
    if (selectedIds.size === invites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invites.map(inv => inv.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleReleaseBulk = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos um convite');
      return;
    }

    setIsReleasing(true);
    try {
      const response = await supabase.functions.invoke('admin-release-invites-bulk', {
        body: {
          invite_ids: Array.from(selectedIds),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      setReleaseResult(result);
      setShowResultDialog(true);
      
      if (result.sent?.length > 0) {
        toast.success(`${result.sent.length} convite(s) enviado(s)!`);
      }
      
      setSelectedIds(new Set());
      fetchInvites();
    } catch (err: any) {
      console.error('Error releasing invites:', err);
      toast.error(err.message || 'Erro ao liberar convites');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleGoToSeatGrants = () => {
    const selectedInvites = invites.filter(inv => selectedIds.has(inv.id));
    const overLimitOrgs = selectedInvites.filter(inv => inv.seat_summary.available <= 0);
    
    if (overLimitOrgs.length > 0) {
      const firstOrg = overLimitOrgs[0];
      navigate(`/admin/seat-grants?org=${firstOrg.org_id}&name=${encodeURIComponent(firstOrg.org_name)}`);
    } else {
      navigate('/admin/seat-grants');
    }
  };

  if (roleLoading) {
    return (
      <ConsultoriaLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ConsultoriaLayout>
    );
  }

  if (!canAccess) {
    return <Navigate to="/consultoria" replace />;
  }

  const selectedOverLimit = invites.filter(
    inv => selectedIds.has(inv.id) && inv.seat_summary.available <= 0
  );

  return (
    <ConsultoriaLayout>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Liberação em Massa de Convites
                </CardTitle>
                <CardDescription>
                  Visualize e libere convites pendentes de todas as organizações
                </CardDescription>
              </div>
              <Button variant="outline" onClick={fetchInvites} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Organização
                </Label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as organizações</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  placeholder="Buscar por email..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">&nbsp;</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="overLimit"
                    checked={onlyOverLimit}
                    onCheckedChange={(checked) => setOnlyOverLimit(checked === true)}
                  />
                  <label htmlFor="overLimit" className="text-sm cursor-pointer">
                    Apenas sem assentos
                  </label>
                </div>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedIds.size} selecionado(s)
                </span>
                <Button 
                  size="sm" 
                  onClick={handleReleaseBulk}
                  disabled={isReleasing}
                >
                  {isReleasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Liberar Selecionados
                    </>
                  )}
                </Button>
                {selectedOverLimit.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleGoToSeatGrants}>
                    <Armchair className="mr-2 h-4 w-4" />
                    Conceder Assentos
                  </Button>
                )}
              </div>
            )}

            {/* Warning for over-limit selection */}
            {selectedOverLimit.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedOverLimit.length} convite(s) selecionado(s) pertencem a organizações sem assentos disponíveis.
                  Conceda assentos antes de liberar esses convites.
                </AlertDescription>
              </Alert>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum convite pendente encontrado
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center"
                        >
                          {selectedIds.size === invites.length ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Assentos</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const isOverLimit = invite.seat_summary.available <= 0;
                      const statusInfo = STATUS_LABELS[invite.status] || { label: invite.status, variant: 'outline' as const };
                      
                      return (
                        <TableRow 
                          key={invite.id}
                          className={isOverLimit ? 'bg-destructive/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(invite.id)}
                              onCheckedChange={() => handleSelectOne(invite.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {invite.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {invite.org_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">
                            {invite.role}
                          </TableCell>
                          <TableCell>
                            <div className={`text-sm ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {invite.seat_summary.available}/{invite.seat_summary.total}
                              {isOverLimit && (
                                <span className="ml-1 text-xs">(sem vagas)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatBRT(new Date(invite.created_at), 'dd/MM/yy HH:mm')}
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

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado da Liberação</DialogTitle>
            <DialogDescription>
              Veja o resultado do envio dos convites
            </DialogDescription>
          </DialogHeader>
          
          {releaseResult && (
            <div className="space-y-4 py-4">
              {releaseResult.sent.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviados ({releaseResult.sent.length})
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {releaseResult.sent.length} convite(s) foram enviados com sucesso.
                  </p>
                </div>
              )}
              
              {releaseResult.skipped.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Ignorados ({releaseResult.skipped.length})
                  </h4>
                  <ul className="text-sm space-y-1">
                    {releaseResult.skipped.map((skip, i) => (
                      <li key={i} className="text-muted-foreground">
                        • {skip.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsultoriaLayout>
  );
}
