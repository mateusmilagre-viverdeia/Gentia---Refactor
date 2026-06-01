import { Check, User, FileText, Layers, Settings, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainStep, PhaseSubStep, WizardPhase } from '@/hooks/useOnboardingWizardState';

interface DynamicWizardStepperProps {
  mainStep: MainStep;
  currentPhaseIndex: number;
  phaseSubStep: PhaseSubStep;
  selectedPhases: WizardPhase[];
  onStepClick?: (mainStep: MainStep, phaseIndex?: number, subStep?: PhaseSubStep) => void;
}

interface StepItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
  isClickable: boolean;
}

export function DynamicWizardStepper({
  mainStep,
  currentPhaseIndex,
  phaseSubStep,
  selectedPhases,
  onStepClick,
}: DynamicWizardStepperProps) {
  const mainSteps: MainStep[] = ['employee', 'template', 'phases', 'phase-config', 'review'];
  const mainStepIndex = mainSteps.indexOf(mainStep);

  const getMainStepTitle = (step: MainStep): string => {
    const titles: Record<MainStep, string> = {
      employee: 'Colaborador',
      template: 'Template',
      phases: 'Fases',
      'phase-config': 'Configurar',
      competencies: 'Competências',
      review: 'Revisão',
    };
    return titles[step];
  };

  const getMainStepIcon = (step: MainStep) => {
    const icons: Record<MainStep, React.ReactNode> = {
      employee: <User className="h-4 w-4" />,
      template: <FileText className="h-4 w-4" />,
      phases: <Layers className="h-4 w-4" />,
      'phase-config': <Settings className="h-4 w-4" />,
      competencies: <Settings className="h-4 w-4" />,
      review: <CheckCircle className="h-4 w-4" />,
    };
    return icons[step];
  };

  // Build step items
  const steps: StepItem[] = [];

  // Main steps before phase-config
  (['employee', 'template', 'phases'] as MainStep[]).forEach((step) => {
    const stepIndex = mainSteps.indexOf(step);
    steps.push({
      id: step,
      title: getMainStepTitle(step),
      icon: getMainStepIcon(step),
      isCompleted: mainStepIndex > stepIndex,
      isCurrent: mainStep === step,
      isClickable: mainStepIndex >= stepIndex,
    });
  });

  // Phase config steps (dynamic based on selected phases)
  if (selectedPhases.length > 0 && (mainStep === 'phase-config' || mainStep === 'review')) {
    selectedPhases.forEach((phase, index) => {
      const isPhaseCompleted = mainStep === 'review' || (mainStep === 'phase-config' && currentPhaseIndex > index);
      const isPhaseCurrent = mainStep === 'phase-config' && currentPhaseIndex === index;
      
      steps.push({
        id: `phase-${phase.id}`,
        title: phase.name.length > 15 ? phase.name.slice(0, 15) + '...' : phase.name,
        icon: isPhaseCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>,
        isCompleted: isPhaseCompleted,
        isCurrent: isPhaseCurrent,
        isClickable: isPhaseCompleted || isPhaseCurrent,
      });
    });
  }

  // Review step
  steps.push({
    id: 'review',
    title: getMainStepTitle('review'),
    icon: getMainStepIcon('review'),
    isCompleted: false,
    isCurrent: mainStep === 'review',
    isClickable: mainStep === 'review',
  });

  // Limit visible steps for mobile
  const maxVisibleSteps = 5;
  const visibleSteps = steps.length <= maxVisibleSteps
    ? steps
    : (() => {
        const currentIndex = steps.findIndex(s => s.isCurrent);
        const start = Math.max(0, Math.min(currentIndex - 2, steps.length - maxVisibleSteps));
        return steps.slice(start, start + maxVisibleSteps);
      })();

  const showEllipsisBefore = visibleSteps[0]?.id !== steps[0]?.id;
  const showEllipsisAfter = visibleSteps[visibleSteps.length - 1]?.id !== steps[steps.length - 1]?.id;

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {showEllipsisBefore && (
          <div className="flex items-center">
            <span className="text-muted-foreground text-sm">...</span>
            <div className="h-0.5 w-4 bg-muted mx-2" />
          </div>
        )}
        
        {visibleSteps.map((step, index) => {
          const isLast = index === visibleSteps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => {
                    if (step.isClickable && onStepClick) {
                      if (step.id === 'employee' || step.id === 'template' || step.id === 'phases' || step.id === 'review') {
                        onStepClick(step.id as MainStep);
                      } else if (step.id.startsWith('phase-')) {
                        const phaseIndex = selectedPhases.findIndex(p => `phase-${p.id}` === step.id);
                        if (phaseIndex >= 0) {
                          onStepClick('phase-config', phaseIndex, 'tasks');
                        }
                      }
                    }
                  }}
                  disabled={!step.isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    step.isCompleted && 'bg-primary text-primary-foreground',
                    step.isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !step.isCompleted && !step.isCurrent && 'bg-muted text-muted-foreground',
                    step.isClickable && 'cursor-pointer hover:opacity-80'
                  )}
                >
                  {step.isCompleted ? <Check className="h-5 w-5" /> : step.icon}
                </button>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-xs font-medium truncate max-w-[80px]',
                    step.isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                </div>
              </div>
              {!isLast && (
                <div className={cn(
                  'h-0.5 flex-1 mx-2',
                  step.isCompleted ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}

        {showEllipsisAfter && (
          <div className="flex items-center">
            <div className="h-0.5 w-4 bg-muted mx-2" />
            <span className="text-muted-foreground text-sm">...</span>
          </div>
        )}
      </div>

      {/* Sub-step indicator for phase-config */}
      {mainStep === 'phase-config' && (
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          {(['tasks', 'responsibles', 'ordering'] as PhaseSubStep[]).map((subStep, index) => {
            const subSteps: PhaseSubStep[] = ['tasks', 'responsibles', 'ordering'];
            const currentSubIndex = subSteps.indexOf(phaseSubStep);
            const isCompleted = index < currentSubIndex;
            const isCurrent = subStep === phaseSubStep;

            const labels: Record<PhaseSubStep, string> = {
              tasks: 'Tarefas',
              responsibles: 'Responsáveis',
              ordering: 'Ordenação',
            };

            return (
              <div key={subStep} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary/20 text-primary border-2 border-primary',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className={cn(
                  'hidden sm:inline',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {labels[subStep]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
