import { useCheckpoints } from "@/hooks/useCheckpoints";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle2, Clock, AlertCircle, Trash2, Edit2 } from "lucide-react";

import { useState } from "react";
import type { ProjectCheckpoint, CheckpointAction } from "@/types/consultant.types";
import { formatBRT } from "@/lib/datetime";

interface CheckpointsTabProps {
  accountId: string;
}

export function CheckpointsTab({ accountId }: CheckpointsTabProps) {
  const { checkpoints, actions, loading, canManage, createCheckpoint, updateCheckpoint, deleteCheckpoint, createAction, updateAction, deleteAction } = useCheckpoints(accountId);
  const [newCheckpointOpen, setNewCheckpointOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  
  // Form states
  const [checkpointForm, setCheckpointForm] = useState({
    checkpoint_date: "",
    topic: "",
    summary: "",
    notes: "",
  });
  
  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    responsible: "",
    due_date: "",
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const pendingActions = actions.filter(a => a.status === 'pending');
  const completedActions = actions.filter(a => a.status === 'completed');
  const upcomingCheckpoints = checkpoints.filter(c => c.status === 'scheduled' && new Date(c.checkpoint_date) >= new Date());
  const pastCheckpoints = checkpoints.filter(c => c.status === 'completed' || new Date(c.checkpoint_date) < new Date());

  const handleCreateCheckpoint = async () => {
    if (!checkpointForm.checkpoint_date || !checkpointForm.topic) return;
    
    await createCheckpoint({
      account_id: accountId,
      checkpoint_date: checkpointForm.checkpoint_date,
      topic: checkpointForm.topic,
      summary: checkpointForm.summary || null,
      notes: checkpointForm.notes || null,
      status: 'scheduled',
    });
    
    setNewCheckpointOpen(false);
    setCheckpointForm({ checkpoint_date: "", topic: "", summary: "", notes: "" });
  };

  const handleCreateAction = async () => {
    if (!actionForm.title || !actionForm.responsible || !selectedCheckpointId) return;
    
    await createAction({
      checkpoint_id: selectedCheckpointId,
      account_id: accountId,
      title: actionForm.title,
      description: actionForm.description || null,
      responsible: actionForm.responsible,
      due_date: actionForm.due_date || null,
      status: 'pending',
    });
    
    setNewActionOpen(false);
    setActionForm({ title: "", description: "", responsible: "", due_date: "" });
    setSelectedCheckpointId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Em Andamento</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'scheduled':
        return <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" />Agendado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Próximos Checkpoints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Próximos</CardTitle>
            <CardDescription>Checkpoints agendados</CardDescription>
          </div>
          {canManage && (
            <Dialog open={newCheckpointOpen} onOpenChange={setNewCheckpointOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Checkpoint</DialogTitle>
                  <DialogDescription>
                    Agende uma nova reunião de acompanhamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={checkpointForm.checkpoint_date}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, checkpoint_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pauta</Label>
                    <Input
                      value={checkpointForm.topic}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, topic: e.target.value })}
                      placeholder="Ex: Revisão de valores"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resumo (opcional)</Label>
                    <Textarea
                      value={checkpointForm.summary}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, summary: e.target.value })}
                      placeholder="Resumo da reunião..."
                    />
                  </div>
                  {canManage && (
                    <div className="space-y-2">
                      <Label>Notas Internas (só para consultoria)</Label>
                      <Textarea
                        value={checkpointForm.notes}
                        onChange={(e) => setCheckpointForm({ ...checkpointForm, notes: e.target.value })}
                        placeholder="Notas privadas..."
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNewCheckpointOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCheckpoint} disabled={!checkpointForm.checkpoint_date || !checkpointForm.topic}>
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {upcomingCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum checkpoint agendado
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingCheckpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatBRT(new Date(checkpoint.checkpoint_date), "dd/MM/yyyy")}
                    </span>
                    {getStatusBadge(checkpoint.status)}
                  </div>
                  <p className="text-sm">{checkpoint.topic}</p>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateCheckpoint(checkpoint.id, { status: 'completed' })}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCheckpointId(checkpoint.id);
                          setNewActionOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Pendentes</CardTitle>
          <CardDescription>Itens a serem concluídos</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma ação pendente
            </p>
          ) : (
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <div key={action.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Responsável: {action.responsible}
                      </p>
                      {action.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Prazo: {formatBRT(new Date(action.due_date), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateAction(action.id, { status: 'completed' })}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico</CardTitle>
          <CardDescription>Checkpoints anteriores</CardDescription>
        </CardHeader>
        <CardContent>
          {pastCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum checkpoint concluído
            </p>
          ) : (
            <div className="space-y-3">
              {pastCheckpoints.slice(0, 5).map((checkpoint) => (
                <div key={checkpoint.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatBRT(new Date(checkpoint.checkpoint_date), "dd/MM/yyyy")}
                    </span>
                    {getStatusBadge(checkpoint.status)}
                  </div>
                  <p className="text-sm">{checkpoint.topic}</p>
                  {checkpoint.summary && (
                    <p className="text-xs text-muted-foreground">{checkpoint.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para nova ação */}
      <Dialog open={newActionOpen} onOpenChange={(open) => {
        setNewActionOpen(open);
        if (!open) setSelectedCheckpointId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ação</DialogTitle>
            <DialogDescription>
              Adicione uma ação ao checkpoint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={actionForm.title}
                onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                placeholder="Ex: Revisar missão"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={actionForm.responsible}
                onChange={(e) => setActionForm({ ...actionForm, responsible: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={actionForm.due_date}
                onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewActionOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAction} disabled={!actionForm.title || !actionForm.responsible}>
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
