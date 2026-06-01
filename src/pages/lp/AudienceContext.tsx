import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type AudienceMode = "consultoria" | "empresa";

interface AudienceContextType {
  mode: AudienceMode;
  setMode: (mode: AudienceMode) => void;
  isAuto: boolean;
  setIsAuto: (auto: boolean) => void;
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined);

export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AudienceMode>("consultoria");
  const [isAuto, setIsAuto] = useState(true);

  // Auto rotation
  useEffect(() => {
    if (!isAuto) return;
    const t = setInterval(() => {
      setMode((prev) => (prev === "consultoria" ? "empresa" : "consultoria"));
    }, 6000);
    return () => clearInterval(t);
  }, [isAuto]);

  const handleSetMode = useCallback((newMode: AudienceMode) => {
    setMode(newMode);
    setIsAuto(false);
    // Optional: Resume auto after some time? 
    // Usually on Hero it's better to keep it manual once clicked.
  }, []);

  return (
    <AudienceContext.Provider value={{ mode, setMode: handleSetMode, isAuto, setIsAuto }}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const context = useContext(AudienceContext);
  if (context === undefined) {
    throw new Error("useAudience must be used within an AudienceProvider");
  }
  return context;
}
