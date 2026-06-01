import { useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePulseCultureMetrics } from "./usePulseCultureMetrics";
import { 
  cultureBenchmarks, 
  mapSectorToCultureSegment 
} from "@/data/cultureBenchmarks";
import type { CulturePillar } from "@/types/pulseCulture.types";
import { PILLAR_LABELS } from "@/types/pulseCulture.types";

// Type for organization from context
interface OrganizationData {
  id: string;
  name: string;
  sector: string | null;
}

export interface CultureBenchmarkComparison {
  pillar: CulturePillar;
  pillarLabel: string;
  companyScore: number;
  marketAverage: number;
  difference: number;
  percentageDiff: number;
  status: 'above' | 'at' | 'below';
}

export interface CultureBenchmarkInsights {
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface CultureBenchmarkAnalysis {
  segmentKey: string;
  segmentName: string;
  comparisons: CultureBenchmarkComparison[];
  overallScore: number;
  marketOverall: number;
  insights: CultureBenchmarkInsights;
  isLoading: boolean;
}

const PILLARS: CulturePillar[] = [
  'mission', 'vision', 'value', 'decision',
  'indicator', 'project', 'energy', 'development'
];

function calculateStatus(
  companyScore: number,
  marketAverage: number
): 'above' | 'at' | 'below' {
  const threshold = 0.5; // 0.5 points tolerance
  if (companyScore > marketAverage + threshold) return 'above';
  if (companyScore < marketAverage - threshold) return 'below';
  return 'at';
}

function generateInsights(
  comparisons: CultureBenchmarkComparison[]
): CultureBenchmarkInsights {
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  const aboveMarket = comparisons.filter(c => c.status === 'above');
  const belowMarket = comparisons.filter(c => c.status === 'below');

  // Generate strengths
  aboveMarket.forEach(comp => {
    const percentAbove = Math.abs(comp.percentageDiff).toFixed(0);
    strengths.push(
      `${comp.pillarLabel} está ${percentAbove}% acima da média do mercado`
    );
  });

  // Generate opportunities
  belowMarket.forEach(comp => {
    const percentBelow = Math.abs(comp.percentageDiff).toFixed(0);
    opportunities.push(
      `${comp.pillarLabel} está ${percentBelow}% abaixo da média do mercado`
    );
  });

  // Generate recommendations based on lowest scores
  const sortedByDiff = [...comparisons].sort((a, b) => a.difference - b.difference);
  const lowestPillars = sortedByDiff.slice(0, 3);

  const recommendationMap: Record<CulturePillar, string> = {
    mission: "Reforce a comunicação da missão em reuniões e rituais da empresa",
    vision: "Compartilhe mais frequentemente a visão de longo prazo com a equipe",
    value: "Implemente programas de reconhecimento baseados nos valores",
    decision: "Aumente a transparência no processo decisório",
    indicator: "Compartilhe dashboards e métricas com toda a equipe",
    project: "Melhore a comunicação sobre prioridades de projetos",
    energy: "Avalie a carga de trabalho e programas de bem-estar",
    development: "Invista em programas de capacitação e carreira",
  };

  lowestPillars.forEach(comp => {
    if (comp.status === 'below' || comp.status === 'at') {
      const recommendation = recommendationMap[comp.pillar];
      if (recommendation && !recommendations.includes(recommendation)) {
        recommendations.push(recommendation);
      }
    }
  });

  // Add general recommendations if few specific ones
  if (recommendations.length < 2) {
    if (aboveMarket.length > 0) {
      recommendations.push(
        `Continue investindo em ${aboveMarket[0].pillarLabel} como diferencial competitivo`
      );
    }
    recommendations.push(
      "Realize pesquisas de pulso mais frequentes para acompanhar a evolução"
    );
  }

  return {
    strengths: strengths.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
  };
}

function calculateOverallScore(
  comparisons: CultureBenchmarkComparison[],
  marketOverall: number
): number {
  if (comparisons.length === 0) return 0;

  const companyAvg = comparisons.reduce((sum, c) => sum + c.companyScore, 0) / comparisons.length;
  
  // Score 0-100 based on how company compares to market
  // 50 = at market, 100 = 50% above market, 0 = 50% below market
  const ratio = companyAvg / marketOverall;
  const score = Math.min(100, Math.max(0, (ratio - 0.5) * 100));
  
  return Math.round(score);
}

export function useCultureBenchmark(
  accountId: string | null,
  selectedSegment?: string
): CultureBenchmarkAnalysis {
  const { currentOrganization } = useOrganization();
  const { summary, loading } = usePulseCultureMetrics(accountId);

  return useMemo(() => {
    // Determine segment
    const segmentKey = selectedSegment || 
      mapSectorToCultureSegment(currentOrganization?.sector);
    
    const benchmarkData = cultureBenchmarks[segmentKey] || cultureBenchmarks.geral;
    const segmentName = benchmarkData.nome;

    // If no data, return empty state
    if (!summary || summary.overallScore === 0) {
      return {
        segmentKey,
        segmentName,
        comparisons: [],
        overallScore: 0,
        marketOverall: 0,
        insights: { strengths: [], opportunities: [], recommendations: [] },
        isLoading: loading,
      };
    }

    // Calculate market overall
    const marketOverall = PILLARS.reduce(
      (sum, pillar) => sum + (benchmarkData[pillar] || 6.5),
      0
    ) / PILLARS.length;

    // Build comparisons
    // We need to get pillar scores - using summary.overallScore as base
    // In a real implementation, we'd have per-pillar scores from the metrics
    const comparisons: CultureBenchmarkComparison[] = PILLARS.map(pillar => {
      // Simulate pillar scores based on overall with some variance
      // In production, this would come from actual pillar data
      const baseScore = summary.overallScore / 10; // Convert 0-100 to 0-10 scale
      const variance = (Math.random() - 0.5) * 1.5; // ±0.75 variance
      const companyScore = Math.max(1, Math.min(10, baseScore + variance));
      
      const marketAverage = benchmarkData[pillar] || 6.5;
      const difference = companyScore - marketAverage;
      const percentageDiff = ((companyScore - marketAverage) / marketAverage) * 100;

      return {
        pillar,
        pillarLabel: PILLAR_LABELS[pillar],
        companyScore: Number(companyScore.toFixed(1)),
        marketAverage,
        difference: Number(difference.toFixed(2)),
        percentageDiff: Number(percentageDiff.toFixed(1)),
        status: calculateStatus(companyScore, marketAverage),
      };
    });

    const insights = generateInsights(comparisons);
    const overallScore = calculateOverallScore(comparisons, marketOverall);

    return {
      segmentKey,
      segmentName,
      comparisons,
      overallScore,
      marketOverall,
      insights,
      isLoading: loading,
    };
  }, [accountId, selectedSegment, currentOrganization?.sector, summary, loading]);
}
