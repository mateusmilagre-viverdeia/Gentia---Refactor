import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEPRole } from "@/hooks/useEPRole";
import { useCheckpoints } from "@/hooks/useCheckpoints";
import { useConsultantNotes } from "@/hooks/useConsultantNotes";
import { useAccount } from "@/hooks/useAccount";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useConsultantAuditLog } from "@/hooks/useConsultantAuditLog";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Calendar, StickyNote, ExternalLink, Shield, Activity, Route, FileArchive, BarChart3, Sparkles } from "lucide-react";
import { CheckpointsTab } from "@/components/consultor/CheckpointsTab";
import { ConsultantNotesTab } from "@/components/consultor/ConsultantNotesTab";
import { ModuleLicenseManager } from "@/components/consultor/ModuleLicenseManager";
import { ProjectHealthBadge } from "@/components/consultor/health/ProjectHealthBadge";
import { ProjectHealthCard } from "@/components/consultor/health/ProjectHealthCard";
import { ProjectTimelineView } from "@/components/consultor/timeline/ProjectTimelineView";
import { DocumentsTab } from "@/components/consultor/documents";
import { ProjectAnalyticsDashboard } from "@/components/consultor/analytics";
import { RecommendationsPanel } from "@/components/consultor/recommendations";

interface CompanyInfo {
  id: string;
  name: string;
  slug: string | null;
}

export default function ClientProject() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { isEPTeam, loading: roleLoading } = useEPRole();
  const { account } = useAccount();
  const { setConsultantProject, isConsultantMode } = useOrganization();
  const { logAccess } = useConsultantAuditLog();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const hasLoggedAccess = useRef(false);
  
  // Health Score hook
  const { healthScore, calculateHealth, loading: healthLoading } = useProjectHealth(accountId);

  useEffect(() => {
    async function checkAccessAndLoadCompany() {
      if (!accountId) {
        setLoading(false);
        return;
      }

      try {
        // Try to load company data (will fail if no access due to RLS)
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, slug')
          .eq('id', accountId)
          .maybeSingle();

        if (error || !data) {
          setHasAccess(false);
        } else {
          setCompany(data);
          setHasAccess(true);
          
          // Set consultant project context for sub-pages
          await setConsultantProject(accountId);
          
          // Log access for audit (only once per page load)
          if (!hasLoggedAccess.current) {
            hasLoggedAccess.current = true;
            logAccess({
              accountId,
              action: 'view_project',
              resourceType: 'project',
              metadata: { company_name: data.name }
            });
          }
        }
      } catch (err) {
        console.error('Error loading company:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccessAndLoadCompany();
  }, [accountId, setConsultantProject]);

  const projectBreadcrumb = [
    { label: "Home", href: "/" },
    { label: "Consultoria EP", href: "/consultor/dashboard" },
    { label: company?.name || "Projeto" }
  ];

  if (roleLoading || loading) {
    return (
      <AppLayout 
        title="Projeto"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Consultoria EP", href: "/consultor/dashboard" },
          { label: "Projeto" }
        ]}
      >
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout 
        title="Projeto"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Consultoria EP", href: "/consultor/dashboard" },
          { label: "Projeto" }
        ]}
      >
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Você não tem acesso a este projeto.
              </p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const goBackPath = isEPTeam ? "/consultor/dashboard" : "/";

  return (
    <AppLayout title={company?.name || "Projeto"} breadcrumb={projectBreadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(goBackPath)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">{company?.name}</h1>
                {healthScore && (
                  <ProjectHealthBadge 
                    score={healthScore.health_score} 
                    status={healthScore.health_status}
                    showScore
                    size="md"
                  />
                )}
              </div>
              <p className="text-muted-foreground">
                {isEPTeam ? "Projeto de consultoria" : "Acompanhamento do projeto"}
              </p>
            </div>
          </div>
          
          {isEPTeam && !isConsultantMode && (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/company/${accountId}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Detalhes Completos
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isEPTeam ? "timeline" : "checkpoints"} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            {isEPTeam && (
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            )}
            {isEPTeam && (
              <TabsTrigger value="health" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Health
              </TabsTrigger>
            )}
            {isEPTeam && (
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
            )}
            {isEPTeam && (
              <TabsTrigger value="cultura" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Cultura
              </TabsTrigger>
            )}
            <TabsTrigger value="checkpoints" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Checkpoints
            </TabsTrigger>
            {isEPTeam && (
              <>
                <TabsTrigger value="documentos" className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="modulos" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Módulos
                </TabsTrigger>
                <TabsTrigger value="notas" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notas
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isEPTeam && (
            <TabsContent value="timeline" className="mt-6">
              <ProjectTimelineView 
                accountId={accountId || ''} 
                healthScore={healthScore}
              />
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="health" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <ProjectHealthCard 
                  healthScore={healthScore}
                  loading={healthLoading}
                  onRefresh={() => accountId && calculateHealth(accountId)}
                  showDetails
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo do Projeto</CardTitle>
                    <CardDescription>Visão geral do andamento</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {healthScore ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Dias sem atividade</span>
                          <span className="font-medium">{healthScore.days_since_last_activity}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Ações pendentes</span>
                          <span className="font-medium">{healthScore.pending_actions_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Ações concluídas</span>
                          <span className="font-medium">{healthScore.completed_actions_count}</span>
                        </div>
                        {healthScore.last_checkpoint_date && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Último checkpoint</span>
                            <span className="font-medium">
                              {new Date(healthScore.last_checkpoint_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Calcule o Health Score para ver o resumo do projeto.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="recommendations" className="mt-6">
              <RecommendationsPanel accountId={accountId || ''} />
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="cultura" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Acesso à Cultura</CardTitle>
                  <CardDescription>
                    Acesse os 8 pilares de cultura do cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      { name: "Missão", path: "missao" },
                      { name: "Visão", path: "visao" },
                      { name: "Valores", path: "valores" },
                      { name: "Indicadores", path: "indicadores" },
                      { name: "Projetos", path: "projetos" },
                      { name: "Energia", path: "energia" },
                      { name: "Desenvolvimento", path: "desenvolvimento" },
                      { name: "Decisão", path: "decisao" },
                    ].map((pillar) => (
                      <Button
                        key={pillar.path}
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2"
                        onClick={() => {
                          navigate(`/cultura/criacao?tab=${pillar.path}`);
                        }}
                      >
                        <span className="font-medium">{pillar.name}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Nota: Você será redirecionado para o app do cliente mantendo o contexto do projeto.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="checkpoints" className="mt-6">
            <CheckpointsTab accountId={accountId || ""} />
          </TabsContent>

          {isEPTeam && (
            <TabsContent value="documentos" className="mt-6">
              <DocumentsTab accountId={accountId || ""} />
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="analytics" className="mt-6">
              <ProjectAnalyticsDashboard accountId={accountId || ""} />
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="modulos" className="mt-6">
              <ModuleLicenseManager accountId={accountId || ""} />
            </TabsContent>
          )}

          {isEPTeam && (
            <TabsContent value="notas" className="mt-6">
              <ConsultantNotesTab accountId={accountId || ""} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
