import { useState, useRef } from 'react';
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
  OrgChartSelector,
  OrgChartForm,
  OrgChartCanvas,
} from '@/components/contratacao/organograma';
import { useOrgCharts } from '@/hooks/useOrgCharts';
import { PageGamificationBanner } from '@/components/gamification';

export default function Organograma() {
  const {
    orgCharts,
    selectedChart,
    setSelectedChart,
    nodes,
    loading,
    createChart,
    updateChart,
    deleteChart,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    getTreeStructure,
  } = useOrgCharts();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleCreateChart = async (name: string, description?: string) => {
    await createChart(name, description);
    setIsCreateOpen(false);
  };

  const handleUpdateChart = async (name: string, description?: string) => {
    if (selectedChart) {
      await updateChart(selectedChart.id, { name, description });
      setIsEditOpen(false);
    }
  };

  const handleDeleteChart = async () => {
    if (selectedChart) {
      await deleteChart(selectedChart.id);
      setIsDeleteOpen(false);
    }
  };

  const tree = getTreeStructure();

  if (loading) {
    return (
      <AppLayout
        title="Organograma"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contratação", href: "/atracao-contratacao/contratacao" }, { label: "Organograma" }]}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[500px]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Organograma"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Contratação", href: "/atracao-contratacao/contratacao" }, { label: "Organograma" }]}
    >
      <div className="space-y-4">
        <PageGamificationBanner journeyId="atracao" stepId="organograma" />
        
        {/* Header with selector */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <OrgChartSelector
              charts={orgCharts}
              selectedChart={selectedChart}
              onSelect={setSelectedChart}
              onCreateNew={() => setIsCreateOpen(true)}
            />
            {selectedChart && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  title="Editar organograma"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDeleteOpen(true)}
                  title="Excluir organograma"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {selectedChart?.description && (
            <p className="text-sm text-muted-foreground">{selectedChart.description}</p>
          )}
        </div>

        {/* Main content */}
        {!selectedChart && orgCharts.length === 0 ? (
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-xl">Crie seu primeiro organograma</CardTitle>
              <CardDescription>
                Visualize a estrutura hierárquica da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateOpen(true)}>
                Criar Organograma
              </Button>
            </CardContent>
          </Card>
        ) : selectedChart ? (
          <OrgChartCanvas
            tree={tree}
            chartId={selectedChart.id}
            chartName={selectedChart.name}
            onAddNode={addNode}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
            onMoveNode={moveNode}
            allNodes={nodes}
            // Fullscreen chart management
            charts={orgCharts}
            selectedChart={selectedChart}
            onSelectChart={setSelectedChart}
            onCreateNewChart={() => setIsCreateOpen(true)}
            onEditChart={() => setIsEditOpen(true)}
            onDeleteChart={() => setIsDeleteOpen(true)}
          />
        ) : null}

        {/* Create Chart Dialog */}
        <OrgChartForm
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleCreateChart}
        />

        {/* Edit Chart Dialog */}
        <OrgChartForm
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={() => {}}
          onUpdate={handleUpdateChart}
          editingChart={selectedChart}
        />

        {/* Delete Chart Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir organograma "{selectedChart?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O organograma e todos os cargos serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteChart}
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
