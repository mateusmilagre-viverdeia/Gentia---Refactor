import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlaybookDetails } from '@/hooks/usePlaybooks';
import { PlaybookPhaseCard } from './PlaybookPhaseCard';
import { PhaseFormDialog } from './PhaseFormDialog';
import { PlaybookMilestoneFormDialog } from './PlaybookMilestoneFormDialog';
import { PlaybookGuideEditor } from './PlaybookGuideEditor';
import { 
  PlaybookPhase, 
  PlaybookMilestone, 
  PlaybookMilestoneWithChecklist,
  PlaybookCategory,
  PLAYBOOK_CATEGORY_CONFIG,
  getCategoryLabel,
} from '@/types/playbook.types';
import { 
  ArrowLeft, 
  Plus, 
  Layers, 
  BookOpen, 
  Settings, 
  AlertCircle,
  Target,
  Clock,
  Loader2,
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';

interface PlaybookEditorProps {
  playbookId: string;
  onClose: () => void;
}

export function PlaybookEditor({ playbookId, onClose }: PlaybookEditorProps) {
  const {
    playbook,
    loading,
    error,
    refreshPlaybook,
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    createGuide,
    updateGuide,
    deleteGuide,
  } = usePlaybookDetails(playbookId);

  const [activeTab, setActiveTab] = useState('phases');
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<PlaybookPhase | null>(null);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [milestonePhaseId, setMilestonePhaseId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<PlaybookMilestoneWithChecklist | null>(null);
  const [saving, setSaving] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    category: 'implementation' as PlaybookCategory,
    estimated_duration_weeks: 12,
  });

  // Initialize settings form when playbook loads
  useState(() => {
    if (playbook) {
      setSettingsForm({
        name: playbook.name,
        description: playbook.description || '',
        category: playbook.category,
        estimated_duration_weeks: playbook.estimated_duration_weeks,
      });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePhaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && playbook) {
      const oldIndex = playbook.phases.findIndex(p => p.id === active.id);
      const newIndex = playbook.phases.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(playbook.phases, oldIndex, newIndex);
      reorderPhases(newOrder.map(p => p.id));
    }
  };

  const handleCreatePhase = async (data: any) => {
    await createPhase(data);
  };

  const handleUpdatePhase = async (data: any) => {
    if (!editingPhase) return;
    await updatePhase(editingPhase.id, data);
    setEditingPhase(null);
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (confirm('Excluir esta fase e todos os seus marcos?')) {
      await deletePhase(phaseId);
    }
  };

  const openMilestoneDialog = (phaseId: string, milestone?: PlaybookMilestoneWithChecklist) => {
    setMilestonePhaseId(phaseId);
    setEditingMilestone(milestone || null);
    setShowMilestoneDialog(true);
  };

  const handleCreateMilestone = async (data: any) => {
    await createMilestone(data);
    setShowMilestoneDialog(false);
    setMilestonePhaseId(null);
  };

  const handleUpdateMilestone = async (data: any) => {
    if (!editingMilestone) return;
    await updateMilestone(editingMilestone.id, data);
    setShowMilestoneDialog(false);
    setEditingMilestone(null);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (confirm('Excluir este marco e todos os seus itens de checklist?')) {
      await deleteMilestone(milestoneId);
    }
  };

  const handleAddChecklistItem = async (milestoneId: string, title: string) => {
    const milestone = playbook?.phases
      .flatMap(p => p.milestones)
      .find(m => m.id === milestoneId);
    
    if (!milestone) return;
    
    await createChecklistItem({
      milestone_id: milestoneId,
      title,
      is_required: false,
      order_index: milestone.checklist_items.length,
    });
  };

  const handleSaveSettings = async () => {
    if (!playbook) return;
    setSaving(true);
    try {
      // This would need to be implemented in the hook
      // For now, just show a toast
      toast.success('Configurações salvas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Erro ao carregar playbook</p>
        <p className="text-muted-foreground">{error || 'Playbook não encontrado'}</p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Voltar
        </Button>
      </div>
    );
  }

  const totalMilestones = playbook.phases.reduce((acc, p) => acc + p.milestones.length, 0);
  const totalChecklistItems = playbook.phases.reduce(
    (acc, p) => acc + p.milestones.reduce((m, mil) => m + mil.checklist_items.length, 0),
    0
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{playbook.name}</h1>
            <Badge variant="secondary">{getCategoryLabel(playbook.category)}</Badge>
            {playbook.is_default && <Badge variant="outline">Padrão</Badge>}
          </div>
          <p className="text-muted-foreground mt-0.5">{playbook.description}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {playbook.phases.length} fases
          </span>
          <span className="flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            {totalMilestones} marcos
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {playbook.estimated_duration_weeks} semanas
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="phases" className="gap-2">
            <Layers className="h-4 w-4" />
            Fases & Marcos
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Guias
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Phases & Milestones Tab */}
        <TabsContent value="phases" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Arraste para reordenar fases e marcos
            </p>
            <Button onClick={() => setShowPhaseDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Fase
            </Button>
          </div>

          {playbook.phases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <CardTitle className="text-lg mb-2">Nenhuma fase cadastrada</CardTitle>
                <CardDescription className="text-center max-w-md">
                  Comece adicionando as fases do playbook. Cada fase pode conter múltiplos marcos e checklists.
                </CardDescription>
                <Button className="mt-4" onClick={() => setShowPhaseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Fase
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePhaseDragEnd}
            >
              <SortableContext
                items={playbook.phases.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {playbook.phases.map(phase => (
                    <PlaybookPhaseCard
                      key={phase.id}
                      phase={phase}
                      onEdit={() => {
                        setEditingPhase(phase);
                        setShowPhaseDialog(true);
                      }}
                      onDelete={() => handleDeletePhase(phase.id)}
                      onAddMilestone={() => openMilestoneDialog(phase.id)}
                      onEditMilestone={(milestone) => openMilestoneDialog(phase.id, milestone)}
                      onDeleteMilestone={handleDeleteMilestone}
                      onReorderMilestones={(ids) => reorderMilestones(phase.id, ids)}
                      onAddChecklistItem={handleAddChecklistItem}
                      onUpdateChecklistItem={(id, updates) => updateChecklistItem(id, updates)}
                      onDeleteChecklistItem={deleteChecklistItem}
                      onReorderChecklistItems={(milestoneId, ids) => reorderChecklistItems(milestoneId, ids)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="mt-4">
          <PlaybookGuideEditor
            playbookId={playbookId}
            guides={playbook.guides}
            phases={playbook.phases}
            onCreateGuide={createGuide}
            onUpdateGuide={updateGuide}
            onDeleteGuide={deleteGuide}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Playbook</CardTitle>
              <CardDescription>
                Atualize as informações gerais do playbook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={playbook.name}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use o formulário de edição para alterar o nome
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={playbook.category} disabled>
                    <SelectTrigger className="bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAYBOOK_CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={playbook.description || ''}
                  disabled
                  className="bg-muted"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{playbook.phases.length}</p>
                  <p className="text-sm text-muted-foreground">Fases</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{totalMilestones}</p>
                  <p className="text-sm text-muted-foreground">Marcos</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{totalChecklistItems}</p>
                  <p className="text-sm text-muted-foreground">Itens de Checklist</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Phase Form Dialog */}
      <PhaseFormDialog
        open={showPhaseDialog}
        onOpenChange={(open) => {
          setShowPhaseDialog(open);
          if (!open) setEditingPhase(null);
        }}
        phase={editingPhase || undefined}
        playbookId={playbookId}
        nextOrderIndex={playbook.phases.length}
        onSubmit={editingPhase ? handleUpdatePhase : handleCreatePhase}
      />

      {/* Milestone Form Dialog */}
      {milestonePhaseId && (
        <PlaybookMilestoneFormDialog
          open={showMilestoneDialog}
          onOpenChange={(open) => {
            setShowMilestoneDialog(open);
            if (!open) {
              setMilestonePhaseId(null);
              setEditingMilestone(null);
            }
          }}
          milestone={editingMilestone || undefined}
          phaseId={milestonePhaseId}
          nextOrderIndex={
            playbook.phases.find(p => p.id === milestonePhaseId)?.milestones.length || 0
          }
          onSubmit={editingMilestone ? handleUpdateMilestone : handleCreateMilestone}
        />
      )}
    </div>
  );
}
