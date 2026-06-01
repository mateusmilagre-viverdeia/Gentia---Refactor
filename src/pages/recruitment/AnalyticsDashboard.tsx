import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target, Scale, Clock, Shield } from "lucide-react";
import { SlaAnalyticsTab } from "@/components/recruitment/analytics/SlaAnalyticsTab";
import { GarantiasAnalyticsTab } from "@/components/recruitment/analytics/GarantiasAnalyticsTab";

// Import content from individual pages
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import {
  ExecutiveKPICards,
  MonthlyComparisonChart,
  ProjectionsCard,
  PipelineHealthCard,
  TopJobsTable,
  AlertsSection,
} from "@/components/recruitment/executive";
import { BenchmarkSummaryCard } from "@/components/recruitment/benchmark";

// Goal imports
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useRecruitmentGoals, useGoalProgress } from "@/hooks/useRecruitmentGoals";
import { GoalProgressCard, CreateGoalDialog, GoalHistoryList } from "@/components/recruitment/goals";
import { toast } from "sonner";

// Benchmark imports
import { useOrganization } from "@/contexts/OrganizationContext";
import { mapSectorToSegment } from "@/data/recruitmentBenchmarks";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import {
  BenchmarkComparisonGrid,
  BenchmarkRadarChart,
  BenchmarkInsightsCard,
  BenchmarkScoreCard,
  SegmentSelectorDropdown,
} from "@/components/recruitment/benchmark";

const PERIOD_OPTIONS = [
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
];

const BENCHMARK_PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

// Executive Tab Content
function ExecutiveContent() {
  const [months, setMonths] = useState("6");
  const { data, isLoading } = useExecutiveDashboard(parseInt(months));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Executivo</h2>
          <p className="text-muted-foreground">
            Visão consolidada do recrutamento com comparativos e projeções
          </p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ExecutiveKPICards data={data} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyComparisonChart data={data?.monthlyComparison} isLoading={isLoading} />
        </div>
        <div>
          <PipelineHealthCard 
            pipelineHealth={data?.kpis.pipelineHealth || 0}
            jobsByStatus={data?.jobsByStatus}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProjectionsCard projections={data?.projections} isLoading={isLoading} />
        <BenchmarkSummaryCard />
        <TopJobsTable jobs={data?.topJobs} isLoading={isLoading} />
      </div>

      <AlertsSection alerts={data?.alerts} isLoading={isLoading} />
    </div>
  );
}

// Goals Tab Content
function GoalsContent() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { 
    goals, 
    activeGoal, 
    isLoading, 
    isLoadingActive, 
    createGoal, 
    cancelGoal,
    isCreating 
  } = useRecruitmentGoals();
  
  const { data: goalProgress, isLoading: isLoadingProgress } = useGoalProgress(activeGoal);

  const handleCancelGoal = async (goalId: string) => {
    try {
      await cancelGoal(goalId);
      toast.success("Meta cancelada");
    } catch (error) {
      toast.error("Erro ao cancelar meta");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas de Recrutamento
          </h2>
          <p className="text-muted-foreground">
            Defina e acompanhe metas por período
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Meta Ativa</h3>
        
        {isLoadingActive || isLoadingProgress ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : goalProgress ? (
          <GoalProgressCard goalProgress={goalProgress} />
        ) : (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma meta ativa</h3>
            <p className="text-muted-foreground mb-4">
              Crie uma nova meta para acompanhar o progresso do recrutamento
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Meta
            </Button>
          </div>
        )}
      </div>

      <GoalHistoryList 
        goals={goals} 
        isLoading={isLoading}
        onCancel={handleCancelGoal}
      />

      <CreateGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createGoal}
        isSubmitting={isCreating}
      />
    </div>
  );
}

// Benchmark Tab Content
function BenchmarkContent() {
  const { currentOrganization } = useOrganization();
  const defaultSegment = mapSectorToSegment(currentOrganization?.sector);
  
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [selectedSegment, setSelectedSegment] = useState(defaultSegment);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Benchmark de Mercado
          </h2>
          <p className="text-muted-foreground">
            Compare suas métricas de recrutamento com a média do setor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentSelectorDropdown
            value={selectedSegment}
            onChange={setSelectedSegment}
          />
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENCHMARK_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BenchmarkScoreCard period={period} selectedSegment={selectedSegment} />
        <div className="md:col-span-3">
          <BenchmarkRadarChart period={period} selectedSegment={selectedSegment} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Comparativo por Métrica</h3>
        <BenchmarkComparisonGrid period={period} selectedSegment={selectedSegment} />
      </div>

      <BenchmarkInsightsCard period={period} selectedSegment={selectedSegment} />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "executivo");

  useEffect(() => {
    if (tabParam && ["executivo", "metas", "benchmark", "sla", "garantias"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Métricas, metas e benchmarks de recrutamento
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="executivo" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Executivo
            </TabsTrigger>
            <TabsTrigger value="metas" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Benchmark
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              SLA
            </TabsTrigger>
            <TabsTrigger value="garantias" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Garantias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="executivo" className="mt-6">
            <ExecutiveContent />
          </TabsContent>

          <TabsContent value="metas" className="mt-6">
            <GoalsContent />
          </TabsContent>

          <TabsContent value="benchmark" className="mt-6">
            <BenchmarkContent />
          </TabsContent>

          <TabsContent value="sla" className="mt-6">
            <SlaAnalyticsTab />
          </TabsContent>

          <TabsContent value="garantias" className="mt-6">
            <GarantiasAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </RecruitmentLayout>
  );
}
