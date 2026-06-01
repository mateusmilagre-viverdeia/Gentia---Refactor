import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Users, User, Briefcase, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OnboardingResponsibleType, 
  getResponsibleLabel, 
  getResponsibleColor 
} from '@/types/onboarding.types';
import { WizardPhase } from './PhasesCustomizationStep';
import { UserSelect } from '@/components/shared/UserSelect';

interface ResponsiblePerson {
  type: OnboardingResponsibleType;
  name: string;
  id?: string;
  user_id?: string;
}

interface ResponsiblesStepProps {
  phases: WizardPhase[];
  responsibles: Record<OnboardingResponsibleType, ResponsiblePerson>;
  onResponsiblesChange: (responsibles: Record<OnboardingResponsibleType, ResponsiblePerson>) => void;
  employeeInfo: {
    leader_name?: string;
    leader_user_id?: string;
    hr_responsible_name?: string;
    hr_responsible_user_id?: string;
    employee_name?: string;
  };
  onBack: () => void;
  onNext: () => void;
}

export function ResponsiblesStep({
  phases,
  responsibles,
  onResponsiblesChange,
  employeeInfo,
  onBack,
  onNext,
}: ResponsiblesStepProps) {
  // Count tasks by responsible type
  const taskCounts: Record<OnboardingResponsibleType, number> = {
    rh: 0,
    leader: 0,
    employee: 0,
    ti: 0,
    buddy: 0,
  };

  phases.forEach(phase => {
    phase.tasks.forEach(task => {
      taskCounts[task.responsible_type]++;
    });
  });

  const updateResponsible = (type: OnboardingResponsibleType, name: string, userId?: string) => {
    onResponsiblesChange({
      ...responsibles,
      [type]: { ...responsibles[type], name, user_id: userId },
    });
  };

  const responsibleConfigs: {
    type: OnboardingResponsibleType;
    icon: typeof User;
    label: string;
    description: string;
    defaultValue: string;
    defaultUserId?: string;
    editable: boolean;
  }[] = [
    {
      type: 'rh',
      icon: Building2,
      label: 'Responsável RH',
      description: 'Profissional de RH que acompanhará o processo',
      defaultValue: employeeInfo.hr_responsible_name || '',
      defaultUserId: employeeInfo.hr_responsible_user_id,
      editable: true,
    },
    {
      type: 'leader',
      icon: Briefcase,
      label: 'Líder/Gestor',
      description: 'Gestor direto do colaborador',
      defaultValue: employeeInfo.leader_name || '',
      defaultUserId: employeeInfo.leader_user_id,
      editable: true,
    },
    {
      type: 'employee',
      icon: User,
      label: 'Colaborador',
      description: 'O novo colaborador em onboarding',
      defaultValue: employeeInfo.employee_name || '',
      editable: false,
    },
    {
      type: 'ti',
      icon: Users,
      label: 'TI',
      description: 'Responsável por acessos e equipamentos',
      defaultValue: '',
      editable: true,
    },
    {
      type: 'buddy',
      icon: Users,
      label: 'Buddy',
      description: 'Colega mentor que apoiará o novo colaborador',
      defaultValue: '',
      editable: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Definir Responsáveis
        </CardTitle>
        <CardDescription>
          Confirme ou atualize os responsáveis pelas tarefas do onboarding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          {responsibleConfigs.map(({ type, icon: Icon, label, description, defaultValue, defaultUserId, editable }) => (
            <div
              key={type}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    getResponsibleColor(type)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{label}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {taskCounts[type]} tarefas
                </Badge>
              </div>

              <div>
                <Label htmlFor={`responsible-${type}`}>Nome</Label>
                {editable ? (
                  <UserSelect
                    value={responsibles[type]?.user_id || defaultUserId || ''}
                    onChange={(userId, userName) => updateResponsible(type, userName, userId)}
                    placeholder={`Selecione ${label.toLowerCase()}`}
                    className="mt-1"
                  />
                ) : (
                  <Input
                    id={`responsible-${type}`}
                    value={responsibles[type]?.name || defaultValue}
                    disabled
                    className="mt-1 bg-muted"
                  />
                )}
              </div>

              {/* Tasks preview */}
              {taskCounts[type] > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Tarefas atribuídas:</p>
                  <div className="flex flex-wrap gap-1">
                    {phases.flatMap(phase => 
                      phase.tasks
                        .filter(task => task.responsible_type === type)
                        .slice(0, 3)
                        .map(task => (
                          <Badge key={task.id} variant="secondary" className="text-xs">
                            {task.title.length > 20 ? task.title.slice(0, 20) + '...' : task.title}
                          </Badge>
                        ))
                    )}
                    {taskCounts[type] > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{taskCounts[type] - 3} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>
            Próximo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
