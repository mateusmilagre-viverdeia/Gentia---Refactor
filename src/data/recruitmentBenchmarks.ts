export interface RecruitmentBenchmarkData {
  nome: string;
  tempo_medio_contratacao: number;      // dias
  taxa_conversao: number;               // % (aplicados -> contratados)
  candidatos_por_vaga: number;          // média
  taxa_aceitacao_oferta: number;        // %
  custo_por_contratacao: number;        // R$
  tempo_triagem: number;                // dias
  taxa_rejeicao: number;                // %
  fill_rate: number;                    // % de vagas preenchidas
}

// Benchmarks por segmento de mercado
export const recruitmentBenchmarks: Record<string, RecruitmentBenchmarkData> = {
  tecnologia: {
    nome: "Tecnologia",
    tempo_medio_contratacao: 35,
    taxa_conversao: 3.5,
    candidatos_por_vaga: 45,
    taxa_aceitacao_oferta: 78,
    custo_por_contratacao: 8500,
    tempo_triagem: 5,
    taxa_rejeicao: 85,
    fill_rate: 82
  },
  saude: {
    nome: "Saúde",
    tempo_medio_contratacao: 28,
    taxa_conversao: 5,
    candidatos_por_vaga: 30,
    taxa_aceitacao_oferta: 85,
    custo_por_contratacao: 6000,
    tempo_triagem: 4,
    taxa_rejeicao: 80,
    fill_rate: 88
  },
  varejo: {
    nome: "Varejo",
    tempo_medio_contratacao: 21,
    taxa_conversao: 4,
    candidatos_por_vaga: 60,
    taxa_aceitacao_oferta: 75,
    custo_por_contratacao: 3500,
    tempo_triagem: 3,
    taxa_rejeicao: 82,
    fill_rate: 85
  },
  industria: {
    nome: "Indústria",
    tempo_medio_contratacao: 25,
    taxa_conversao: 4.5,
    candidatos_por_vaga: 35,
    taxa_aceitacao_oferta: 80,
    custo_por_contratacao: 5000,
    tempo_triagem: 4,
    taxa_rejeicao: 78,
    fill_rate: 86
  },
  financeiro: {
    nome: "Serviços Financeiros",
    tempo_medio_contratacao: 40,
    taxa_conversao: 2.8,
    candidatos_por_vaga: 55,
    taxa_aceitacao_oferta: 82,
    custo_por_contratacao: 12000,
    tempo_triagem: 6,
    taxa_rejeicao: 88,
    fill_rate: 80
  },
  construcao: {
    nome: "Construção Civil",
    tempo_medio_contratacao: 18,
    taxa_conversao: 6,
    candidatos_por_vaga: 25,
    taxa_aceitacao_oferta: 72,
    custo_por_contratacao: 2500,
    tempo_triagem: 2,
    taxa_rejeicao: 75,
    fill_rate: 90
  },
  educacao: {
    nome: "Educação",
    tempo_medio_contratacao: 30,
    taxa_conversao: 4.2,
    candidatos_por_vaga: 40,
    taxa_aceitacao_oferta: 88,
    custo_por_contratacao: 4000,
    tempo_triagem: 5,
    taxa_rejeicao: 80,
    fill_rate: 87
  },
  consultoria: {
    nome: "Consultoria",
    tempo_medio_contratacao: 32,
    taxa_conversao: 3,
    candidatos_por_vaga: 50,
    taxa_aceitacao_oferta: 76,
    custo_por_contratacao: 9000,
    tempo_triagem: 5,
    taxa_rejeicao: 86,
    fill_rate: 78
  },
  logistica: {
    nome: "Logística",
    tempo_medio_contratacao: 20,
    taxa_conversao: 5.5,
    candidatos_por_vaga: 35,
    taxa_aceitacao_oferta: 70,
    custo_por_contratacao: 3000,
    tempo_triagem: 3,
    taxa_rejeicao: 76,
    fill_rate: 88
  },
  alimentacao: {
    nome: "Alimentação",
    tempo_medio_contratacao: 14,
    taxa_conversao: 8,
    candidatos_por_vaga: 20,
    taxa_aceitacao_oferta: 68,
    custo_por_contratacao: 2000,
    tempo_triagem: 2,
    taxa_rejeicao: 70,
    fill_rate: 92
  },
  geral: {
    nome: "Média Geral do Mercado",
    tempo_medio_contratacao: 28,
    taxa_conversao: 4.5,
    candidatos_por_vaga: 40,
    taxa_aceitacao_oferta: 77,
    custo_por_contratacao: 5500,
    tempo_triagem: 4,
    taxa_rejeicao: 80,
    fill_rate: 85
  }
};

// Helper function to get segment options for dropdown
export const getSegmentOptions = () => {
  return Object.entries(recruitmentBenchmarks).map(([key, value]) => ({
    value: key,
    label: value.nome
  }));
};

// Map company sector to benchmark segment
export const mapSectorToSegment = (sector: string | null | undefined): string => {
  if (!sector) return "geral";
  
  const sectorLower = sector.toLowerCase();
  
  const sectorMap: Record<string, string> = {
    "tecnologia": "tecnologia",
    "tech": "tecnologia",
    "ti": "tecnologia",
    "software": "tecnologia",
    "saúde": "saude",
    "saude": "saude",
    "healthcare": "saude",
    "varejo": "varejo",
    "retail": "varejo",
    "comércio": "varejo",
    "comercio": "varejo",
    "indústria": "industria",
    "industria": "industria",
    "manufacturing": "industria",
    "financeiro": "financeiro",
    "finanças": "financeiro",
    "financas": "financeiro",
    "banking": "financeiro",
    "banco": "financeiro",
    "construção": "construcao",
    "construcao": "construcao",
    "construction": "construcao",
    "educação": "educacao",
    "educacao": "educacao",
    "education": "educacao",
    "consultoria": "consultoria",
    "consulting": "consultoria",
    "logística": "logistica",
    "logistica": "logistica",
    "logistics": "logistica",
    "transporte": "logistica",
    "alimentação": "alimentacao",
    "alimentacao": "alimentacao",
    "food": "alimentacao",
    "restaurante": "alimentacao",
  };

  for (const [key, value] of Object.entries(sectorMap)) {
    if (sectorLower.includes(key)) {
      return value;
    }
  }

  return "geral";
};
