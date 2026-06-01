import { Link } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import {
  ExecutiveKPICards,
  MonthlyComparisonChart,
  ProjectionsCard,
  PipelineHealthCard,
  TopJobsTable,
  AlertsSection,
  JobCostTable,
} from "@/components/recruitment/executive";
import { BenchmarkSummaryCard } from "@/components/recruitment/benchmark";
import { useJobCostAnalytics } from "@/hooks/useJobCostAnalytics";

const PERIOD_OPTIONS = [
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
];

export default function ExecutiveDashboard() {
  const [months, setMonths] = useState("6");
  const { data, isLoading } = useExecutiveDashboard(parseInt(months));
  const { data: jobCostData, isLoading: isJobCostLoading } = useJobCostAnalytics();

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/atracao-contratacao/recrutamento">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Dashboard Executivo</h1>
              <p className="text-muted-foreground">
                Visão consolidada do recrutamento com comparativos e projeções
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        {/* KPI Cards */}
        <ExecutiveKPICards data={data} isLoading={isLoading} avgCostPerHire={jobCostData?.avgCostPerHire} />

        {/* Main Charts Row */}
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

        {/* Projections, Benchmark and Top Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProjectionsCard projections={data?.projections} isLoading={isLoading} />
          <BenchmarkSummaryCard />
          <TopJobsTable jobs={data?.topJobs} isLoading={isLoading} />
        </div>

        {/* Alerts */}
        <AlertsSection alerts={data?.alerts} isLoading={isLoading} />

        {/* Cost per Job */}
        <JobCostTable data={jobCostData} isLoading={isJobCostLoading} />
      </div>
    </RecruitmentLayout>
  );
}
