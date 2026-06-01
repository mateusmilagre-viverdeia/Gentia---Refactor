import { Navigate } from "react-router-dom";
import { Loader2, RefreshCw, ShieldAlert, BarChart3 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCards } from "@/components/admin/MetricCards";
import { CompanyProgressTable } from "@/components/admin/CompanyProgressTable";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, companies, loading, error, metrics, reload } = useAdminDashboard();

  if (authLoading || loading) {
    return (
      <AppLayout title="Monitoramento" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Monitoramento" }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Monitoramento" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Monitoramento" }]}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Esta página é exclusiva para administradores da plataforma.
              </p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Monitoramento" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Monitoramento" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Dashboard de Monitoramento
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o progresso de todas as empresas em tempo real
            </p>
          </div>
          <Button onClick={reload} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Metric Cards */}
        <MetricCards
          totalCompanies={metrics.totalCompanies}
          totalMembers={metrics.totalMembers}
          activeToday={metrics.activeToday}
          averageProgress={metrics.averageProgress}
        />

        {/* Progress Table */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso por Empresa</CardTitle>
            <CardDescription>
              Clique em uma empresa para ver detalhes completos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyProgressTable
              companies={companies}
              onViewDetails={(id) => console.log('View details:', id)}
            />
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
            <span>Em progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-muted-foreground" />
            <span>Não iniciado</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
