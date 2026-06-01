import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEPRole } from "@/hooks/useEPRole";
import { useEPPartnerProjects } from "@/hooks/useEPPartnerProjects";
import { useConsultantMetrics } from "@/hooks/useConsultantMetrics";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Building2, 
  TrendingUp, 
  Clock, 
  Trophy, 
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  Users
} from "lucide-react";
import { useState } from "react";

import type { ClientProjectWithProgress } from "@/types/consultant.types";
import { formatBRT } from "@/lib/datetime";

function getProgressColor(percentage: number): string {
  if (percentage >= 75) return "text-green-600";
  if (percentage >= 50) return "text-yellow-600";
  if (percentage >= 25) return "text-orange-600";
  return "text-red-600";
}

function getStatusBadge(percentage: number, days: number) {
  if (percentage >= 75) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Excelente</Badge>;
  if (percentage >= 50) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Em andamento</Badge>;
  if (percentage < 25 && days > 30) return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Em risco</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Iniciando</Badge>;
}

export default function SocioProjetosPage() {
  const navigate = useNavigate();
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { projects, consultants, loading: projectsLoading, error, getProjectConsultants } = useEPPartnerProjects();
  const { globalMetrics, pillarCompletions, calculateProjectCompletion } = useConsultantMetrics(
    projects,
    consultants,
    getProjectConsultants
  );
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isEPPartner && !isSuperAdmin) {
      navigate('/');
    }
  }, [roleLoading, isEPPartner, isSuperAdmin, navigate]);

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Progresso dos Projetos" }
  ];

  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];

  if (roleLoading || projectsLoading) {
    return (
      <AppLayout title="Progresso dos Projetos" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Progresso dos Projetos" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (projects.length === 0) {
    return (
      <AppLayout title="Progresso dos Projetos" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Você ainda não tem clientes com projetos ativos. Adicione clientes através do seu código promocional.
              </p>
              <Button className="mt-4" onClick={() => navigate('/socio/clientes')}>
                Gerenciar Clientes
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Calculate project days
  const getProjectDays = (project: ClientProjectWithProgress) => {
    return Math.round((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <AppLayout title="Progresso dos Projetos" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progresso dos Projetos</h1>
          <p className="text-muted-foreground">
            Acompanhe o desenvolvimento de todos os seus clientes
          </p>
        </div>

        {/* Metric Cards */}
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
              <p className="text-xs text-muted-foreground mt-2">todos os pilares</p>
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
              <p className="text-xs text-muted-foreground">dias por projeto</p>
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
              <p className="text-xs text-muted-foreground">&lt;25% conclusão, &gt;30 dias</p>
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

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Todos os Projetos</CardTitle>
            <CardDescription>
              Clique em um projeto para ver detalhes dos pilares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projects.map((project) => {
                const completion = calculateProjectCompletion(project);
                const days = getProjectDays(project);
                const projectConsultants = getProjectConsultants(project.id);

                return (
                  <Collapsible 
                    key={project.id}
                    open={expandedProject === project.id}
                    onOpenChange={() => setExpandedProject(
                      expandedProject === project.id ? null : project.id
                    )}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedProject === project.id ? 'rotate-180' : ''}`} />
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{project.name}</span>
                            </div>
                            {getStatusBadge(completion, days)}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <Progress value={completion} className="h-2 w-20" />
                              <span className={`font-semibold ${getProgressColor(completion)}`}>
                                {completion}%
                              </span>
                            </div>
                            <div className="text-center min-w-[60px]">
                              <p className="text-muted-foreground text-xs">Dias</p>
                              <p className="font-semibold">{days}</p>
                            </div>
                            <div className="text-center min-w-[80px]">
                              <p className="text-muted-foreground text-xs">Consultor</p>
                              <p className="font-semibold">
                                {projectConsultants.length > 0 
                                  ? projectConsultants.map(c => c.name.split(' ')[0]).join(', ')
                                  : <span className="text-amber-600">-</span>
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t px-4 py-3 bg-muted/30">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                            <PillarProgress label="Missão" stage={project.mission_stage} maxStage={13} />
                            <PillarProgress label="Visão" stage={project.vision_stage} maxStage={13} />
                            <PillarProgress label="Valores" stage={project.values_stage} maxStage={9} />
                            <PillarProgress label="Indicadores" stage={project.indicators_stage} maxStage={5} />
                            <PillarProgress label="Decisão" stage={project.decision_stage} maxStage={7} />
                            <PillarProgress label="Energia" stage={project.energy_stage} maxStage={5} />
                            <PillarProgress label="Desenvolvimento" stage={project.development_stage} maxStage={5} />
                            <PillarProgress label="Eventos" stage={project.event_stage} maxStage={7} />
                            <PillarProgress label="Rituais" stage={project.ritual_stage} maxStage={5} />
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Criado em {formatBRT(new Date(project.created_at), "dd/MM/yyyy")}</span>
                              {project.next_checkpoint && (
                                <span>• Próximo checkpoint: {formatBRT(new Date(project.next_checkpoint.checkpoint_date), "dd/MM")} - {project.next_checkpoint.topic}</span>
                              )}
                              {(project.pending_actions_count || 0) > 0 && (
                                <Badge variant="outline" className="text-amber-600">
                                  {project.pending_actions_count} ações pendentes
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/consultor/projeto/${project.id}`)}
                            >
                              Ver Projeto
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function PillarProgress({ label, stage, maxStage }: { label: string; stage: number | null; maxStage: number }) {
  const percentage = stage ? Math.round((stage / maxStage) * 100) : 0;
  const completed = stage && stage >= maxStage;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${completed ? 'text-green-600' : ''}`}>
          {completed ? '✓' : `${stage || 0}/${maxStage}`}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
