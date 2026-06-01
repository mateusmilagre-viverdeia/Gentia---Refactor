import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Route, MessageCircle, FileArchive } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { ProjectHealthCard } from "@/components/consultor/health/ProjectHealthCard";
import { ProjectTimelineView } from "@/components/consultor/timeline/ProjectTimelineView";
import { ProjectComments } from "@/components/portal/comments/ProjectComments";
import { ProjectAlertsCard } from "@/components/project/ProjectAlertsCard";
import { DocumentsTab } from "@/components/consultor/documents";

export default function ClientPortalProject() {
  const { accountId: accountIdFromRoute } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { account, loading: accountLoading } = useAccount();

  const accountId = accountIdFromRoute || account?.id || "";

  const { milestones, loading: milestonesLoading } = useProjectMilestones(accountId);
  const { healthScore, loading: healthLoading, calculateHealth } = useProjectHealth(accountId);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");

  const selectableMilestones = useMemo(() => {
    return (milestones ?? []).filter((m) => m.id && m.status !== "cancelled");
  }, [milestones]);

  const effectiveSelectedMilestoneId = useMemo(() => {
    if (selectedMilestoneId) return selectedMilestoneId;
    return selectableMilestones[0]?.id || "";
  }, [selectedMilestoneId, selectableMilestones]);

  const loading = accountLoading || milestonesLoading;

  if (loading) {
    return (
      <AppLayout title="Portal do Projeto">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!accountId) {
    return (
      <AppLayout title="Portal do Projeto">
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Não encontramos uma empresa vinculada à sua conta.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Portal do Projeto">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Visão do Cliente</h1>
            <p className="text-muted-foreground">Acompanhamento do projeto (somente leitura)</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comentários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <ProjectHealthCard
                  healthScore={healthScore}
                  loading={healthLoading}
                  onRefresh={() => calculateHealth(accountId)}
                  showDetails={false}
                />
                <ProjectAlertsCard
                  accountId={accountId}
                  maxItems={3}
                  showActions={false}
                  compact
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Próximos marcos</CardTitle>
                  <CardDescription>O que vem a seguir na jornada</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectableMilestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum marco cadastrado.</p>
                  ) : (
                    selectableMilestones
                      .slice()
                      .sort((a, b) => {
                        const da = a.planned_end ? new Date(a.planned_end).getTime() : Number.MAX_SAFE_INTEGER;
                        const db = b.planned_end ? new Date(b.planned_end).getTime() : Number.MAX_SAFE_INTEGER;
                        return da - db;
                      })
                      .slice(0, 5)
                      .map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.milestone_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.planned_end ? new Date(m.planned_end).toLocaleDateString("pt-BR") : "Sem prazo"}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground shrink-0">{m.progress_percentage}%</p>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ProjectTimelineView accountId={accountId} healthScore={healthScore} readOnly />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentsTab accountId={accountId} readOnly />
          </TabsContent>

          <TabsContent value="comments" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Comentar em um marco</CardTitle>
                <CardDescription>Escolha um marco para centralizar a conversa</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={effectiveSelectedMilestoneId}
                  onValueChange={(v) => setSelectedMilestoneId(v)}
                  disabled={selectableMilestones.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um marco" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableMilestones.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.milestone_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {effectiveSelectedMilestoneId ? (
              <ProjectComments
                accountId={accountId}
                entityType="milestone"
                entityId={effectiveSelectedMilestoneId}
                title="Comentários do marco"
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Crie um marco para habilitar comentários.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
