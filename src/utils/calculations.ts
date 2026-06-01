import { benchmarks, BenchmarkData } from '@/data/benchmarks';

export interface DadosFormulario {
  segmento: string;
  regimeTributario: 'simples' | 'lucro_presumido';
  faturamento: number;
  funcionarios: number;
  rotatividade: number;
  salarioMedio: number;
  tempoOperacional: number;
  potencialAumentoFaturamento?: number;
}

export interface CenarioEconomia {
  percentual: number;
  economiaRotatividade: number;
  economiaDesengajamento: number;
  economiaImprodutividade: number;
  economiaCrescimento: number;
  economiaTotal: number;
  ganhoMensal: number;
  ganhoAnual: number;
}

export interface ResultadosROIP {
  faturamentoPorColaborador: number;
  lucroPorColaboradorEmpresa: number;
  lucroPorColaboradorSetor: number;
  custosRotatividade: DetalhesRotatividade;
  custoErroContratacao: number;
  custoDesengajamento: DetalhesDesengajamento;
  custoImprodutividade: number;
  diasOperacionais: number;
  perdaTotal: number;
  percentualPerda: number;
  cenariosEconomia: {
    pessimista: CenarioEconomia;
    realista: CenarioEconomia;
    otimista: CenarioEconomia;
  };
  benchmark: BenchmarkData;
}

export interface DetalhesRotatividade {
  funcionariosDesligados: number;
  custoRH: number;
  custoEntrevistas: number;
  custoTreinamentos: number;
  custoSalariosEncargos: number;
  total: number;
  detalhesRH: {
    horasPorVaga: number;
    custoHoraRH: number;
    totalHoras: number;
  };
  detalhesTreinamento: {
    custoTreinamento: number;
    custoGestor: number;
    totalPorFuncionario: number;
  };
  detalhesSalariosEncargos: {
    salarioMedio: number;
    multiplicador: number;
    mesesExperiencia: number;
    totalPorFuncionario: number;
  };
}

export interface DetalhesDesengajamento {
  produtividadeAtual: number;
  deficitFuncionarios: number;
  custoAtual: number;
  cenarios: {
    pessimista: { produtividade: number; economiaPotencial: number; };
    realista: { produtividade: number; economiaPotencial: number; };
    otimista: { produtividade: number; economiaPotencial: number; };
  };
  detalhes: {
    percentualEngajados: number;
    percentualNaoEngajados: number;
    percentualDesengajados: number;
    produtividadeEngajados: number;
    produtividadeNaoEngajados: number;
    produtividadeDesengajados: number;
    salarioMedioAnual: number;
    multiplicadorEncargos: number;
  };
}

export const calcularROIP = (dados: DadosFormulario): ResultadosROIP => {
  const benchmark = benchmarks[dados.segmento];

  if (!benchmark) {
    throw new Error('Segmento não encontrado');
  }

  // 1. Indicadores de Performance
  const faturamentoPorColaborador = dados.faturamento / dados.funcionarios;
  const lucroEstimadoEmpresa = dados.faturamento * (benchmark.lucro_medio / 100);
  const lucroPorColaboradorEmpresa = lucroEstimadoEmpresa / dados.funcionarios;
  const lucroPorColaboradorSetor = (benchmark.faturamento_por_colaborador * benchmark.lucro_medio) / 100;

  // 2. Custo da Rotatividade/Contratação
  const funcionariosDesligados = (dados.funcionarios * dados.rotatividade) / 100;
  const multiplicadorEncargos = dados.regimeTributario === 'simples' ? 1.47 : 1.97;

  const horasPorVaga = 8 + (28/60);
  const custoHoraRH = 24;
  const custoRHPorVaga = horasPorVaga * custoHoraRH;
  const custoTotalRH = funcionariosDesligados * custoRHPorVaga;

  const custoEntrevistaPorVaga = 4 * 47;
  const custoTotalEntrevistas = funcionariosDesligados * custoEntrevistaPorVaga;

  const custoTreinamentoPorFuncionario = (30 * 30) + (8 * 47);
  const custoTotalTreinamentos = funcionariosDesligados * custoTreinamentoPorFuncionario;

  const custoSalariosEncargosPorFuncionario = dados.salarioMedio * multiplicadorEncargos * 3;
  const custoTotalSalariosEncargos = funcionariosDesligados * custoSalariosEncargosPorFuncionario;

  const custoTotalRotatividade = custoTotalRH + custoTotalEntrevistas + custoTotalTreinamentos + custoTotalSalariosEncargos;

  // 3. Custo do Desengajamento
  const salarioMedioAnual = dados.salarioMedio * 12;
  const produtividadeAtualPercentual = 85.57;
  const unidadesProdutividade = (dados.funcionarios * produtividadeAtualPercentual) / 100;
  const deficitFuncionarios = dados.funcionarios - unidadesProdutividade;
  const funcionariosExtrasNecessarios = Math.ceil(deficitFuncionarios);
  const custoAtualDesengajamento = funcionariosExtrasNecessarios * salarioMedioAnual * multiplicadorEncargos;

  const cenarioPessimista = 88.88;
  const cenarioRealista = 91.37;
  const cenarioOtimista = 93.85;

  const calcularEconomia = (novoPercentual: number) => {
    const novasUnidadesProdutividade = (dados.funcionarios * novoPercentual) / 100;
    const novoDeficit = dados.funcionarios - novasUnidadesProdutividade;
    const novosFuncionariosExtras = Math.ceil(Math.max(0, novoDeficit));
    const novoCusto = novosFuncionariosExtras * salarioMedioAnual * multiplicadorEncargos;
    return custoAtualDesengajamento - novoCusto;
  };

  const custoDesengajamento: DetalhesDesengajamento = {
    produtividadeAtual: produtividadeAtualPercentual,
    deficitFuncionarios: funcionariosExtrasNecessarios,
    custoAtual: custoAtualDesengajamento,
    cenarios: {
      pessimista: { produtividade: cenarioPessimista, economiaPotencial: calcularEconomia(cenarioPessimista) },
      realista: { produtividade: cenarioRealista, economiaPotencial: calcularEconomia(cenarioRealista) },
      otimista: { produtividade: cenarioOtimista, economiaPotencial: calcularEconomia(cenarioOtimista) }
    },
    detalhes: {
      percentualEngajados: 27,
      percentualNaoEngajados: 62,
      percentualDesengajados: 11,
      produtividadeEngajados: 121,
      produtividadeNaoEngajados: 80,
      produtividadeDesengajados: 30,
      salarioMedioAnual,
      multiplicadorEncargos
    }
  };

  // 4. Custo da Improdutividade
  const custoImprodutividade = dados.faturamento * 0.0383;

  // 5. Custo por Erro de Contratação
  const custoErroContratacao = custoTotalRotatividade * 0.8;

  // 6. Dias operacionais
  const diasOperacionais = Math.round((365 * dados.tempoOperacional) / 100);

  // 7. Totais
  const perdaTotal = custoTotalRotatividade + custoDesengajamento.custoAtual + custoImprodutividade;
  const percentualPerda = (perdaTotal / dados.faturamento) * 100;

  // 8. Cenários de Economia
  const calcularCenarioEconomia = (percentual: number): CenarioEconomia => {
    const economiaRotatividade = custoTotalRotatividade * (percentual / 100);
    const economiaDesengajamento = custoDesengajamento.custoAtual * (percentual / 100);
    const economiaImprodutividade = custoImprodutividade * (percentual / 100);
    const potencialFaturamento = dados.potencialAumentoFaturamento || 0;
    const potencialLucro = potencialFaturamento * (benchmark.lucro_medio / 100);
    const economiaCrescimento = potencialLucro * (percentual / 100);
    const economiaTotal = economiaRotatividade + economiaDesengajamento + economiaImprodutividade + economiaCrescimento;

    return {
      percentual,
      economiaRotatividade,
      economiaDesengajamento,
      economiaImprodutividade,
      economiaCrescimento,
      economiaTotal,
      ganhoMensal: economiaTotal / 12,
      ganhoAnual: economiaTotal
    };
  };

  const cenariosEconomia = {
    pessimista: calcularCenarioEconomia(23),
    realista: calcularCenarioEconomia(41),
    otimista: calcularCenarioEconomia(55)
  };

  return {
    faturamentoPorColaborador,
    lucroPorColaboradorEmpresa,
    lucroPorColaboradorSetor,
    custosRotatividade: {
      funcionariosDesligados,
      custoRH: custoTotalRH,
      custoEntrevistas: custoTotalEntrevistas,
      custoTreinamentos: custoTotalTreinamentos,
      custoSalariosEncargos: custoTotalSalariosEncargos,
      total: custoTotalRotatividade,
      detalhesRH: { horasPorVaga, custoHoraRH, totalHoras: funcionariosDesligados * horasPorVaga },
      detalhesTreinamento: { custoTreinamento: 30 * 30, custoGestor: 8 * 47, totalPorFuncionario: custoTreinamentoPorFuncionario },
      detalhesSalariosEncargos: { salarioMedio: dados.salarioMedio, multiplicador: multiplicadorEncargos, mesesExperiencia: 3, totalPorFuncionario: custoSalariosEncargosPorFuncionario }
    },
    custoErroContratacao,
    custoDesengajamento,
    custoImprodutividade,
    diasOperacionais,
    perdaTotal,
    percentualPerda,
    cenariosEconomia,
    benchmark
  };
};

// Função para recalcular cenários de economia com dados corrigidos
export function recalcularCenariosEconomia(
  resultados: ResultadosROIP,
  dadosOriginais: DadosFormulario
): ResultadosROIP['cenariosEconomia'] {
  const cenarios = resultados.cenariosEconomia;
  const margemLucro = resultados.benchmark.lucro_medio / 100;
  const potencialCrescimento = dadosOriginais.potencialAumentoFaturamento || 0;

  const calcularCenario = (percentual: number): CenarioEconomia => {
    const economiaRotatividade = resultados.custosRotatividade.total * (percentual / 100);
    const economiaDesengajamento = resultados.custoDesengajamento.custoAtual * (percentual / 100);
    const economiaImprodutividade = resultados.custoImprodutividade * (percentual / 100);
    const economiaCrescimento = potencialCrescimento * margemLucro * (percentual / 100);
    const economiaTotal = economiaRotatividade + economiaDesengajamento + economiaImprodutividade + economiaCrescimento;

    return {
      percentual,
      economiaRotatividade,
      economiaDesengajamento,
      economiaImprodutividade,
      economiaCrescimento,
      economiaTotal,
      ganhoMensal: economiaTotal / 12,
      ganhoAnual: economiaTotal
    };
  };

  return {
    pessimista: calcularCenario(23),
    realista: calcularCenario(41),
    otimista: calcularCenario(55)
  };
}

// Interface para projeção de indicadores
export interface ProjecaoIndicadores {
  faturamentoPorColabAtual: number;
  faturamentoPorColabProjetado: number;
  aumentoFaturamentoPorColab: number;
  lucroPorColabAtual: number;
  lucroPorColabProjetado: number;
  aumentoLucroPorColab: number;
  percentualLucroAtual: number;
  percentualLucroProjetado: number;
  crescimentoMargem: number;
}

// Função para calcular projeção de indicadores por cenário
export function calcularProjecaoIndicadores(
  dadosOriginais: DadosFormulario,
  resultados: ResultadosROIP,
  tipoCenario: 'pessimista' | 'realista' | 'otimista',
  margemEfetiva: number,
  lucroPotencial: number
): ProjecaoIndicadores {
  const { funcionarios, faturamento } = dadosOriginais;

  const faturamentoPorColabAtual = faturamento / funcionarios;
  const lucroPorColabAtual = (faturamento * margemEfetiva / 100) / funcionarios;
  const percentualLucroAtual = margemEfetiva;

  // Projeções baseadas no lucro potencial
  const lucroPorColabProjetado = lucroPorColabAtual + (lucroPotencial / funcionarios);
  const aumentoLucroPorColab = lucroPorColabAtual > 0 
    ? ((lucroPorColabProjetado - lucroPorColabAtual) / lucroPorColabAtual) * 100 
    : 0;

  // Faturamento projetado (30% do aumento do lucro reflete em faturamento)
  const faturamentoPorColabProjetado = faturamentoPorColabAtual * (1 + aumentoLucroPorColab / 100 * 0.3);
  const aumentoFaturamentoPorColab = faturamentoPorColabAtual > 0
    ? ((faturamentoPorColabProjetado - faturamentoPorColabAtual) / faturamentoPorColabAtual) * 100
    : 0;

  // Margem de lucro projetada
  const percentualLucroProjetado = faturamentoPorColabProjetado > 0
    ? (lucroPorColabProjetado / faturamentoPorColabProjetado) * 100
    : percentualLucroAtual;
  const crescimentoMargem = percentualLucroProjetado - percentualLucroAtual;

  return {
    faturamentoPorColabAtual,
    faturamentoPorColabProjetado,
    aumentoFaturamentoPorColab,
    lucroPorColabAtual,
    lucroPorColabProjetado,
    aumentoLucroPorColab,
    percentualLucroAtual,
    percentualLucroProjetado,
    crescimentoMargem
  };
}
