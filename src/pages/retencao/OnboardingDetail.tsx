import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Building2, Briefcase, User, UserPlus, Target } from 'lucide-react';
import {
  OnboardingHeader,
  OnboardingProgress,
  OnboardingPhaseCard,
  OnboardingTimeline,
  CheckpointsSection,
  EvaluationSummaryCard,
  OnboardingAssessmentsCard,
} from '@/components/onboarding/detail';
import { EmployeeView, LeaderView, HRView } from '@/components/onboarding/views';
import { useOnboardingProcesses } from '@/hooks/useOnboardingProcesses';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { useOnboardingCheckpoints } from '@/hooks/useOnboardingCheckpoints';
import { useOnboardingAlerts } from '@/hooks/useOnboardingAlerts';
import { useOnboardingSuccessMetrics } from '@/hooks/useOnboardingSuccessMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function OnboardingDetail() {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();

  const { 
    useProcessWithDetails, 
    startProcess, 
    completeProcess, 
    cancelProcess 
  } = useOnboardingProcesses();

  const { 
    completeTask, 
    uncompleteTask, 
    skipTask, 
    updatePhaseStatus 
  } = useOnboardingTasks();

  const { data: process, isLoading, error } = useProcessWithDetails(processId);
  
  const { checkpoints, refetch: refetchCheckpoints } = useOnboardingCheckpoints(processId);
  const { alerts } = useOnboardingAlerts(processId);
  const { metrics } = useOnboardingSuccessMetrics(processId);
  const isUpdating = 
    startProcess.isPending || 
    completeProcess.isPending || 
    cancelProcess.isPending ||
    completeTask.isPending ||
    uncompleteTask.isPending ||
    skipTask.isPending ||
    updatePhaseStatus.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Erro ao carregar onboarding</h1>
        <p className="text-muted-foreground mt-2">
          {error?.message || 'Processo não encontrado'}
        </p>
      </div>
    );
  }

  const handleStart = () => {
    if (processId) startProcess.mutate(processId);
  };

  const handleComplete = () => {
    if (processId) completeProcess.mutate(processId);
  };

  const handleCancel = () => {
    if (processId) {
      cancelProcess.mutate(processId, {
        onSuccess: () => navigate('/retencao/onboarding'),
      });
    }
  };

  const handleTaskComplete = (taskId: string) => {
    completeTask.mutate({ id: taskId, processId: processId! });
  };

  const handleTaskUncomplete = (taskId: string) => {
    uncompleteTask.mutate({ id: taskId, processId: processId! });
  };

  const handleTaskSkip = (taskId: string) => {
    skipTask.mutate({ id: taskId, processId: processId! });
  };

  const handleUpdatePhaseStatus = (phaseId: string, status: 'pending' | 'in_progress' | 'completed') => {
    updatePhaseStatus.mutate({ phaseId, status, processId: processId! });
  };

  // Check if process came from recruitment
  const isFromRecruitment = !!(process as any).recruitment_candidate_id;

  return (
    <div className="container py-8 space-y-6">
      {/* Origin Badge */}
      {isFromRecruitment && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <UserPlus className="h-3 w-3" />
            Origem: Recrutamento
          </Badge>
          <Link 
            to="/recruitment/candidates" 
            className="text-xs text-muted-foreground hover:text-primary underline"
          >
            Ver candidatos
          </Link>
        </div>
      )}

      <OnboardingHeader
        process={process}
        onStart={handleStart}
        onComplete={handleComplete}
        onCancel={handleCancel}
        isUpdating={isUpdating}
        hasEvaluation={!!process.evaluation}
      />

      <OnboardingProgress phases={process.phases} />

      <Tabs defaultValue="rh" className="w-full">
        <TabsList>
          <TabsTrigger value="rh" className="gap-2">
            <Building2 className="h-4 w-4" />
            Visão RH
          </TabsTrigger>
          <TabsTrigger value="leader" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Visão Líder
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-2">
            <User className="h-4 w-4" />
            Visão Colaborador
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-2">
            <Target className="h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="rh" className="mt-6">
          <HRView 
            process={process} 
            checkpoints={checkpoints} 
            alerts={alerts}
            metrics={metrics}
          />
        </TabsContent>

        <TabsContent value="leader" className="mt-6">
          <LeaderView 
            process={process} 
            checkpoints={checkpoints}
            alerts={alerts}
            onCheckpointRefresh={refetchCheckpoints}
          />
        </TabsContent>

        <TabsContent value="employee" className="mt-6">
          <EmployeeView process={process} checkpoints={checkpoints} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-6">
          <OnboardingAssessmentsCard
            processId={process.id}
            employeeName={process.employee_name}
            employeeEmail={process.employee_email || undefined}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              {process.phases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma fase definida para este onboarding.</p>
                </div>
              ) : (
                process.phases.map((phase, index) => (
                  <OnboardingPhaseCard
                    key={phase.id}
                    phase={phase}
                    isFirst={index === 0}
                    isLast={index === process.phases.length - 1}
                    onTaskComplete={handleTaskComplete}
                    onTaskUncomplete={handleTaskUncomplete}
                    onTaskSkip={handleTaskSkip}
                    onUpdatePhaseStatus={handleUpdatePhaseStatus}
                    isUpdating={isUpdating}
                  />
                ))
              )}
            </div>
            <div className="space-y-4">
              <OnboardingTimeline process={process} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checkpoints" className="mt-6">
          <CheckpointsSection processId={process.id} startDate={process.start_date} />
        </TabsContent>

        {process.evaluation && (
          <TabsContent value="evaluation" className="mt-6">
            <EvaluationSummaryCard evaluation={process.evaluation} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
