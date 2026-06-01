import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  DynamicWizardStepper,
  WizardProgressBar,
  EmployeeInfoStep,
  TemplateSelectionStep,
  PhaseSelectionStep,
  PhaseTaskSelectionStep,
  PhaseResponsiblesStep,
  PhaseOrderingStep,
  ReviewStep,
  EmployeeFormData,
} from '@/components/onboarding/wizard';
import { useOnboardingWizardState, WizardPhase, WizardTask } from '@/hooks/useOnboardingWizardState';
import { useOnboardingTemplates } from '@/hooks/useOnboardingTemplates';
import { useOnboardingProcesses } from '@/hooks/useOnboardingProcesses';
import { OnboardingResponsibleType } from '@/types/onboarding.types';
import { formatBRT } from "@/lib/datetime";

interface ResponsiblePerson {
  type: OnboardingResponsibleType;
  name: string;
  id?: string;
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  
  // Form state
  const [employeeData, setEmployeeData] = useState<Partial<EmployeeFormData>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [availablePhases, setAvailablePhases] = useState<WizardPhase[]>([]);
  const [responsibles, setResponsibles] = useState<Record<OnboardingResponsibleType, ResponsiblePerson>>({
    rh: { type: 'rh', name: '' },
    leader: { type: 'leader', name: '' },
    employee: { type: 'employee', name: '' },
    ti: { type: 'ti', name: '' },
    buddy: { type: 'buddy', name: '' },
  });

  // Wizard state management
  const wizardState = useOnboardingWizardState([]);
  const {
    state,
    goToMainStep,
    goToPhaseConfig,
    nextPhaseSubStep,
    prevPhaseSubStep,
    selectPhases,
    updateTaskInPhase,
    addTaskToPhase,
    reorderTasksInPhase,
    currentPhase,
    isLastPhase,
    totalPhases,
    calculateProgress,
  } = wizardState;

  // Hooks
  const { templates, isLoading: templatesLoading, useTemplateWithDetails } = useOnboardingTemplates();
  const { createProcess, createFromTemplate } = useOnboardingProcesses();
  const templateQuery = useTemplateWithDetails(selectedTemplateId || undefined);
  const selectedTemplate = templateQuery.data;

  // Load template phases when selected
  useEffect(() => {
    if (selectedTemplate?.phases) {
      const wizardPhases: WizardPhase[] = selectedTemplate.phases.map((phase, index) => ({
        id: phase.id,
        name: phase.name,
        description: phase.description || '',
        duration_days: phase.duration_days,
        order_index: index,
        selected: true,
        tasks: phase.tasks.map((task, taskIndex) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          responsible_type: task.responsible_type,
          is_required: task.is_required,
          order_index: taskIndex,
          selected: true,
        })),
      }));
      setAvailablePhases(wizardPhases);
      selectPhases(wizardPhases);
    } else if (selectedTemplateId === null && state.mainStep === 'phases') {
      // Create from scratch - empty phases
      setAvailablePhases([]);
      selectPhases([]);
    }
  }, [selectedTemplate, selectedTemplateId]);

  // Update responsibles from employee data
  useEffect(() => {
    if (employeeData.employee_name || employeeData.leader_name || employeeData.hr_responsible_name) {
      setResponsibles((prev) => ({
        ...prev,
        rh: { type: 'rh', name: employeeData.hr_responsible_name || '' },
        leader: { type: 'leader', name: employeeData.leader_name || '' },
        employee: { type: 'employee', name: employeeData.employee_name || '' },
      }));
    }
  }, [employeeData]);

  const handleEmployeeSubmit = (data: EmployeeFormData) => {
    setEmployeeData(data);
    goToMainStep('template');
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
  };

  const handleSubmit = async () => {
    if (!employeeData.employee_name || !employeeData.start_date || !employeeData.end_date) {
      toast.error('Dados incompletos');
      return;
    }

    try {
      // Get final phases from wizard state
      const finalPhases = state.selectedPhases.filter(p => p.selected !== false);
      
      // Create the process
      const processData = await createProcess.mutateAsync({
        employee_name: employeeData.employee_name,
        employee_email: employeeData.employee_email || undefined,
        employee_role: employeeData.employee_role || undefined,
        employee_department: employeeData.employee_department || undefined,
        leader_name: responsibles.leader.name || employeeData.leader_name || undefined,
        hr_responsible_name: responsibles.rh.name || employeeData.hr_responsible_name || undefined,
        template_id: selectedTemplateId || undefined,
        start_date: formatBRT(employeeData.start_date, 'yyyy-MM-dd'),
        end_date: formatBRT(employeeData.end_date, 'yyyy-MM-dd'),
        notes: employeeData.notes || undefined,
      });

      // Create phases and tasks from wizard data
      if (finalPhases.length > 0) {
        const templatePhases = finalPhases.map(phase => ({
          name: phase.name,
          description: phase.description || null,
          order_index: phase.order_index,
          start_date: null,
          end_date: null,
          tasks: phase.tasks
            .filter(t => t.selected !== false)
            .map(task => ({
              title: task.title,
              description: task.description || null,
              responsible_type: task.responsible_type,
              is_required: task.is_required,
              order_index: task.order_index,
              due_date: null,
            })),
        }));

        await createFromTemplate.mutateAsync({
          processId: processData.id,
          templatePhases,
        });
      }

      toast.success('Onboarding criado com sucesso!');
      navigate(`/retencao/onboarding/${processData.id}`);
    } catch (error) {
      console.error('Error creating onboarding:', error);
      toast.error('Erro ao criar onboarding');
    }
  };

  const getTemplateName = () => {
    if (!selectedTemplateId) return null;
    return templates?.find(t => t.id === selectedTemplateId)?.name || null;
  };

  // Navigation handlers for stepper
  const handleStepClick = (mainStep: typeof state.mainStep, phaseIndex?: number, subStep?: typeof state.phaseSubStep) => {
    if (phaseIndex !== undefined && subStep) {
      goToPhaseConfig(phaseIndex, subStep);
    } else {
      goToMainStep(mainStep);
    }
  };

  // Handle task toggle in current phase
  const handleTaskToggle = (taskId: string, selected: boolean) => {
    if (currentPhase) {
      updateTaskInPhase(currentPhase.id, taskId, { selected });
    }
  };

  // Handle task add in current phase
  const handleTaskAdd = (task: WizardTask) => {
    if (currentPhase) {
      addTaskToPhase(currentPhase.id, task);
    }
  };

  // Handle task update in current phase
  const handleTaskUpdate = (taskId: string, updates: Partial<WizardTask>) => {
    if (currentPhase) {
      updateTaskInPhase(currentPhase.id, taskId, updates);
    }
  };

  // Handle reorder in current phase
  const handleReorder = (tasks: WizardTask[]) => {
    if (currentPhase) {
      reorderTasksInPhase(currentPhase.id, tasks);
    }
  };

  const progress = calculateProgress();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/retencao/onboarding')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Novo Onboarding</h1>
        <p className="text-muted-foreground">
          Configure o processo de integração do novo colaborador
        </p>
      </div>

      {/* Progress bar */}
      <WizardProgressBar
        progress={progress}
        currentPhaseName={currentPhase?.name}
        totalPhases={totalPhases}
        currentPhaseIndex={state.currentPhaseIndex}
        className="mb-6"
      />

      {/* Dynamic stepper */}
      <DynamicWizardStepper
        mainStep={state.mainStep}
        currentPhaseIndex={state.currentPhaseIndex}
        phaseSubStep={state.phaseSubStep}
        selectedPhases={state.selectedPhases}
        onStepClick={handleStepClick}
      />

      <div className="mt-8">
        {/* Step 1: Employee Info */}
        {state.mainStep === 'employee' && (
          <EmployeeInfoStep
            data={employeeData}
            onNext={handleEmployeeSubmit}
          />
        )}

        {/* Step 2: Template Selection */}
        {state.mainStep === 'template' && (
          <TemplateSelectionStep
            templates={templates || []}
            isLoading={templatesLoading}
            selectedTemplateId={selectedTemplateId}
            onSelect={handleTemplateSelect}
            onBack={() => goToMainStep('employee')}
            onNext={() => goToMainStep('phases')}
          />
        )}

        {/* Step 3: Phase Selection */}
        {state.mainStep === 'phases' && (
          <PhaseSelectionStep
            availablePhases={availablePhases}
            selectedPhases={state.selectedPhases}
            onPhasesChange={selectPhases}
            onBack={() => goToMainStep('template')}
            onNext={() => {
              if (state.selectedPhases.length > 0) {
                goToPhaseConfig(0, 'tasks');
              }
            }}
          />
        )}

        {/* Step 4: Phase Configuration */}
        {state.mainStep === 'phase-config' && currentPhase && (
          <>
            {state.phaseSubStep === 'tasks' && (
              <PhaseTaskSelectionStep
                phase={currentPhase}
                phaseIndex={state.currentPhaseIndex}
                totalPhases={totalPhases}
                onTaskToggle={handleTaskToggle}
                onTaskAdd={handleTaskAdd}
                onTaskUpdate={handleTaskUpdate}
                onBack={prevPhaseSubStep}
                onNext={nextPhaseSubStep}
              />
            )}

            {state.phaseSubStep === 'responsibles' && (
              <PhaseResponsiblesStep
                phase={currentPhase}
                phaseIndex={state.currentPhaseIndex}
                totalPhases={totalPhases}
                onTaskUpdate={handleTaskUpdate}
                onBack={prevPhaseSubStep}
                onNext={nextPhaseSubStep}
              />
            )}

            {state.phaseSubStep === 'ordering' && (
              <PhaseOrderingStep
                phase={currentPhase}
                phaseIndex={state.currentPhaseIndex}
                totalPhases={totalPhases}
                isLastPhase={isLastPhase}
                onReorder={handleReorder}
                onBack={prevPhaseSubStep}
                onNext={nextPhaseSubStep}
              />
            )}
          </>
        )}

        {/* Step 5: Review */}
        {state.mainStep === 'review' && employeeData.employee_name && employeeData.start_date && employeeData.end_date && (
          <ReviewStep
            employeeData={employeeData as EmployeeFormData}
            templateName={getTemplateName()}
            phases={state.selectedPhases.map(p => ({
              ...p,
              tasks: p.tasks.filter(t => t.selected !== false),
            }))}
            responsibles={responsibles}
            onBack={() => {
              if (state.selectedPhases.length > 0) {
                goToPhaseConfig(state.selectedPhases.length - 1, 'ordering');
              } else {
                goToMainStep('phases');
              }
            }}
            onSubmit={handleSubmit}
            isSubmitting={createProcess.isPending || createFromTemplate.isPending}
          />
        )}
      </div>
    </div>
  );
}
