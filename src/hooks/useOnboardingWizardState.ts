import { useState, useCallback, useMemo } from 'react';
import { OnboardingResponsibleType } from '@/types/onboarding.types';

export interface WizardTask {
  id: string;
  title: string;
  description: string;
  responsible_type: OnboardingResponsibleType;
  is_required: boolean;
  order_index: number;
  selected?: boolean;
}

export interface WizardPhase {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  order_index: number;
  tasks: WizardTask[];
  selected?: boolean;
}

export type MainStep = 'employee' | 'template' | 'phases' | 'phase-config' | 'competencies' | 'review';
export type PhaseSubStep = 'tasks' | 'responsibles' | 'ordering';

interface WizardState {
  mainStep: MainStep;
  selectedPhases: WizardPhase[];
  currentPhaseIndex: number;
  phaseSubStep: PhaseSubStep;
  hasJobDescription: boolean;
}

interface UseOnboardingWizardStateReturn {
  state: WizardState;
  // Navigation
  goToMainStep: (step: MainStep) => void;
  goToPhaseConfig: (phaseIndex: number, subStep?: PhaseSubStep) => void;
  nextPhaseSubStep: () => void;
  prevPhaseSubStep: () => void;
  // Phase management
  selectPhases: (phases: WizardPhase[]) => void;
  updatePhase: (phaseId: string, updates: Partial<WizardPhase>) => void;
  updateTaskInPhase: (phaseId: string, taskId: string, updates: Partial<WizardTask>) => void;
  addTaskToPhase: (phaseId: string, task: WizardTask) => void;
  removeTaskFromPhase: (phaseId: string, taskId: string) => void;
  reorderTasksInPhase: (phaseId: string, tasks: WizardTask[]) => void;
  addCustomPhase: (phase: WizardPhase) => void;
  removePhase: (phaseId: string) => void;
  setHasJobDescription: (hasJD: boolean) => void;
  // Progress
  calculateProgress: () => number;
  getCompletedSteps: () => string[];
  // Current phase
  currentPhase: WizardPhase | null;
  isLastPhase: boolean;
  isFirstPhase: boolean;
  totalPhases: number;
}

export function useOnboardingWizardState(
  initialPhases: WizardPhase[] = []
): UseOnboardingWizardStateReturn {
  const [state, setState] = useState<WizardState>({
    mainStep: 'employee',
    selectedPhases: initialPhases,
    currentPhaseIndex: 0,
    phaseSubStep: 'tasks',
    hasJobDescription: false,
  });

  // Navigation
  const goToMainStep = useCallback((step: MainStep) => {
    setState(prev => ({
      ...prev,
      mainStep: step,
      currentPhaseIndex: 0,
      phaseSubStep: 'tasks',
    }));
  }, []);

  const goToPhaseConfig = useCallback((phaseIndex: number, subStep: PhaseSubStep = 'tasks') => {
    setState(prev => ({
      ...prev,
      mainStep: 'phase-config',
      currentPhaseIndex: phaseIndex,
      phaseSubStep: subStep,
    }));
  }, []);

  const nextPhaseSubStep = useCallback(() => {
    setState(prev => {
      const subSteps: PhaseSubStep[] = ['tasks', 'responsibles', 'ordering'];
      const currentIndex = subSteps.indexOf(prev.phaseSubStep);
      
      if (currentIndex < subSteps.length - 1) {
        // Move to next sub-step
        return { ...prev, phaseSubStep: subSteps[currentIndex + 1] };
      } else {
        // Move to next phase or review
        if (prev.currentPhaseIndex < prev.selectedPhases.length - 1) {
          return {
            ...prev,
            currentPhaseIndex: prev.currentPhaseIndex + 1,
            phaseSubStep: 'tasks',
          };
        } else {
          // All phases done, go to review
          return { ...prev, mainStep: 'review' };
        }
      }
    });
  }, []);

  const prevPhaseSubStep = useCallback(() => {
    setState(prev => {
      const subSteps: PhaseSubStep[] = ['tasks', 'responsibles', 'ordering'];
      const currentIndex = subSteps.indexOf(prev.phaseSubStep);
      
      if (currentIndex > 0) {
        // Move to previous sub-step
        return { ...prev, phaseSubStep: subSteps[currentIndex - 1] };
      } else {
        // Move to previous phase or phases selection
        if (prev.currentPhaseIndex > 0) {
          return {
            ...prev,
            currentPhaseIndex: prev.currentPhaseIndex - 1,
            phaseSubStep: 'ordering',
          };
        } else {
          // Go back to phases selection
          return { ...prev, mainStep: 'phases' };
        }
      }
    });
  }, []);

  // Phase management
  const selectPhases = useCallback((phases: WizardPhase[]) => {
    setState(prev => ({
      ...prev,
      selectedPhases: phases,
    }));
  }, []);

  const updatePhase = useCallback((phaseId: string, updates: Partial<WizardPhase>) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.map(p =>
        p.id === phaseId ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const updateTaskInPhase = useCallback((phaseId: string, taskId: string, updates: Partial<WizardTask>) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.map(p =>
        p.id === phaseId
          ? {
              ...p,
              tasks: p.tasks.map(t =>
                t.id === taskId ? { ...t, ...updates } : t
              ),
            }
          : p
      ),
    }));
  }, []);

  const addTaskToPhase = useCallback((phaseId: string, task: WizardTask) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.map(p =>
        p.id === phaseId
          ? { ...p, tasks: [...p.tasks, task] }
          : p
      ),
    }));
  }, []);

  const removeTaskFromPhase = useCallback((phaseId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.map(p =>
        p.id === phaseId
          ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }
          : p
      ),
    }));
  }, []);

  const reorderTasksInPhase = useCallback((phaseId: string, tasks: WizardTask[]) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.map(p =>
        p.id === phaseId ? { ...p, tasks } : p
      ),
    }));
  }, []);

  const addCustomPhase = useCallback((phase: WizardPhase) => {
    setState(prev => ({
      ...prev,
      selectedPhases: [...prev.selectedPhases, phase],
    }));
  }, []);

  const removePhase = useCallback((phaseId: string) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.filter(p => p.id !== phaseId),
    }));
  }, []);

  const setHasJobDescription = useCallback((hasJD: boolean) => {
    setState(prev => ({
      ...prev,
      hasJobDescription: hasJD,
    }));
  }, []);

  // Progress calculation
  const calculateProgress = useCallback(() => {
    const { mainStep, selectedPhases, currentPhaseIndex, phaseSubStep } = state;
    
    // Base steps: employee (10%), template (20%), phases (30%)
    const baseSteps = {
      employee: 10,
      template: 20,
      phases: 30,
    };

    if (mainStep === 'employee') return 0;
    if (mainStep === 'template') return baseSteps.employee;
    if (mainStep === 'phases') return baseSteps.employee + baseSteps.template;
    if (mainStep === 'competencies') return 90;
    if (mainStep === 'review') return 100;

    // Phase config: remaining 50% split across phases and sub-steps
    const remainingPercent = 50;
    const totalPhases = selectedPhases.length || 1;
    const subStepsPerPhase = 3; // tasks, responsibles, ordering
    const totalSubSteps = totalPhases * subStepsPerPhase;
    
    const subStepIndex = {
      tasks: 0,
      responsibles: 1,
      ordering: 2,
    };
    
    const completedSubSteps = (currentPhaseIndex * subStepsPerPhase) + subStepIndex[phaseSubStep];
    const phaseProgress = (completedSubSteps / totalSubSteps) * remainingPercent;
    
    return Math.round(baseSteps.employee + baseSteps.template + baseSteps.phases + phaseProgress);
  }, [state]);

  const getCompletedSteps = useCallback(() => {
    const steps: string[] = [];
    const { mainStep, selectedPhases, currentPhaseIndex, phaseSubStep } = state;
    
    if (mainStep !== 'employee') steps.push('employee');
    if (mainStep !== 'employee' && mainStep !== 'template') steps.push('template');
    if (mainStep === 'phase-config' || mainStep === 'review') steps.push('phases');
    
    if (mainStep === 'phase-config' || mainStep === 'review') {
      for (let i = 0; i < currentPhaseIndex; i++) {
        steps.push(`phase-${selectedPhases[i]?.id}-complete`);
      }
      
      if (mainStep === 'phase-config') {
        const subSteps: PhaseSubStep[] = ['tasks', 'responsibles', 'ordering'];
        const currentSubIndex = subSteps.indexOf(phaseSubStep);
        for (let j = 0; j < currentSubIndex; j++) {
          steps.push(`phase-${selectedPhases[currentPhaseIndex]?.id}-${subSteps[j]}`);
        }
      }
    }
    
    return steps;
  }, [state]);

  // Current phase helpers
  const currentPhase = useMemo(() => {
    if (state.mainStep !== 'phase-config') return null;
    return state.selectedPhases[state.currentPhaseIndex] || null;
  }, [state.mainStep, state.selectedPhases, state.currentPhaseIndex]);

  const isLastPhase = useMemo(() => {
    return state.currentPhaseIndex === state.selectedPhases.length - 1;
  }, [state.currentPhaseIndex, state.selectedPhases.length]);

  const isFirstPhase = useMemo(() => {
    return state.currentPhaseIndex === 0;
  }, [state.currentPhaseIndex]);

  return {
    state,
    goToMainStep,
    goToPhaseConfig,
    nextPhaseSubStep,
    prevPhaseSubStep,
    selectPhases,
    updatePhase,
    updateTaskInPhase,
    addTaskToPhase,
    removeTaskFromPhase,
    reorderTasksInPhase,
    addCustomPhase,
    removePhase,
    setHasJobDescription,
    calculateProgress,
    getCompletedSteps,
    currentPhase,
    isLastPhase,
    isFirstPhase,
    totalPhases: state.selectedPhases.length,
  };
}
