import type { CulturePillar } from "@/types/pulseCulture.types";

export interface CultureBenchmarkData {
  nome: string;
  mission: number;
  vision: number;
  value: number;
  decision: number;
  indicator: number;
  project: number;
  energy: number;
  development: number;
}

export const cultureBenchmarks: Record<string, CultureBenchmarkData> = {
  tecnologia: {
    nome: "Tecnologia",
    mission: 7.2,
    vision: 6.8,
    value: 7.5,
    decision: 6.5,
    indicator: 6.2,
    project: 7.0,
    energy: 7.3,
    development: 7.8,
  },
  varejo: {
    nome: "Varejo",
    mission: 6.5,
    vision: 6.2,
    value: 7.0,
    decision: 6.0,
    indicator: 5.8,
    project: 6.3,
    energy: 6.5,
    development: 6.8,
  },
  financeiro: {
    nome: "Financeiro",
    mission: 7.0,
    vision: 7.2,
    value: 7.8,
    decision: 7.0,
    indicator: 7.5,
    project: 6.8,
    energy: 6.5,
    development: 7.2,
  },
  saude: {
    nome: "Saúde",
    mission: 7.5,
    vision: 7.0,
    value: 8.0,
    decision: 6.5,
    indicator: 6.8,
    project: 6.5,
    energy: 6.8,
    development: 7.5,
  },
  industria: {
    nome: "Indústria",
    mission: 6.8,
    vision: 6.5,
    value: 7.2,
    decision: 6.2,
    indicator: 6.5,
    project: 6.8,
    energy: 6.2,
    development: 6.5,
  },
  educacao: {
    nome: "Educação",
    mission: 7.8,
    vision: 7.5,
    value: 8.2,
    decision: 6.0,
    indicator: 5.5,
    project: 6.2,
    energy: 7.0,
    development: 8.0,
  },
  servicos: {
    nome: "Serviços",
    mission: 6.8,
    vision: 6.5,
    value: 7.2,
    decision: 6.3,
    indicator: 6.0,
    project: 6.5,
    energy: 6.8,
    development: 7.0,
  },
  geral: {
    nome: "Média Geral do Mercado",
    mission: 6.9,
    vision: 6.7,
    value: 7.4,
    decision: 6.4,
    indicator: 6.3,
    project: 6.6,
    energy: 6.7,
    development: 7.1,
  },
};

export function getCultureSegmentOptions(): Array<{ value: string; label: string }> {
  return Object.entries(cultureBenchmarks).map(([key, data]) => ({
    value: key,
    label: data.nome,
  }));
}

export function mapSectorToCultureSegment(sector: string | null | undefined): string {
  if (!sector) return "geral";

  const sectorLower = sector.toLowerCase();

  const sectorMap: Record<string, string> = {
    tecnologia: "tecnologia",
    technology: "tecnologia",
    tech: "tecnologia",
    ti: "tecnologia",
    software: "tecnologia",
    "software development": "tecnologia",
    
    varejo: "varejo",
    retail: "varejo",
    comercio: "varejo",
    "comércio": "varejo",
    loja: "varejo",
    
    financeiro: "financeiro",
    finance: "financeiro",
    "financas": "financeiro",
    "finanças": "financeiro",
    banco: "financeiro",
    bank: "financeiro",
    banking: "financeiro",
    fintech: "financeiro",
    
    saude: "saude",
    "saúde": "saude",
    health: "saude",
    healthcare: "saude",
    hospital: "saude",
    "clinica": "saude",
    "clínica": "saude",
    
    industria: "industria",
    "indústria": "industria",
    industry: "industria",
    manufacturing: "industria",
    "manufatura": "industria",
    
    educacao: "educacao",
    "educação": "educacao",
    education: "educacao",
    escola: "educacao",
    universidade: "educacao",
    
    servicos: "servicos",
    "serviços": "servicos",
    services: "servicos",
    consultoria: "servicos",
    consulting: "servicos",
  };

  for (const [keyword, segment] of Object.entries(sectorMap)) {
    if (sectorLower.includes(keyword)) {
      return segment;
    }
  }

  return "geral";
}

export function getBenchmarkForPillar(
  segment: string,
  pillar: CulturePillar
): number {
  const benchmarkData = cultureBenchmarks[segment] || cultureBenchmarks.geral;
  return benchmarkData[pillar] || 6.5;
}
