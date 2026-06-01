import { ConsultoriaLayout } from "@/components/consultoria";
import { useConsultant } from "@/hooks/useConsultant";
import { useEPRole } from "@/hooks/useEPRole";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, ArrowRight, AlertCircle } from "lucide-react";

import { DashboardTimeCard, ActiveTimerWidget } from "@/components/consultor/time-tracking";
import { DashboardRecommendationsWidget } from "@/components/consultor/recommendations";
import { formatBRT } from "@/lib/datetime";

function getPillarStatus(stage: number | null, maxStage: number = 9) {
  if (!stage || stage === 0) return { label: "Não iniciado", color: "outline" as const };
  if (stage >= maxStage) return { label: "Concluído", color: "default" as const };
  return { label: "Em andamento", color: "secondary" as const };
}

export default function ConsultoriaMeusProjetos() {
  const navigate = useNavigate();
  const { isEPConsultant, isHeadCS, isSuperAdmin, isEPTeam, loading: roleLoading } = useEPRole();
  const { consultant, assignedProjects, loading, error } = useConsultant();

  if (roleLoading || loading) {
    return (
      <ConsultoriaLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ConsultoriaLayout>
    );
  }

  if (!isEPTeam) {
    return <Navigate to="/" replace />;
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

  const totalPendingActions = assignedProjects.reduce((sum, p) => sum + (p.pending_actions_count || 0), 0);
  const projectsWithUpcoming = assignedProjects.filter(p => p.next_checkpoint);

  return (
    <ConsultoriaLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Olá, {consultant?.name?.split(' ')[0] || 'Consultor'}
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus projetos de consultoria
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Projetos Ativos</CardDescription>
              <CardTitle className="text-3xl">{assignedProjects.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                clientes atribuídos a você
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
                itens aguardando conclusão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Próximos Checkpoints</CardDescription>
              <CardTitle className="text-3xl">{projectsWithUpcoming.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                reuniões agendadas
              </p>
            </CardContent>
          </Card>

          <DashboardTimeCard />
        </div>

        {/* Active Timer Widget */}
        <ActiveTimerWidget />

        {/* Quick Recommendations Widget */}
        <DashboardRecommendationsWidget />

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Projetos</CardTitle>
            <CardDescription>
              Clientes atribuídos à sua consultoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum projeto atribuído ainda.</p>
                <p className="text-sm">Entre em contato com o Head CS para ser atribuído a projetos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium">{project.name}</h3>
                        </div>

                        {/* Progress badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant={getPillarStatus(project.mission_stage, 13).color}>
                            Missão: {getPillarStatus(project.mission_stage, 13).label}
                          </Badge>
                          <Badge variant={getPillarStatus(project.vision_stage, 13).color}>
                            Visão: {getPillarStatus(project.vision_stage, 13).label}
                          </Badge>
                          <Badge variant={getPillarStatus(project.values_stage).color}>
                            Valores: {getPillarStatus(project.values_stage).label}
                          </Badge>
                        </div>

                        {/* Next checkpoint */}
                        {project.next_checkpoint && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Próximo checkpoint: {formatBRT(new Date(project.next_checkpoint.checkpoint_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        )}

                        {/* Pending actions */}
                        {(project.pending_actions_count || 0) > 0 && (
                          <div className="flex items-center gap-2 text-sm text-amber-600 mt-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>{project.pending_actions_count} ações pendentes</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => navigate(`/consultoria/projeto/${project.id}`)}
                      >
                        Acessar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsultoriaLayout>
  );
}
