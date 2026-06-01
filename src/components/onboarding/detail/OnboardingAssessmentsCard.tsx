import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Mountain, 
  Play, 
  Eye,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';
import { useOnboardingAssessments, OnboardingAssessmentStatus } from '@/hooks/useOnboardingAssessments';
import { useNavigate } from 'react-router-dom';

interface OnboardingAssessmentsCardProps {
  processId: string;
  employeeName: string;
  employeeEmail?: string;
}

export function OnboardingAssessmentsCard({
  processId,
  employeeName,
  employeeEmail
}: OnboardingAssessmentsCardProps) {
  const navigate = useNavigate();
  const { 
    assessmentStatus, 
    isLoading, 
    createDISCSession, 
    createQASession 
  } = useOnboardingAssessments(processId);

  const handleStartDISC = async () => {
    if (assessmentStatus.disc.session_id) {
      navigate(`/retencao/assessment-disc?session=${assessmentStatus.disc.session_id}`);
    } else {
      const session = await createDISCSession.mutateAsync({
        participantName: employeeName,
        participantEmail: employeeEmail
      });
      navigate(`/retencao/assessment-disc?session=${session.id}`);
    }
  };

  const handleStartQA = async () => {
    if (assessmentStatus.qa.session_id) {
      navigate(`/retencao/assessment-qa?session=${assessmentStatus.qa.session_id}`);
    } else {
      const session = await createQASession.mutateAsync({
        participantName: employeeName,
        participantEmail: employeeEmail
      });
      navigate(`/retencao/assessment-qa?session=${session.id}`);
    }
  };

  const handleViewDISCResult = () => {
    if (assessmentStatus.disc.session_id) {
      navigate(`/retencao/disc-results/${assessmentStatus.disc.session_id}`);
    }
  };

  const handleViewQAResult = () => {
    if (assessmentStatus.qa.session_id) {
      navigate(`/retencao/qa-results/${assessmentStatus.qa.session_id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Assessments do Colaborador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* DISC Card */}
          <AssessmentCard
            title="DISC"
            description="Perfil comportamental"
            icon={<Target className="h-5 w-5" />}
            status={assessmentStatus.disc.status}
            result={assessmentStatus.disc.result ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold">
                    {assessmentStatus.disc.result.primary_profile}
                    {assessmentStatus.disc.result.secondary_profile && 
                      `/${assessmentStatus.disc.result.secondary_profile}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({assessmentStatus.disc.result.intensity})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <ScoreBar label="D" value={assessmentStatus.disc.result.d_normalized} color="bg-red-500" />
                  <ScoreBar label="I" value={assessmentStatus.disc.result.i_normalized} color="bg-yellow-500" />
                  <ScoreBar label="S" value={assessmentStatus.disc.result.s_normalized} color="bg-green-500" />
                  <ScoreBar label="C" value={assessmentStatus.disc.result.c_normalized} color="bg-blue-500" />
                </div>
              </div>
            ) : undefined}
            onStart={handleStartDISC}
            onViewResult={handleViewDISCResult}
            isCreating={createDISCSession.isPending}
          />

          {/* QA Card */}
          <AssessmentCard
            title="QA"
            description="Quociente de Adversidade"
            icon={<Mountain className="h-5 w-5" />}
            status={assessmentStatus.qa.status}
            result={assessmentStatus.qa.result ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold capitalize">
                    {assessmentStatus.qa.result.profile}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    QA: {assessmentStatus.qa.result.qa_total}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <ScoreBar label="C" value={assessmentStatus.qa.result.c_score * 2} color="bg-purple-500" max={100} />
                  <ScoreBar label="R" value={assessmentStatus.qa.result.r_score * 2} color="bg-indigo-500" max={100} />
                  <ScoreBar label="A" value={assessmentStatus.qa.result.a_score * 2} color="bg-teal-500" max={100} />
                  <ScoreBar label="D" value={assessmentStatus.qa.result.d_score * 2} color="bg-orange-500" max={100} />
                </div>
              </div>
            ) : undefined}
            onStart={handleStartQA}
            onViewResult={handleViewQAResult}
            isCreating={createQASession.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface AssessmentCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed';
  result?: React.ReactNode;
  onStart: () => void;
  onViewResult: () => void;
  isCreating: boolean;
}

function AssessmentCard({ 
  title, 
  description, 
  icon, 
  status, 
  result,
  onStart, 
  onViewResult,
  isCreating 
}: AssessmentCardProps) {
  const statusConfig = {
    pending: { 
      label: 'Pendente', 
      variant: 'secondary' as const,
      icon: <Clock className="h-3 w-3" />
    },
    in_progress: { 
      label: 'Em Andamento', 
      variant: 'default' as const,
      icon: <Play className="h-3 w-3" />
    },
    completed: { 
      label: 'Concluído', 
      variant: 'default' as const,
      icon: <CheckCircle2 className="h-3 w-3" />
    }
  };

  const config = statusConfig[status];

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge 
          variant={config.variant} 
          className={status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
        >
          {config.icon}
          <span className="ml-1">{config.label}</span>
        </Badge>
      </div>

      {result && status === 'completed' && (
        <div className="pt-2 border-t">
          {result}
        </div>
      )}

      <div className="pt-2">
        {status === 'completed' ? (
          <Button variant="outline" size="sm" className="w-full" onClick={onViewResult}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="w-full" 
            onClick={onStart}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {status === 'in_progress' ? 'Continuar' : 'Iniciar'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
  max?: number;
}

function ScoreBar({ label, value, color, max = 100 }: ScoreBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="text-center">
      <div className="text-muted-foreground mb-1">{label}</div>
      <div className="h-12 w-full bg-muted rounded relative">
        <div 
          className={`absolute bottom-0 left-0 right-0 ${color} rounded transition-all`}
          style={{ height: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 font-medium">{Math.round(value)}</div>
    </div>
  );
}
