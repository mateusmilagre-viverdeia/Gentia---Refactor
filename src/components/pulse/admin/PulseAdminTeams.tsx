import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, RefreshCw, Users, Trash2, Pencil, UserCircle } from 'lucide-react';
import { PulseTeam, CreateTeamData, UpdateTeamData } from '@/hooks/usePulseTeams';

interface Props {
  teams: PulseTeam[];
  availableLeaders: { id: string; first_name: string | null; last_name: string | null; email: string | null }[];
  loading: boolean;
  onCreate: (data: CreateTeamData) => Promise<any>;
  onUpdate: (teamId: string, data: UpdateTeamData) => Promise<boolean>;
  onDelete: (teamId: string) => Promise<boolean>;
  onToggle: (teamId: string, isActive: boolean) => Promise<boolean>;
  onRefresh: () => void;
}

export function PulseAdminTeams({
  teams,
  availableLeaders,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
  onRefresh,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PulseTeam | null>(null);
  const [formData, setFormData] = useState({ name: '', leader_user_id: '' });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await onCreate({
      name: formData.name.trim(),
      leader_user_id: formData.leader_user_id || undefined,
    });
    setFormData({ name: '', leader_user_id: '' });
    setCreateOpen(false);
  };

  const handleEdit = async () => {
    if (!editingTeam || !formData.name.trim()) return;
    await onUpdate(editingTeam.id, {
      name: formData.name.trim(),
      leader_user_id: formData.leader_user_id || null,
    });
    setEditingTeam(null);
    setFormData({ name: '', leader_user_id: '' });
    setEditOpen(false);
  };

  const openEdit = (team: PulseTeam) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      leader_user_id: team.leader_user_id || '',
    });
    setEditOpen(true);
  };

  const getLeaderName = (leader: PulseTeam['leader_profile']) => {
    if (!leader) return 'Sem líder';
    const name = [leader.first_name, leader.last_name].filter(Boolean).join(' ');
    return name || leader.email || 'Sem líder';
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
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
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
              <Users className="h-5 w-5 text-primary" />
              Equipes
            </CardTitle>
            <CardDescription>
              Gerencie as equipes e seus líderes para segmentação do Pulse.
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
                  Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Equipe</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova equipe ao sistema Pulse.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Equipe</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Desenvolvimento, Marketing..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leader">Líder (opcional)</Label>
                <Select
                      value={formData.leader_user_id || '__none__'}
                      onValueChange={v => setFormData(prev => ({ ...prev, leader_user_id: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um líder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem líder</SelectItem>
                        {availableLeaders.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
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
                  <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                    Criar Equipe
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma equipe cadastrada. Crie a primeira equipe acima.
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{team.name}</span>
                    {!team.is_active && (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserCircle className="h-3.5 w-3.5" />
                      {getLeaderName(team.leader_profile)}
                    </span>
                    <span>{team.member_count || 0} membros</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={team.is_active ?? true}
                    onCheckedChange={checked => onToggle(team.id, checked)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Equipe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a equipe "{team.name}"?
                          Os membros serão desassociados mas não excluídos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(team.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Equipe</DialogTitle>
              <DialogDescription>
                Atualize as informações da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Equipe</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-leader">Líder</Label>
                <Select
                  value={formData.leader_user_id || '__none__'}
                  onValueChange={v => setFormData(prev => ({ ...prev, leader_user_id: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um líder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem líder</SelectItem>
                    {availableLeaders.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
