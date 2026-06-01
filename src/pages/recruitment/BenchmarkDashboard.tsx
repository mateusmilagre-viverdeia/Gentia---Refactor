import { useState } from "react";
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
import { ArrowLeft, Scale } from "lucide-react";
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

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

export default function BenchmarkDashboard() {
  const { currentOrganization } = useOrganization();
  const defaultSegment = mapSectorToSegment(currentOrganization?.sector);
  
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [selectedSegment, setSelectedSegment] = useState(defaultSegment);

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
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Scale className="h-6 w-6" />
                Benchmark de Mercado
              </h1>
              <p className="text-muted-foreground">
                Compare suas métricas de recrutamento com a média do setor
              </p>
            </div>
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
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <BenchmarkScoreCard period={period} selectedSegment={selectedSegment} />
          <div className="md:col-span-3">
            <BenchmarkRadarChart period={period} selectedSegment={selectedSegment} />
          </div>
        </div>

        {/* Comparison Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Comparativo por Métrica</h2>
          <BenchmarkComparisonGrid period={period} selectedSegment={selectedSegment} />
        </div>

        {/* Insights */}
        <BenchmarkInsightsCard period={period} selectedSegment={selectedSegment} />
      </div>
    </RecruitmentLayout>
  );
}
