import { useState, useEffect } from 'react';
import { Shield, Plus, X, Loader2, Building2, User, Calendar, Clock, Pencil } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEPRole } from '@/hooks/useEPRole';
import { toast } from 'sonner';

import { Navigate } from 'react-router-dom';
import { formatBRT } from "@/lib/datetime";

interface Grant {
  id: string;
  org_id: string | null;
  user_id: string | null;
  reason: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  revoked_at: string | null;
  org_name?: string;
  user_email?: string;
  created_by_email?: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminGrants() {
  const { user } = useAuth();
  const { isSuperAdmin, isHeadCS, loading: roleLoading } = useEPRole();
  
  const [grants, setGrants] = useState<Grant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  
  // Form state
  const [grantType, setGrantType] = useState<'org' | 'user'>('org');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const isEditMode = editingGrant !== null;

  const canAccess = isSuperAdmin || isHeadCS;
  const isLoadingAccess = roleLoading;

  useEffect(() => {
    if (canAccess) {
      fetchGrants();
      fetchOrganizations();
    }
  }, [canAccess]);

  const fetchGrants = async () => {
    try {
      setIsLoading(true);
      
      // Fetch grants with org names
      const { data: grantsData, error } = await supabase
        .from('admin_grants')
        .select(`
          *,
          companies:org_id (name)
        `)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedGrants = grantsData?.map(grant => ({
        ...grant,
        org_name: grant.companies?.name || null,
      })) || [];

      setGrants(processedGrants);
    } catch (err) {
      console.error('Error fetching grants:', err);
      toast.error('Erro ao carregar liberações');
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
    if (!user) return;
    
    if (!reason.trim()) {
      toast.error('Informe o motivo da liberação');
      return;
    }
    
    if (!expiresAt) {
      toast.error('Informe a data de expiração');
      return;
    }

    // ===== Edit mode =====
    if (isEditMode && editingGrant) {
      setIsCreating(true);
      try {
        const { error } = await supabase
          .from('admin_grants')
          .update({
            reason: reason.trim(),
            expires_at: new Date(expiresAt).toISOString(),
          })
          .eq('id', editingGrant.id);

        if (error) throw error;

        await supabase.from('billing_events').insert({
          org_id: editingGrant.org_id,
          event_type: 'grant_updated',
          payload: {
            updated_by: user.id,
            grant_id: editingGrant.id,
            new_reason: reason.trim(),
            new_expires_at: expiresAt,
            old_reason: editingGrant.reason,
            old_expires_at: editingGrant.expires_at,
          },
        });

        toast.success('Liberação atualizada');
        setIsDialogOpen(false);
        resetForm();
        fetchGrants();
      } catch (err) {
        console.error('Error updating grant:', err);
        toast.error('Erro ao atualizar liberação');
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // ===== Create mode =====
    if (grantType === 'org' && !selectedOrgId) {
      toast.error('Selecione uma organização');
      return;
    }

    if (grantType === 'user' && !userEmail.trim()) {
      toast.error('Informe o email do usuário');
      return;
    }

    setIsCreating(true);
    try {
      let userId = null;
      
      if (grantType === 'user') {
        // Find user by email using profiles or auth
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail.toLowerCase())
          .maybeSingle();

        if (profileError) throw profileError;
        
        if (!profiles) {
          toast.error('Usuário não encontrado');
          return;
        }
        
        userId = profiles.id;
      }

      const { error } = await supabase
        .from('admin_grants')
        .insert({
          org_id: grantType === 'org' ? selectedOrgId : null,
          user_id: userId,
          reason: reason.trim(),
          expires_at: new Date(expiresAt).toISOString(),
          created_by: user.id,
        });

      if (error) throw error;

      // Log billing event
      await supabase.from('billing_events').insert({
        org_id: grantType === 'org' ? selectedOrgId : null,
        event_type: 'grant_created',
        payload: {
          created_by: user.id,
          reason: reason.trim(),
          expires_at: expiresAt,
          target_type: grantType,
          target_id: grantType === 'org' ? selectedOrgId : userId,
        },
      });

      toast.success('Liberação criada com sucesso');
      setIsDialogOpen(false);
      resetForm();
      fetchGrants();
    } catch (err) {
      console.error('Error creating grant:', err);
      toast.error('Erro ao criar liberação');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (grant: Grant) => {
    setEditingGrant(grant);
    setGrantType(grant.org_id ? 'org' : 'user');
    setSelectedOrgId(grant.org_id || '');
    setUserEmail(grant.user_email || '');
    setReason(grant.reason);
    // Convert ISO to yyyy-MM-dd for date input
    setExpiresAt(new Date(grant.expires_at).toISOString().split('T')[0]);
    setIsDialogOpen(true);
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('admin_grants')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', grantId);

      if (error) throw error;

      // Log billing event
      const grant = grants.find(g => g.id === grantId);
      await supabase.from('billing_events').insert({
        org_id: grant?.org_id,
        event_type: 'grant_revoked',
        payload: {
          revoked_by: user.id,
          grant_id: grantId,
        },
      });

      toast.success('Liberação revogada');
      fetchGrants();
    } catch (err) {
      console.error('Error revoking grant:', err);
      toast.error('Erro ao revogar liberação');
    }
  };

  const resetForm = () => {
    setEditingGrant(null);
    setGrantType('org');
    setSelectedOrgId('');
    setUserEmail('');
    setReason('');
    setExpiresAt('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Liberações' }
  ];

  if (isLoadingAccess) {
    return (
      <AppLayout title="Liberações de Acesso" breadcrumb={breadcrumb}>
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
    <AppLayout title="Liberações de Acesso" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Liberações Manuais
                </CardTitle>
                <CardDescription>
                  Conceda acesso temporário a organizações ou usuários
                </CardDescription>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Liberação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isEditMode ? 'Editar Liberação de Acesso' : 'Criar Liberação de Acesso'}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditMode
                        ? 'Atualize a data de expiração e o motivo desta liberação'
                        : 'Libere o acesso temporário à plataforma'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo de Liberação</Label>
                      <Select
                        value={grantType}
                        onValueChange={(v: 'org' | 'user') => setGrantType(v)}
                        disabled={isEditMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Organização
                            </div>
                          </SelectItem>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Usuário Individual
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {grantType === 'org' ? (
                      <div className="space-y-2">
                        <Label>Organização</Label>
                        <Select
                          value={selectedOrgId}
                          onValueChange={setSelectedOrgId}
                          disabled={isEditMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma organização" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Email do Usuário</Label>
                        <Input
                          type="email"
                          placeholder="usuario@email.com"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          disabled={isEditMode}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Data de Expiração</Label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo (obrigatório)</Label>
                      <Textarea
                        placeholder="Descreva o motivo da liberação..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitGrant} disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? 'Salvando...' : 'Criando...'}
                        </>
                      ) : (
                        isEditMode ? 'Salvar Alterações' : 'Criar Liberação'
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
                Nenhuma liberação ativa
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {grant.org_id ? (
                            <><Building2 className="mr-1 h-3 w-3" /> Org</>
                          ) : (
                            <><User className="mr-1 h-3 w-3" /> Usuário</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {grant.org_name || grant.user_email || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {grant.reason}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatBRT(new Date(grant.expires_at), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatBRT(new Date(grant.created_at), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(grant)}
                            title="Editar liberação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevokeGrant(grant.id)}
                            title="Revogar liberação"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
