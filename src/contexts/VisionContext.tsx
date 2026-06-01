import { createContext, useContext, ReactNode } from "react";
import { useVisionState } from "@/hooks/useVisionState";

type VisionContextType = ReturnType<typeof useVisionState>;

const VisionContext = createContext<VisionContextType | null>(null);

export function VisionProvider({ children }: { children: ReactNode }) {
  const visionState = useVisionState();
  
  return (
    <VisionContext.Provider value={visionState}>
      {children}
    </VisionContext.Provider>
  );
}

export function useVision() {
  const context = useContext(VisionContext);
  if (!context) {
    throw new Error("useVision must be used within VisionProvider");
  }
  return context;
}
