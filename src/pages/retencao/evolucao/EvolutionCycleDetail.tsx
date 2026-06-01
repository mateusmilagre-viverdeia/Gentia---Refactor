import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { parseISO, differenceInDays } from "date-fns";
import { 
  ArrowLeft, 
  Rocket, 
  Target, 
  TrendingUp, 
  Zap,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  MoreVertical,
  Plus,
  MessageSquare,
  Briefcase,
  Users,
  BookOpen
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEvolutionCycle } from "@/hooks/useEvolutionCycles";
import { useEvolutionActions } from "@/hooks/useEvolutionActions";
import { CheckinDialog } from "@/components/evolucao/CheckinDialog";
import { ObjectiveCard } from "@/components/evolucao/ObjectiveCard";
import type { EvolutionCycleStatus, EvolutionActionType } from "@/types/evolution.types";
import { formatBRT } from "@/lib/datetime";

const statusConfig: Record<EvolutionCycleStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
}> = {
  draft: { label: "Rascunho", variant: "outline", icon: Clock },
  active: { label: "Ativo", variant: "default", icon: Target },
  completed: { label: "Concluído", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", variant: "destructive", icon: AlertCircle },
};

// Helper to get full name from profile
function getFullName(profile?: { first_name: string; last_name: string } | null): string {
  if (!profile) return "Não definido";
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Sem nome";
}

const EvolutionCycleDetail = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { data: cycle, isLoading } = useEvolutionCycle(cycleId);
  const [checkinOpen, setCheckinOpen] = useState(false);

  if (isLoading) {
    return (
      <AppLayout 
        title="Carregando..." 
        breadcrumb={[{ label: "Retenção", href: "/retencao" }, { label: "Sistema de Evolução", href: "/retencao/evolucao" }]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Carregando ciclo...</div>
        </div>
      </AppLayout>
    );
  }

  if (!cycle) {
    return (
      <AppLayout 
        title="Ciclo não encontrado" 
        breadcrumb={[{ label: "Retenção", href: "/retencao" }, { label: "Sistema de Evolução", href: "/retencao/evolucao" }]}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground mb-4">Ciclo de evolução não encontrado</p>
          <Button onClick={() => navigate("/retencao/evolucao")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[cycle.status];
  const StatusIcon = status.icon;

  const collaboratorName = getFullName(cycle.collaborator);
  const leaderName = cycle.leader ? getFullName(cycle.leader) : null;

  // Calculate progress
  const totalActions = cycle.objectives?.reduce(
    (acc, obj) => acc + (obj.actions?.length || 0),
    0
  ) || 0;
  const completedActions = cycle.objectives?.reduce(
    (acc, obj) =>
      acc + (obj.actions?.filter((a) => a.status === "completed").length || 0),
    0
  ) || 0;
  const progress = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  // Days remaining
  const endDate = parseISO(cycle.end_date);
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);

  // Priority competency
  const priorityCompetency = cycle.competencies?.find((c) => c.is_priority);

  return (
    <AppLayout
      title={collaboratorName}
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Sistema de Evolução", href: "/retencao/evolucao" },
        { label: collaboratorName },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/retencao/evolucao")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{collaboratorName}</h1>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {leaderName && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Líder: {leaderName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatBRT(parseISO(cycle.start_date), "dd/MM/yyyy")} -{" "}
                  {formatBRT(endDate, "dd/MM/yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cycle.status === "active" && (
              <Button onClick={() => setCheckinOpen(true)} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Registrar Check-in
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cycle.status === "draft" && (
                  <DropdownMenuItem>
                    <Play className="h-4 w-4 mr-2" />
                    Ativar Ciclo
                  </DropdownMenuItem>
                )}
                {cycle.status === "active" && (
                  <>
                    <DropdownMenuItem>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Concluir Ciclo
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Pause className="h-4 w-4 mr-2" />
                      Cancelar Ciclo
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>Editar Informações</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Overview */}
        {cycle.status === "active" && (
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Geral</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {completedActions} de {totalActions} ações concluídas
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Math.max(0, daysRemaining)}</p>
                    <p className="text-sm text-muted-foreground">dias restantes</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{cycle.checkins?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">check-ins realizados</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="objectives" className="space-y-4">
          <TabsList>
            <TabsTrigger value="objectives" className="gap-2">
              <Target className="h-4 w-4" />
              Objetivos & Ações
            </TabsTrigger>
            <TabsTrigger value="checkins" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Check-ins ({cycle.checkins?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="purpose" className="gap-2">
              <Rocket className="h-4 w-4" />
              Propósito
            </TabsTrigger>
          </TabsList>

          {/* Objectives Tab */}
          <TabsContent value="objectives" className="space-y-4">
            {cycle.objectives?.map((objective, index) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                index={index}
                cycleId={cycle.id}
                isActive={cycle.status === "active"}
              />
            ))}

            {(!cycle.objectives || cycle.objectives.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum objetivo definido</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins" className="space-y-4">
            {cycle.checkins && cycle.checkins.length > 0 ? (
              cycle.checkins
                .sort((a, b) => new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime())
                .map((checkin) => (
                  <Card key={checkin.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Check-in de {formatBRT(parseISO(checkin.checkin_date), "dd 'de' MMMM")}
                        </CardTitle>
                        {checkin.overall_progress !== null && (
                          <Badge variant="outline">{checkin.overall_progress}% progresso</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {checkin.planned_vs_executed && (
                        <div>
                          <p className="text-sm font-medium mb-1">Planejado vs Executado</p>
                          <p className="text-sm text-muted-foreground">{checkin.planned_vs_executed}</p>
                        </div>
                      )}
                      {checkin.perceived_evolution && (
                        <div>
                          <p className="text-sm font-medium mb-1">Evolução Percebida</p>
                          <p className="text-sm text-muted-foreground">{checkin.perceived_evolution}</p>
                        </div>
                      )}
                      {checkin.blockers && (
                        <div>
                          <p className="text-sm font-medium mb-1">Bloqueios</p>
                          <p className="text-sm text-muted-foreground">{checkin.blockers}</p>
                        </div>
                      )}
                      {checkin.next_steps && (
                        <div>
                          <p className="text-sm font-medium mb-1">Próximos Passos</p>
                          <p className="text-sm text-muted-foreground">{checkin.next_steps}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhum check-in registrado ainda</p>
                  {cycle.status === "active" && (
                    <Button onClick={() => setCheckinOpen(true)}>
                      Registrar Primeiro Check-in
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Purpose Tab */}
          <TabsContent value="purpose">
            {priorityCompetency ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Competência Prioritária
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={priorityCompetency.competency_type === "behavioral" ? "default" : "secondary"}>
                      {priorityCompetency.competency_type === "behavioral" ? "Comportamental" : "Técnica"}
                    </Badge>
                    <span className="text-xl font-semibold">{priorityCompetency.competency_name}</span>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Justificativa Estratégica</p>
                      <p className="text-sm">{priorityCompetency.strategic_justification}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Impacto Esperado</p>
                      <p className="text-sm">{priorityCompetency.expected_impact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma competência definida</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Check-in Dialog */}
      <CheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        cycleId={cycle.id}
      />
    </AppLayout>
  );
};

export default EvolutionCycleDetail;
