import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { formatarMoeda } from "@/utils/formatters";
import type { JobCostSummary } from "@/hooks/useJobCostAnalytics";

interface JobCostTableProps {
  data: JobCostSummary | undefined;
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Ativa", variant: "default" },
  closed: { label: "Fechada", variant: "secondary" },
  paused: { label: "Pausada", variant: "outline" },
  draft: { label: "Rascunho", variant: "outline" },
};

export function JobCostTable({ data, isLoading }: JobCostTableProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.jobs.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Custo por Vaga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum dado de custo disponível ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Custo por Vaga
          </CardTitle>
          {data.avgCostPerHire !== null && (
            <div className="text-sm text-muted-foreground">
              Custo médio por contratação:{" "}
              <span className="font-semibold text-foreground">
                {formatarMoeda(data.avgCostPerHire)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vaga</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Candidatos</TableHead>
              <TableHead className="text-center">Contratados</TableHead>
              <TableHead className="text-right">Créditos</TableHead>
              <TableHead className="text-right">Custo Total</TableHead>
              <TableHead className="text-right">Custo/Contratação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.jobs.map((job) => {
              const status = STATUS_LABELS[job.jobStatus] || { label: job.jobStatus, variant: "outline" as const };
              return (
                <TableRow key={job.jobId}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {job.jobTitle}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{job.totalCandidates}</TableCell>
                  <TableCell className="text-center">{job.hiredCount}</TableCell>
                  <TableCell className="text-right">{job.totalCredits.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(job.totalCostBrl)}</TableCell>
                  <TableCell className="text-right">
                    {job.costPerHire !== null ? formatarMoeda(job.costPerHire) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer summary */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm text-muted-foreground">
          <span>{data.jobs.length} vaga{data.jobs.length !== 1 ? "s" : ""} com consumo</span>
          <div className="flex items-center gap-4">
            <span>Total: <strong className="text-foreground">{data.totalCreditsConsumed.toFixed(1)} créditos</strong></span>
            <span>|</span>
            <span><strong className="text-foreground">{formatarMoeda(data.totalCostBrl)}</strong></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
