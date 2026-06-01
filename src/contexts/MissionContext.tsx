import { createContext, useContext, ReactNode } from "react";
import { useMissionState } from "@/hooks/useMissionState";

type MissionContextType = ReturnType<typeof useMissionState>;

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const missionState = useMissionState();
  
  return (
    <MissionContext.Provider value={missionState}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error("useMission must be used within MissionProvider");
  }
  return context;
}
