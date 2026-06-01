import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Briefcase, Users, Clock, TrendingUp, Gauge, Scale, DollarSign, LineChart, GitBranch, Bot, Store, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import {
  AdvancedMetricsGrid,
  SourceAnalyticsChart,
  EvaluatorPerformance,
  TimeInStageChart,
  JobAnalyticsGrid,
  TrendChart,
  JobComparisonChart,
  EfficiencyDashboard,
  ReportExportButton,
  SourceROITab,
  HiringForecastTab,
  ConsolidatedFunnelTab,
  AutomatedStepsTab,
  TalentPoolAnalyticsTab,
  FunnelBySourceChart,
  TouchComparisonChart,
  NpsAnalyticsTab,
} from "@/components/recruitment/analytics";
import { FunnelVisualization } from "@/components/recruitment/FunnelVisualization";
import {
  BenchmarkComparisonGrid,
  BenchmarkRadarChart,
  BenchmarkInsightsCard,
} from "@/components/recruitment/benchmark";

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

export default function RecruitmentAnalytics() {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/atracao-contratacao/recrutamento">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Analytics de Recrutamento
            </h1>
            <p className="text-muted-foreground text-sm">
              Métricas avançadas, tendências e relatórios detalhados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ReportExportButton period={period} />
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Metrics Grid */}
      <AdvancedMetricsGrid period={period} />

      {/* Tabs for different views */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="funnel" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Funil
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Etapas IA
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Por Vaga
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Eficiência
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempo
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Benchmark
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            ROI de Fontes
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Previsão
          </TabsTrigger>
          <TabsTrigger value="talent-pool" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Talent Pool
          </TabsTrigger>
          <TabsTrigger value="nps" className="flex items-center gap-2">
            <Smile className="h-4 w-4" />
            NPS Candidatos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6">
          <ConsolidatedFunnelTab period={period} />
        </TabsContent>

        <TabsContent value="automated" className="space-y-6">
          <AutomatedStepsTab period={period} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendChart period={period} />
          <JobComparisonChart period={period} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelVisualization period={period} />
            <SourceAnalyticsChart period={period} />
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <JobAnalyticsGrid period={period} />
        </TabsContent>

        <TabsContent value="efficiency">
          <EfficiencyDashboard period={period} />
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EvaluatorPerformance period={period} />
            <SourceAnalyticsChart period={period} />
          </div>
        </TabsContent>

        <TabsContent value="timing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeInStageChart period={period} />
            <FunnelVisualization period={period} />
          </div>
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6">
          <BenchmarkComparisonGrid period={period} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BenchmarkRadarChart period={period} />
            <BenchmarkInsightsCard period={period} />
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelBySourceChart period={period} />
            <SourceROITab />
          </div>
          <TouchComparisonChart period={period} />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <HiringForecastTab />
        </TabsContent>

        <TabsContent value="talent-pool" className="space-y-6">
          <TalentPoolAnalyticsTab />
        </TabsContent>

        <TabsContent value="nps" className="space-y-6">
          <NpsAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
