import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PushNotificationPermission } from "@/components/notifications/PushNotificationPermission";
import { 
  Activity, 
  History, 
  BarChart3, 
  Users, 
  Settings, 
  ClipboardList,
  ArrowRight,
  Lock,
  HelpCircle,
  FileText,
  AlertTriangle,
  Heart
} from "lucide-react";
import { usePulseRetentionAlerts } from "@/hooks/usePulseRetentionAlerts";
import { usePulseRole } from "@/hooks/usePulseRole";
import { usePulseOnboarding } from "@/hooks/usePulseOnboarding";
import { usePulseSurveys } from "@/hooks/usePulseSurveys";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PulseOnboardingTour, 
  PulseOnboardingWelcome,
  TourRole 
} from "@/components/pulse/onboarding";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PulseToolCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  requiresAdmin?: boolean;
  requiresLeader?: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  dataTour?: string;
}

const PulseHub = () => {
  const navigate = useNavigate();
  const { isAdmin, isLeader, isEmployee, loading } = usePulseRole();
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id || null;
  const { surveys, isLoadingSurveys } = usePulseSurveys(accountId);
  const { summary: alertsSummary } = usePulseRetentionAlerts(accountId);

  // Redirect admin to surveys page if no surveys configured
  useEffect(() => {
    if (!loading && !isLoadingSurveys && isAdmin && surveys.length === 0) {
      navigate("/retencao/pulse/surveys");
    }
  }, [loading, isLoadingSurveys, isAdmin, surveys.length, navigate]);

  // Determinar role para o tour
  const getTourRole = (): TourRole => {
    if (isAdmin) return "admin";
    if (isLeader) return "leader";
    return "employee";
  };

  const tourRole = getTourRole();
  const {
    showWelcomeModal,
    isRunning,
    stepIndex,
    startTour,
    endTour,
    skipOnboarding,
    resetOnboarding,
    setStepIndex,
  } = usePulseOnboarding(tourRole, loading);

  // Tools available to all users with Pulse access
  const allUserTools: PulseToolCard[] = [
    {
      title: "Pulse Diário",
      description: "Responda as perguntas do dia sobre seu bem-estar e engajamento",
      icon: Activity,
      url: "/retencao/pulse",
      badge: "Diário",
      badgeVariant: "default",
      dataTour: "pulse-daily",
    },
    {
      title: "Meu Histórico",
      description: "Visualize suas respostas anteriores e acompanhe sua evolução",
      icon: History,
      url: "/retencao/pulse/history",
      dataTour: "pulse-history",
    },
  ];

  // Tools available to leaders
  const leaderTools: PulseToolCard[] = [
    {
      title: "Dashboard do Líder",
      description: "Acompanhe métricas e insights da sua equipe",
      icon: Users,
      url: "/retencao/pulse/leader",
      requiresLeader: true,
      dataTour: "pulse-leader-dashboard",
    },
    {
      title: "Planos de Ação",
      description: "Gerencie ações de melhoria baseadas nos feedbacks",
      icon: ClipboardList,
      url: "/retencao/pulse/actions",
      requiresLeader: true,
      dataTour: "pulse-actions",
    },
  ];

  // Tools available to admins only
  const adminTools: PulseToolCard[] = [
    {
      title: "Pesquisas Pulse",
      description: "Crie e gerencie pesquisas de engajamento para sua equipe",
      icon: FileText,
      url: "/retencao/pulse/surveys",
      requiresAdmin: true,
      badge: "Novo",
      badgeVariant: "default",
      dataTour: "pulse-surveys",
    },
    {
      title: "Gestor de Cultura",
      description: "Acompanhe se a cultura está sendo vivida no dia a dia",
      icon: Heart,
      url: "/retencao/pulse/cultura",
      requiresAdmin: true,
      badge: "Novo",
      badgeVariant: "default",
      dataTour: "pulse-culture",
    },
    {
      title: "Dashboard Geral",
      description: "Visão completa de métricas, tendências e alertas da organização",
      icon: BarChart3,
      url: "/retencao/pulse/dashboard",
      requiresAdmin: true,
      dataTour: "pulse-dashboard-general",
    },
    {
      title: "Alertas de Retenção",
      description: "Monitore riscos de turnover e tome ações preventivas",
      icon: AlertTriangle,
      url: "/retencao/pulse/dashboard?tab=retention",
      requiresAdmin: true,
      badge: alertsSummary.criticalAlerts > 0 ? `${alertsSummary.criticalAlerts} crítico(s)` : undefined,
      badgeVariant: "default",
      dataTour: "pulse-retention-alerts",
    },
    {
      title: "Administração",
      description: "Configure perguntas, equipes, usuários e regras de gamificação",
      icon: Settings,
      url: "/retencao/pulse/admin",
      requiresAdmin: true,
      badge: "Admin",
      badgeVariant: "secondary",
      dataTour: "pulse-admin",
    },
  ];

  const renderToolCard = (tool: PulseToolCard, hasAccess: boolean) => (
    <Card 
      key={tool.title} 
      data-tour={tool.dataTour}
      className={`relative transition-all duration-200 ${
        hasAccess 
          ? "hover:shadow-lg hover:border-primary/50 cursor-pointer" 
          : "opacity-60 cursor-not-allowed"
      }`}
      onClick={() => hasAccess && navigate(tool.url)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-lg ${hasAccess ? "bg-primary/10" : "bg-muted"}`}>
            <tool.icon className={`h-6 w-6 ${hasAccess ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex items-center gap-2">
            {!hasAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
            {tool.badge && (
              <Badge variant={tool.badgeVariant || "outline"} className="text-xs">
                {tool.badge}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg mt-4">{tool.title}</CardTitle>
        <CardDescription className="text-sm">{tool.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full" 
          variant={hasAccess ? "outline" : "ghost"}
          disabled={!hasAccess}
        >
          {hasAccess ? "Acessar" : "Sem acesso"}
          {hasAccess && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading || isLoadingSurveys) {
    return (
      <AppLayout 
        title="Pesquisa Pulse"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Retenção", href: "/retencao" },
          { label: "Pesquisa Pulse" }
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Pesquisa Pulse"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Pesquisa Pulse" }
      ]}
    >
      {/* Onboarding Components */}
      <PulseOnboardingWelcome
        isOpen={showWelcomeModal}
        role={tourRole}
        onStartTour={startTour}
        onSkip={skipOnboarding}
      />
      <PulseOnboardingTour
        isRunning={isRunning}
        stepIndex={stepIndex}
        role={tourRole}
        onTourEnd={endTour}
        onStepChange={setStepIndex}
      />

      <div className="space-y-8" data-tour="pulse-welcome">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Pesquisa Pulse</h1>
            <p className="text-muted-foreground">
              Acompanhe o engajamento e bem-estar da equipe com pesquisas diárias
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetOnboarding}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver tutorial novamente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Access level indicator */}
        <div 
          className="p-4 bg-primary/5 rounded-lg border border-primary/20"
          data-tour="pulse-access-level"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary text-primary">
              {isAdmin ? "Administrador" : isLeader ? "Líder" : "Colaborador"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isAdmin 
                ? "Você tem acesso completo a todas as funcionalidades" 
                : isLeader 
                  ? "Você pode visualizar dados da sua equipe"
                  : "Você pode responder pesquisas e ver seu histórico"
              }
            </span>
          </div>
        </div>

        {/* All user tools */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Minha Participação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allUserTools.map((tool) => renderToolCard(tool, isEmployee))}
          </div>
        </div>

        {/* Leader tools */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Gestão de Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leaderTools.map((tool) => renderToolCard(tool, isLeader))}
          </div>
        </div>

        {/* Admin tools */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Administração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {adminTools.map((tool) => renderToolCard(tool, isAdmin))}
          </div>
        </div>
      </div>

      {/* Push Notification Permission Banner */}
      <PushNotificationPermission />
    </AppLayout>
  );
};

export default PulseHub;
