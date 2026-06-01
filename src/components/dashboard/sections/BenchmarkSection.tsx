import React, { useState } from 'react';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { formatarMoeda, formatarPercentual } from '@/utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardSection } from '../DashboardSection';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BenchmarkSectionProps {
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
}

export const BenchmarkSection: React.FC<BenchmarkSectionProps> = ({ resultados, dadosOriginais }) => {
  const [benchmarkOpen, setBenchmarkOpen] = useState(true);
  const [benchmarkSetorOpen, setBenchmarkSetorOpen] = useState(true);

  if (!resultados.benchmark) {
    return null;
  }

  return (
    <DashboardSection id="benchmark" title="Comparativo com o Mercado">
      <div className="space-y-4">
        {/* Comparativo Benchmark vs Empresa */}
        <Card>
          <button
            onClick={() => setBenchmarkOpen(!benchmarkOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <span className="font-semibold text-lg">Comparativo: Benchmark vs Sua Empresa</span>
            {benchmarkOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {benchmarkOpen && (
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Indicador</th>
                      <th className="text-center py-3 px-2 font-medium">Benchmark</th>
                      <th className="text-center py-3 px-2 font-medium">Sua Empresa</th>
                      <th className="text-center py-3 px-2 font-medium">GAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-2">Rotatividade</td>
                      <td className="text-center py-3 px-2">{formatarPercentual(resultados.benchmark.rotatividade_media)}</td>
                      <td className="text-center py-3 px-2">{formatarPercentual(dadosOriginais.rotatividade)}</td>
                      <td className={cn(
                        "text-center py-3 px-2 font-medium",
                        dadosOriginais.rotatividade > resultados.benchmark.rotatividade_media ? 'text-red-600' : 'text-green-600'
                      )}>
                        {dadosOriginais.rotatividade > resultados.benchmark.rotatividade_media ? '+' : ''}
                        {formatarPercentual(dadosOriginais.rotatividade - resultados.benchmark.rotatividade_media)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-2">Faturamento/Colaborador</td>
                      <td className="text-center py-3 px-2">{formatarMoeda(resultados.benchmark.faturamento_por_colaborador)}</td>
                      <td className="text-center py-3 px-2">{formatarMoeda(resultados.faturamentoPorColaborador)}</td>
                      <td className={cn(
                        "text-center py-3 px-2 font-medium",
                        resultados.faturamentoPorColaborador >= resultados.benchmark.faturamento_por_colaborador ? 'text-green-600' : 'text-red-600'
                      )}>
                        {resultados.faturamentoPorColaborador > resultados.benchmark.faturamento_por_colaborador ? '+' : ''}
                        {formatarMoeda(resultados.faturamentoPorColaborador - resultados.benchmark.faturamento_por_colaborador)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-2">Salário Médio</td>
                      <td className="text-center py-3 px-2">{formatarMoeda(resultados.benchmark.salario_medio)}</td>
                      <td className="text-center py-3 px-2">{formatarMoeda(dadosOriginais.salarioMedio)}</td>
                      <td className={cn(
                        "text-center py-3 px-2 font-medium",
                        dadosOriginais.salarioMedio > resultados.benchmark.salario_medio ? 'text-red-600' : 'text-green-600'
                      )}>
                        {dadosOriginais.salarioMedio > resultados.benchmark.salario_medio ? '+' : ''}
                        {formatarMoeda(dadosOriginais.salarioMedio - resultados.benchmark.salario_medio)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-2">Margem Bruta</td>
                      <td className="text-center py-3 px-2">{formatarPercentual(resultados.benchmark.margem_bruta_media)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-2">Lucro Médio</td>
                      <td className="text-center py-3 px-2">{formatarPercentual(resultados.benchmark.lucro_medio)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">% Folha de Pagamento</td>
                      <td className="text-center py-3 px-2">{formatarPercentual(resultados.benchmark.folha_media)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Benchmark do Setor */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <button
            onClick={() => setBenchmarkSetorOpen(!benchmarkSetorOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors rounded-t-lg"
          >
            <span className="font-semibold text-lg">Benchmark do Setor: {resultados.benchmark.nome}</span>
            {benchmarkSetorOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {benchmarkSetorOpen && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Rotatividade Média:</p>
                  <p className="text-lg font-semibold">{formatarPercentual(resultados.benchmark.rotatividade_media)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Margem Bruta Média:</p>
                  <p className="text-lg font-semibold">{formatarPercentual(resultados.benchmark.margem_bruta_media)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Lucro Médio:</p>
                  <p className="text-lg font-semibold">{formatarPercentual(resultados.benchmark.lucro_medio)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Faturamento/Colaborador:</p>
                  <p className="text-lg font-semibold">{formatarMoeda(resultados.benchmark.faturamento_por_colaborador)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Salário Médio:</p>
                  <p className="text-lg font-semibold">{formatarMoeda(resultados.benchmark.salario_medio)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">% Folha de Pagamento:</p>
                  <p className="text-lg font-semibold">{formatarPercentual(resultados.benchmark.folha_media)}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardSection>
  );
};
