import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MessageSquare,
  User,
  Briefcase,
} from 'lucide-react';
import { isPast, isToday } from "date-fns";
import { cn } from '@/lib/utils';
import type { 
  OnboardingCheckpointWithResponses,
  OnboardingCheckpointStatus,
} from '@/types/onboarding.types';
import { 
  getCheckpointStatusLabel, 
  getCheckpointStatusColor,
} from '@/types/onboarding.types';
import { CheckpointFormModal } from './CheckpointFormModal';
import { formatBRT } from "@/lib/datetime";

interface CheckpointCardProps {
  checkpoint: OnboardingCheckpointWithResponses;
  processId: string;
  onStatusUpdate?: (id: string, status: OnboardingCheckpointStatus) => void;
  onResponseSubmit?: () => void;
  isUpdating?: boolean;
}

export function CheckpointCard({
  checkpoint,
  processId,
  onStatusUpdate,
  onResponseSubmit,
  isUpdating,
}: CheckpointCardProps) {
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showLeaderForm, setShowLeaderForm] = useState(false);

  const scheduledDate = new Date(checkpoint.scheduled_date);
  const isOverdue = isPast(scheduledDate) && checkpoint.status === 'pending';
  const isDueToday = isToday(scheduledDate);

  const employeeResponse = checkpoint.responses.find(r => r.respondent_type === 'employee');
  const leaderResponse = checkpoint.responses.find(r => r.respondent_type === 'leader');

  const getStatusIcon = () => {
    switch (checkpoint.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'attention':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusEmoji = () => {
    switch (checkpoint.status) {
      case 'completed':
        return '🟢';
      case 'at_risk':
        return '🔴';
      case 'attention':
        return '🟡';
      default:
        return '⏳';
    }
  };

  const calculateAverageScore = (response: typeof employeeResponse) => {
    if (!response) return null;
    const scores = [
      response.feeling_score,
      response.role_clarity_score,
      response.team_integration_score,
      response.work_preparation_score,
      response.delivery_quality_score,
      response.culture_adherence_score,
      response.autonomy_score,
    ].filter((s): s is number => s !== null);
    
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  return (
    <>
      <Card className={cn(
        'transition-all',
        isOverdue && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
        isDueToday && checkpoint.status === 'pending' && 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20',
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getStatusEmoji()}</span>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Dia {checkpoint.checkpoint_day}
                  <span className="text-muted-foreground font-normal">—</span>
                  {checkpoint.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatBRT(scheduledDate, "d 'de' MMMM")}
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Atrasado
                    </Badge>
                  )}
                  {isDueToday && checkpoint.status === 'pending' && (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                      Hoje
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge className={getCheckpointStatusColor(checkpoint.status)}>
              {getStatusLabel(checkpoint.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {checkpoint.description && (
            <p className="text-sm text-muted-foreground">{checkpoint.description}</p>
          )}

          {/* Response Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Employee Response */}
            <div className={cn(
              'p-3 rounded-lg border',
              employeeResponse ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Colaborador</span>
                </div>
                {employeeResponse && (
                  <Badge variant="secondary" className="text-xs">
                    {calculateAverageScore(employeeResponse)}/10
                  </Badge>
                )}
              </div>
              
              {employeeResponse ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Respondido em {formatBRT(new Date(employeeResponse.responded_at), "d/MM 'às' HH:mm")}
                  </div>
                  {employeeResponse.additional_notes && (
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 mt-0.5" />
                      <span className="line-clamp-2">{employeeResponse.additional_notes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => setShowEmployeeForm(true)}
                  disabled={isUpdating}
                >
                  Responder como Colaborador
                </Button>
              )}
            </div>

            {/* Leader Response */}
            <div className={cn(
              'p-3 rounded-lg border',
              leaderResponse ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' : 'bg-muted/50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Líder</span>
                </div>
                {leaderResponse && (
                  <Badge variant="secondary" className="text-xs">
                    {calculateAverageScore(leaderResponse)}/10
                  </Badge>
                )}
              </div>
              
              {leaderResponse ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Respondido em {formatBRT(new Date(leaderResponse.responded_at), "d/MM 'às' HH:mm")}
                  </div>
                  {leaderResponse.additional_notes && (
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 mt-0.5" />
                      <span className="line-clamp-2">{leaderResponse.additional_notes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => setShowLeaderForm(true)}
                  disabled={isUpdating}
                >
                  Responder como Líder
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar if both can respond */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso do checkpoint</span>
              <span>{checkpoint.responses.length}/2 respostas</span>
            </div>
            <Progress value={(checkpoint.responses.length / 2) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CheckpointFormModal
        open={showEmployeeForm}
        onOpenChange={setShowEmployeeForm}
        checkpoint={checkpoint}
        respondentType="employee"
        onSuccess={() => {
          setShowEmployeeForm(false);
          onResponseSubmit?.();
        }}
      />

      <CheckpointFormModal
        open={showLeaderForm}
        onOpenChange={setShowLeaderForm}
        checkpoint={checkpoint}
        respondentType="leader"
        onSuccess={() => {
          setShowLeaderForm(false);
          onResponseSubmit?.();
        }}
      />
    </>
  );
}

function getStatusLabel(status: OnboardingCheckpointStatus): string {
  return getCheckpointStatusLabel(status);
}
