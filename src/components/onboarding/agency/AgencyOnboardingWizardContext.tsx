import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface AgencyOnboardingState {
  clientId: string | null;
  jobId: string | null;
  agentId: string | null;
}

interface AgencyOnboardingContextType extends AgencyOnboardingState {
  setClientId: (id: string | null) => void;
  setJobId: (id: string | null) => void;
  setAgentId: (id: string | null) => void;
  reset: () => void;
  // Wizard open control (used by sidebar/progress bar to reopen)
  isOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;
}

const AgencyOnboardingContext = createContext<AgencyOnboardingContextType | undefined>(
  undefined
);

export function AgencyOnboardingProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const reset = useCallback(() => {
    setClientId(null);
    setJobId(null);
    setAgentId(null);
  }, []);

  const openWizard = useCallback(() => setIsOpen(true), []);
  const closeWizard = useCallback(() => setIsOpen(false), []);

  return (
    <AgencyOnboardingContext.Provider
      value={{
        clientId,
        jobId,
        agentId,
        setClientId,
        setJobId,
        setAgentId,
        reset,
        isOpen,
        openWizard,
        closeWizard,
      }}
    >
      {children}
    </AgencyOnboardingContext.Provider>
  );
}

export function useAgencyOnboarding() {
  const ctx = useContext(AgencyOnboardingContext);
  if (!ctx) {
    throw new Error("useAgencyOnboarding must be used inside AgencyOnboardingProvider");
  }
  return ctx;
}
