import React from 'react';
import { MetricCard } from '../MetricCard';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { formatarMoeda } from '@/utils/formatters';
import { DashboardSection } from '../DashboardSection';
import { useDashboard } from '@/contexts/DashboardContext';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MetricasSectionProps {
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
}

export const MetricasSection: React.FC<MetricasSectionProps> = ({ resultados, dadosOriginais }) => {
  const { usarLucroPersonalizado, lucroPersonalizado } = useDashboard();

  const benchmarkLucro = resultados.benchmark.lucro_medio;
  const clienteSuperaBenchmark = usarLucroPersonalizado && lucroPersonalizado > benchmarkLucro;
  const margemParaCalculo = clienteSuperaBenchmark ? lucroPersonalizado : benchmarkLucro;

  const lucroAproximadoEmpresa = dadosOriginais.faturamento * (margemParaCalculo / 100);
  const lucroPorColaboradorCalculado = lucroAproximadoEmpresa / dadosOriginais.funcionarios;

  return (
    <DashboardSection id="metricas" title="Indicadores de Performance">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Faturamento Anual */}
        <MetricCard
          title="Faturamento Anual"
          value={dadosOriginais.faturamento}
          type="currency"
          variant="neutral"
          benchmark={resultados.benchmark.faturamento_por_colaborador * dadosOriginais.funcionarios}
        />

        {/* Faturamento por Colaborador */}
        <MetricCard
          title="Faturamento por Colaborador"
          value={resultados.faturamentoPorColaborador}
          type="currency"
          variant={resultados.faturamentoPorColaborador >= resultados.benchmark.faturamento_por_colaborador ? 'positive' : 'warning'}
          benchmark={resultados.benchmark.faturamento_por_colaborador}
        />

        {/* Lucro por Colaborador */}
        <div className="relative">
          {clienteSuperaBenchmark && (
            <Badge className="absolute -top-2 -right-2 z-10 bg-green-500 text-white flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Acima do Benchmark
            </Badge>
          )}
          <MetricCard
            title="Lucro por Colaborador"
            value={lucroPorColaboradorCalculado}
            type="currency"
            variant={lucroPorColaboradorCalculado >= resultados.lucroPorColaboradorSetor ? 'positive' : 'warning'}
            benchmark={resultados.lucroPorColaboradorSetor}
            subtitle={
              <div className="space-y-1">
                <p className="text-xs">
                  {clienteSuperaBenchmark 
                    ? `Margem do cliente (${lucroPersonalizado.toFixed(1)}%) supera o benchmark`
                    : `Baseado na margem média do setor (${benchmarkLucro.toFixed(1)}%)`
                  }
                </p>
                <p className="text-xs font-medium">
                  Lucro aproximado da empresa: {formatarMoeda(lucroAproximadoEmpresa)}
                </p>
              </div>
            }
          />
        </div>
      </div>
    </DashboardSection>
  );
};
