import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  FunnelVisualizer,
  FunnelStageList,
  FunnelSelector,
  FunnelForm,
} from '@/components/contratacao/funil';
import { useHiringFunnels } from '@/hooks/useHiringFunnels';
import { PageGamificationBanner } from '@/components/gamification';

export default function FunilContratacao() {
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleCreateFunnel = async (name: string, description?: string, copyFromFunnelId?: string) => {
    await createFunnel(name, description, copyFromFunnelId);
    setIsCreateOpen(false);
  };

  const handleUpdateFunnel = async (name: string, description?: string) => {
    if (selectedFunnel) {
      await updateFunnel(selectedFunnel.id, { name, description });
      setIsEditOpen(false);
    }
  };

  const handleDeleteFunnel = async () => {
    if (selectedFunnel) {
      await deleteFunnel(selectedFunnel.id);
      setIsDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <AppLayout
        title="Funil de Contratação"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contratação", href: "/atracao-contratacao/contratacao" }, { label: "Funil de Contratação" }]}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Funil de Contratação"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Contratação", href: "/atracao-contratacao/contratacao" }, { label: "Funil de Contratação" }]}
    >
      <div className="space-y-6">
        <PageGamificationBanner journeyId="atracao" stepId="funil" />
        
        {/* Header with selector */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FunnelSelector
              funnels={funnels}
              selectedFunnel={selectedFunnel}
              onSelect={setSelectedFunnel}
              onCreateNew={() => setIsCreateOpen(true)}
            />
            {selectedFunnel && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  title="Editar funil"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDeleteOpen(true)}
                  title="Excluir funil"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {selectedFunnel?.description && (
            <p className="text-sm text-muted-foreground">{selectedFunnel.description}</p>
          )}
        </div>

        {/* Main content */}
        {!selectedFunnel && funnels.length === 0 ? (
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-xl">Crie seu primeiro funil</CardTitle>
              <CardDescription>
                Estruture visualmente as etapas do seu processo seletivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateOpen(true)}>
                Criar Funil
              </Button>
            </CardContent>
          </Card>
        ) : selectedFunnel ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editable List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Etapas</CardTitle>
                <CardDescription>
                  Arraste para reordenar, clique para editar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelStageList
                  stages={stages}
                  onReorder={reorderStages}
                  onAdd={addStage}
                  onUpdate={updateStage}
                  onDelete={deleteStage}
                />
              </CardContent>
            </Card>

            {/* Visual Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Visualização</CardTitle>
                <CardDescription>
                  Representação visual do seu funil de contratação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelVisualizer stages={stages} />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Create Funnel Dialog */}
        <FunnelForm
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleCreateFunnel}
          existingFunnels={funnels}
        />

        {/* Edit Funnel Dialog */}
        <FunnelForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={() => {}}
          onUpdate={handleUpdateFunnel}
          existingFunnels={funnels}
          editingFunnel={selectedFunnel}
        />

        {/* Delete Funnel Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir funil "{selectedFunnel?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O funil e todas as suas etapas serão removidos permanentemente.
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
    </AppLayout>
  );
}
