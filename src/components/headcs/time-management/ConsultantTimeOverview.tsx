import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Building2, TrendingUp } from "lucide-react";
import type { ConsultantTimeSummary, TimeEntrySummary } from "@/types/time-tracking.types";
import { formatDuration } from "@/types/time-tracking.types";

interface ConsultantTimeOverviewProps {
  consultantSummaries: ConsultantTimeSummary[];
  overallSummary: TimeEntrySummary;
  totalConsultants: number;
  totalProjects: number;
  isLoading?: boolean;
}

export function ConsultantTimeOverview({
  consultantSummaries,
  overallSummary,
  totalConsultants,
  totalProjects,
  isLoading,
}: ConsultantTimeOverviewProps) {
  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  const sortedConsultants = [...consultantSummaries].sort((a, b) => b.totalHours - a.totalHours);
  const avgBillablePercentage = consultantSummaries.length > 0
    ? Math.round(consultantSummaries.reduce((sum, c) => sum + c.billablePercentage, 0) / consultantSummaries.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Total de Horas
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatDuration(overallSummary.totalMinutes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Consultores Ativos
            </CardDescription>
            <CardTitle className="text-2xl">{totalConsultants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              com registros no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Projetos
            </CardDescription>
            <CardTitle className="text-2xl">{totalProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              com horas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Taxa Faturável
            </CardDescription>
            <CardTitle className="text-2xl">{avgBillablePercentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avgBillablePercentage} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Consultant Table */}
      <Card>
        <CardHeader>
          <CardTitle>Horas por Consultor</CardTitle>
          <CardDescription>
            Distribuição de tempo por membro da equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedConsultants.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum registro de tempo no período selecionado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultor</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Projetos</TableHead>
                  <TableHead className="text-right">Média/Projeto</TableHead>
                  <TableHead className="text-right">Faturável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedConsultants.map((consultant) => (
                  <TableRow key={consultant.consultantId}>
                    <TableCell className="font-medium">
                      {consultant.consultantName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {consultant.totalHours}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {consultant.projectCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {consultant.avgHoursPerProject}h
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress 
                          value={consultant.billablePercentage} 
                          className="w-16 h-2" 
                        />
                        <span className="text-sm text-muted-foreground w-10">
                          {consultant.billablePercentage}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
