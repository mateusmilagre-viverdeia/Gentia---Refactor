import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Calendar, Briefcase, Mail, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOffboardingCases } from '@/hooks/useOffboardingCases';
import { useOffboardingTasks } from '@/hooks/useOffboardingTasks';
import { OffboardingChecklist, OffboardingSurveyBlock } from '@/components/offboarding';
import { getOffboardingStatusLabel, getOffboardingStatusColor, getTerminationTypeLabel } from '@/types/offboarding.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { formatBRT } from "@/lib/datetime";

export default function OffboardingDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { useCaseWithDetails, completeCase, cancelCase, resendSurvey } = useOffboardingCases();
  const { completeTask, uncompleteTask, skipTask } = useOffboardingTasks();

  const { data: caseData, isLoading, error } = useCaseWithDetails(caseId);

  const isUpdating = 
    completeCase.isPending || 
    cancelCase.isPending ||
    completeTask.isPending ||
    uncompleteTask.isPending ||
    skipTask.isPending;

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !caseData) {
    return (
      <AppLayout title="Erro">
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Erro ao carregar offboarding</h1>
          <p className="text-muted-foreground mt-2">
            {error?.message || 'Processo não encontrado'}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/retencao/offboarding')}
          >
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleComplete = () => {
    if (caseId) completeCase.mutate(caseId);
  };

  const handleCancel = () => {
    if (caseId) {
      cancelCase.mutate(caseId, {
        onSuccess: () => navigate('/retencao/offboarding'),
      });
    }
  };

  const handleTaskComplete = (taskId: string) => {
    completeTask.mutate({ id: taskId, case_id: caseId! });
  };

  const handleTaskUncomplete = (taskId: string) => {
    uncompleteTask.mutate({ id: taskId, case_id: caseId! });
  };

  const handleTaskSkip = (taskId: string) => {
    skipTask.mutate({ id: taskId, case_id: caseId! });
  };

  const handleResendSurvey = async () => {
    if (caseId) {
      await resendSurvey.mutateAsync(caseId);
    }
  };

  const tasks = caseData.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <AppLayout
      title={caseData.employee_name}
      breadcrumb={[
        { label: 'Retenção', href: '/retencao' },
        { label: 'Offboarding', href: '/retencao/offboarding' },
        { label: caseData.employee_name },
      ]}
    >
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/retencao/offboarding')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{caseData.employee_name}</h1>
              <Badge className={getOffboardingStatusColor(caseData.status as any)}>
                {getOffboardingStatusLabel(caseData.status as any)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {getTerminationTypeLabel(caseData.termination_type)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {caseData.status === 'active' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={isUpdating || progress < 100}
                >
                  Concluir
                </Button>
              </>
            )}
            {caseData.status === 'draft' && (
              <Button 
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Excluir Rascunho
              </Button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="font-medium">{caseData.employee_name}</p>
              </div>
            </CardContent>
          </Card>
          
          {caseData.department && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Departamento</p>
                  <p className="font-medium">{caseData.department}</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {caseData.employee_email && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm truncate">{caseData.employee_email}</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Último Dia</p>
                <p className="font-medium">
                  {formatBRT(new Date(caseData.last_day), "dd/MM/yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Checklist */}
          <OffboardingChecklist
            tasks={tasks}
            isLoading={false}
            onCompleteTask={handleTaskComplete}
            onUncompleteTask={handleTaskUncomplete}
            onSkipTask={handleTaskSkip}
            isUpdating={isUpdating}
          />

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Survey Block */}
            <OffboardingSurveyBlock
              caseId={caseId!}
              surveyStatus={caseData.survey_status}
              employeeName={caseData.employee_name}
              employeeEmail={caseData.employee_email || undefined}
              onResendSurvey={handleResendSurvey}
              isResending={resendSurvey.isPending}
            />

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cronograma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {caseData.notice_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Data do Aviso</span>
                    <span className="text-sm font-medium">
                      {formatBRT(new Date(caseData.notice_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Último Dia</span>
                  <span className="text-sm font-medium">
                    {formatBRT(new Date(caseData.last_day), "dd/MM/yyyy")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Progresso</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tarefas Concluídas</span>
                  <span className="text-sm font-medium">{completedTasks} de {tasks.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {caseData.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {caseData.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
