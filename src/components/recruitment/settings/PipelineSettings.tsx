import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Info, GitBranch } from 'lucide-react';
import { FunnelSelector } from '@/components/contratacao/funil/FunnelSelector';
import { FunnelStageList } from '@/components/contratacao/funil/FunnelStageList';
import { FunnelVisualizer } from '@/components/contratacao/funil/FunnelVisualizer';
import { FunnelForm } from '@/components/contratacao/funil/FunnelForm';
import { useHiringFunnels } from '@/hooks/useHiringFunnels';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function PipelineSettings() {
  const {
    funnels,
    selectedFunnel,
    setSelectedFunnel,
    stages,
    loading,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
  } = useHiringFunnels();

  const [showFunnelForm, setShowFunnelForm] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCreateFunnel = async (name: string, description?: string, copyFromFunnelId?: string) => {
    await createFunnel(name, description, copyFromFunnelId);
    setShowFunnelForm(false);
  };

  const handleUpdateFunnelFromForm = async (name: string, description?: string) => {
    if (!selectedFunnel) return;
    await updateFunnel(selectedFunnel.id, { name, description });
    setEditingFunnel(false);
  };

  const handleDeleteFunnel = async () => {
    if (!selectedFunnel) return;
    
    try {
      await deleteFunnel(selectedFunnel.id);
      setShowDeleteDialog(false);
      toast.success('Funil excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir funil');
    }
  };

  const handleSetDefault = async (checked: boolean) => {
    if (!selectedFunnel) return;
    
    try {
      await updateFunnel(selectedFunnel.id, { is_default: checked });
      toast.success(checked ? 'Funil definido como padrão' : 'Funil removido como padrão');
    } catch (error) {
      toast.error('Erro ao atualizar funil');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Pipeline de Recrutamento
          </CardTitle>
          <CardDescription>
            Configure os funis e etapas do processo de recrutamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Funnel Selector and Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <FunnelSelector
              funnels={funnels}
              selectedFunnel={selectedFunnel}
              onSelect={setSelectedFunnel}
              onCreateNew={() => setShowFunnelForm(true)}
            />
            
            {selectedFunnel && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingFunnel(true)}
                  title="Editar funil"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Excluir funil"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button onClick={() => setShowFunnelForm(true)} className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funil
            </Button>
          </div>

          {/* Default Checkbox */}
          {selectedFunnel && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="default-funnel"
                checked={selectedFunnel.is_default || false}
                onCheckedChange={(checked) => handleSetDefault(!!checked)}
              />
              <Label htmlFor="default-funnel" className="text-sm cursor-pointer">
                Definir como funil padrão para novas vagas
              </Label>
            </div>
          )}

          {/* Stages and Visualization */}
          {selectedFunnel && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage List */}
              <div>
                <h3 className="text-sm font-medium mb-4">Etapas do Pipeline</h3>
                <FunnelStageList
                  stages={stages}
                  onReorder={reorderStages}
                  onAdd={addStage}
                  onUpdate={updateStage}
                  onDelete={deleteStage}
                />
              </div>

              {/* Funnel Visualization */}
              <div>
                <h3 className="text-sm font-medium mb-4">Visualização</h3>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <FunnelVisualizer stages={stages} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!selectedFunnel && funnels.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum funil criado</p>
              <p className="text-sm">Crie seu primeiro funil de recrutamento para começar</p>
              <Button onClick={() => setShowFunnelForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Funil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O funil padrão será aplicado automaticamente quando você criar novas vagas.
          Etapas do sistema (Aplicado, Contratado, Rejeitado) são adicionadas automaticamente ao pipeline.
        </AlertDescription>
      </Alert>

      {/* Create/Edit Funnel Form */}
      <FunnelForm
        open={showFunnelForm || editingFunnel}
        onOpenChange={(open) => {
          if (!open) {
            setShowFunnelForm(false);
            setEditingFunnel(false);
          }
        }}
        onSubmit={handleCreateFunnel}
        existingFunnels={funnels}
        editingFunnel={editingFunnel ? selectedFunnel : null}
        onUpdate={handleUpdateFunnelFromForm}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Funil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o funil "{selectedFunnel?.name}"?
              Esta ação não pode ser desfeita e todas as etapas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFunnel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
