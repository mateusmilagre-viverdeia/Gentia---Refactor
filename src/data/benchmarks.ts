// Base de dados completa com benchmarks por segmento para cálculos ROIP
export interface BenchmarkData {
  nome: string;
  margem_bruta_media: number;
  rotatividade_media: number;
  faturamento_por_colaborador: number;
  salario_medio: number;
  lucro_medio: number;
  folha_media: number;
}

export const benchmarks: Record<string, BenchmarkData> = {
  comercio_servico_epp: {
    nome: "Comércio e Serviço EPP",
    margem_bruta_media: 40,
    rotatividade_media: 18,
    faturamento_por_colaborador: 180000,
    salario_medio: 3000,
    lucro_medio: 14,
    folha_media: 35
  },
  setor_industrial_epp: {
    nome: "Setor Industrial EPP",
    margem_bruta_media: 45,
    rotatividade_media: 15,
    faturamento_por_colaborador: 220000,
    salario_medio: 4000,
    lucro_medio: 18,
    folha_media: 38
  },
  comercio_servico_mp: {
    nome: "Comércio e Serviço MP",
    margem_bruta_media: 42,
    rotatividade_media: 20,
    faturamento_por_colaborador: 230000,
    salario_medio: 4200,
    lucro_medio: 16,
    folha_media: 38
  },
  setor_industrial_mp: {
    nome: "Setor Industrial MP",
    margem_bruta_media: 48,
    rotatividade_media: 18,
    faturamento_por_colaborador: 300000,
    salario_medio: 5200,
    lucro_medio: 22,
    folha_media: 40
  },
  transportadora_rodoviaria: {
    nome: "Transportadora Rodoviária",
    margem_bruta_media: 35,
    rotatividade_media: 25,
    faturamento_por_colaborador: 160000,
    salario_medio: 3500,
    lucro_medio: 12,
    folha_media: 30
  },
  operadora_logistica: {
    nome: "Operadora Logística",
    margem_bruta_media: 40,
    rotatividade_media: 20,
    faturamento_por_colaborador: 180000,
    salario_medio: 3800,
    lucro_medio: 15,
    folha_media: 32
  },
  agronegocio: {
    nome: "Agronegócio",
    margem_bruta_media: 30,
    rotatividade_media: 20,
    faturamento_por_colaborador: 200000,
    salario_medio: 4000,
    lucro_medio: 15,
    folha_media: 30
  },
  saude: {
    nome: "Saúde",
    margem_bruta_media: 60,
    rotatividade_media: 12,
    faturamento_por_colaborador: 380000,
    salario_medio: 8000,
    lucro_medio: 30,
    folha_media: 45
  },
  imobiliario: {
    nome: "Imobiliário",
    margem_bruta_media: 55,
    rotatividade_media: 15,
    faturamento_por_colaborador: 300000,
    salario_medio: 5500,
    lucro_medio: 25,
    folha_media: 38
  },
  varejo_comercio: {
    nome: "Varejo/Comércio",
    margem_bruta_media: 35,
    rotatividade_media: 30,
    faturamento_por_colaborador: 170000,
    salario_medio: 2800,
    lucro_medio: 12,
    folha_media: 28
  },
  construcao_civil: {
    nome: "Construção Civil",
    margem_bruta_media: 40,
    rotatividade_media: 35,
    faturamento_por_colaborador: 180000,
    salario_medio: 3500,
    lucro_medio: 15,
    folha_media: 30
  },
  industria: {
    nome: "Indústria",
    margem_bruta_media: 45,
    rotatividade_media: 15,
    faturamento_por_colaborador: 250000,
    salario_medio: 4800,
    lucro_medio: 20,
    folha_media: 38
  },
  supermercado: {
    nome: "Supermercado",
    margem_bruta_media: 28,
    rotatividade_media: 40,
    faturamento_por_colaborador: 130000,
    salario_medio: 2200,
    lucro_medio: 8,
    folha_media: 25
  },
  restaurante: {
    nome: "Restaurante (Alimentação)",
    margem_bruta_media: 38,
    rotatividade_media: 50,
    faturamento_por_colaborador: 120000,
    salario_medio: 2000,
    lucro_medio: 10,
    folha_media: 28
  },
  alimentos_bebidas: {
    nome: "Alimentos/Bebidas",
    margem_bruta_media: 45,
    rotatividade_media: 20,
    faturamento_por_colaborador: 220000,
    salario_medio: 4000,
    lucro_medio: 18,
    folha_media: 35
  },
  consultorias: {
    nome: "Consultorias",
    margem_bruta_media: 75,
    rotatividade_media: 10,
    faturamento_por_colaborador: 550000,
    salario_medio: 12000,
    lucro_medio: 40,
    folha_media: 45
  },
  turismo: {
    nome: "Turismo",
    margem_bruta_media: 50,
    rotatividade_media: 25,
    faturamento_por_colaborador: 180000,
    salario_medio: 3500,
    lucro_medio: 16,
    folha_media: 30
  },
  educacao: {
    nome: "Educação",
    margem_bruta_media: 55,
    rotatividade_media: 12,
    faturamento_por_colaborador: 250000,
    salario_medio: 5500,
    lucro_medio: 28,
    folha_media: 40
  },
  comunicacao_publicidade: {
    nome: "Comunicação/Publicidade",
    margem_bruta_media: 60,
    rotatividade_media: 15,
    faturamento_por_colaborador: 320000,
    salario_medio: 5500,
    lucro_medio: 20,
    folha_media: 42
  },
  servicos_financeiros: {
    nome: "Serviços Financeiros",
    margem_bruta_media: 70,
    rotatividade_media: 12,
    faturamento_por_colaborador: 420000,
    salario_medio: 9000,
    lucro_medio: 35,
    folha_media: 50
  },
  atacadista: {
    nome: "Atacadista",
    margem_bruta_media: 28,
    rotatividade_media: 20,
    faturamento_por_colaborador: 220000,
    salario_medio: 3500,
    lucro_medio: 12,
    folha_media: 30
  },
  automotivo: {
    nome: "Automotivo",
    margem_bruta_media: 42,
    rotatividade_media: 20,
    faturamento_por_colaborador: 260000,
    salario_medio: 5000,
    lucro_medio: 18,
    folha_media: 38
  },
  quimico: {
    nome: "Químico",
    margem_bruta_media: 52,
    rotatividade_media: 15,
    faturamento_por_colaborador: 320000,
    salario_medio: 6000,
    lucro_medio: 25,
    folha_media: 42
  },
  tecnologia: {
    nome: "Tecnologia",
    margem_bruta_media: 80,
    rotatividade_media: 15,
    faturamento_por_colaborador: 650000,
    salario_medio: 11000,
    lucro_medio: 40,
    folha_media: 45
  },
  ambiental: {
    nome: "Ambiental",
    margem_bruta_media: 50,
    rotatividade_media: 15,
    faturamento_por_colaborador: 250000,
    salario_medio: 5500,
    lucro_medio: 22,
    folha_media: 40
  },
  farmacia: {
    nome: "Farmácia",
    margem_bruta_media: 45,
    rotatividade_media: 15,
    faturamento_por_colaborador: 280000,
    salario_medio: 4800,
    lucro_medio: 20,
    folha_media: 38
  },
  energia: {
    nome: "Energia",
    margem_bruta_media: 60,
    rotatividade_media: 12,
    faturamento_por_colaborador: 400000,
    salario_medio: 8000,
    lucro_medio: 25,
    folha_media: 40
  },
  servicos_em_geral: {
    nome: "Serviços em Geral",
    margem_bruta_media: 75,
    rotatividade_media: 15,
    faturamento_por_colaborador: 300000,
    salario_medio: 4500,
    lucro_medio: 50,
    folha_media: 20
  }
};

export const segmentoOptions = Object.keys(benchmarks).map(key => ({
  value: key,
  label: benchmarks[key].nome
})).sort((a, b) => a.label.localeCompare(b.label));
