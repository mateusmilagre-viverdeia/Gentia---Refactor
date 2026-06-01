import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, User, Briefcase, FileText } from "lucide-react";

import type { OffboardingCaseWithDetails } from "@/types/offboarding.types";
import { getOffboardingStatusLabel, getOffboardingStatusColor, getTerminationTypeLabel, getSurveyStatusLabel, getSurveyStatusColor, OffboardingSurveyStatus } from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";

interface OffboardingCaseListProps {
  cases: OffboardingCaseWithDetails[];
  isLoading: boolean;
  title: string;
  emptyMessage: string;
  showLimit?: number;
}

const getStatusBadge = (status: string) => {
  const color = getOffboardingStatusColor(status as any);
  const label = getOffboardingStatusLabel(status as any);
  return <Badge className={color}>{label}</Badge>;
};

const getSurveyBadge = (status: string) => {
  const color = getSurveyStatusColor(status as OffboardingSurveyStatus);
  const label = getSurveyStatusLabel(status as OffboardingSurveyStatus);
  return <Badge variant="outline" className={color}>{label}</Badge>;
};

const calculateProgress = (caseItem: OffboardingCaseWithDetails) => {
  const tasks = caseItem.tasks || [];
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
};

export const OffboardingCaseList = ({
  cases,
  isLoading,
  title,
  emptyMessage,
  showLimit,
}: OffboardingCaseListProps) => {
  const navigate = useNavigate();
  
  const displayCases = showLimit ? cases.slice(0, showLimit) : cases;

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
              {cases.length} {cases.length === 1 ? 'processo' : 'processos'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/retencao/offboarding/novo')}
            >
              Criar primeiro offboarding
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayCases.map((caseItem) => {
              const progress = calculateProgress(caseItem);
              
              return (
                <div 
                  key={caseItem.id}
                  className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/retencao/offboarding/${caseItem.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-lg">{caseItem.employee_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {caseItem.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {caseItem.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Último dia: {formatBRT(new Date(caseItem.last_day), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(caseItem.status)}
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
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {getTerminationTypeLabel(caseItem.termination_type)}
                    </span>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {getSurveyBadge(caseItem.survey_status)}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {showLimit && cases.length > showLimit && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/retencao/offboarding?tab=completed')}
              >
                Ver todos ({cases.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
