import { ConsultoriaLayout } from "@/components/consultoria";
import { useHeadCS } from "@/hooks/useHeadCS";
import { useEPRole } from "@/hooks/useEPRole";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, UserPlus, ArrowRight, BarChart3, Shield, Clock, Sparkles, Layers, Calendar } from "lucide-react";
import { useState } from "react";
import { ConsultantReports } from "@/components/admin/ConsultantReports";
import { HeadCSLicenseOverview } from "@/components/headcs/HeadCSLicenseOverview";
import { ConsultantTimeOverview, TimeFiltersBar } from "@/components/headcs/time-management";
import { HeadCSRecommendationsOverview } from "@/components/headcs/HeadCSRecommendationsOverview";
import { ResourcePlanningDashboard } from "@/components/headcs/resource-planning";
import { CheckpointAnalyticsDashboard } from "@/components/headcs/checkpoint-analytics";
import { useTimeAnalytics } from "@/hooks/useHeadCSTimeAnalytics";
import { generateTimeReportPDF, generateTimeReportCSV } from "@/utils/generateTimeReport";
import { startOfWeek, endOfWeek } from "date-fns";
import { formatBRT } from "@/lib/datetime";

function getPillarStatus(stage: number | null, maxStage: number = 9) {
  if (!stage || stage === 0) return { icon: "⚪", label: "Não iniciado" };
  if (stage >= maxStage) return { icon: "✅", label: "Concluído" };
  return { icon: "🔵", label: "Em andamento" };
}

export default function ConsultoriaGestao() {
  const navigate = useNavigate();
  const { isHeadCS, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { allProjects, allConsultants, loading, error, assignConsultant, getProjectConsultants } = useHeadCS();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<string>("");
  
  // Time tracking filters
  const [timeFilters, setTimeFilters] = useState({
    startDate: formatBRT(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: formatBRT(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    consultantId: undefined as string | undefined,
  });

  const { 
    entries: timeEntries,
    consultantSummaries, 
    overallSummary, 
    totalConsultants: activeConsultantsCount, 
    totalProjects: projectsWithTimeCount,
    isLoading: timeLoading 
  } = useTimeAnalytics(timeFilters);

  if (roleLoading || loading) {
    return (
      <ConsultoriaLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </ConsultoriaLayout>
    );
  }

  if (!isHeadCS && !isSuperAdmin) {
    return <Navigate to="/consultoria" replace />;
  }

  if (error) {
    return (
      <ConsultoriaLayout>
        <div className="p-6">
          <Card className="border-destructive">
            <CardContent className="p-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </ConsultoriaLayout>
    );
  }

  const totalPendingActions = allProjects.reduce((sum, p) => sum + (p.pending_actions_count || 0), 0);
  const projectsWithConsultants = allProjects.filter(p => (p.consultants?.length || 0) > 0).length;
  const projectsWithoutConsultants = allProjects.length - projectsWithConsultants;

  const handleTimeExport = (exportFormat: 'pdf' | 'csv') => {
    const reportData = {
      entries: timeEntries.map((e: any) => ({
        id: e.id,
        date: e.entry_date,
        projectName: e.account?.name || 'Projeto',
        category: e.category,
        duration: e.duration_minutes,
        description: e.description,
        billable: e.billable,
      })),
      summary: overallSummary,
      period: {
        start: timeFilters.startDate,
        end: timeFilters.endDate,
      },
    };

    if (exportFormat === 'pdf') {
      generateTimeReportPDF(reportData);
    } else {
      generateTimeReportCSV(reportData);
    }
  };

  const handleAssign = async () => {
    if (selectedProject && selectedConsultant) {
      await assignConsultant(selectedConsultant, selectedProject);
      setAssignDialogOpen(false);
      setSelectedProject(null);
      setSelectedConsultant("");
    }
  };

  return (
    <ConsultoriaLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard de Gestão</h1>
          <p className="text-muted-foreground">
            Visão consolidada de todos os projetos de consultoria
          </p>
        </div>

        <Tabs defaultValue="projetos" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="projetos" className="gap-2">
              <Building2 className="h-4 w-4" />
              Projetos
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="gap-2">
              <Calendar className="h-4 w-4" />
              Checkpoints
            </TabsTrigger>
            <TabsTrigger value="licencas" className="gap-2">
              <Shield className="h-4 w-4" />
              Licenças
            </TabsTrigger>
            <TabsTrigger value="alocacao" className="gap-2">
              <Clock className="h-4 w-4" />
              Alocação
            </TabsTrigger>
            <TabsTrigger value="recursos" className="gap-2">
              <Layers className="h-4 w-4" />
              Recursos
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projetos" className="space-y-6">
            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total de Projetos</CardDescription>
                  <CardTitle className="text-3xl">{allProjects.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    empresas cadastradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Consultores Ativos</CardDescription>
                  <CardTitle className="text-3xl">{allConsultants.filter(c => c.active).length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    de {allConsultants.length} cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Sem Consultor</CardDescription>
                  <CardTitle className="text-3xl">{projectsWithoutConsultants}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    projetos sem atribuição
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Ações Pendentes</CardDescription>
                  <CardTitle className="text-3xl">{totalPendingActions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    em todos os projetos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Projects Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Todos os Projetos</CardTitle>
                  <CardDescription>
                    Gerencie consultores e acompanhe o progresso
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/consultoria/equipe")}>
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Consultores
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Consultores</TableHead>
                      <TableHead>Missão</TableHead>
                      <TableHead>Visão</TableHead>
                      <TableHead>Valores</TableHead>
                      <TableHead>Ações</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProjects.map((project) => {
                      const consultants = getProjectConsultants(project.id);
                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{project.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {consultants.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {consultants.map(c => (
                                  <Badge key={c.id} variant="secondary" className="text-xs">
                                    {c.name.split(' ')[0]}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-amber-600">
                                Sem consultor
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getPillarStatus(project.mission_stage, 13).icon}</TableCell>
                          <TableCell>{getPillarStatus(project.vision_stage, 13).icon}</TableCell>
                          <TableCell>{getPillarStatus(project.values_stage).icon}</TableCell>
                          <TableCell>
                            {(project.pending_actions_count || 0) > 0 ? (
                              <Badge variant="outline" className="text-amber-600">
                                {project.pending_actions_count} pendentes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Dialog open={assignDialogOpen && selectedProject === project.id} onOpenChange={(open) => {
                                setAssignDialogOpen(open);
                                if (!open) setSelectedProject(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedProject(project.id)}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Atribuir Consultor</DialogTitle>
                                    <DialogDescription>
                                      Selecione um consultor para atribuir a {project.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione um consultor" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {allConsultants.filter(c => c.active).map(consultant => (
                                          <SelectItem key={consultant.id} value={consultant.id}>
                                            {consultant.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleAssign} disabled={!selectedConsultant}>
                                        Atribuir
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/consultoria/projeto/${project.id}`)}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkpoints">
            <CheckpointAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="licencas">
            <HeadCSLicenseOverview projects={allProjects} />
          </TabsContent>

          <TabsContent value="alocacao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alocação de Tempo</CardTitle>
                <CardDescription>
                  Monitore as horas trabalhadas por todos os consultores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeFiltersBar
                  onDateRangeChange={(start, end) => 
                    setTimeFilters(prev => ({ ...prev, startDate: start, endDate: end }))
                  }
                  onExport={handleTimeExport}
                  consultants={allConsultants.filter(c => c.active).map(c => ({ id: c.id, name: c.name }))}
                  selectedConsultantId={timeFilters.consultantId}
                  onConsultantChange={(id) => 
                    setTimeFilters(prev => ({ ...prev, consultantId: id }))
                  }
                />
              </CardContent>
            </Card>
            
            <ConsultantTimeOverview
              consultantSummaries={consultantSummaries}
              overallSummary={overallSummary}
              totalConsultants={activeConsultantsCount}
              totalProjects={projectsWithTimeCount}
              isLoading={timeLoading}
            />
          </TabsContent>

          <TabsContent value="recursos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planejamento de Recursos</CardTitle>
                <CardDescription>
                  Horizonte de 12 semanas com demanda híbrida (manual + sugestão pelo histórico).
                </CardDescription>
              </CardHeader>
            </Card>
            <ResourcePlanningDashboard />
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <HeadCSRecommendationsOverview />
          </TabsContent>

          <TabsContent value="relatorios">
            <ConsultantReports 
              projects={allProjects} 
              consultants={allConsultants} 
              getProjectConsultants={getProjectConsultants} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </ConsultoriaLayout>
  );
}
