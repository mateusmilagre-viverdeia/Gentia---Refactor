import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { UserCheck, BarChart3, Zap, TrendingUp, ArrowRight, CheckCircle2, Clock, ClipboardList, Activity, Users, Trophy, UserPlus, UserMinus, Rocket, Mountain, Coins, Sparkles, ShieldAlert, Layers, Users2 } from "lucide-react";
import { HubProgressCard } from "@/components/gamification";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePulseRetentionAlerts } from "@/hooks/usePulseRetentionAlerts";
import { usePendingPulse } from "@/hooks/usePendingPulse";

const retencaoTools = [
  {
    title: "Analisador de Pessoas",
    description: "Analise e avalie colaboradores com base nos valores organizacionais definidos",
    icon: UserCheck,
    url: "/retencao/analisador-pessoas",
    stepId: "analisador_pessoas",
    category: "performance",
  },
  {
    title: "Avaliação de Desempenho",
    description: "Visualize o desempenho dos colaboradores em um gráfico de 4 blocos",
    icon: BarChart3,
    url: "/retencao/avaliacao-desempenho",
    stepId: "avaliacao_desempenho",
    category: "performance",
  },
  {
    title: "Maturidade do Time",
    description: "Avalie o nível de maturidade e autonomia de cada membro da equipe",
    icon: TrendingUp,
    url: "/retencao/maturidade-time",
    stepId: "maturidade_time",
    category: "performance",
  },
  {
    title: "People Performance",
    description: "Dashboard consolidado com índice de performance baseado em todas as avaliações",
    icon: Trophy,
    url: "/retencao/people-performance",
    stepId: "people_performance",
    category: "performance",
  },
  {
    title: "Assessment DISC",
    description: "Avalie o perfil comportamental da equipe com o método DISC",
    icon: Users,
    url: "/retencao/assessment-disc",
    stepId: "assessment_disc",
    category: "performance",
  },
  {
    title: "Teste QA",
    description: "Avalie o Quociente de Adversidade e resiliência dos colaboradores",
    icon: Mountain,
    url: "/retencao/assessment-qa",
    stepId: "assessment_qa",
    category: "performance",
  },
  {
    title: "Habilidade Única",
    description: "Identifique as habilidades únicas de cada colaborador e otimize a alocação de tarefas",
    icon: Zap,
    url: "/retencao/habilidade-unica",
    stepId: "habilidade_unica",
    category: "surveys",
  },
  {
    title: "Questionários",
    description: "Crie pesquisas personalizadas para avaliar satisfação, clima e engajamento",
    icon: ClipboardList,
    url: "/retencao/questionarios",
    stepId: "questionarios",
    category: "surveys",
  },
  {
    title: "Pesquisa Pulse",
    description: "Acompanhe engajamento e bem-estar com pesquisas diárias rápidas",
    icon: Activity,
    url: "/retencao/pulse/hub",
    stepId: "pulse",
    category: "surveys",
  },
  {
    title: "Onboarding",
    description: "Gerencie processos de integração de novos colaboradores com acompanhamento completo",
    icon: UserPlus,
    url: "/retencao/onboarding",
    stepId: "onboarding",
    category: "development",
  },
  {
    title: "Offboarding",
    description: "Gerencie processos de desligamento com checklist, pesquisa de saída e métricas",
    icon: UserMinus,
    url: "/retencao/offboarding",
    stepId: "offboarding",
    category: "development",
  },
  {
    title: "Sistema de Evolução",
    description: "Desenvolvimento contínuo orientado a resultado, performance e impacto no negócio",
    icon: Rocket,
    url: "/retencao/evolucao",
    stepId: "sistema_evolucao",
    category: "development",
  },
  {
    title: "Cargos e Salários",
    description: "Sistema de valorização com estrutura de cargos, níveis e faixas salariais customizáveis",
    icon: Coins,
    url: "/retencao/cargos-salarios",
    stepId: "cargos_salarios",
    category: "development",
  },
  {
    title: "Reuniões 1:1",
    description: "Gerencie reuniões individuais com liderados, pautas e planos de ação",
    icon: Users2,
    url: "/retencao/reunioes-1-1",
    stepId: "reunioes_1_1",
    category: "development",
  },
];

const retencaoCategories = [
  {
    id: "performance",
    title: "Avaliação e Performance",
    icon: BarChart3,
    color: "primary",
    borderColor: "border-primary/20",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
  {
    id: "surveys",
    title: "Pesquisas e Questionários",
    icon: ClipboardList,
    color: "green",
    borderColor: "border-green-500/20",
    bgColor: "bg-green-500/10",
    textColor: "text-green-500",
  },
  {
    id: "development",
    title: "Desenvolvimento e Estrutura",
    icon: Layers,
    color: "amber",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-500",
  },
];

const RetencaoHub = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneyProgress();
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id || null;
  const { summary: alertsSummary, isLoading: isLoadingAlerts } = usePulseRetentionAlerts(accountId);
  const { hasPendingPulse, questionsCount: pendingQuestionsCount } = usePendingPulse();
  
  const retencaoJourney = journeys.find(j => j.id === 'retencao');

  const getStepStatus = (stepId: string) => {
    if (!retencaoJourney) return 'available';
    const step = retencaoJourney.steps.find(s => s.id === stepId);
    return step?.status || 'available';
  };

  const getStatusBadge = (stepId: string) => {
    const status = getStepStatus(stepId);
    switch (status) {
      case "in_progress":
        return <Badge variant="default" className="text-xs bg-amber-500">Em andamento</Badge>;
      case "completed":
        return <Badge variant="default" className="text-xs bg-green-500">Concluído</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (stepId: string) => {
    const status = getStepStatus(stepId);
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getToolsByCategory = (categoryId: string) => {
    return retencaoTools.filter(tool => tool.category === categoryId);
  };

  return (
    <AppLayout 
      title="Retenção"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção" }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Retenção</h1>
            <p className="text-muted-foreground">
              Ferramentas para gestão diária de pessoas, avaliação e desenvolvimento de talentos
            </p>
          </div>
          <HubProgressCard journeyId="retencao" />
        </div>

        {/* Pending Pulse Banner */}
        {hasPendingPulse && (
          <Card 
            className="border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/retencao/pulse/daily')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 animate-pulse">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Seu pulso diário está disponível! 💫</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingQuestionsCount} {pendingQuestionsCount === 1 ? 'pergunta' : 'perguntas'} rápidas para responder
                    </p>
                  </div>
                </div>
                <Button variant="default" size="sm">
                  Responder Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retention Alerts Summary */}
        {!isLoadingAlerts && alertsSummary.totalAlerts > 0 && (
          <Card 
            className="border-amber-500/30 bg-amber-50/50 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/retencao/pulse/dashboard?tab=retention')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">Alertas de Retenção Ativos</p>
                    <p className="text-sm text-amber-700">
                      {alertsSummary.criticalAlerts > 0 && (
                        <span className="font-semibold text-red-600">{alertsSummary.criticalAlerts} crítico(s)</span>
                      )}
                      {alertsSummary.criticalAlerts > 0 && alertsSummary.totalAlerts - alertsSummary.criticalAlerts > 0 && ' • '}
                      {alertsSummary.totalAlerts - alertsSummary.criticalAlerts > 0 && (
                        <span>{alertsSummary.totalAlerts - alertsSummary.criticalAlerts} outros alertas</span>
                      )}
                      {alertsSummary.highRiskTeams > 0 && ` • ${alertsSummary.highRiskTeams} equipes em risco`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                  Ver Alertas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Sections */}
        {retencaoCategories.map((category) => {
          const CategoryIcon = category.icon;
          const tools = getToolsByCategory(category.id);
          
          return (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                  <CategoryIcon className={`h-5 w-5 ${category.textColor}`} />
                </div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <Card 
                    key={tool.title} 
                    className={`relative transition-all duration-200 hover:shadow-lg cursor-pointer ${category.borderColor} hover:border-${category.color}-500/50`}
                    onClick={() => navigate(tool.url)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2.5 rounded-lg ${category.bgColor}`}>
                          <tool.icon className={`h-5 w-5 ${category.textColor}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tool.stepId)}
                          {getStatusBadge(tool.stepId)}
                        </div>
                      </div>
                      <CardTitle className="text-base mt-3">{tool.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button className="w-full" variant="outline" size="sm">
                        Acessar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default RetencaoHub;
