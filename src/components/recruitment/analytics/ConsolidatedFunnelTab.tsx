import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, BarChart3, ArrowUpDown } from "lucide-react";
import { FunnelMetricsDashboard } from "./FunnelMetricsDashboard";
import { FunnelTrendChart } from "./FunnelTrendChart";
import { PipelineQualityCard } from "./PipelineQualityCard";
import { useJobFunnelAnalytics } from "@/hooks/useJobFunnelAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";

interface ConsolidatedFunnelTabProps {
  period: DashboardPeriod;
}

export function ConsolidatedFunnelTab({ period }: ConsolidatedFunnelTabProps) {
  const { currentAccount } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"conversion" | "candidates" | "time">("conversion");

  // Fetch jobs for filters
  const { data: jobs } = useQuery({
    queryKey: ["recruitment-jobs-filter", currentAccount?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title, department, status")
        .eq("account_id", currentAccount!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAccount?.id,
  });

  // Get unique departments
  const departments = [...new Set(jobs?.map((j) => j.department).filter(Boolean))] as string[];

  // Filtered jobs
  const filteredJobs = jobs?.filter((job) => {
    if (selectedDepartment !== "all" && job.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Vaga</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todas as vagas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as vagas</SelectItem>
                  {filteredJobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Departamento</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <FunnelMetricsDashboard
        period={period}
        jobId={selectedJobId !== "all" ? selectedJobId : undefined}
        showJobInfo={selectedJobId !== "all"}
      />

      {/* Funnel Trend Chart */}
      <FunnelTrendChart 
        period={period} 
        jobId={selectedJobId !== "all" ? selectedJobId : undefined} 
      />

      {/* Pipeline Quality Card */}
      <PipelineQualityCard 
        period={period} 
        jobId={selectedJobId !== "all" ? selectedJobId : undefined} 
      />

      {/* Job Comparison Table */}
      {selectedJobId === "all" && filteredJobs && filteredJobs.length > 1 && (
        <JobComparisonTable jobs={filteredJobs} period={period} sortBy={sortBy} onSort={setSortBy} />
      )}
    </div>
  );
}

interface JobComparisonTableProps {
  jobs: Array<{ id: string; title: string; department: string | null; status: string }>;
  period: DashboardPeriod;
  sortBy: "conversion" | "candidates" | "time";
  onSort: (sort: "conversion" | "candidates" | "time") => void;
}

function JobComparisonTable({ jobs, period, sortBy, onSort }: JobComparisonTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Comparativo de Vagas
        </CardTitle>
        <CardDescription>
          Performance de conversão por vaga
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vaga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => onSort("candidates")}
                >
                  Candidatos
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => onSort("conversion")}
                >
                  Conversão
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => onSort("time")}
                >
                  Tempo Médio
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Gargalo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.slice(0, 10).map((job) => (
              <JobRow key={job.id} job={job} period={period} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface JobRowProps {
  job: { id: string; title: string; department: string | null; status: string };
  period: DashboardPeriod;
}

function JobRow({ job, period }: JobRowProps) {
  const { data: metrics } = useJobFunnelAnalytics(period, job.id);

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    open: { label: "Aberta", variant: "default" },
    closed: { label: "Fechada", variant: "secondary" },
    draft: { label: "Rascunho", variant: "outline" },
    paused: { label: "Pausada", variant: "outline" },
  };

  const status = statusConfig[job.status] || { label: job.status, variant: "outline" as const };

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{job.title}</p>
          {job.department && (
            <p className="text-xs text-muted-foreground">{job.department}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>{metrics?.totalCandidates ?? "-"}</TableCell>
      <TableCell>
        <span
          className={cn(
            "font-medium",
            (metrics?.overallConversionRate ?? 0) >= 10
              ? "text-green-600"
              : (metrics?.overallConversionRate ?? 0) >= 5
              ? "text-amber-600"
              : "text-red-600"
          )}
        >
          {metrics?.overallConversionRate ?? 0}%
        </span>
      </TableCell>
      <TableCell>
        {metrics?.avgTimeToHire ? `${metrics.avgTimeToHire}d` : "-"}
      </TableCell>
      <TableCell>
        {metrics?.mainBottleneck ? (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            {metrics.mainBottleneck}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
