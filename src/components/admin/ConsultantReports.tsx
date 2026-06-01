import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Clock, Trophy, AlertTriangle, ChevronDown, Building2 } from "lucide-react";
import { useState } from "react";
import { useConsultantMetrics, type ConsultantMetrics } from "@/hooks/useConsultantMetrics";
import type { ClientProjectWithProgress, EPConsultant } from "@/types/consultant.types";
import { formatBRT } from "@/lib/datetime";


interface ConsultantReportsProps {
  projects: ClientProjectWithProgress[];
  consultants: EPConsultant[];
  getProjectConsultants: (accountId: string) => EPConsultant[];
}

export function ConsultantReports({ projects, consultants, getProjectConsultants }: ConsultantReportsProps) {
  const { globalMetrics, pillarCompletions, consultantMetrics, unassignedProjects, calculateProjectCompletion } = useConsultantMetrics(
    projects,
    consultants,
    getProjectConsultants
  );

  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);

  const getStatusBadge = (avgCompletion: number, avgDays: number) => {
    if (avgCompletion >= 75) return <Badge className="bg-green-100 text-green-800">🟢 Excelente</Badge>;
    if (avgCompletion >= 50 || avgDays < 45) return <Badge className="bg-yellow-100 text-yellow-800">🟡 Regular</Badge>;
    return <Badge className="bg-red-100 text-red-800">🔴 Atenção</Badge>;
  };

  // Chart colors
  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <div className="space-y-6">
      {/* Global Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Média de Conclusão
            </CardDescription>
            <CardTitle className="text-3xl">{globalMetrics.avgCompletion}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={globalMetrics.avgCompletion} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              todos os pilares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio
            </CardDescription>
            <CardTitle className="text-3xl">{globalMetrics.avgProjectDays}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              dias por projeto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Projetos Concluídos
            </CardDescription>
            <CardTitle className="text-3xl">{globalMetrics.completedProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              de {globalMetrics.totalProjects} projetos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Projetos em Risco
            </CardDescription>
            <CardTitle className="text-3xl">{globalMetrics.atRiskProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              &lt;25% conclusão, &gt;30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pillar Completion Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conclusão por Pilar</CardTitle>
          <CardDescription>Média de conclusão de cada pilar em todos os projetos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarCompletions} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" width={80} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Conclusão']}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                  {pillarCompletions.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Consultant Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Consultor</CardTitle>
          <CardDescription>Métricas individuais de cada consultor</CardDescription>
        </CardHeader>
        <CardContent>
          {consultantMetrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum consultor ativo cadastrado
            </p>
          ) : (
            <div className="space-y-2">
              {consultantMetrics.map((metrics) => (
                <ConsultantRow
                  key={metrics.consultant.id}
                  metrics={metrics}
                  expanded={expandedConsultant === metrics.consultant.id}
                  onToggle={() => setExpandedConsultant(
                    expandedConsultant === metrics.consultant.id ? null : metrics.consultant.id
                  )}
                  getStatusBadge={getStatusBadge}
                  calculateProjectCompletion={calculateProjectCompletion}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Projects */}
      {unassignedProjects.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Projetos Sem Consultor
            </CardTitle>
            <CardDescription>
              {unassignedProjects.length} projeto(s) precisam de atribuição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Ações Pendentes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{calculateProjectCompletion(project)}%</TableCell>
                    <TableCell>{Math.round((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))}</TableCell>
                    <TableCell>
                      {(project.pending_actions_count || 0) > 0 ? (
                        <Badge variant="outline" className="text-amber-600">
                          {project.pending_actions_count}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ConsultantRowProps {
  metrics: ConsultantMetrics;
  expanded: boolean;
  onToggle: () => void;
  getStatusBadge: (avgCompletion: number, avgDays: number) => JSX.Element;
  calculateProjectCompletion: (project: ClientProjectWithProgress) => number;
}

function ConsultantRow({ metrics, expanded, onToggle, getStatusBadge, calculateProjectCompletion }: ConsultantRowProps) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                <span className="font-medium">{metrics.consultant.name}</span>
              </div>
              {getStatusBadge(metrics.avgCompletion, metrics.avgDays)}
            </div>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Projetos</p>
                <p className="font-semibold">{metrics.projectCount}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Média</p>
                <p className="font-semibold">{metrics.avgCompletion}%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Tempo Médio</p>
                <p className="font-semibold">{metrics.avgDays} dias</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Pendências</p>
                <p className="font-semibold">{metrics.pendingActions}</p>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3 bg-muted/30">
            {metrics.projects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum projeto atribuído
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Conclusão</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Próximo Checkpoint</TableHead>
                    <TableHead>Pendências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {project.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={calculateProjectCompletion(project)} className="h-2 w-20" />
                          <span className="text-sm">{calculateProjectCompletion(project)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBRT(new Date(project.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        {project.next_checkpoint ? (
                          <span className="text-sm">
                            {formatBRT(new Date(project.next_checkpoint.checkpoint_date), "dd/MM")}
                            {' - '}{project.next_checkpoint.topic}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(project.pending_actions_count || 0) > 0 ? (
                          <Badge variant="outline" className="text-amber-600">
                            {project.pending_actions_count}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
