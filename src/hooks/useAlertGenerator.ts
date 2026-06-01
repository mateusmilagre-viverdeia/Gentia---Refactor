import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingAlerts } from '@/hooks/useOnboardingAlerts';
import type { 
  OnboardingPhaseWithTasks,
  OnboardingCheckpointWithResponses,
} from '@/types/onboarding.types';

interface AlertGeneratorProps {
  processId: string;
  phases: OnboardingPhaseWithTasks[];
  checkpoints?: OnboardingCheckpointWithResponses[];
  processStatus: string;
  endDate: string;
}

export function useAlertGenerator({
  processId,
  phases,
  checkpoints = [],
  processStatus,
  endDate,
}: AlertGeneratorProps) {
  const { createAlert, alerts } = useOnboardingAlerts(processId);

  useEffect(() => {
    if (processStatus !== 'active') return;

    const checkAndCreateAlerts = async () => {
      const today = new Date();
      const existingAlertTypes = new Set(alerts.filter(a => !a.resolved_at).map(a => `${a.alert_type}-${a.related_task_id || a.related_checkpoint_id || ''}`));

      // Check for delayed tasks
      phases.forEach(phase => {
        phase.tasks.forEach(task => {
          if (task.status === 'pending' || task.status === 'in_progress') {
            if (task.due_date && new Date(task.due_date) < today) {
              const alertKey = `task_delayed-${task.id}`;
              if (!existingAlertTypes.has(alertKey)) {
                createAlert.mutate({
                  process_id: processId,
                  alert_type: 'task_delayed',
                  severity: 'medium',
                  title: `Tarefa atrasada: ${task.title}`,
                  message: `A tarefa "${task.title}" está atrasada. Prazo era ${task.due_date}.`,
                  related_task_id: task.id,
                });
              }
            }
          }
        });
      });

      // Check for at-risk checkpoints
      checkpoints.forEach(checkpoint => {
        const scheduledDate = new Date(checkpoint.scheduled_date);
        const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (checkpoint.status === 'pending' && daysUntil < 0) {
          const alertKey = `checkpoint_at_risk-${checkpoint.id}`;
          if (!existingAlertTypes.has(alertKey)) {
            createAlert.mutate({
              process_id: processId,
              alert_type: 'checkpoint_at_risk',
              severity: 'high',
              title: `Checkpoint atrasado: Dia ${checkpoint.checkpoint_day}`,
              message: `O checkpoint "${checkpoint.name}" está atrasado e ainda não foi respondido.`,
              related_checkpoint_id: checkpoint.id,
            });
          }
        } else if (checkpoint.status === 'pending' && daysUntil <= 3 && daysUntil >= 0) {
          const alertKey = `checkpoint_pending-${checkpoint.id}`;
          if (!existingAlertTypes.has(alertKey)) {
            createAlert.mutate({
              process_id: processId,
              alert_type: 'checkpoint_pending',
              severity: 'low',
              title: `Checkpoint próximo: Dia ${checkpoint.checkpoint_day}`,
              message: `O checkpoint "${checkpoint.name}" deve ser realizado em ${daysUntil} dia(s).`,
              related_checkpoint_id: checkpoint.id,
            });
          }
        }

        // Check for missing leader feedback
        if (checkpoint.status !== 'pending') {
          const hasLeaderResponse = checkpoint.responses?.some(r => r.respondent_type === 'leader');
          if (!hasLeaderResponse && new Date(checkpoint.scheduled_date) < today) {
            const alertKey = `missing_leader_feedback-${checkpoint.id}`;
            if (!existingAlertTypes.has(alertKey)) {
              createAlert.mutate({
                process_id: processId,
                alert_type: 'missing_leader_feedback',
                severity: 'medium',
                title: `Feedback do líder pendente`,
                message: `O checkpoint "${checkpoint.name}" ainda não tem a avaliação do líder.`,
                related_checkpoint_id: checkpoint.id,
              });
            }
          }
        }
      });

      // Check if onboarding is past end date without completion
      if (new Date(endDate) < today && processStatus === 'active') {
        const alertKey = 'onboarding_not_closed-';
        if (!existingAlertTypes.has(alertKey)) {
          createAlert.mutate({
            process_id: processId,
            alert_type: 'onboarding_not_closed',
            severity: 'medium',
            title: 'Onboarding não encerrado',
            message: 'O período do onboarding já terminou mas o processo ainda não foi concluído.',
          });
        }
      }
    };

    // Run once on mount
    const timeoutId = setTimeout(checkAndCreateAlerts, 1000);
    return () => clearTimeout(timeoutId);
  }, [processId, processStatus, phases, checkpoints, endDate, alerts, createAlert]);
}
