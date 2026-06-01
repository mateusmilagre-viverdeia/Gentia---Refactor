import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountUpNumber } from './CountUpNumber';
import { TrendingDown, TrendingUp, Target, DollarSign, Users, AlertTriangle, HelpCircle, Wallet, BarChart3, PiggyBank } from 'lucide-react';
import { formatarMoeda, formatarPercentual } from '@/utils/formatters';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboard } from '@/contexts/DashboardContext';

interface ExecutiveSummaryProps {
  perdaTotal: number;
  economiaRealista: number;
  roiPotencial: number;
  faturamento: number;
  percentualPerda: number;
  resultados: ResultadosROIP;
  dadosOriginais: DadosFormulario;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  perdaTotal,
  economiaRealista,
  roiPotencial,
  faturamento,
  percentualPerda,
  resultados,
  dadosOriginais
}) => {
  const { 
    usarLucroPersonalizado, 
    setUsarLucroPersonalizado, 
    lucroPersonalizado, 
    setLucroPersonalizado,
    setBenchmarkLucro 
  } = useDashboard();

  useEffect(() => {
    setBenchmarkLucro(resultados.benchmark.lucro_medio);
    if (!usarLucroPersonalizado) {
      setLucroPersonalizado(resultados.benchmark.lucro_medio);
    }
  }, [resultados.benchmark.lucro_medio, setBenchmarkLucro, setLucroPersonalizado, usarLucroPersonalizado]);

  const calcularSaudeROIP = (): number => {
    const benchmarkRotatividade = resultados.benchmark.rotatividade_media;
    const rotatividadeEmpresa = dadosOriginais.rotatividade;
    const performanceBenchmark = benchmarkRotatividade > 0 
      ? Math.max(0, 30 * (1 - (rotatividadeEmpresa / benchmarkRotatividade)))
      : 15;

    const totalPerdas = perdaTotal;
    const perdaRotatividade = resultados.custosRotatividade.total;
    const perdaDesengajamento = resultados.custoDesengajamento.custoAtual;
    const perdaImprodutividade = resultados.custoImprodutividade;

    const proporcoes = [
      perdaRotatividade / totalPerdas,
      perdaDesengajamento / totalPerdas,
      perdaImprodutividade / totalPerdas
    ];

    const gini = proporcoes.reduce((acc, p1, i) => 
      acc + proporcoes.slice(i + 1).reduce((sum, p2) => sum + Math.abs(p1 - p2), 0)
    , 0) / 2;

    const balanceamento = 30 * (1 - gini);

    const taxaRecuperacao = economiaRealista / perdaTotal;
    const pontuacaoROI = Math.min(20, (roiPotencial / 1000) * 20);
    const pontuacaoRecuperacao = Math.min(20, taxaRecuperacao * 40);
    const capacidadeRecuperacao = pontuacaoROI + pontuacaoRecuperacao;

    return Math.max(0, Math.min(100, performanceBenchmark + balanceamento + capacidadeRecuperacao));
  };

  const saudeROIP = calcularSaudeROIP();

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
    if (health >= 40) return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800';
    return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
  };

  const getHealthLabel = (health: number) => {
    if (health >= 70) return 'Excelente';
    if (health >= 50) return 'Bom';
    if (health >= 30) return 'Atenção';
    return 'Crítico';
  };

  const getHealthDescription = (health: number) => {
    if (health >= 70) return 'Empresa com gestão de pessoas saudável e bem posicionada vs mercado';
    if (health >= 50) return 'Gestão adequada com oportunidades claras de melhoria';
    if (health >= 30) return 'Perdas significativas requerem ação prioritária';
    return 'Situação crítica - perdas comprometem competitividade';
  };

  const perdasDiretas = 
    resultados.custosRotatividade.total + 
    resultados.custoDesengajamento.custoAtual + 
    resultados.custoImprodutividade;

  const lucroEstimadoEmpresa = faturamento * (resultados.benchmark.lucro_medio / 100);
  const margemLucro = resultados.benchmark.lucro_medio;

  const potencialFaturamento = dadosOriginais.potencialAumentoFaturamento || 0;

  const margemEfetiva = usarLucroPersonalizado ? lucroPersonalizado : margemLucro;
  const potencialConvertidoEmLucro = potencialFaturamento * (margemEfetiva / 100);

  const percentualPerdasDiretasNoLucro = lucroEstimadoEmpresa > 0 ? (perdasDiretas / lucroEstimadoEmpresa) * 100 : 0;
  const percentualPotencialNoLucro = lucroEstimadoEmpresa > 0 ? (potencialConvertidoEmLucro / lucroEstimadoEmpresa) * 100 : 0;

  const impactoTotalLucro = perdasDiretas + potencialConvertidoEmLucro;
  const percentualImpactoTotalNoLucro = lucroEstimadoEmpresa > 0 ? (impactoTotalLucro / lucroEstimadoEmpresa) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* BLOCO 1: Perdas Diretas */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Perdas Diretas (Saída de Caixa)
            </CardTitle>
            <span className="text-xs text-muted-foreground bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
              Economia aqui vai 100% para o lucro
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabela de Perdas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Categoria</th>
                  <th className="text-right py-2 font-medium">Anual</th>
                  <th className="text-right py-2 font-medium">Mensal</th>
                  <th className="text-right py-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-muted-foreground">Rotatividade</td>
                  <td className="text-right py-2 font-medium text-red-600">{formatarMoeda(resultados.custosRotatividade.total)}</td>
                  <td className="text-right py-2 text-muted-foreground">{formatarMoeda(resultados.custosRotatividade.total / 12)}</td>
                  <td className="text-right py-2">{formatarPercentual((resultados.custosRotatividade.total / perdasDiretas) * 100, 0)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-muted-foreground">Desengajamento</td>
                  <td className="text-right py-2 font-medium text-orange-600">{formatarMoeda(resultados.custoDesengajamento.custoAtual)}</td>
                  <td className="text-right py-2 text-muted-foreground">{formatarMoeda(resultados.custoDesengajamento.custoAtual / 12)}</td>
                  <td className="text-right py-2">{formatarPercentual((resultados.custoDesengajamento.custoAtual / perdasDiretas) * 100, 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-muted-foreground">Improdutividade</td>
                  <td className="text-right py-2 font-medium text-yellow-600">{formatarMoeda(resultados.custoImprodutividade)}</td>
                  <td className="text-right py-2 text-muted-foreground">{formatarMoeda(resultados.custoImprodutividade / 12)}</td>
                  <td className="text-right py-2">{formatarPercentual((resultados.custoImprodutividade / perdasDiretas) * 100, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Perdas Diretas</p>
              <p className="text-2xl font-bold text-red-600">
                <CountUpNumber value={perdasDiretas} format="currency" />
              </p>
              <p className="text-xs text-muted-foreground">{formatarMoeda(perdasDiretas / 12)}/mês</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Impacto no Lucro</p>
              <p className="text-2xl font-bold text-green-600">
                +{percentualPerdasDiretasNoLucro.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">de aumento possível</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Lucro Estimado</p>
              <p className="text-lg font-semibold">{formatarMoeda(lucroEstimadoEmpresa)}</p>
              <p className="text-xs text-muted-foreground">margem {margemLucro}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Margem */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={usarLucroPersonalizado} 
                onCheckedChange={setUsarLucroPersonalizado}
              />
              <Label className="text-sm">Usar margem de lucro real do cliente</Label>
            </div>
            {usarLucroPersonalizado && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Margem:</span>
                <Input
                  type="number"
                  value={lucroPersonalizado}
                  onChange={(e) => setLucroPersonalizado(Number(e.target.value) || 0)}
                  className="w-20 h-8 text-center"
                  min={0}
                  max={100}
                  step={0.1}
                />
                <span className="text-sm">%</span>
                <span className="text-xs text-muted-foreground">(Benchmark: {margemLucro.toFixed(1)}%)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: Potencial Não Realizado */}
      {potencialFaturamento > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Potencial Não Realizado
              </CardTitle>
              <span className="text-xs text-muted-foreground">Faturamento que está deixando de ganhar</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Faturamento Perdido</p>
                <p className="text-2xl font-bold text-blue-600">{formatarMoeda(potencialFaturamento)}</p>
                <p className="text-xs text-muted-foreground">{formatarMoeda(potencialFaturamento / 12)}/mês</p>
              </div>
              <div className="text-center text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Convertido em Lucro
                  <span className="text-xs block">(margem de {margemEfetiva.toFixed(1)}%{usarLucroPersonalizado ? ' - cliente' : ' do setor'})</span>
                </p>
                <p className="text-2xl font-bold text-green-600">{formatarMoeda(potencialConvertidoEmLucro)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Lucro Equivalente</p>
                <p className="text-xl font-bold text-green-600">{formatarMoeda(potencialConvertidoEmLucro)}/ano</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Impacto no Lucro</p>
                <p className="text-xl font-bold text-green-600">+{percentualPotencialNoLucro.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">de aumento possível</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOCO 3: Impacto Total */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Impacto Total no Lucro
            </CardTitle>
            <span className="text-xs text-muted-foreground">Quanto você está deixando na mesa</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Perdas Diretas (100% lucro)</span>
              <span className="font-semibold text-red-600">{formatarMoeda(perdasDiretas)}</span>
            </div>
            {potencialFaturamento > 0 && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Potencial Convertido (margem {margemEfetiva.toFixed(0)}%{usarLucroPersonalizado ? ' - cliente' : ''})
                </span>
                <span className="font-semibold text-blue-600">{formatarMoeda(potencialConvertidoEmLucro)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 bg-primary/10 px-2 rounded">
              <span className="font-bold">TOTAL IMPACTO NO LUCRO</span>
              <span className="text-xl font-bold text-primary">{formatarMoeda(impactoTotalLucro)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center bg-primary/10 p-4 rounded-lg">
              <p className="text-3xl font-bold text-primary">
                <CountUpNumber value={impactoTotalLucro} format="currency" />
              </p>
              <p className="text-sm text-muted-foreground">/ano</p>
              <p className="text-lg font-semibold">{formatarMoeda(impactoTotalLucro / 12)}/mês na mesa</p>
            </div>
            <div className="text-center bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Aumento Possível no Lucro</p>
              <p className="text-3xl font-bold text-green-600">
                +{percentualImpactoTotalNoLucro.toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Operacionais */}
      <Card>
        <CardContent className="py-4">
          <h4 className="font-semibold mb-2">Informações Operacionais</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dias Operacionais por Ano:</span>
              <span className="font-medium">{resultados.diasOperacionais} dias</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meses Operacionais por Ano:</span>
              <span className="font-medium">{(resultados.diasOperacionais / 30.42).toFixed(1)} meses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mini Insight */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm">
          💡 <strong>Insight:</strong> Sua empresa está deixando de ganhar{' '}
          <strong className="text-primary">{formatarMoeda(impactoTotalLucro / 12)}</strong>{' '}
          por mês. Com o ROIP™, você pode recuperar até{' '}
          <strong className="text-green-600">{formatarMoeda(economiaRealista)}</strong>{' '}
          anualmente.
        </p>
      </div>

      {/* Resumo Executivo - Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumo Executivo
          </CardTitle>
          <p className="text-sm text-muted-foreground">Principais indicadores do seu diagnóstico ROIP</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Perda Total */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-red-600">PERDAS</span>
              </div>
              <p className="text-sm text-muted-foreground">Perda Total Anual</p>
              <p className="text-2xl font-bold text-red-600">
                <CountUpNumber value={perdaTotal} format="currency" />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatarPercentual(percentualPerda)} do faturamento
              </p>
            </div>

            {/* Economia Realista */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <PiggyBank className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-600">ECONOMIA</span>
              </div>
              <p className="text-sm text-muted-foreground">Economia Realista</p>
              <p className="text-2xl font-bold text-green-600">
                <CountUpNumber value={economiaRealista} format="currency" />
              </p>
              <p className="text-xs text-muted-foreground mt-1">Cenário mais provável</p>
            </div>

            {/* ROI Potencial */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">ROI</span>
                <Popover>
                  <PopoverTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm">
                    <p className="font-semibold mb-2">O que é ROI Potencial?</p>
                    <p className="text-muted-foreground mb-2">
                      O ROI Potencial mostra o retorno sobre investimento que sua empresa pode alcançar ao implementar melhorias na gestão de pessoas.
                    </p>
                    <p className="font-medium mb-1">Como é calculado:</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      (Economia Anual Realista ÷ Investimento Estimado) × 100
                    </p>
                    <p className="font-medium mb-1">Interpretação:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Acima de 300%: Excelente retorno</li>
                      <li>• Entre 150-300%: Bom retorno</li>
                      <li>• Abaixo de 150%: Retorno moderado</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground">ROI Potencial</p>
              <p className="text-2xl font-bold text-blue-600">
                <CountUpNumber value={roiPotencial} format="percentage" decimals={0} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">Retorno projetado</p>
            </div>

            {/* Saúde ROIP */}
            <div className={cn('border rounded-lg p-4 text-center', getHealthColor(saudeROIP))}>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium">{getHealthLabel(saudeROIP).toUpperCase()}</span>
                <Popover>
                  <PopoverTrigger>
                    <HelpCircle className="h-3 w-3 opacity-70 cursor-help" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <p className="font-semibold mb-2">O que é Saúde ROIP™?</p>
                    <p className="text-muted-foreground mb-3">
                      A Saúde ROIP™ é um indicador proprietário que avalia a saúde da gestão de pessoas da sua empresa em 3 dimensões, totalizando 100 pontos.
                    </p>
                    <p className="font-medium mb-2">Critérios de Avaliação:</p>
                    <div className="space-y-2 text-xs text-muted-foreground mb-3">
                      <p><strong>1. Performance vs Benchmark (30 pts)</strong><br/>Compara sua rotatividade com a média do setor</p>
                      <p><strong>2. Balanceamento de Perdas (30 pts)</strong><br/>Avalia a distribuição equilibrada entre tipos de perda</p>
                      <p><strong>3. Capacidade de Recuperação (40 pts)</strong><br/>Analisa ROI potencial e taxa de recuperação</p>
                    </div>
                    <p className="font-medium mb-1">Classificação:</p>
                    <ul className="text-xs space-y-1">
                      <li className="text-green-600">• 70-100: Excelente</li>
                      <li className="text-blue-600">• 50-69: Bom</li>
                      <li className="text-orange-600">• 30-49: Atenção</li>
                      <li className="text-red-600">• 0-29: Crítico</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground">Saúde ROIP™</p>
              <p className="text-2xl font-bold">
                <CountUpNumber value={saudeROIP} format="number" />%
              </p>
              <p className="text-xs mt-1 opacity-80">{getHealthDescription(saudeROIP)}</p>
              <Progress value={saudeROIP} className="h-2 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
