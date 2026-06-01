// Main stepper components
export { OnboardingWizardStepper, ONBOARDING_WIZARD_STEPS } from './OnboardingWizardStepper';
export { DynamicWizardStepper } from './DynamicWizardStepper';
export { WizardProgressBar } from './WizardProgressBar';

// Step components
export { EmployeeInfoStep } from './steps/EmployeeInfoStep';
export type { EmployeeFormData } from './steps/EmployeeInfoStep';
export { TemplateSelectionStep } from './steps/TemplateSelectionStep';
export { PhasesCustomizationStep } from './steps/PhasesCustomizationStep';
export { ResponsiblesStep } from './steps/ResponsiblesStep';
export { ReviewStep } from './steps/ReviewStep';

// New phase configuration steps
export { PhaseSelectionStep } from './steps/PhaseSelectionStep';
export { PhaseTaskSelectionStep } from './steps/PhaseTaskSelectionStep';
export { PhaseResponsiblesStep } from './steps/PhaseResponsiblesStep';
export { PhaseOrderingStep } from './steps/PhaseOrderingStep';
export { OnboardingCompetencyStep } from './steps/OnboardingCompetencyStep';

// Types - re-export from hook for convenience
export type { WizardPhase, WizardTask, MainStep, PhaseSubStep } from '@/hooks/useOnboardingWizardState';
