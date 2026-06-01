import { useState, useEffect } from 'react';
import { Armchair, Plus, X, Loader2, Building2, Calendar, Clock, Search, Pencil } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEPRole } from '@/hooks/useEPRole';
import { toast } from 'sonner';
import { addMonths } from "date-fns";
import { Navigate } from 'react-router-dom';
import { formatBRT } from "@/lib/datetime";

interface SeatGrant {
  id: string;
  org_id: string;
  free_seats: number;
  valid_until: string;
  created_by: string | null;
  source: string | null;
  created_at: string;
  org_name?: string;
  created_by_name?: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminSeatGrants() {
  const { user, session } = useAuth();
  const { isSuperAdmin, isHeadCS, loading: roleLoading } = useEPRole();
  
  const [grants, setGrants] = useState<SeatGrant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<SeatGrant | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  
  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOrgName, setSelectedOrgName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [validUntil, setValidUntil] = useState(formatBRT(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');

  const canAccess = isSuperAdmin || isHeadCS;

  useEffect(() => {
    if (canAccess) {
      fetchGrants();
      fetchOrganizations();
    }
  }, [canAccess]);

  useEffect(() => {
    if (orgSearch.trim()) {
      const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(orgSearch.toLowerCase())
      );
      setFilteredOrgs(filtered.slice(0, 10));
    } else {
      setFilteredOrgs([]);
    }
  }, [orgSearch, organizations]);

  const fetchGrants = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('org_seat_grants')
        .select(`
          *,
          companies:org_id (name)
        `)
        .gte('valid_until', new Date().toISOString())
        .gt('free_seats', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names separately
      const creatorIds = [...new Set(data?.map(g => g.created_by).filter(Boolean) as string[])];
      let profilesMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', creatorIds);
        profiles?.forEach(p => {
          profilesMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ');
        });
      }

      const processedGrants = data?.map(grant => ({
        ...grant,
        org_name: (grant.companies as any)?.name || 'Org desconhecida',
        created_by_name: grant.created_by ? profilesMap[grant.created_by] || null : null,
      })) || [];

      setGrants(processedGrants);
    } catch (err) {
      console.error('Error fetching seat grants:', err);
      toast.error('Erro ao carregar liberações de assentos');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubmitGrant = async () => {
    if (!user || !session) return;
    
    if (!selectedOrgId) {
      toast.error('Selecione uma organização');
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      toast.error('Informe uma quantidade válida (mínimo 1)');
      return;
    }
    
    if (!validUntil) {
      toast.error('Informe a data de expiração');
      return;
    }

    setIsCreating(true);
    try {
      const isEditing = !!editingGrant;
      const response = await supabase.functions.invoke('grant-org-seats', {
        body: {
          action: isEditing ? 'update' : 'grant',
          org_id: selectedOrgId,
          quantity: qty,
          valid_until: validUntil,
          reason: reason.trim() || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao salvar');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao salvar');
      }

      toast.success(isEditing ? 'Liberação atualizada com sucesso!' : `${qty} assento(s) concedido(s) com sucesso!`);
      setIsDialogOpen(false);
      resetForm();
      fetchGrants();
    } catch (err: any) {
      console.error('Error saving seat grant:', err);
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditGrant = (grant: SeatGrant) => {
    setEditingGrant(grant);
    setSelectedOrgId(grant.org_id);
    setSelectedOrgName(grant.org_name || '');
    setQuantity(String(grant.free_seats));
    setValidUntil(formatBRT(new Date(grant.valid_until), 'yyyy-MM-dd'));
    setReason('');
    setIsDialogOpen(true);
  };

  const handleRevokeGrant = async (grantId: string, orgId: string) => {
    if (!user || !session) return;
    
    try {
      const response = await supabase.functions.invoke('grant-org-seats', {
        body: {
          action: 'revoke',
          org_id: orgId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Liberação revogada');
      fetchGrants();
    } catch (err: any) {
      console.error('Error revoking seat grant:', err);
      toast.error(err.message || 'Erro ao revogar liberação');
    }
  };

  const resetForm = () => {
    setSelectedOrgId('');
    setSelectedOrgName('');
    setOrgSearch('');
    setQuantity('');
    setValidUntil(formatBRT(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    setReason('');
    setEditingGrant(null);
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrgId(org.id);
    setSelectedOrgName(org.name);
    setOrgSearch('');
    setFilteredOrgs([]);
  };

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Liberação de Assentos' }
  ];

  if (roleLoading) {
    return (
      <AppLayout title="Liberação de Assentos" breadcrumb={breadcrumb}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout title="Liberação de Assentos" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Armchair className="h-5 w-5" />
                  Assentos via Grant
                </CardTitle>
                <CardDescription>
                  Conceda assentos temporários para organizações
                </CardDescription>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Conceder Assentos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingGrant ? 'Editar Liberação de Assentos' : 'Conceder Assentos para Organização'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingGrant
                        ? 'Altere a quantidade de assentos e/ou a data de validade'
                        : 'Os assentos serão somados ao limite atual da organização até a data de expiração'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Organização</Label>
                      {selectedOrgId ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{selectedOrgName}</span>
                          {!editingGrant && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedOrgId('');
                                setSelectedOrgName('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar organização..."
                            value={orgSearch}
                            onChange={(e) => setOrgSearch(e.target.value)}
                            className="pl-9"
                          />
                          {filteredOrgs.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                              {filteredOrgs.map((org) => (
                                <button
                                  key={org.id}
                                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                                  onClick={() => handleSelectOrg(org)}
                                >
                                  {org.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Quantidade de Assentos</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 10"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Válido até</Label>
                      <Input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo (opcional)</Label>
                      <Textarea
                        placeholder="Descreva o motivo da liberação..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitGrant} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingGrant ? 'Salvando...' : 'Concedendo...'}
                        </>
                      ) : (
                        editingGrant ? 'Salvar Alterações' : 'Conceder Assentos'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma liberação de assentos ativa
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead className="text-center">Assentos</TableHead>
                    <TableHead>Válido até</TableHead>
                    <TableHead>Origem</TableHead>
                     <TableHead>Criado em</TableHead>
                     <TableHead>Liberado por</TableHead>
                     <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((grant) => {
                    const isExpiringSoon = new Date(grant.valid_until) < addMonths(new Date(), 1);
                    
                    return (
                      <TableRow key={grant.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{grant.org_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            +{grant.free_seats}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-sm ${isExpiringSoon ? 'text-amber-600' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            {formatBRT(new Date(grant.valid_until), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {grant.source || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatBRT(new Date(grant.created_at), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                         <TableCell className="text-sm text-muted-foreground">
                           {grant.created_by_name || '—'}
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-1">
                             <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGrant(grant)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevokeGrant(grant.id, grant.org_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
