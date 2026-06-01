import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Briefcase, 
  Building2, 
  Mail, 
  Calendar,
  FileText
} from 'lucide-react';

import { OnboardingProcess } from '@/types/onboarding.types';
import { formatBRT } from "@/lib/datetime";

interface OnboardingTimelineProps {
  process: OnboardingProcess;
}

export function OnboardingTimeline({ process }: OnboardingTimelineProps) {
  const startDate = new Date(process.start_date);
  const endDate = new Date(process.end_date);
  const today = new Date();
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Informações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{process.employee_name}</p>
              {process.employee_email && (
                <p className="text-xs text-muted-foreground">{process.employee_email}</p>
              )}
            </div>
          </div>

          {process.employee_role && (
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{process.employee_role}</p>
            </div>
          )}

          {process.employee_department && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{process.employee_department}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Responsáveis</h4>
          <div className="space-y-2">
            {process.leader_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Líder</span>
                <span className="text-sm font-medium">{process.leader_name}</span>
              </div>
            )}
            {process.hr_responsible_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">RH</span>
                <span className="text-sm font-medium">{process.hr_responsible_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Cronograma</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Início</span>
              <span className="text-sm font-medium">
                {formatBRT(startDate, "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Término</span>
              <span className="text-sm font-medium">
                {formatBRT(endDate, "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duração</span>
              <span className="text-sm font-medium">{totalDays} dias</span>
            </div>
            {process.status === 'active' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Restantes</span>
                <Badge variant={remainingDays < 7 ? 'destructive' : 'secondary'}>
                  {remainingDays} dias
                </Badge>
              </div>
            )}
          </div>

          {/* Timeline bar */}
          {process.status === 'active' && (
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {Math.round(progressPercent)}% do período
              </p>
            </div>
          )}
        </div>

        {process.notes && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações
            </h4>
            <p className="text-sm text-muted-foreground">{process.notes}</p>
          </div>
        )}

        {process.success_metrics && process.success_metrics.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Métricas de Sucesso</h4>
            <ul className="space-y-1">
              {process.success_metrics.map((metric, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {metric}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
