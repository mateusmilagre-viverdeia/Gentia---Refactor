import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  User, 
  Flag,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { usePulseActions, PulseAction, CreateActionInput } from '@/hooks/usePulseActions';
import { supabase } from '@/integrations/supabase/client';
import { formatBRT } from "@/lib/datetime";


interface ActionPlanBoardProps {
  accountId: string;
}

const statusConfig = {
  planned: { 
    label: 'Planejado', 
    icon: Clock, 
    color: 'bg-muted text-muted-foreground',
    columnBg: 'bg-muted/30'
  },
  doing: { 
    label: 'Em Andamento', 
    icon: Loader2, 
    color: 'bg-primary/20 text-primary',
    columnBg: 'bg-primary/5'
  },
  done: { 
    label: 'Concluído', 
    icon: CheckCircle2, 
    color: 'bg-green-500/20 text-green-600',
    columnBg: 'bg-green-500/5'
  },
  wont_do_now: { 
    label: 'Não Fazer Agora', 
    icon: XCircle, 
    color: 'bg-orange-500/20 text-orange-600',
    columnBg: 'bg-orange-500/5'
  },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', color: 'bg-yellow-500/20 text-yellow-600' },
  high: { label: 'Alta', color: 'bg-orange-500/20 text-orange-600' },
  critical: { label: 'Crítica', color: 'bg-destructive/20 text-destructive' },
};

interface Driver {
  id: string;
  name: string;
  key: string;
}

interface Pillar {
  id: string;
  name: string;
  emoji: string | null;
}

export function ActionPlanBoard({ accountId }: ActionPlanBoardProps) {
  const { actions, loading, fetchActions, createAction, updateStatus, deleteAction } = usePulseActions(accountId);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState<CreateActionInput>({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchActions();
    fetchReferenceData();
  }, [fetchActions]);

  const fetchReferenceData = async () => {
    const [driversRes, pillarsRes] = await Promise.all([
      supabase.from('pulse_drivers').select('id, name, key').eq('is_active', true),
      supabase.from('pulse_pillars').select('id, name, emoji').eq('is_active', true),
    ]);

    if (driversRes.data) setDrivers(driversRes.data);
    if (pillarsRes.data) setPillars(pillarsRes.data);
  };

  const handleCreateAction = async () => {
    if (!newAction.title.trim()) return;
    
    const result = await createAction(newAction);
    if (result) {
      setCreateDialogOpen(false);
      setNewAction({ title: '', description: '', priority: 'medium' });
      fetchActions();
    }
  };

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    await updateStatus(actionId, newStatus);
  };

  const handleDelete = async (actionId: string) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      await deleteAction(actionId);
    }
  };

  const getActionsByStatus = (status: string) => {
    return actions.filter(a => a.status === status);
  };

  const renderActionCard = (action: PulseAction) => {
    const priority = priorityConfig[action.priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Card key={action.id} className="mb-3 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{action.title}</h4>
              {action.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {action.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem 
                    key={key}
                    onClick={() => handleStatusChange(action.id, key)}
                    disabled={action.status === key}
                  >
                    <config.icon className="h-4 w-4 mr-2" />
                    Mover para {config.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDelete(action.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className={`text-xs ${priority.color}`}>
              <Flag className="h-3 w-3 mr-1" />
              {priority.label}
            </Badge>
            
            {action.pulse_drivers && (
              <Badge variant="outline" className="text-xs">
                {action.pulse_drivers.name}
              </Badge>
            )}
            
            {action.pulse_pillars && (
              <Badge variant="outline" className="text-xs">
                {action.pulse_pillars.emoji} {action.pulse_pillars.name}
              </Badge>
            )}
          </div>

          {action.due_date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatBRT(new Date(action.due_date), "d 'de' MMM")}
            </div>
          )}

          {action.profiles && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {action.profiles.first_name || action.profiles.email}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderColumn = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const StatusIcon = config.icon;
    const columnActions = getActionsByStatus(status);

    return (
      <div key={status} className={`flex-1 min-w-[280px] rounded-lg ${config.columnBg} p-3`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status === 'doing' ? 'animate-spin' : ''}`} />
            <h3 className="font-medium text-sm">{config.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {columnActions.length}
            </Badge>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {columnActions.map(renderActionCard)}
          {columnActions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma ação
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  if (loading && actions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Planos de Ação</CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Ação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Plano de Ação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newAction.title}
                  onChange={(e) => setNewAction(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Melhorar comunicação interna"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newAction.description}
                  onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a ação em detalhes..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={newAction.priority}
                    onValueChange={(value) => setNewAction(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Data Limite</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newAction.due_date || ''}
                    onChange={(e) => setNewAction(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Driver Relacionado</Label>
                  <Select
                    value={newAction.related_driver_id || 'none'}
                    onValueChange={(value) => setNewAction(prev => ({ 
                      ...prev, 
                      related_driver_id: value === 'none' ? undefined : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pilar Relacionado</Label>
                  <Select
                    value={newAction.related_pillar_id || 'none'}
                    onValueChange={(value) => setNewAction(prev => ({ 
                      ...prev, 
                      related_pillar_id: value === 'none' ? undefined : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pillars.map((pillar) => (
                        <SelectItem key={pillar.id} value={pillar.id}>
                          {pillar.emoji} {pillar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAction} disabled={!newAction.title.trim()}>
                  Criar Ação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.keys(statusConfig).map(renderColumn)}
        </div>
      </CardContent>
    </Card>
  );
}
