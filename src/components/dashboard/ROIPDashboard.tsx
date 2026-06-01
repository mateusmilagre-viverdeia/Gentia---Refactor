import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import { DashboardNavigation } from './DashboardNavigation';
import { ExecutiveSummary } from './ExecutiveSummary';
import { MetricasSection } from './sections/MetricasSection';
import { PerdasSection } from './sections/PerdasSection';
import { EconomiaSection } from './sections/EconomiaSection';
import { BenchmarkSection } from './sections/BenchmarkSection';
import { Button } from '@/components/ui/button';

interface ROIPDashboardProps {
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
  nomeEmpresa?: string;
  onEditSimulation?: () => void;
  isSharedView?: boolean;
}

// Content Component - Renders the active section with transitions
const DashboardContent: React.FC<{
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
  nomeEmpresa: string;
  potencialCrescimento: number;
  impactoTotal: number;
  percentualPerda: number;
  roiPotencial: number;
}> = ({
  resultados,
  dadosOriginais,
  nomeEmpresa,
  potencialCrescimento,
  impactoTotal,
  percentualPerda,
  roiPotencial
}) => {
  const { activeSection } = useDashboard();

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'resumo':
        return (
          <ExecutiveSummary
            perdaTotal={resultados.perdaTotal}
            economiaRealista={resultados.cenariosEconomia.realista.ganhoAnual}
            roiPotencial={roiPotencial}
            faturamento={dadosOriginais.faturamento}
            percentualPerda={percentualPerda}
            resultados={resultados}
            dadosOriginais={dadosOriginais}
          />
        );
      case 'metricas':
        return <MetricasSection resultados={resultados} dadosOriginais={dadosOriginais} />;
      case 'perdas':
        return <PerdasSection resultados={resultados} dadosOriginais={dadosOriginais} />;
      case 'economia':
        return <EconomiaSection resultados={resultados} dadosOriginais={dadosOriginais} />;
      case 'benchmarks':
        return <BenchmarkSection resultados={resultados} dadosOriginais={dadosOriginais} />;
      default:
        return (
          <ExecutiveSummary
            perdaTotal={resultados.perdaTotal}
            economiaRealista={resultados.cenariosEconomia.realista.ganhoAnual}
            roiPotencial={roiPotencial}
            faturamento={dadosOriginais.faturamento}
            percentualPerda={percentualPerda}
            resultados={resultados}
            dadosOriginais={dadosOriginais}
          />
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex-1"
      >
        {renderActiveSection()}
      </motion.div>
    </AnimatePresence>
  );
};

export const ROIPDashboard: React.FC<ROIPDashboardProps> = ({ 
  resultados, 
  dadosOriginais,
  nomeEmpresa = 'Empresa',
  onEditSimulation,
  isSharedView = false
}) => {
  const potencialCrescimento = dadosOriginais.potencialAumentoFaturamento || 0;
  const impactoTotal = resultados.perdaTotal + potencialCrescimento;
  const percentualPerda = (impactoTotal / dadosOriginais.faturamento) * 100;

  // ROI Potencial (baseado na economia realista)
  const roiPotencial = (resultados.cenariosEconomia.realista.ganhoAnual / impactoTotal) * 100;

  return (
    <DashboardProvider isSharedView={isSharedView} initialBenchmarkLucro={resultados.benchmark.lucro_medio}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-foreground">
            Diagnóstico ROIP™
          </h1>
          {onEditSimulation && !isSharedView && (
            <Button variant="outline" size="sm" onClick={onEditSimulation} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar Simulação
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{nomeEmpresa}</span>
          {' • '}
          Diagnóstico ROIP - Resultados
        </p>
      </div>

      {/* Layout de Duas Colunas: Sidebar + Conteúdo */}
      <div className="flex gap-6 pb-20 md:pb-6">
        {/* Sidebar - gerencia mobile/desktop internamente */}
        <DashboardNavigation />

        {/* Conteúdo da Página Ativa */}
        <DashboardContent
          resultados={resultados}
          dadosOriginais={dadosOriginais}
          nomeEmpresa={nomeEmpresa}
          potencialCrescimento={potencialCrescimento}
          impactoTotal={impactoTotal}
          percentualPerda={percentualPerda}
          roiPotencial={roiPotencial}
        />
      </div>
    </DashboardProvider>
  );
};
