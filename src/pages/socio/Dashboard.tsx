import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEPRole } from "@/hooks/useEPRole";
import { useEPPartner } from "@/hooks/useEPPartner";
import { useEPPartnerProjects } from "@/hooks/useEPPartnerProjects";
import { useConsultantMetrics } from "@/hooks/useConsultantMetrics";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Wallet, 
  Building2, 
  Copy, 
  Check,
  ArrowRight,
  TrendingUp,
  FileBarChart,
  UsersRound,
  BarChart3,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SocioDashboard() {
  const navigate = useNavigate();
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { partner, stats, loading: partnerLoading, error } = useEPPartner();
  const { projects, consultants, loading: projectsLoading, getProjectConsultants } = useEPPartnerProjects();
  const { globalMetrics } = useConsultantMetrics(projects, consultants, getProjectConsultants);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isEPPartner && !isSuperAdmin) {
      navigate('/');
    }
  }, [roleLoading, isEPPartner, isSuperAdmin, navigate]);

  const handleCopyPromoCode = async () => {
    if (partner?.promo_code) {
      await navigator.clipboard.writeText(partner.promo_code);
      setCopied(true);
      toast.success("Código promocional copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Dashboard" }
  ];

  // Get unique consultants assigned to partner's projects
  const assignedConsultants = new Set<string>();
  projects.forEach(project => {
    const projectConsultants = getProjectConsultants(project.id);
    projectConsultants.forEach(c => assignedConsultants.add(c.id));
  });
  const consultantsCount = assignedConsultants.size;

  if (roleLoading || partnerLoading) {
    return (
      <AppLayout title="Dashboard" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (error || !partner) {
    return (
      <AppLayout title="Dashboard" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro</CardTitle>
              <CardDescription>
                {error || "Dados do parceiro não encontrados"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Olá, {partner.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e acompanhe seus royalties
            </p>
          </div>
          
          {/* Promo Code Card */}
          <Card className="w-full sm:w-auto">
            <CardContent className="p-4 flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Seu código promocional</p>
                <p className="text-lg font-mono font-bold">{partner.promo_code}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyPromoCode}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - First Row (Original) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas Disponíveis</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.usedSeats} / {stats.totalSeats}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.availableSeats} vagas livres
              </p>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.totalSeats > 0 ? (stats.usedSeats / stats.totalSeats) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-muted-foreground">
                Empresas atendidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Royalties do Mês</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.monthlyRoyalties.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Acumulado este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.pendingRoyalties.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <Badge variant="outline" className="mt-1">
                Pendente
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - Second Row (New Project Stats) */}
        {!projectsLoading && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalMetrics.avgCompletion}%</div>
                <Progress value={globalMetrics.avgCompletion} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  de todos os projetos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalMetrics.completedProjects}</div>
                <p className="text-xs text-muted-foreground">
                  de {globalMetrics.totalProjects} projetos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projetos em Risco</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${globalMetrics.atRiskProjects > 0 ? 'text-amber-600' : ''}`}>
                  {globalMetrics.atRiskProjects}
                </div>
                <p className="text-xs text-muted-foreground">
                  &lt;25% conclusão, &gt;30 dias
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultores Atribuídos</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{consultantsCount}</div>
                <p className="text-xs text-muted-foreground">
                  nos seus projetos
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/socio/clientes')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Meus Clientes
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Gerencie os acessos dos seus clientes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/30" onClick={() => navigate('/socio/projetos')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Progresso dos Projetos
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso de todos os projetos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/socio/royalties')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Royalties
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Histórico de royalties por cliente
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/socio/financeiro')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5" />
                  Financeiro
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Encontro de contas: royalties e comissões
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/socio/usuarios')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5" />
                  Equipe
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Gerenciar usuários da empresa
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
