import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Loader2, ChevronDown, ChevronRight, Building2, Link, KeyRound, Power, Mail, Ban, CheckCircle, Trash2, Copy, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useEPRole } from '@/hooks/useEPRole';

import { Navigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getTranslatedErrorMessage, showErrorToast } from '@/lib/errorToast';
import { formatBRT } from "@/lib/datetime";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  account_id: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean | null;
  created_at: string | null;
  profile?: Profile;
}

interface Company {
  id: string;
  name: string;
  status: string | null;
  members: Member[];
  invites: PendingInvite[];
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
  account_id: string;
}

interface OrphanUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  account_id: string | null;
  company_name: string | null;
}

interface EmergencyReleaseResult {
  email: string;
  temporary_password: string;
  company_name: string;
  role: string;
  created?: boolean;
}

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  admin_rh: 'Admin RH',
  leader: 'Líder',
  member: 'Membro',
  viewer: 'Visualizador',
};

const allRoles = ['owner', 'admin', 'admin_rh', 'leader', 'member', 'viewer'];

export default function AdminUsuarios() {
  const { isSuperAdmin, loading: roleLoading } = useEPRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orphanUsers, setOrphanUsers] = useState<OrphanUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Link user state
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  // Company suspend confirm dialog
  const [suspendCompanyId, setSuspendCompanyId] = useState<string | null>(null);
  const [suspendCompanyName, setSuspendCompanyName] = useState('');

  // Delete orphan user confirm dialog
  const [deleteOrphanId, setDeleteOrphanId] = useState<string | null>(null);
  const [deleteOrphanName, setDeleteOrphanName] = useState('');

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Temporary password dialog state
  const [temporaryPasswordResult, setTemporaryPasswordResult] = useState<{ email: string; password: string } | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseMode, setReleaseMode] = useState<'single' | 'bulk'>('single');
  const [releaseForm, setReleaseForm] = useState({ firstName: '', lastName: '', email: '', companyId: '', role: 'member' });
  const [releaseBulkText, setReleaseBulkText] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseResults, setReleaseResults] = useState<{ released: EmergencyReleaseResult[]; failed: { email: string; error: string }[] } | null>(null);

  useEffect(() => {
    if (!isSuperAdmin || roleLoading) return;
    fetchData();
  }, [isSuperAdmin, roleLoading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [companiesRes, membersRes, profilesRes] = await Promise.all([
        supabase.from('companies').select('id, name, status').order('name'),
        supabase.from('account_members').select('id, account_id, user_id, role, is_active, created_at'),
        supabase.from('profiles').select('id, first_name, last_name, email, account_id'),
      ]);

      const invitesRes = await supabase
        .from('account_invites')
        .select('id, account_id, email, role, status, created_at, expires_at')
        .in('status', ['pending', 'sent', 'awaiting_payment', 'paid_ready_to_send']);

      if (companiesRes.error) throw companiesRes.error;
      if (membersRes.error) throw membersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (invitesRes.error) throw invitesRes.error;

      const profileMap = new Map<string, Profile>();
      (profilesRes.data || []).forEach(p => profileMap.set(p.id, p));

      // Find users with memberships
      const usersWithMembership = new Set<string>();
      const membersByAccount = new Map<string, Member[]>();
      (membersRes.data || []).forEach(m => {
        usersWithMembership.add(m.user_id);
        const list = membersByAccount.get(m.account_id) || [];
        list.push({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          is_active: m.is_active,
          created_at: m.created_at,
          profile: profileMap.get(m.user_id),
        });
        membersByAccount.set(m.account_id, list);
      });

      const result: Company[] = (companiesRes.data || []).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        members: membersByAccount.get(c.id) || [],
        invites: (invitesRes.data || []).filter(i => i.account_id === c.id),
      }));

      // Orphan users: have profile but no membership
      const companyMap = new Map((companiesRes.data || []).map(c => [c.id, c.name]));
      const orphans: OrphanUser[] = (profilesRes.data || [])
        .filter(p => !usersWithMembership.has(p.id))
        .map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          account_id: p.account_id,
          company_name: p.account_id ? (companyMap.get(p.account_id) || null) : null,
        }));

      setCompanies(result);
      setOrphanUsers(orphans);
    } catch (err) {
      console.error('Error fetching admin users data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (actionName: string, payload: Record<string, unknown>, loadingKey: string) => {
    setActionLoading(loadingKey);
    try {
      const { error } = await invokeAuthenticatedFunction('admin-manage-user', {
        action: actionName,
        ...payload,
      });
      if (error) {
        showErrorToast(error);
        return false;
      }
      return true;
    } catch {
      toast.error('Erro ao executar ação');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkUser = async (userId: string) => {
    if (!selectedCompanyId) {
      toast.error('Selecione uma empresa');
      return;
    }
    const success = await handleAction('link_to_company', {
      user_id: userId,
      account_id: selectedCompanyId,
      role: selectedRole,
    }, `link-${userId}`);
    if (success) {
      toast.success('Usuário vinculado com sucesso');
      setLinkingUserId(null);
      setSelectedCompanyId('');
      setSelectedRole('member');
      fetchData();
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const success = await handleAction('change_role', {
      member_id: memberId,
      new_role: newRole,
    }, `role-${memberId}`);
    if (success) {
      toast.success('Papel alterado');
      fetchData();
    }
  };

  const handleToggleActive = async (memberId: string, currentActive: boolean | null) => {
    const newActive = currentActive === false;
    const success = await handleAction('toggle_active', {
      member_id: memberId,
      is_active: newActive,
    }, `active-${memberId}`);
    if (success) {
      toast.success(newActive ? 'Usuário ativado' : 'Usuário desativado');
      fetchData();
    }
  };

  const handleInviteEmail = async () => {
    if (!inviteEmail.trim() || !inviteCompanyId || !inviteRole) {
      toast.error('Preencha todos os campos');
      return;
    }
    setInviteLoading(true);
    try {
      const { error } = await invokeAuthenticatedFunction('admin-manage-user', {
        action: 'invite_to_company',
        email: inviteEmail.trim(),
        account_id: inviteCompanyId,
        role: inviteRole,
      });
      if (error) {
        showErrorToast(error);
        return;
      }
      toast.success(`Convite enviado para ${inviteEmail.trim()}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteCompanyId('');
      setInviteRole('member');
      fetchData();
    } catch {
      toast.error('Erro ao enviar convite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleCompanyStatus = async (companyId: string) => {
    const success = await handleAction('toggle_company_status', {
      company_id: companyId,
    }, `company-status-${companyId}`);
    if (success) {
      const company = companies.find(c => c.id === companyId);
      const wasSuspended = company?.status === 'suspended';
      toast.success(wasSuspended ? 'Empresa reativada' : 'Empresa suspensa');
      fetchData();
    }
    setSuspendCompanyId(null);
  };

  const handleResetPassword = async (email: string) => {
    const loadingKey = `reset-${email}`;
    if (actionLoading === loadingKey) return;

    setActionLoading(loadingKey);
    try {
      const { data, error } = await invokeAuthenticatedFunction<{ blocked_by_cooldown?: boolean; message?: string }>('admin-manage-user', {
        action: 'reset_password',
        email,
      });
      if (error) {
        showErrorToast(error);
        return;
      }

      if (data?.blocked_by_cooldown) {
        toast.info(getTranslatedErrorMessage(data.message, 'Já existe um link de recuperação recente. Use o e-mail mais novo.'));
        return;
      }

      toast.success(`E-mail de recuperação solicitado para ${email}. Se não chegar, use Gerar senha temporária.`);
    } catch {
      toast.error('Erro ao solicitar recuperação de senha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateTemporaryPassword = async (email: string) => {
    setActionLoading(`temp-password-${email}`);
    try {
      const { data, error } = await invokeAuthenticatedFunction<{ temporary_password: string }>('admin-manage-user', {
        action: 'generate_temporary_password',
        email,
      });
      if (error || !data?.temporary_password) {
        showErrorToast(error, 'Erro ao gerar senha temporária');
        return;
      }
      setTemporaryPasswordResult({ email, password: data.temporary_password });
      toast.success('Senha temporária gerada');
    } catch {
      toast.error('Erro ao gerar senha temporária');
    } finally {
      setActionLoading(null);
    }
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPasswordResult) return;
    await navigator.clipboard.writeText(temporaryPasswordResult.password);
    toast.success('Senha copiada');
  };

  const loginUrl = 'https://gentia.tech/auth/login';
  const getInviteLink = (inviteId: string) => `https://gentia.tech/app/accept-invite?invite_id=${inviteId}`;
  const getAccessMessage = (item: EmergencyReleaseResult) => `Seu acesso ao GENTIA foi liberado.\n\nAcesse:\n${loginUrl}\n\nE-mail:\n${item.email}\n\nSenha temporária:\n${item.temporary_password}\n\nAo entrar, recomendamos trocar a senha em Conta → Perfil.`;
  const getInviteMessage = (invite: PendingInvite) => `Você foi convidado para acessar o GENTIA.\n\nAceite o convite por este link:\n${getInviteLink(invite.id)}\n\nSe o link abrir pedindo login ou cadastro, use o mesmo e-mail do convite: ${invite.email}`;

  const copyText = async (text: string, successMessage: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };

  const parseBulkUsers = () => releaseBulkText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(';').map(part => part.trim());
      if (parts.length === 1) return { email: parts[0], role: releaseForm.role };
      return { first_name: parts[0], last_name: parts[1], email: parts[2], role: parts[3] || releaseForm.role };
    })
    .filter(item => item.email);

  const handleEmergencyRelease = async () => {
    if (!releaseForm.companyId) {
      toast.error('Selecione a empresa');
      return;
    }
    setReleaseLoading(true);
    try {
      const payload = releaseMode === 'single'
        ? { action: 'emergency_release_access', email: releaseForm.email, first_name: releaseForm.firstName, last_name: releaseForm.lastName, account_id: releaseForm.companyId, role: releaseForm.role }
        : { action: 'emergency_release_access_bulk', users: parseBulkUsers(), account_id: releaseForm.companyId, role: releaseForm.role };

      const { data, error } = await invokeAuthenticatedFunction<any>('admin-manage-user', payload);
      if (error) {
        showErrorToast(error);
        return;
      }
      const released = releaseMode === 'single' ? [data as EmergencyReleaseResult] : (data?.released || []);
      const failed = releaseMode === 'single' ? [] : (data?.failed || []);
      setReleaseResults({ released, failed });
      toast.success(`${released.length} acesso(s) liberado(s)`);
      fetchData();
    } catch {
      toast.error('Erro ao liberar acesso');
    } finally {
      setReleaseLoading(false);
    }
  };

  const copyAllReleaseMessages = async () => {
    if (!releaseResults?.released.length) return;
    const companyName = releaseResults.released[0]?.company_name || 'Organização';
    const message = `Acessos liberados - ${companyName}\n\n${releaseResults.released.map((item, index) => `${index + 1}. ${item.email}\nSenha temporária: ${item.temporary_password}`).join('\n\n')}\n\nLogin:\n${loginUrl}`;
    await copyText(message, 'Mensagem pronta copiada');
  };

  const handleDeleteOrphanUser = async (userId: string) => {
    const success = await handleAction('delete_orphan_user', { target_user_id: userId }, `delete-${userId}`);
    if (success) {
      toast.success('Usuário excluído permanentemente');
      setOrphanUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeleteOrphanId(null);
  };

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c => {
      if (c.name.toLowerCase().includes(q)) return true;
      return c.members.some(m => {
        const name = `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.toLowerCase();
        const email = (m.profile?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    });
  }, [companies, search]);

  const filteredOrphans = useMemo(() => {
    if (!search.trim()) return orphanUsers;
    const q = search.toLowerCase();
    return orphanUsers.filter(u => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [orphanUsers, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (roleLoading) {
    return (
      <AppLayout title="Usuários" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Usuários' }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Usuários' },
  ];

  return (
    <AppLayout title="Usuários por Empresa" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Usuários por Empresa</h2>
              <p className="text-sm text-muted-foreground">
                {companies.length} empresas · {companies.reduce((sum, c) => sum + c.members.length, 0)} membros · {orphanUsers.length} sem empresa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setReleaseDialogOpen(true)} size="sm" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Liberar acesso agora
            </Button>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm" variant="outline" className="gap-1.5">
              <Mail className="h-4 w-4" />
              Convidar Email
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Orphan Users Section */}
        {filteredOrphans.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">Usuários sem empresa ({filteredOrphans.length})</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[300px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrphans.map(user => {
                    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sem nome';
                    const isLinking = linkingUserId === user.id;

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{user.email || '—'}</span>
                            {user.company_name && (
                              <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                                <Building2 className="h-3 w-3" />
                                {user.company_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLinking ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {companies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allRoles.map(r => (
                                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                disabled={actionLoading === `link-${user.id}`}
                                onClick={() => handleLinkUser(user.id)}
                              >
                                {actionLoading === `link-${user.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : 'Confirmar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => setLinkingUserId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setLinkingUserId(user.id)}
                              >
                                <Link className="h-3 w-3" />
                                Vincular
                              </Button>
                              {user.email && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    disabled={actionLoading === `reset-${user.email}`}
                                    onClick={() => handleResetPassword(user.email!)}
                                  >
                                    {actionLoading === `reset-${user.email}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <KeyRound className="h-3 w-3" />
                                        Resetar senha
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    disabled={actionLoading === `temp-password-${user.email}`}
                                    onClick={() => handleGenerateTemporaryPassword(user.email!)}
                                  >
                                    {actionLoading === `temp-password-${user.email}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <KeyRound className="h-3 w-3" />
                                        Gerar senha
                                      </>
                                    )}
                                  </Button>
                                </>
                               )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                disabled={actionLoading === `delete-${user.id}`}
                                onClick={() => {
                                  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sem nome';
                                  setDeleteOrphanId(user.id);
                                  setDeleteOrphanName(name);
                                }}
                              >
                                {actionLoading === `delete-${user.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-3 w-3" />
                                    Excluir
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Companies Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma empresa encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCompanies.map(company => {
              const isOpen = expandedIds.has(company.id);
              const activeCount = company.members.filter(m => m.is_active !== false).length;

              return (
                <Collapsible key={company.id} open={isOpen} onOpenChange={() => toggleExpand(company.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer w-full" role="button" tabIndex={0}>
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{company.name}</span>
                          {company.status === 'suspended' && (
                            <Badge variant="destructive" className="text-xs">Suspensa</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant={company.status === 'suspended' ? 'outline' : 'ghost'}
                            className={`h-7 text-xs gap-1 ${company.status !== 'suspended' ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-700'}`}
                            disabled={actionLoading === `company-status-${company.id}`}
                            onClick={() => {
                              if (company.status === 'suspended') {
                                handleToggleCompanyStatus(company.id);
                              } else {
                                setSuspendCompanyId(company.id);
                                setSuspendCompanyName(company.name);
                              }
                            }}
                          >
                            {actionLoading === `company-status-${company.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : company.status === 'suspended' ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Reativar
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3" />
                                Suspender
                              </>
                            )}
                          </Button>
                          {company.invites.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {company.invites.length} convite{company.invites.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {activeCount} ativo{activeCount !== 1 ? 's' : ''} / {company.members.length} total
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {company.invites.length > 0 && (
                        <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Convites pendentes</p>
                          {company.invites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{invite.email}</p>
                                <p className="text-xs text-muted-foreground">{roleLabels[invite.role] || invite.role} · {invite.status || 'pending'}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyText(getInviteLink(invite.id), 'Link do convite copiado')}>
                                  <Copy className="h-3 w-3" />
                                  Link
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyText(getInviteMessage(invite), 'Mensagem de convite copiada')}>
                                  <Copy className="h-3 w-3" />
                                  Mensagem
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {company.members.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-muted-foreground border-t">
                          Nenhum membro nesta empresa.
                        </div>
                      ) : (
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Papel</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Entrada</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {company.members.map(member => {
                                const firstName = member.profile?.first_name || '';
                                const lastName = member.profile?.last_name || '';
                                const name = `${firstName} ${lastName}`.trim() || 'Sem nome';

                                return (
                                  <TableRow key={member.id}>
                                    <TableCell className="font-medium">{name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {member.profile?.email || '—'}
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={member.role}
                                        onValueChange={(val) => handleChangeRole(member.id, val)}
                                        disabled={actionLoading === `role-${member.id}`}
                                      >
                                        <SelectTrigger className="h-7 w-[130px] text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allRoles.map(r => (
                                            <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={member.is_active !== false}
                                          onCheckedChange={() => handleToggleActive(member.id, member.is_active)}
                                          disabled={actionLoading === `active-${member.id}`}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          {member.is_active !== false ? 'Ativo' : 'Inativo'}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                      {member.created_at
                                        ? formatBRT(new Date(member.created_at), 'dd/MM/yyyy')
                                        : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {member.profile?.email && (
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs gap-1"
                                            disabled={actionLoading === `reset-${member.profile.email}`}
                                            onClick={() => handleResetPassword(member.profile!.email!)}
                                          >
                                            {actionLoading === `reset-${member.profile.email}` ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <>
                                                <KeyRound className="h-3 w-3" />
                                                Resetar senha
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1"
                                            disabled={actionLoading === `temp-password-${member.profile.email}`}
                                            onClick={() => handleGenerateTemporaryPassword(member.profile!.email!)}
                                          >
                                            {actionLoading === `temp-password-${member.profile.email}` ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <>
                                                <KeyRound className="h-3 w-3" />
                                                Gerar senha
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
      {/* Emergency Release Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Liberar acesso agora</DialogTitle>
            <DialogDescription>
              Crie ou localize usuários, vincule à empresa e gere senha temporária sem depender de email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={releaseMode === 'single' ? 'default' : 'outline'} onClick={() => setReleaseMode('single')}>Individual</Button>
              <Button variant={releaseMode === 'bulk' ? 'default' : 'outline'} onClick={() => setReleaseMode('bulk')}>Em lote</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={releaseForm.companyId} onValueChange={(companyId) => setReleaseForm(prev => ({ ...prev, companyId }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{companies.filter(c => c.status !== 'suspended').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Papel padrão</Label>
                <Select value={releaseForm.role} onValueChange={(role) => setReleaseForm(prev => ({ ...prev, role }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allRoles.filter(r => r !== 'owner').map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {releaseMode === 'single' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={releaseForm.firstName} onChange={e => setReleaseForm(prev => ({ ...prev, firstName: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Sobrenome</Label><Input value={releaseForm.lastName} onChange={e => setReleaseForm(prev => ({ ...prev, lastName: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" value={releaseForm.email} onChange={e => setReleaseForm(prev => ({ ...prev, email: e.target.value }))} placeholder="usuario@empresa.com.br" /></div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Usuários em lote</Label>
                <Textarea rows={8} value={releaseBulkText} onChange={e => setReleaseBulkText(e.target.value)} placeholder={'nome;sobrenome;email;papel\nMaria;Silva;maria@empresa.com.br;member\nou apenas:\nemail@empresa.com.br'} />
              </div>
            )}
            {releaseResults && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{releaseResults.released.length} liberado(s), {releaseResults.failed.length} erro(s)</p>
                  {releaseResults.released.length > 0 && <Button size="sm" variant="outline" onClick={copyAllReleaseMessages}><Copy className="h-4 w-4 mr-2" />Copiar tudo</Button>}
                </div>
                {releaseResults.released.map(item => (
                  <div key={item.email} className="rounded-md border bg-background p-2 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{item.email}</span><Button size="sm" variant="ghost" onClick={() => copyText(getAccessMessage(item), 'Mensagem copiada')}>Copiar mensagem</Button></div>
                    <p className="font-mono text-xs text-muted-foreground break-all">{item.temporary_password}</p>
                  </div>
                ))}
                {releaseResults.failed.map(item => <p key={item.email} className="text-sm text-destructive">{item.email || 'linha'}: {item.error}</p>)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>Fechar</Button>
            <Button onClick={handleEmergencyRelease} disabled={releaseLoading}>{releaseLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Liberar acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Email para Empresa</DialogTitle>
            <DialogDescription>
              Envie um convite por email para um novo usuário ingressar em uma organização.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={inviteCompanyId} onValueChange={setInviteCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.status !== 'suspended').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map(r => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteEmail} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Company Confirmation */}
      <AlertDialog open={!!suspendCompanyId} onOpenChange={(open) => { if (!open) setSuspendCompanyId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja suspender <strong>{suspendCompanyName}</strong>? A empresa ficará marcada como suspensa, mas poderá ser reativada a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => suspendCompanyId && handleToggleCompanyStatus(suspendCompanyId)}
            >
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Orphan User Confirmation */}
      <AlertDialog open={!!deleteOrphanId} onOpenChange={(open) => { if (!open) setDeleteOrphanId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteOrphanName}</strong>? Esta ação é <strong>irreversível</strong> e removerá o usuário permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOrphanId && handleDeleteOrphanUser(deleteOrphanId)}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Result */}
      <Dialog open={!!temporaryPasswordResult} onOpenChange={(open) => { if (!open) setTemporaryPasswordResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Senha temporária gerada</DialogTitle>
            <DialogDescription>
              Compartilhe esta senha com {temporaryPasswordResult?.email} por um canal seguro. Oriente o usuário a trocar a senha após entrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Senha temporária</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
              <span className="flex-1 break-all">{temporaryPasswordResult?.password}</span>
              <Button size="icon" variant="ghost" onClick={copyTemporaryPassword} aria-label="Copiar senha temporária">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {temporaryPasswordResult && (
              <Button variant="outline" className="w-full" onClick={() => copyText(getAccessMessage({ email: temporaryPasswordResult.email, temporary_password: temporaryPasswordResult.password, company_name: 'GENTIA', role: 'member' }), 'Mensagem pronta copiada')}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar mensagem pronta
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setTemporaryPasswordResult(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
