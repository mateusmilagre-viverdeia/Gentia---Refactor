
import { Pencil, Trash2, AlertTriangle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ActionPlan, ActionPlanStatus, ActionPlanPriority } from '@/types/action-plan.types';
import { formatBRT } from "@/lib/datetime";

interface ActionPlanRowProps {
  action: ActionPlan;
  onEdit: (action: ActionPlan) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<ActionPlanStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  planejada: { label: 'Planejada', variant: 'outline' },
  em_andamento: { label: 'Em Andamento', variant: 'secondary' },
  concluida: { label: 'Concluída', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

const PRIORITY_CONFIG: Record<ActionPlanPriority, { label: string; icon: React.ReactNode; className: string }> = {
  baixa: { label: 'Baixa', icon: <ArrowDown className="h-4 w-4" />, className: 'text-green-600' },
  media: { label: 'Média', icon: <ArrowRight className="h-4 w-4" />, className: 'text-yellow-600' },
  alta: { label: 'Alta', icon: <ArrowUp className="h-4 w-4" />, className: 'text-orange-600' },
  urgente: { label: 'Urgente', icon: <AlertTriangle className="h-4 w-4" />, className: 'text-red-600' },
};

export function ActionPlanRow({ action, onEdit, onDelete }: ActionPlanRowProps) {
  const statusConfig = STATUS_CONFIG[action.status];
  const priorityConfig = PRIORITY_CONFIG[action.priority];

  return (
    <TableRow>
      <TableCell className="font-medium max-w-[250px]">
        <div className="truncate" title={action.title}>
          {action.title}
        </div>
        {action.description && (
          <div className="text-xs text-muted-foreground truncate" title={action.description}>
            {action.description}
          </div>
        )}
      </TableCell>
      <TableCell>{action.responsible}</TableCell>
      <TableCell>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </TableCell>
      <TableCell>
        {action.deadline
          ? formatBRT(new Date(action.deadline), 'dd/MM/yyyy')
          : '-'}
      </TableCell>
      <TableCell>
        <div className={`flex items-center gap-1 ${priorityConfig.className}`}>
          {priorityConfig.icon}
          <span className="text-sm">{priorityConfig.label}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(action)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Excluir">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação será excluída permanentemente. Deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(action.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
