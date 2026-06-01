import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Users } from "lucide-react";
import { useEmployeePositionsByModel, useEmployeePositions } from "@/hooks/useEmployeePositions";
import { EmployeesList } from "./EmployeesList";
import { EmployeePositionForm } from "./EmployeePositionForm";
import { SalaryHistoryDialog } from "./SalaryHistoryDialog";
import type { EmployeePositionWithDetails } from "@/hooks/useEmployeePositions";

interface EmployeesTabProps {
  modelId: string;
}

export function EmployeesTab({ modelId }: EmployeesTabProps) {
  const { data: employees, isLoading } = useEmployeePositionsByModel(modelId);
  const { createPosition, updatePosition, deletePosition } = useEmployeePositions();

  // Modal states
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeePositionWithDetails | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<EmployeePositionWithDetails | null>(null);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowPositionForm(true);
  };

  const handleEditEmployee = (employee: EmployeePositionWithDetails) => {
    setEditingEmployee(employee);
    setShowPositionForm(true);
  };

  const handleViewHistory = (employee: EmployeePositionWithDetails) => {
    setHistoryEmployee(employee);
  };

  const handleDeleteEmployee = async (id: string) => {
    await deletePosition.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando colaboradores...</div>
      </div>
    );
  }

  // Empty state
  if (!employees || employees.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Nenhum colaborador vinculado</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Vincule colaboradores a cargos e níveis para acompanhar posicionamento salarial e evolução.
            </p>
            <Button onClick={handleAddEmployee}>
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular Colaborador
            </Button>
          </CardContent>
        </Card>

        <EmployeePositionForm
          open={showPositionForm}
          onOpenChange={setShowPositionForm}
          modelId={modelId}
          employee={editingEmployee}
          onSubmit={async (data) => {
            if (editingEmployee) {
              await updatePosition.mutateAsync({ id: editingEmployee.id, ...data });
            } else {
              await createPosition.mutateAsync(data);
            }
            setShowPositionForm(false);
          }}
          isLoading={createPosition.isPending || updatePosition.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {employees.length} colaborador{employees.length !== 1 ? 'es' : ''} vinculado{employees.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onClick={handleAddEmployee}>
          <UserPlus className="h-4 w-4 mr-2" />
          Vincular Colaborador
        </Button>
      </div>

      {/* List */}
      <EmployeesList
        employees={employees}
        onEdit={handleEditEmployee}
        onViewHistory={handleViewHistory}
        onDelete={handleDeleteEmployee}
      />

      {/* Modals */}
      <EmployeePositionForm
        open={showPositionForm}
        onOpenChange={setShowPositionForm}
        modelId={modelId}
        employee={editingEmployee}
        onSubmit={async (data) => {
          if (editingEmployee) {
            await updatePosition.mutateAsync({ 
              id: editingEmployee.id, 
              ...data,
              previous_salary: editingEmployee.current_salary || undefined,
              record_history: data.current_salary !== editingEmployee.current_salary,
            });
          } else {
            await createPosition.mutateAsync(data);
          }
          setShowPositionForm(false);
        }}
        isLoading={createPosition.isPending || updatePosition.isPending}
      />

      <SalaryHistoryDialog
        open={!!historyEmployee}
        onOpenChange={(open) => !open && setHistoryEmployee(null)}
        employee={historyEmployee}
      />
    </div>
  );
}
