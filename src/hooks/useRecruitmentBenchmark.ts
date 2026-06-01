import { useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useFunnelAnalytics } from "@/hooks/useFunnelAnalytics";
import { useEfficiencyMetrics } from "@/hooks/useEfficiencyMetrics";
import { recruitmentBenchmarks, mapSectorToSegment, type RecruitmentBenchmarkData } from "@/data/recruitmentBenchmarks";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

export interface BenchmarkComparison {
  metric: string;
  metricLabel: string;
  companyValue: number;
  marketValue: number;
  difference: number;
  percentageDiff: number;
  status: "above" | "at" | "below";
  isPositiveBetter: boolean; // true = maior é melhor, false = menor é melhor
  unit: string;
}

export interface BenchmarkAnalysis {
  segmentKey: string;
  segmentName: string;
  comparisons: BenchmarkComparison[];
  overallScore: number;           // 0-100 score geral
  strengths: string[];            // pontos fortes
  opportunities: string[];        // oportunidades
  recommendations: string[];      // recomendações
  isLoading: boolean;
}

interface MetricConfig {
  key: keyof RecruitmentBenchmarkData;
  label: string;
  isPositiveBetter: boolean;
  unit: string;
  getCompanyValue: (funnel: any, efficiency: any) => number | null;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: "tempo_medio_contratacao",
    label: "Tempo Médio de Contratação",
    isPositiveBetter: false,
    unit: "dias",
    getCompanyValue: (funnel, efficiency) => efficiency?.avgTimeToHire ?? funnel?.avgTimeToHire ?? null,
  },
  {
    key: "taxa_conversao",
    label: "Taxa de Conversão",
    isPositiveBetter: true,
    unit: "%",
    getCompanyValue: (funnel) => funnel?.overallConversionRate ?? null,
  },
  {
    key: "candidatos_por_vaga",
    label: "Candidatos por Vaga",
    isPositiveBetter: true,
    unit: "",
    getCompanyValue: (_, efficiency) => efficiency?.applicationsPerJob ?? null,
  },
  {
    key: "taxa_rejeicao",
    label: "Taxa de Rejeição",
    isPositiveBetter: false,
    unit: "%",
    getCompanyValue: (funnel) => funnel?.rejectionRate ?? null,
  },
  {
    key: "fill_rate",
    label: "Taxa de Preenchimento",
    isPositiveBetter: true,
    unit: "%",
    getCompanyValue: (_, efficiency) => efficiency?.fillRate ?? null,
  },
];

function calculateComparison(
  config: MetricConfig,
  companyValue: number | null,
  marketValue: number
): BenchmarkComparison | null {
  if (companyValue === null || companyValue === undefined) return null;

  const difference = companyValue - marketValue;
  const percentageDiff = marketValue !== 0 ? (difference / marketValue) * 100 : 0;
  
  let status: "above" | "at" | "below";
  const threshold = 5; // 5% threshold for "at market"
  
  if (Math.abs(percentageDiff) <= threshold) {
    status = "at";
  } else if (difference > 0) {
    status = "above";
  } else {
    status = "below";
  }

  return {
    metric: config.key,
    metricLabel: config.label,
    companyValue: Math.round(companyValue * 10) / 10,
    marketValue,
    difference: Math.round(difference * 10) / 10,
    percentageDiff: Math.round(percentageDiff * 10) / 10,
    status,
    isPositiveBetter: config.isPositiveBetter,
    unit: config.unit,
  };
}

function generateInsights(comparisons: BenchmarkComparison[]): {
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  comparisons.forEach((comp) => {
    const isGood = comp.isPositiveBetter
      ? comp.status === "above"
      : comp.status === "below";
    
    const isBad = comp.isPositiveBetter
      ? comp.status === "below"
      : comp.status === "above";

    const diffText = Math.abs(comp.percentageDiff).toFixed(0);

    if (isGood && Math.abs(comp.percentageDiff) > 10) {
      strengths.push(`${comp.metricLabel} está ${diffText}% ${comp.isPositiveBetter ? 'acima' : 'abaixo'} da média do mercado`);
    }

    if (isBad && Math.abs(comp.percentageDiff) > 10) {
      opportunities.push(`${comp.metricLabel} está ${diffText}% ${comp.isPositiveBetter ? 'abaixo' : 'acima'} da média do setor`);
    }
  });

  // Generate recommendations based on opportunities
  if (opportunities.some(o => o.includes("Tempo Médio"))) {
    recommendations.push("Considere revisar e otimizar as etapas do processo seletivo para reduzir o tempo de contratação");
  }
  if (opportunities.some(o => o.includes("Taxa de Conversão"))) {
    recommendations.push("Invista em employer branding e melhore a descrição das vagas para atrair candidatos mais qualificados");
  }
  if (opportunities.some(o => o.includes("Candidatos por Vaga"))) {
    recommendations.push("Expanda os canais de divulgação e fortaleça a presença da marca empregadora");
  }
  if (opportunities.some(o => o.includes("Taxa de Rejeição"))) {
    recommendations.push("Revise os critérios de triagem para garantir que candidatos qualificados avancem no processo");
  }
  if (opportunities.some(o => o.includes("Taxa de Preenchimento"))) {
    recommendations.push("Analise os motivos de vagas não preenchidas e considere flexibilizar requisitos quando apropriado");
  }

  if (recommendations.length === 0 && strengths.length > 0) {
    recommendations.push("Continue mantendo as boas práticas atuais e monitore regularmente as métricas");
  }

  return { strengths, opportunities, recommendations };
}

function calculateOverallScore(comparisons: BenchmarkComparison[]): number {
  if (comparisons.length === 0) return 0;

  let totalScore = 0;
  
  comparisons.forEach((comp) => {
    // Base score of 50 (at market)
    let score = 50;
    
    // Adjust based on performance
    const adjustment = Math.min(Math.abs(comp.percentageDiff), 50) / 2;
    
    const isGood = comp.isPositiveBetter
      ? comp.status === "above"
      : comp.status === "below";

    if (isGood) {
      score += adjustment;
    } else if (comp.status !== "at") {
      score -= adjustment;
    }
    
    totalScore += score;
  });

  return Math.round(totalScore / comparisons.length);
}

export function useRecruitmentBenchmark(
  period: DashboardPeriod = "30d",
  selectedSegment?: string
): BenchmarkAnalysis {
  const { currentOrganization } = useOrganization();
  const { data: funnelData, isLoading: funnelLoading } = useFunnelAnalytics(period);
  const { data: efficiencyData, isLoading: efficiencyLoading } = useEfficiencyMetrics(period);

  const isLoading = funnelLoading || efficiencyLoading;

  return useMemo(() => {
    // Determine segment
    const segmentKey = selectedSegment || mapSectorToSegment(currentOrganization?.sector);
    const benchmarkData = recruitmentBenchmarks[segmentKey] || recruitmentBenchmarks.geral;

    if (isLoading || !funnelData) {
      return {
        segmentKey,
        segmentName: benchmarkData.nome,
        comparisons: [],
        overallScore: 0,
        strengths: [],
        opportunities: [],
        recommendations: [],
        isLoading: true,
      };
    }

    // Calculate comparisons
    const comparisons: BenchmarkComparison[] = [];

    METRIC_CONFIGS.forEach((config) => {
      const companyValue = config.getCompanyValue(funnelData, efficiencyData);
      const marketValue = benchmarkData[config.key] as number;
      
      const comparison = calculateComparison(config, companyValue, marketValue);
      if (comparison) {
        comparisons.push(comparison);
      }
    });

    const { strengths, opportunities, recommendations } = generateInsights(comparisons);
    const overallScore = calculateOverallScore(comparisons);

    return {
      segmentKey,
      segmentName: benchmarkData.nome,
      comparisons,
      overallScore,
      strengths,
      opportunities,
      recommendations,
      isLoading: false,
    };
  }, [currentOrganization?.sector, selectedSegment, funnelData, efficiencyData, isLoading]);
}
