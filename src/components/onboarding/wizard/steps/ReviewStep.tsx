import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  FileText, 
  ListTodo, 
  Users,
  CheckCircle2,
  Loader2
} from 'lucide-react';

import { 
  OnboardingResponsibleType, 
  getResponsibleLabel, 
  getResponsibleColor 
} from '@/types/onboarding.types';
import { EmployeeFormData } from './EmployeeInfoStep';
import { WizardPhase } from './PhasesCustomizationStep';
import { formatBRT } from "@/lib/datetime";

interface ResponsiblePerson {
  type: OnboardingResponsibleType;
  name: string;
  id?: string;
}

interface ReviewStepProps {
  employeeData: EmployeeFormData;
  templateName: string | null;
  phases: WizardPhase[];
  responsibles: Record<OnboardingResponsibleType, ResponsiblePerson>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({
  employeeData,
  templateName,
  phases,
  responsibles,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewStepProps) {
  const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const requiredTasks = phases.reduce(
    (sum, phase) => sum + phase.tasks.filter(t => t.is_required).length, 
    0
  );
  const totalDays = phases.reduce((sum, phase) => sum + phase.duration_days, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Revisar e Criar
        </CardTitle>
        <CardDescription>
          Confira os dados antes de criar o processo de onboarding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Colaborador */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Colaborador
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Nome:</span>
              <p className="font-medium">{employeeData.employee_name}</p>
            </div>
            {employeeData.employee_email && (
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{employeeData.employee_email}</p>
              </div>
            )}
            {employeeData.employee_role && (
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <p className="font-medium">{employeeData.employee_role}</p>
              </div>
            )}
            {employeeData.employee_department && (
              <div>
                <span className="text-muted-foreground">Departamento:</span>
                <p className="font-medium">{employeeData.employee_department}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Período */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Período
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Início:</span>
              <p className="font-medium">
                {formatBRT(employeeData.start_date, "dd 'de' MMMM 'de' yyyy")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Término:</span>
              <p className="font-medium">
                {formatBRT(employeeData.end_date, "dd 'de' MMMM 'de' yyyy")}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Template */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Template
          </h3>
          <Badge variant={templateName ? 'default' : 'secondary'}>
            {templateName || 'Criado do zero'}
          </Badge>
        </div>

        <Separator />

        {/* Fases e Tarefas */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Estrutura
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{phases.length}</p>
              <p className="text-xs text-muted-foreground">Fases</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tarefas</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{requiredTasks}</p>
              <p className="text-xs text-muted-foreground">Obrigatórias</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{totalDays}</p>
              <p className="text-xs text-muted-foreground">Dias Total</p>
            </div>
          </div>

          <div className="space-y-2">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                <span>
                  <span className="font-medium">{index + 1}. {phase.name}</span>
                  <span className="text-muted-foreground ml-2">({phase.duration_days} dias)</span>
                </span>
                <Badge variant="outline">{phase.tasks.length} tarefas</Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Responsáveis */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Responsáveis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['rh', 'leader', 'employee'] as OnboardingResponsibleType[]).map((type) => (
              <div key={type} className="p-3 border rounded-lg">
                <Badge className={getResponsibleColor(type)}>
                  {getResponsibleLabel(type)}
                </Badge>
                <p className="mt-2 font-medium">
                  {responsibles[type]?.name || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {employeeData.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-medium">Observações</h3>
              <p className="text-sm text-muted-foreground">{employeeData.notes}</p>
            </div>
          </>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Onboarding'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
