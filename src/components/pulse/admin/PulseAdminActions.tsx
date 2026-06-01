import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCw, ListTodo, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { PulsePillar, PulseDriver, ActionStatus } from '@/types/pulse.types';
import type { PulseAdminAction } from '@/hooks/usePulseAdmin';

interface Props {
  actions: PulseAdminAction[];
  pillars: PulsePillar[];
  drivers: PulseDriver[];
  loading: boolean;
  onCreate: (action: Partial<PulseAdminAction>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<PulseAdminAction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<ActionStatus, { label: string; icon: any; color: string }> = {
  planned: { label: 'Planejado', icon: Clock, color: 'bg-slate-100 text-slate-700' },
  doing: { label: 'Fazendo', icon: ListTodo, color: 'bg-blue-100 text-blue-700' },
  done: { label: 'Feito', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  wont_do_now: { label: 'Não faremos', icon: XCircle, color: 'bg-amber-100 text-amber-700' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-muted-foreground' },
  medium: { label: 'Média', color: 'text-foreground' },
  high: { label: 'Alta', color: 'text-orange-600' },
  critical: { label: 'Crítica', color: 'text-destructive' },
};

export function PulseAdminActions({
  actions,
  pillars,
  drivers,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<PulseAdminAction | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planned' as ActionStatus,
    priority: 'medium',
    related_pillar_id: '',
    related_driver_id: '',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredActions = actions.filter(a => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const openCreate = () => {
    setEditingAction(null);
    setFormData({
      title: '',
      description: '',
      status: 'planned',
      priority: 'medium',
      related_pillar_id: '',
      related_driver_id: '',
      due_date: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (action: PulseAdminAction) => {
    setEditingAction(action);
    setFormData({
      title: action.title,
      description: action.description || '',
      status: action.status,
      priority: action.priority || 'medium',
      related_pillar_id: action.related_pillar_id || '',
      related_driver_id: action.related_driver_id || '',
      due_date: action.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        related_pillar_id: formData.related_pillar_id || null,
        related_driver_id: formData.related_driver_id || null,
        due_date: formData.due_date || null,
      };
      if (editingAction) {
        await onUpdate(editingAction.id, payload);
      } else {
        await onCreate(payload);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta ação?')) {
      await onDelete(id);
    }
  };

  const handleStatusChange = async (actionId: string, newStatus: ActionStatus) => {
    await onUpdate(actionId, { status: newStatus });
  };

  if (loading && actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Ações do RH
            </CardTitle>
            <CardDescription>
              Acompanhe e gerencie as ações de melhoria
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nova Ação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Todas ({actions.length})
            </button>
            {(Object.entries(STATUS_CONFIG) as [ActionStatus, typeof STATUS_CONFIG[ActionStatus]][]).map(([status, config]) => {
              const count = actions.filter(a => a.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    filterStatus === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Actions list */}
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma ação encontrada.</p>
              <p className="text-sm mt-1">Crie uma nova ação para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActions.map(action => {
                const statusConfig = STATUS_CONFIG[action.status];
                const priorityConfig = PRIORITY_CONFIG[action.priority || 'medium'];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={action.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <Select
                      value={action.status}
                      onValueChange={(value: ActionStatus) => handleStatusChange(action.id, value)}
                    >
                      <SelectTrigger className={`w-auto h-8 ${statusConfig.color} border-0`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">{statusConfig.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_CONFIG) as [ActionStatus, typeof STATUS_CONFIG[ActionStatus]][]).map(([s, c]) => (
                          <SelectItem key={s} value={s}>
                            <div className="flex items-center gap-2">
                              <c.icon className="h-4 w-4" />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{action.title}</p>
                          {action.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {action.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs shrink-0 ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {action.pulse_pillars && (
                          <Badge variant="outline" className="gap-1">
                            {action.pulse_pillars.emoji} {action.pulse_pillars.name}
                          </Badge>
                        )}
                        {action.pulse_drivers && (
                          <Badge variant="secondary">{action.pulse_drivers.name}</Badge>
                        )}
                        {action.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Prazo: {new Date(action.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(action)}
                        className="p-2 hover:bg-accent rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(action.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAction ? 'Editar Ação' : 'Nova Ação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da ação"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva a ação..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ActionStatus) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [ActionStatus, typeof STATUS_CONFIG[ActionStatus]][]).map(([s, c]) => (
                      <SelectItem key={s} value={s}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Prioridade</label>
                <Select
                  value={formData.priority}
                  onValueChange={value => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([p, c]) => (
                      <SelectItem key={p} value={p}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Pilar (opcional)</label>
                <Select
                  value={formData.related_pillar_id}
                  onValueChange={value => setFormData(prev => ({ ...prev, related_pillar_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {pillars.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Driver (opcional)</label>
                <Select
                  value={formData.related_driver_id}
                  onValueChange={value => setFormData(prev => ({ ...prev, related_driver_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {drivers.filter(d => d.is_active).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Prazo (opcional)</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving ? 'Salvando...' : editingAction ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
