import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw, UserCog, Trash2, UserCircle, Users, Loader2, Info } from 'lucide-react';
import { PulseUserProfile, PulseUserRole, CreateUserProfileData } from '@/hooks/usePulseUserProfiles';
import { PulseTeam } from '@/hooks/usePulseTeams';

interface AvailableUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface Props {
  userProfiles: PulseUserProfile[];
  teams: PulseTeam[];
  availableUsers: AvailableUser[];
  loading: boolean;
  onCreate: (data: CreateUserProfileData) => Promise<any>;
  onBulkCreate?: (userIds: string[], role: PulseUserRole, teamId?: string) => Promise<{ success: boolean; count: number }>;
  onChangeRole: (profileId: string, role: PulseUserRole) => Promise<boolean>;
  onAssignTeam: (profileId: string, teamId: string | null) => Promise<boolean>;
  onToggle: (profileId: string, isActive: boolean) => Promise<boolean>;
  onDelete: (profileId: string) => Promise<boolean>;
  onRefresh: () => void;
  onRefreshAvailable: () => void;
}

const ROLE_LABELS: Record<PulseUserRole, string> = {
  admin_rh: 'Admin RH',
  leader: 'Líder',
  employee: 'Colaborador',
};

const ROLE_COLORS: Record<PulseUserRole, string> = {
  admin_rh: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  employee: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function PulseAdminUsers({
  userProfiles,
  teams,
  availableUsers,
  loading,
  onCreate,
  onBulkCreate,
  onChangeRole,
  onAssignTeam,
  onToggle,
  onDelete,
  onRefresh,
  onRefreshAvailable,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRole, setBulkRole] = useState<PulseUserRole>('employee');
  const [bulkTeamId, setBulkTeamId] = useState('');
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'employee' as PulseUserRole,
    team_id: '',
  });

  useEffect(() => {
    if (createOpen || bulkOpen) {
      onRefreshAvailable();
    }
  }, [createOpen, bulkOpen, onRefreshAvailable]);

  const handleCreate = async () => {
    if (!formData.user_id) return;
    await onCreate({
      user_id: formData.user_id,
      role: formData.role,
      team_id: formData.team_id || undefined,
    });
    setFormData({ user_id: '', role: 'employee', team_id: '' });
    setCreateOpen(false);
  };

  const handleBulkCreate = async () => {
    if (!onBulkCreate || availableUsers.length === 0) return;
    setBulkLoading(true);
    const userIds = availableUsers.map(u => u.id);
    await onBulkCreate(userIds, bulkRole, bulkTeamId || undefined);
    setBulkLoading(false);
    setBulkOpen(false);
    setBulkRole('employee');
    setBulkTeamId('');
  };

  const getUserName = (profile: PulseUserProfile) => {
    if (!profile.user_profile) return 'Usuário';
    const name = [profile.user_profile.first_name, profile.user_profile.last_name]
      .filter(Boolean)
      .join(' ');
    return name || profile.user_profile.email || 'Usuário';
  };

  const getUserEmail = (profile: PulseUserProfile) => {
    return profile.user_profile?.email || '';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Usuários do Pulse
            </CardTitle>
            <CardDescription>
              Gerencie os perfis de usuário, roles e associação a equipes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Usuário ao Pulse</DialogTitle>
                  <DialogDescription>
                    Adicione um membro da conta ao sistema Pulse.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Select
                      value={formData.user_id}
                      onValueChange={v => setFormData(prev => ({ ...prev, user_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.length === 0 ? (
                          <SelectItem value="__no_users__" disabled>
                            Todos os usuários já estão no Pulse
                          </SelectItem>
                        ) : (
                          availableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={v => setFormData(prev => ({ ...prev, role: v as PulseUserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Colaborador</SelectItem>
                        <SelectItem value="leader">Líder</SelectItem>
                        <SelectItem value="admin_rh">Admin RH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipe (opcional)</Label>
                    <Select
                      value={formData.team_id || '__none__'}
                      onValueChange={v => setFormData(prev => ({ ...prev, team_id: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem equipe</SelectItem>
                        {teams.filter(t => t.is_active).map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.user_id}>
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bulk Add Alert */}
        {availableUsers.length > 0 && onBulkCreate && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-800 dark:text-blue-200">
                <strong>{availableUsers.length}</strong> usuário{availableUsers.length > 1 ? 's' : ''} da conta ainda não {availableUsers.length > 1 ? 'estão' : 'está'} no Pulse.
              </span>
              <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 ml-4 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900">
                    <Users className="h-4 w-4" />
                    Adicionar Todos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Todos os Usuários</DialogTitle>
                    <DialogDescription>
                      Adicione {availableUsers.length} usuário{availableUsers.length > 1 ? 's' : ''} pendente{availableUsers.length > 1 ? 's' : ''} ao Pulse de uma vez.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="rounded-lg border p-3 bg-muted/50">
                      <p className="text-sm font-medium mb-2">Usuários a serem adicionados:</p>
                      <div className="flex flex-wrap gap-1">
                        {availableUsers.slice(0, 10).map(user => (
                          <Badge key={user.id} variant="secondary" className="text-xs">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                          </Badge>
                        ))}
                        {availableUsers.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{availableUsers.length - 10} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Role para todos</Label>
                      <Select
                        value={bulkRole}
                        onValueChange={v => setBulkRole(v as PulseUserRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Colaborador</SelectItem>
                          <SelectItem value="leader">Líder</SelectItem>
                          <SelectItem value="admin_rh">Admin RH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Equipe para todos (opcional)</Label>
                      <Select
                        value={bulkTeamId || '__none__'}
                        onValueChange={v => setBulkTeamId(v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem equipe</SelectItem>
                          {teams.filter(t => t.is_active).map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkLoading}>
                      Cancelar
                    </Button>
                    <Button onClick={handleBulkCreate} disabled={bulkLoading}>
                      {bulkLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adicionando...
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-2" />
                          Adicionar {availableUsers.length} Usuário{availableUsers.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </AlertDescription>
          </Alert>
        )}

        {userProfiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum usuário cadastrado no Pulse. Adicione usuários acima.
          </div>
        ) : (
          <div className="space-y-3">
            {userProfiles.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getUserName(profile)}</span>
                      {!profile.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getUserEmail(profile)}</span>
                      {profile.team && (
                        <>
                          <span>•</span>
                          <span>{profile.team.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={profile.role || 'employee'}
                    onValueChange={v => onChangeRole(profile.id, v as PulseUserRole)}
                  >
                    <SelectTrigger className="w-32">
                      <Badge className={ROLE_COLORS[profile.role || 'employee']}>
                        {ROLE_LABELS[profile.role || 'employee']}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Colaborador</SelectItem>
                      <SelectItem value="leader">Líder</SelectItem>
                      <SelectItem value="admin_rh">Admin RH</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={profile.team_id || '__none__'}
                    onValueChange={v => onAssignTeam(profile.id, v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Sem equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem equipe</SelectItem>
                      {teams.filter(t => t.is_active).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={profile.is_active ?? true}
                    onCheckedChange={checked => onToggle(profile.id, checked)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{getUserName(profile)}" do Pulse?
                          O usuário poderá ser adicionado novamente depois.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(profile.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
