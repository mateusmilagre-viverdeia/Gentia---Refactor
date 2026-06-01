import { useState, useEffect } from 'react';
import { useEPRole } from '@/hooks/useEPRole';
import { useTeamInvites } from '@/hooks/useTeamInvites';
import { useSeatsManagement } from '@/hooks/useSeatsManagement';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Trash2, UserPlus, Users, Clock, Pencil, Calendar, Settings, FileText, AlertTriangle, RefreshCw, Power, PowerOff, UserCheck, Copy } from 'lucide-react';
import { AccountRole, roleLabels } from '@/types/account.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseSeatsModal } from './PurchaseSeatsModal';
import { SeatsPanel } from './SeatsPanel';
import { SeatsHistory } from './SeatsHistory';
import { InviteWithPaymentModal } from './InviteWithPaymentModal';
import { InviteStatusBadge } from './InviteStatusBadge';
import { MultiEmailInput } from './MultiEmailInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface TeamManagementProps {
  accountId: string;
  accountName?: string;
  currentUserRole: AccountRole;
  currentUserId: string;
}

export function TeamManagement({ accountId, accountName, currentUserRole, currentUserId }: TeamManagementProps) {
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<AccountRole>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; role: AccountRole } | null>(null);
  const [newRole, setNewRole] = useState<AccountRole>('member');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showInviteWithPaymentModal, setShowInviteWithPaymentModal] = useState(false);

  const {
    invites,
    members,
    loading,
    fetchInvites,
    fetchMembers,
    sendBulkInvites,
    sendInviteWithPayment,
    cancelInvite,
    resendInvite,
    removeMember,
    updateMemberRole,
    toggleMemberActive,
  } = useTeamInvites(accountId);

  const { seatsInfo, fetchSeatsInfo } = useSeatsManagement(accountId);

  const { isEPConsultant } = useEPRole();
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin' || isEPConsultant;

  useEffect(() => {
    if (accountId) {
      fetchMembers();
      if (canManageTeam) {
        fetchInvites();
      }
    }
  }, [accountId, canManageTeam, fetchMembers, fetchInvites]);

  const handleSendBulkInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmails.length === 0) return;

    setSendingInvite(true);
    
    const result = await sendBulkInvites(inviteEmails, inviteRole);
    
    if (result.success) {
      const sentCount = result.sent.length;
      const failedCount = result.failed.length;
      
      if (sentCount > 0 && failedCount === 0) {
        toast.success(`${sentCount} convite(s) enviado(s) com sucesso!`);
      } else if (sentCount > 0 && failedCount > 0) {
        toast.success(`${sentCount} convite(s) enviado(s). ${failedCount} não enviado(s).`);
      } else if (sentCount === 0 && failedCount > 0) {
        toast.warning('Nenhum convite enviado. Todos os emails já são membros ou têm convites pendentes.');
      }
      
      // Handle emails that need payment
      if (result.needsPayment && result.emailsNeedPayment.length > 0) {
        toast.info(`${result.emailsNeedPayment.length} email(s) requerem assentos adicionais.`);
        // Could open a modal or redirect to purchase seats
      }
      
      setInviteEmails([]);
      setInviteRole('member');
    }
    
    fetchSeatsInfo();
    setSendingInvite(false);
  };

  const getMemberName = (member: typeof members[0]) => {
    if (member.profile) {
      const name = [member.profile.first_name, member.profile.last_name]
        .filter(Boolean)
        .join(' ');
      return name || member.profile.email || 'Sem nome';
    }
    return 'Sem nome';
  };

  const getMemberEmail = (member: typeof members[0]) => {
    return member.profile?.email || '-';
  };

  const getMemberInitials = (member: typeof members[0]) => {
    const name = getMemberName(member);
    if (name === 'Sem nome') return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatLastAccess = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca acessou';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getInviteLink = (inviteId: string) => `https://gentia.tech/app/accept-invite?invite_id=${inviteId}`;
  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };
  const getInviteMessage = (invite: typeof invites[0]) => `Você foi convidado para acessar o GENTIA.\n\nAceite o convite por este link:\n${getInviteLink(invite.id)}\n\nSe o link abrir pedindo login ou cadastro, use o mesmo e-mail do convite: ${invite.email}`;

  const handleToggleActive = async (member: typeof members[0]) => {
    const newStatus = !(member.is_active !== false);
    await toggleMemberActive(member.id, newStatus);
  };

  const handleEditRole = (member: typeof members[0]) => {
    setEditingMember({
      id: member.id,
      name: getMemberName(member),
      role: member.role,
    });
    setNewRole(member.role);
  };

  const handleUpdateRole = async () => {
    if (!editingMember || newRole === editingMember.role) {
      setEditingMember(null);
      return;
    }

    setUpdatingRole(true);
    const success = await updateMemberRole(editingMember.id, newRole);
    setUpdatingRole(false);

    if (success) {
      setEditingMember(null);
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Header Card */}
      <Card>
        <CardContent className="flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">{accountName || 'Minha Empresa'}</p>
              <p className="text-sm text-muted-foreground">
                Plano Profissional • {members.length} {members.length === 1 ? 'membro ativo' : 'membros ativos'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center gap-2" disabled={!canManageTeam}>
            <UserPlus className="h-4 w-4" />
            Convidar
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2" disabled={!canManageTeam}>
            <Clock className="h-4 w-4" />
            Pendentes ({invites.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Seats Panel - Enhanced */}
          <SeatsPanel
            accountId={accountId}
            totalSeats={seatsInfo.totalSeats}
            usedSeats={seatsInfo.usedSeats}
            pendingSeats={seatsInfo.pendingSeats}
            availableSeats={seatsInfo.availableSeats}
            grantedSeats={seatsInfo.grantedSeats}
            grantedSeatsValidUntil={seatsInfo.grantedSeatsValidUntil}
            onPurchaseClick={() => setShowPurchaseModal(true)}
            onRefresh={fetchSeatsInfo}
            isEPPartnerOrg={seatsInfo.isEPPartnerOrg}
          />

          {/* Quick Actions */}
          <div className="flex justify-end gap-2">
            {canManageTeam && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/access-requests">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Solicitações de Acesso
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/conta/faturas">
                <FileText className="h-4 w-4 mr-2" />
                Ver Faturas
              </Link>
            </Button>
          </div>

          {/* Members List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Membros da Equipe ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum membro na equipe ainda
                </p>
              ) : (
                <div className="divide-y">
                  {members.map((member) => {
                    const isActive = member.is_active !== false;
                    return (
                    <div 
                      key={member.id} 
                      className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${!isActive ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`text-sm font-medium ${isActive ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                            {getMemberInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getMemberName(member)}</span>
                            {member.user_id === currentUserId && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                            {!isActive && (
                              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{getMemberEmail(member)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {roleLabels[member.role]}
                        </Badge>

                        <div className="flex flex-col items-end text-xs text-muted-foreground min-w-[90px]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastAccess(member.last_access_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(member.created_at)}
                          </span>
                        </div>
                        
                        {canManageTeam && member.role !== 'owner' && member.user_id !== currentUserId && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(member)}
                              title={isActive ? 'Desativar membro' : 'Ativar membro'}
                            >
                              {isActive ? (
                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Power className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(member)}
                              title="Alterar cargo"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Remover membro">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação irá remover {getMemberName(member)} da equipe.
                                    O membro perderá acesso a todos os recursos da conta.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeMember(member.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seats Purchase History */}
          {canManageTeam && (
            <SeatsHistory accountId={accountId} />
          )}
        </TabsContent>

        {/* Invite Tab */}
        <TabsContent value="invite" className="mt-4">
          {canManageTeam && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Convidar Novos Membros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendBulkInvites} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Emails dos Convidados</Label>
                    <MultiEmailInput
                      emails={inviteEmails}
                      onChange={setInviteEmails}
                      existingEmails={members.map(m => m.profile?.email || '').filter(Boolean)}
                      pendingInvites={invites.map(i => i.email)}
                      disabled={sendingInvite}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Cargo para todos os convidados</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AccountRole)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Administrador</span>
                            <span className="text-xs text-muted-foreground">Gerencia toda a conta e usuários</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin_rh">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Admin RH</span>
                            <span className="text-xs text-muted-foreground">Gerencia Pulse, times e colaboradores</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="leader">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Líder</span>
                            <span className="text-xs text-muted-foreground">Gerencia sua equipe no Pulse</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Membro</span>
                            <span className="text-xs text-muted-foreground">Acesso padrão às funcionalidades</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Visualizador</span>
                            <span className="text-xs text-muted-foreground">Apenas visualização</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seats availability summary */}
                  {inviteEmails.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {inviteEmails.length} email{inviteEmails.length !== 1 ? 's' : ''} para convidar
                        </span>
                        <span className="text-muted-foreground">
                          {seatsInfo.availableSeats} assento{seatsInfo.availableSeats !== 1 ? 's' : ''} disponível{seatsInfo.availableSeats !== 1 ? 'is' : ''}
                        </span>
                      </div>
                      
                      {inviteEmails.length > seatsInfo.availableSeats && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {inviteEmails.length - seatsInfo.availableSeats} convite{inviteEmails.length - seatsInfo.availableSeats !== 1 ? 's precisarão' : ' precisará'} de pagamento adicional.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={sendingInvite || inviteEmails.length === 0} 
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingInvite 
                      ? 'Enviando...' 
                      : `Enviar ${inviteEmails.length || ''} Convite${inviteEmails.length !== 1 ? 's' : ''}`
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5" />
                Convites Pendentes ({invites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum convite pendente
                </p>
              ) : (
                <div className="divide-y">
                  {invites.map((invite) => (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                            <Mail className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invite.email}</span>
                            <InviteStatusBadge status={invite.status} />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Criado em {formatDate(invite.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{roleLabels[invite.role]}</Badge>
                        
                        <div className="flex items-center gap-1">
                          {/* Only show resend for 'sent' status */}
                          {invite.status === 'sent' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reenviar convite"
                              disabled={resendingId === invite.id}
                              onClick={async () => {
                                setResendingId(invite.id);
                                await resendInvite(invite.id);
                                setResendingId(null);
                              }}
                            >
                              <RefreshCw className={`h-4 w-4 ${resendingId === invite.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copiar link do convite"
                            onClick={() => copyText(getInviteLink(invite.id), 'Link do convite copiado')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => copyText(getInviteMessage(invite), 'Mensagem de convite copiada')}
                          >
                            <Copy className="h-3 w-3" />
                            Mensagem
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Cancelar convite">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O convite para {invite.email} será cancelado e o link de acesso não funcionará mais.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelInvite(invite.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancelar Convite
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Cargo</DialogTitle>
            <DialogDescription>
              Alterar o cargo de {editingMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-role">Novo Cargo</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AccountRole)}>
              <SelectTrigger id="edit-role" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Administrador</span>
                    <span className="text-xs text-muted-foreground">Gerencia toda a conta</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin_rh">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Admin RH</span>
                    <span className="text-xs text-muted-foreground">Gerencia Pulse e colaboradores</span>
                  </div>
                </SelectItem>
                <SelectItem value="leader">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Líder</span>
                    <span className="text-xs text-muted-foreground">Gerencia sua equipe</span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Membro</span>
                    <span className="text-xs text-muted-foreground">Acesso padrão</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Visualizador</span>
                    <span className="text-xs text-muted-foreground">Apenas visualização</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole || newRole === editingMember?.role}>
              {updatingRole ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Seats Modal */}
      <PurchaseSeatsModal
        open={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          fetchSeatsInfo(); // Refresh after closing modal
        }}
        accountId={accountId}
        currentSeats={seatsInfo.totalSeats}
        usedSeats={seatsInfo.usedSeats}
        pendingSeats={seatsInfo.pendingSeats}
        isEPPartnerOrg={seatsInfo.isEPPartnerOrg}
      />

      {/* Invite With Payment Modal (webhook-first flow) */}
      <InviteWithPaymentModal
        open={showInviteWithPaymentModal}
        onClose={() => {
          setShowInviteWithPaymentModal(false);
          fetchSeatsInfo();
          fetchInvites();
        }}
        accountId={accountId}
      />
    </div>
  );
}
