import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, User, Briefcase } from "lucide-react";

import type { OnboardingProcessWithTasks } from "@/hooks/useOnboardingProcesses";
import { formatBRT } from "@/lib/datetime";
interface OnboardingProcessListProps {
  processes: OnboardingProcessWithTasks[];
  isLoading: boolean;
  title: string;
  emptyMessage: string;
  showLimit?: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-blue-500">Ativo</Badge>;
    case 'completed':
      return <Badge className="bg-green-500">Concluído</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelado</Badge>;
    case 'draft':
      return <Badge variant="outline">Rascunho</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const calculateProgress = (process: OnboardingProcessWithTasks) => {
  const tasks = process.onboarding_tasks || [];
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
};

export const OnboardingProcessList = ({
  processes,
  isLoading,
  title,
  emptyMessage,
  showLimit,
}: OnboardingProcessListProps) => {
  const navigate = useNavigate();
  
  const displayProcesses = showLimit ? processes.slice(0, showLimit) : processes;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {processes.length} {processes.length === 1 ? 'processo' : 'processos'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayProcesses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/retencao/onboarding/novo')}
            >
              Criar primeiro onboarding
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayProcesses.map((process) => {
              const progress = calculateProgress(process);
              
              return (
                <div 
                  key={process.id}
                  className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/retencao/onboarding/${process.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-lg">{process.employee_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {process.employee_role && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {process.employee_role}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatBRT(new Date(process.start_date), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(process.status)}
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  {process.leader_name && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Líder: {process.leader_name}
                    </p>
                  )}
                </div>
              );
            })}
            
            {showLimit && processes.length > showLimit && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/retencao/onboarding?tab=completed')}
              >
                Ver todos ({processes.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
