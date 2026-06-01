import React, { useState } from 'react';
import { MetricCard } from '../MetricCard';
import { DetailBreakdown } from '../DetailBreakdown';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { formatarMoeda } from '@/utils/formatters';
import { DashboardSection } from '../DashboardSection';

interface PerdasSectionProps {
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
}

export const PerdasSection: React.FC<PerdasSectionProps> = ({ resultados, dadosOriginais }) => {
  const [detailsOpen, setDetailsOpen] = useState({
    rotatividade: false,
    desengajamento: false,
    improdutividade: false
  });

  const toggleDetail = (type: keyof typeof detailsOpen) => {
    setDetailsOpen(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <DashboardSection id="perdas" title="Análise de Perdas">
      <div className="space-y-4">
        {/* Perda por Rotatividade */}
        <MetricCard
          title="Perda por Rotatividade"
          value={resultados.custosRotatividade.total}
          type="currency"
          variant="negative"
          showDetail
          onDetailClick={() => toggleDetail('rotatividade')}
          subtitle={
            <div className="space-y-1">
              <p className="text-sm">
                {resultados.custosRotatividade.funcionariosDesligados.toFixed(1)} funcionários desligados/ano
              </p>
              <p className="text-xs text-muted-foreground">
                Custo por Erro de Contratação: {formatarMoeda(resultados.custoErroContratacao)} (80% dos custos de rotatividade)
              </p>
            </div>
          }
        />

        <DetailBreakdown
          type="rotatividade"
          isOpen={detailsOpen.rotatividade}
          onToggle={() => toggleDetail('rotatividade')}
          rotatividadeDetails={resultados.custosRotatividade}
        />

        {/* Perda por Desengajamento */}
        <MetricCard
          title="Perda por Desengajamento"
          value={resultados.custoDesengajamento.custoAtual}
          type="currency"
          variant="warning"
          showDetail
          onDetailClick={() => toggleDetail('desengajamento')}
          subtitle="Custo com Baixo Engajamento"
        />

        <DetailBreakdown
          type="desengajamento"
          isOpen={detailsOpen.desengajamento}
          onToggle={() => toggleDetail('desengajamento')}
          desengajamentoDetails={resultados.custoDesengajamento}
          funcionarios={dadosOriginais.funcionarios}
        />

        {/* Perda por Improdutividade */}
        <MetricCard
          title="Perda por Improdutividade"
          value={resultados.custoImprodutividade}
          type="currency"
          variant="warning"
          showDetail
          onDetailClick={() => toggleDetail('improdutividade')}
          subtitle="3,83% do faturamento anual"
        />

        <DetailBreakdown
          type="improdutividade"
          isOpen={detailsOpen.improdutividade}
          onToggle={() => toggleDetail('improdutividade')}
          improdutividadeValue={resultados.custoImprodutividade}
          faturamento={dadosOriginais.faturamento}
        />
      </div>
    </DashboardSection>
  );
};
