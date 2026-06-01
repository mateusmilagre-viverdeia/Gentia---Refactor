import React, { useMemo } from 'react';
import { ResultadosROIP, DadosFormulario, calcularProjecaoIndicadores, recalcularCenariosEconomia } from '@/utils/calculations';
import { formatarMoeda } from '@/utils/formatters';
import { DashboardSection } from '../DashboardSection';
import { useDashboard } from '@/contexts/DashboardContext';
import { RefreshCw, Heart, Clock, Rocket, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EconomiaSectionProps {
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
}

export const EconomiaSection: React.FC<EconomiaSectionProps> = ({ resultados, dadosOriginais }) => {
  const { margemEfetiva, usarLucroPersonalizado } = useDashboard();

  const cenariosCorrigidos = useMemo(() => {
    return recalcularCenariosEconomia(resultados, dadosOriginais);
  }, [resultados, dadosOriginais]);

  const resultadosCorrigidos = useMemo(() => ({
    ...resultados,
    cenariosEconomia: cenariosCorrigidos
  }), [resultados, cenariosCorrigidos]);

  const calcularLucroPotencial = (cenario: typeof cenariosCorrigidos.pessimista) => {
    const economiaPerdasDiretas = 
      (cenario.economiaRotatividade || 0) + 
      (cenario.economiaDesengajamento || 0) +
      (cenario.economiaImprodutividade || 0);
    const lucroPotencialCrescimento = cenario.economiaCrescimento || 0;
    return economiaPerdasDiretas + lucroPotencialCrescimento;
  };

  const projecaoPessimista = calcularProjecaoIndicadores(
    dadosOriginais,
    resultadosCorrigidos,
    'pessimista',
    margemEfetiva,
    calcularLucroPotencial(cenariosCorrigidos.pessimista)
  );

  const projecaoRealista = calcularProjecaoIndicadores(
    dadosOriginais,
    resultadosCorrigidos,
    'realista',
    margemEfetiva,
    calcularLucroPotencial(cenariosCorrigidos.realista)
  );

  const projecaoOtimista = calcularProjecaoIndicadores(
    dadosOriginais,
    resultadosCorrigidos,
    'otimista',
    margemEfetiva,
    calcularLucroPotencial(cenariosCorrigidos.otimista)
  );

  const detalhamentoLinhas = [
    {
      label: 'Redução de Perdas com Rotatividade',
      icon: RefreshCw,
      pessimista: cenariosCorrigidos.pessimista.economiaRotatividade || 0,
      realista: cenariosCorrigidos.realista.economiaRotatividade || 0,
      otimista: cenariosCorrigidos.otimista.economiaRotatividade || 0,
    },
    {
      label: 'Redução de Perdas com Desengajamento',
      icon: Heart,
      pessimista: cenariosCorrigidos.pessimista.economiaDesengajamento || 0,
      realista: cenariosCorrigidos.realista.economiaDesengajamento || 0,
      otimista: cenariosCorrigidos.otimista.economiaDesengajamento || 0,
    },
    {
      label: 'Redução de Perdas com Improdutividade',
      icon: Clock,
      pessimista: cenariosCorrigidos.pessimista.economiaImprodutividade || 0,
      realista: cenariosCorrigidos.realista.economiaImprodutividade || 0,
      otimista: cenariosCorrigidos.otimista.economiaImprodutividade || 0,
    },
    {
      label: 'Captura de Oportunidade de Crescimento',
      icon: Rocket,
      pessimista: cenariosCorrigidos.pessimista.economiaCrescimento || 0,
      realista: cenariosCorrigidos.realista.economiaCrescimento || 0,
      otimista: cenariosCorrigidos.otimista.economiaCrescimento || 0,
    },
  ];

  return (
    <DashboardSection id="economia" title="Potencial de Ganhos">
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Cenários de ganhos projetados com base no seu diagnóstico
        </p>

        {usarLucroPersonalizado && (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
            <Info className="h-3 w-3 mr-1" />
            Usando margem do cliente: {margemEfetiva.toFixed(1)}%
          </Badge>
        )}

        {/* Tabela de Detalhamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Potencial de Aumento de Lucro</CardTitle>
            <p className="text-sm text-muted-foreground">
              Lucro adicional projetado por fonte de impacto
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Fonte de Lucro Adicional</th>
                    <th className="text-center py-3 px-2">
                      <div className="font-medium">Pessimista (23%)</div>
                      <div className="text-xs text-muted-foreground">23%</div>
                    </th>
                    <th className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="font-medium">Realista (41%)</div>
                      <div className="text-xs text-muted-foreground">41%</div>
                    </th>
                    <th className="text-center py-3 px-2">
                      <div className="font-medium">Otimista (55%)</div>
                      <div className="text-xs text-muted-foreground">55%</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detalhamentoLinhas.map((linha, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <linha.icon className="h-4 w-4 text-muted-foreground" />
                          {linha.label}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium">{formatarMoeda(linha.pessimista)}</div>
                        <div className="text-xs text-muted-foreground">{formatarMoeda(linha.pessimista / 12)}/mês</div>
                      </td>
                      <td className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="font-medium">{formatarMoeda(linha.realista)}</div>
                        <div className="text-xs text-muted-foreground">{formatarMoeda(linha.realista / 12)}/mês</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium">{formatarMoeda(linha.otimista)}</div>
                        <div className="text-xs text-muted-foreground">{formatarMoeda(linha.otimista / 12)}/mês</div>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de Total */}
                  <tr className="bg-primary/10 font-bold">
                    <td className="py-3 px-2">LUCRO POTENCIAL ADICIONAL</td>
                    <td className="text-center py-3 px-2">
                      <div className="text-green-600">{formatarMoeda(cenariosCorrigidos.pessimista.economiaTotal)}</div>
                      <div className="text-xs font-normal text-muted-foreground">{formatarMoeda(cenariosCorrigidos.pessimista.economiaTotal / 12)}/mês</div>
                    </td>
                    <td className="text-center py-3 px-2 bg-yellow-100 dark:bg-yellow-950/40">
                      <div className="text-green-600">{formatarMoeda(cenariosCorrigidos.realista.economiaTotal)}</div>
                      <div className="text-xs font-normal text-muted-foreground">{formatarMoeda(cenariosCorrigidos.realista.economiaTotal / 12)}/mês</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="text-green-600">{formatarMoeda(cenariosCorrigidos.otimista.economiaTotal)}</div>
                      <div className="text-xs font-normal text-muted-foreground">{formatarMoeda(cenariosCorrigidos.otimista.economiaTotal / 12)}/mês</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nota explicativa */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
              <p>
                💡 <strong>Nota:</strong> Valores calculados com margem de lucro de {margemEfetiva.toFixed(1)}%
                {usarLucroPersonalizado 
                  ? ' (margem informada pelo cliente)' 
                  : ' (benchmark do setor)'
                }. Todos representam LUCRO potencial adicional anual, com equivalente mensal abaixo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Eficiência por Colaborador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eficiência por Colaborador</CardTitle>
            <p className="text-sm text-muted-foreground">
              Evolução do faturamento e lucro por colaborador em cada cenário
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Métrica</th>
                    <th className="text-center py-3 px-2 font-medium">Atual</th>
                    <th className="text-center py-3 px-2">
                      <div className="font-medium">Pessimista</div>
                      <div className="text-xs text-muted-foreground">23%</div>
                    </th>
                    <th className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="font-medium">Realista</div>
                      <div className="text-xs text-muted-foreground">41%</div>
                    </th>
                    <th className="text-center py-3 px-2">
                      <div className="font-medium">Otimista</div>
                      <div className="text-xs text-muted-foreground">55%</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Faturamento por Colaborador */}
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium">Fat./Colaborador</td>
                    <td className="text-center py-3 px-2">{formatarMoeda(projecaoPessimista.faturamentoPorColabAtual)}</td>
                    <td className="text-center py-3 px-2">
                      <div>{formatarMoeda(projecaoPessimista.faturamentoPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoPessimista.aumentoFaturamentoPorColab.toFixed(1)}%</div>
                    </td>
                    <td className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div>{formatarMoeda(projecaoRealista.faturamentoPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoRealista.aumentoFaturamentoPorColab.toFixed(1)}%</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div>{formatarMoeda(projecaoOtimista.faturamentoPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoOtimista.aumentoFaturamentoPorColab.toFixed(1)}%</div>
                    </td>
                  </tr>

                  {/* Lucro por Colaborador */}
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium">Lucro/Colaborador</td>
                    <td className="text-center py-3 px-2">{formatarMoeda(projecaoPessimista.lucroPorColabAtual)}</td>
                    <td className="text-center py-3 px-2">
                      <div>{formatarMoeda(projecaoPessimista.lucroPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoPessimista.aumentoLucroPorColab.toFixed(1)}%</div>
                    </td>
                    <td className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div>{formatarMoeda(projecaoRealista.lucroPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoRealista.aumentoLucroPorColab.toFixed(1)}%</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div>{formatarMoeda(projecaoOtimista.lucroPorColabProjetado)}</div>
                      <div className="text-xs text-green-600">+{projecaoOtimista.aumentoLucroPorColab.toFixed(1)}%</div>
                    </td>
                  </tr>

                  {/* % Margem de Lucro */}
                  <tr className="bg-primary/5">
                    <td className="py-3 px-2 font-medium">% Margem de Lucro</td>
                    <td className="text-center py-3 px-2">
                      {projecaoPessimista.percentualLucroAtual.toFixed(1)}%
                      {usarLucroPersonalizado && <span className="text-xs">*</span>}
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="text-muted-foreground">{projecaoPessimista.percentualLucroAtual.toFixed(1)}%</div>
                      <div className="font-bold text-green-600">{projecaoPessimista.percentualLucroProjetado.toFixed(1)}%</div>
                      <div className="text-xs text-green-600">(+{projecaoPessimista.crescimentoMargem.toFixed(1)}%)</div>
                    </td>
                    <td className="text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="text-muted-foreground">{projecaoRealista.percentualLucroAtual.toFixed(1)}%</div>
                      <div className="font-bold text-green-600">{projecaoRealista.percentualLucroProjetado.toFixed(1)}%</div>
                      <div className="text-xs text-green-600">(+{projecaoRealista.crescimentoMargem.toFixed(1)}%)</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="text-muted-foreground">{projecaoOtimista.percentualLucroAtual.toFixed(1)}%</div>
                      <div className="font-bold text-green-600">{projecaoOtimista.percentualLucroProjetado.toFixed(1)}%</div>
                      <div className="text-xs text-green-600">(+{projecaoOtimista.crescimentoMargem.toFixed(1)}%)</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  );
};
