import { useNavigate, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEPRole } from "@/hooks/useEPRole";
import { useHeadCS } from "@/hooks/useHeadCS";
import { useConsultant } from "@/hooks/useConsultant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HubHeader, HubSection } from "@/components/hub";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  Clock, 
  BookOpen, 
  BarChart3, 
  Mail, 
  Headphones,
  Eye,
  Briefcase,
  Building2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HubItem {
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
  roles: ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[];
  badge?: string;
}

export default function ConsultoriaHub() {
  const navigate = useNavigate();
  const { isSuperAdmin, isHeadCS, isEPConsultant, isEPPartner, isEPTeam, loading: roleLoading } = useEPRole();
  const { allProjects, allConsultants, loading: headCSLoading } = useHeadCS();
  const { assignedProjects, loading: consultantLoading } = useConsultant();

  const loading = roleLoading || (isHeadCS || isSuperAdmin ? headCSLoading : consultantLoading);

  if (roleLoading) {
    return (
      <AppLayout title="Consultoria EP">
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isEPTeam) {
    return <Navigate to="/" replace />;
  }

  const getUserRoles = (): ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[] => {
    const roles: ('super_admin' | 'head_cs' | 'ep_consultant' | 'ep_partner')[] = [];
    if (isSuperAdmin) roles.push('super_admin');
    if (isHeadCS) roles.push('head_cs');
    if (isEPConsultant) roles.push('ep_consultant');
    if (isEPPartner) roles.push('ep_partner');
    return roles;
  };

  const userRoles = getUserRoles();
  const canSeeItem = (item: HubItem) => item.roles.some(role => userRoles.includes(role));

  // Calculate metrics
  const totalProjects = (isHeadCS || isSuperAdmin) ? allProjects.length : assignedProjects.length;
  const activeConsultants = allConsultants?.filter(c => c.active).length || 0;
  const projectsWithoutConsultant = allProjects?.filter(p => !p.consultants || p.consultants.length === 0).length || 0;
  const totalPendingActions = (isHeadCS || isSuperAdmin) 
    ? allProjects.reduce((sum, p) => sum + (p.pending_actions_count || 0), 0)
    : assignedProjects.reduce((sum, p) => sum + (p.pending_actions_count || 0), 0);

  const gestaoItems: HubItem[] = [
    { 
      title: "Dashboard Gestão", 
      description: "Visão consolidada de todos os projetos e consultores", 
      icon: LayoutDashboard, 
      url: "/consultoria/gestao", 
      roles: ['super_admin', 'head_cs'],
      badge: `${totalProjects} projetos`
    },
    { 
      title: "Meus Projetos", 
      description: "Projetos de consultoria atribuídos a você", 
      icon: FolderOpen, 
      url: "/consultoria/meus-projetos", 
      roles: ['super_admin', 'head_cs', 'ep_consultant'],
      badge: `${isEPConsultant ? assignedProjects.length : totalProjects} ativos`
    },
    { 
      title: "Equipe EP", 
      description: "Gestão de consultores e atribuições", 
      icon: Users, 
      url: "/consultoria/equipe", 
      roles: ['super_admin', 'head_cs', 'ep_partner'],
      badge: `${activeConsultants} ativos`
    },
  ];

  const operacoesItems: HubItem[] = [
    { 
      title: "Time Tracking", 
      description: "Controle de horas e alocação", 
      icon: Clock, 
      url: "/consultoria/time-tracking", 
      roles: ['super_admin', 'head_cs', 'ep_consultant'] 
    },
    { 
      title: "Playbooks", 
      description: "Templates e guias de execução de projetos", 
      icon: BookOpen, 
      url: "/consultoria/playbooks", 
      roles: ['super_admin', 'head_cs'] 
    },
    { 
      title: "Analytics", 
      description: "Performance e métricas do portfolio", 
      icon: BarChart3, 
      url: "/consultoria/analytics", 
      roles: ['super_admin', 'head_cs', 'ep_consultant'] 
    },
  ];

  const adminItems: HubItem[] = [
    { 
      title: "Convites Pendentes", 
      description: "Liberação em massa de convites de equipe", 
      icon: Mail, 
      url: "/consultoria/convites", 
      roles: ['super_admin', 'head_cs'] 
    },
    { 
      title: "Central de Suporte", 
      description: "Gestão de chamados e atendimento", 
      icon: Headphones, 
      url: "/consultoria/suporte", 
      roles: ['super_admin', 'head_cs'] 
    },
    { 
      title: "Monitoramento", 
      description: "Progresso e atividade de todos os clientes", 
      icon: Eye, 
      url: "/consultoria/monitoramento", 
      roles: ['super_admin'] 
    },
  ];

  const visibleGestao = gestaoItems.filter(canSeeItem);
  const visibleOperacoes = operacoesItems.filter(canSeeItem);
  const visibleAdmin = adminItems.filter(canSeeItem);

  return (
    <AppLayout 
      title="Consultoria EP"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Consultoria EP" }
      ]}
    >
      <div className="p-6 space-y-8">
        {/* Header */}
        <HubHeader
          title="Consultoria EP"
          description="Gerencie projetos, equipe e acompanhe o desempenho dos clientes"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Briefcase className="h-3 w-3" />
              {isHeadCS || isSuperAdmin ? 'Gestão' : 'Consultor'}
            </Badge>
          </div>
        </HubHeader>

        {/* Quick Stats */}
        {!loading && (isHeadCS || isSuperAdmin) && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projetos Ativos</CardDescription>
                <CardTitle className="text-2xl">{totalProjects}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  clientes em consultoria
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Consultores Ativos</CardDescription>
                <CardTitle className="text-2xl">{activeConsultants}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  de {allConsultants?.length || 0} cadastrados
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sem Consultor</CardDescription>
                <CardTitle className="text-2xl">{projectsWithoutConsultant}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  projetos não atribuídos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ações Pendentes</CardDescription>
                <CardTitle className="text-2xl">{totalPendingActions}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  em todos os projetos
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts */}
        {!loading && (isHeadCS || isSuperAdmin) && projectsWithoutConsultant > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-sm">
                  {projectsWithoutConsultant} projeto(s) sem consultor atribuído
                </p>
                <p className="text-xs text-muted-foreground">
                  Acesse "Equipe EP" para fazer as atribuições
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gestão Section */}
        {visibleGestao.length > 0 && (
          <HubSection title="Gestão de Projetos">
            {visibleGestao.map((item) => (
              <Card 
                key={item.url} 
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate(item.url)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-lg bg-primary/5">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                  </div>
                  <CardTitle className="text-base font-medium mt-3">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </HubSection>
        )}

        {/* Operações Section */}
        {visibleOperacoes.length > 0 && (
          <HubSection title="Operações">
            {visibleOperacoes.map((item) => (
              <Card 
                key={item.url} 
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate(item.url)}
              >
                <CardHeader className="pb-3">
                  <div className="p-2.5 rounded-lg bg-primary/5 w-fit">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-medium mt-3">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </HubSection>
        )}

        {/* Admin Section */}
        {visibleAdmin.length > 0 && (
          <HubSection title="Administração">
            {visibleAdmin.map((item) => (
              <Card 
                key={item.url} 
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate(item.url)}
              >
                <CardHeader className="pb-3">
                  <div className="p-2.5 rounded-lg bg-primary/5 w-fit">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-medium mt-3">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </HubSection>
        )}
      </div>
    </AppLayout>
  );
}
