import { useState, useEffect, useCallback } from "react";
import { TourRole } from "@/components/pulse/onboarding/tourSteps";

const STORAGE_KEY = "pulse_onboarding_completed";
const STORAGE_KEY_ROLE = "pulse_onboarding_role";

interface UsePulseOnboardingReturn {
  hasCompletedOnboarding: boolean;
  showWelcomeModal: boolean;
  isRunning: boolean;
  stepIndex: number;
  tourRole: TourRole;
  startTour: () => void;
  endTour: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  closeWelcomeModal: () => void;
  setStepIndex: (index: number) => void;
}

export const usePulseOnboarding = (role: TourRole, isLoading: boolean = false): UsePulseOnboardingReturn => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true); // Default true to avoid flash
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Verificar localStorage apenas uma vez após o loading terminar
  useEffect(() => {
    if (isLoading || initialized) return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    
    // Simplificado: apenas verificar se o onboarding foi completado
    // Não resetar automaticamente por mudança de role
    const completed = stored === "true";
    setHasCompletedOnboarding(completed);
    setShowWelcomeModal(!completed);
    
    setInitialized(true);
  }, [isLoading, initialized]);

  const startTour = useCallback(() => {
    setShowWelcomeModal(false);
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const endTour = useCallback(() => {
    setIsRunning(false);
    setHasCompletedOnboarding(true);
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  }, [role]);

  const skipOnboarding = useCallback(() => {
    setShowWelcomeModal(false);
    setHasCompletedOnboarding(true);
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  }, [role]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    setHasCompletedOnboarding(false);
    setShowWelcomeModal(true);
    setStepIndex(0);
  }, []);

  const closeWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);

  return {
    hasCompletedOnboarding,
    showWelcomeModal,
    isRunning,
    stepIndex,
    tourRole: role,
    startTour,
    endTour,
    skipOnboarding,
    resetOnboarding,
    closeWelcomeModal,
    setStepIndex,
  };
};
