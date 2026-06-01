import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionPlan } from '@/types/action-plan.types';
import { ActionPlanRow } from './ActionPlanRow';

interface ActionPlanTableProps {
  actions: ActionPlan[];
  loading: boolean;
  onEdit: (action: ActionPlan) => void;
  onDelete: (id: string) => void;
}

export function ActionPlanTable({ actions, loading, onEdit, onDelete }: ActionPlanTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Nenhuma ação cadastrada</p>
        <p className="text-sm mt-1">Clique em "Adicionar Ação" para começar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Título</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actions.map((action) => (
          <ActionPlanRow
            key={action.id}
            action={action}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}
