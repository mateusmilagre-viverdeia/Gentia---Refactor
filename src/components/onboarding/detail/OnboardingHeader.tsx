import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ArrowLeft, 
  MoreVertical, 
  Play, 
  CheckCircle2, 
  XCircle,
  Edit,
  Award,
} from 'lucide-react';

import { 
  OnboardingProcess, 
  OnboardingStatus,
  getStatusLabel, 
  getStatusColor 
} from '@/types/onboarding.types';
import { EvaluationFormModal } from './EvaluationFormModal';
import { formatBRT } from "@/lib/datetime";

interface OnboardingHeaderProps {
  process: OnboardingProcess;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isUpdating: boolean;
  hasEvaluation?: boolean;
}

export function OnboardingHeader({
  process,
  onStart,
  onComplete,
  onCancel,
  isUpdating,
  hasEvaluation = false,
}: OnboardingHeaderProps) {
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  const canStart = process.status === 'draft';
  const canComplete = process.status === 'active';
  const canCancel = process.status !== 'cancelled' && process.status !== 'completed';
  const canEvaluate = (process.status === 'active' || process.status === 'completed') && !hasEvaluation;
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/retencao/onboarding')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{process.employee_name}</h1>
            <Badge className={getStatusColor(process.status)}>
              {getStatusLabel(process.status)}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {process.employee_role && (
              <span>{process.employee_role}</span>
            )}
            {process.employee_department && (
              <span>• {process.employee_department}</span>
            )}
            <span>
              • {formatBRT(new Date(process.start_date), "dd/MM/yyyy")} 
              {' - '}
              {formatBRT(new Date(process.end_date), "dd/MM/yyyy")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canStart && (
            <Button onClick={onStart} disabled={isUpdating}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Onboarding
            </Button>
          )}
          
          {canComplete && (
            <Button onClick={onComplete} disabled={isUpdating}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluir
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/retencao/onboarding/${process.id}/editar`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Dados
              </DropdownMenuItem>
              {canEvaluate && (
                <DropdownMenuItem onClick={() => setEvaluationModalOpen(true)}>
                  <Award className="h-4 w-4 mr-2" />
                  Avaliação Final
                </DropdownMenuItem>
              )}
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Onboarding
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O processo de onboarding de {process.employee_name} será cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancel();
                setCancelDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Onboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EvaluationFormModal
        open={evaluationModalOpen}
        onOpenChange={setEvaluationModalOpen}
        processId={process.id}
        employeeName={process.employee_name}
        onSuccess={() => setEvaluationModalOpen(false)}
      />
    </>
  );
}
