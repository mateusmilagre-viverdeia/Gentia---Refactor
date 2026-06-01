import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useActionPlans } from '@/hooks/useActionPlans';
import { ActionPlanFilters, ActionPlanForm, ActionPlanTable } from '@/components/plano-acao';
import { ActionPlan, ActionPlanFormData } from '@/types/action-plan.types';

const PlanoDeAcao = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionPlan | null>(null);
  
  const {
    actions,
    loading,
    statusFilter,
    setStatusFilter,
    createAction,
    updateAction,
    deleteAction,
    getStatusCounts,
    refetch,
  } = useActionPlans();

  // Refetch when filter changes to get fresh counts
  useEffect(() => {
    refetch();
  }, [statusFilter]);

  const handleOpenForm = (action?: ActionPlan) => {
    setEditingAction(action || null);
    setFormOpen(true);
  };

  const handleSubmit = async (data: ActionPlanFormData) => {
    if (editingAction) {
      return await updateAction(editingAction.id, data);
    }
    return await createAction(data);
  };

  const handleDelete = async (id: string) => {
    await deleteAction(id);
  };

  return (
    <AppLayout title="Plano de Ação" breadcrumb={[{ label: "Home", href: "/" }, { label: "Plano de Ação" }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ações Estratégicas</h2>
            <p className="text-muted-foreground mt-1">
              Gerencie as ações relacionadas à implementação da cultura organizacional
            </p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ação
          </Button>
        </div>

        <ActionPlanFilters
          currentFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={getStatusCounts()}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ações</CardTitle>
            <CardDescription>Acompanhe o progresso das iniciativas de cultura</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionPlanTable
              actions={actions}
              loading={loading}
              onEdit={handleOpenForm}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>

      <ActionPlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editingAction={editingAction}
      />
    </AppLayout>
  );
};

export default PlanoDeAcao;
