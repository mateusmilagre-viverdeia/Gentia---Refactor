import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DashboardContextType {
  activeSection: string;
  setActiveSection: (id: string) => void;
  navigateToSection: (id: string) => void;
  isSharedView: boolean;
  usarLucroPersonalizado: boolean;
  setUsarLucroPersonalizado: (value: boolean) => void;
  lucroPersonalizado: number;
  setLucroPersonalizado: (value: number) => void;
  margemEfetiva: number;
  benchmarkLucro: number;
  setBenchmarkLucro: (value: number) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
  isSharedView?: boolean;
  initialBenchmarkLucro?: number;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ 
  children, 
  isSharedView = false,
  initialBenchmarkLucro = 10
}) => {
  const [activeSection, setActiveSection] = useState('resumo');
  const [usarLucroPersonalizado, setUsarLucroPersonalizado] = useState(false);
  const [lucroPersonalizado, setLucroPersonalizado] = useState(initialBenchmarkLucro);
  const [benchmarkLucro, setBenchmarkLucro] = useState(initialBenchmarkLucro);

  const margemEfetiva = useMemo(() => {
    return usarLucroPersonalizado ? lucroPersonalizado : benchmarkLucro;
  }, [usarLucroPersonalizado, lucroPersonalizado, benchmarkLucro]);

  const navigateToSection = (id: string) => {
    setActiveSection(id);
  };

  return (
    <DashboardContext.Provider
      value={{
        activeSection,
        setActiveSection,
        navigateToSection,
        isSharedView,
        usarLucroPersonalizado,
        setUsarLucroPersonalizado,
        lucroPersonalizado,
        setLucroPersonalizado,
        margemEfetiva,
        benchmarkLucro,
        setBenchmarkLucro
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
