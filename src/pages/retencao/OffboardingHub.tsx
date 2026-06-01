import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useOffboardingCases } from "@/hooks/useOffboardingCases";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { HubHeader } from "@/components/hub";
import { 
  getOffboardingStatusLabel, 
  getOffboardingStatusColor,
  getTerminationTypeLabel,
  getTerminationTypeColor,
  calculateChecklistProgress,
  getSurveyStatusLabel,
  getSurveyStatusColor,
} from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";


const OffboardingHub = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { cases, isLoading } = useOffboardingCases(currentOrganization?.id);

  const activeCases = cases.filter(c => c.status === 'active' || c.status === 'draft');
  const completedCases = cases.filter(c => c.status === 'completed');

  return (
    <AppLayout 
      title="Offboarding"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Offboarding" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Offboarding"
          description="Gerencie processos de desligamento com checklist e pesquisa de saída"
        >
          <Button size="sm" onClick={() => navigate('/retencao/offboarding/novo')}>
            <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
            Novo Offboarding
          </Button>
        </HubHeader>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-[3px] border-l-amber-500/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.75} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <div className="text-2xl font-semibold">{activeCases.length}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-emerald-500/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.75} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <div className="text-2xl font-semibold">{completedCases.length}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-blue-500/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.75} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <div className="text-2xl font-semibold">{cases.length}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-[3px] border-l-destructive/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.75} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : (
                <div className="text-2xl font-semibold text-destructive">
                  {activeCases.reduce((acc, c) => {
                    const today = new Date().toISOString().split('T')[0];
                    return acc + (c.offboarding_tasks?.filter(t => 
                      t.status === 'pending' && t.due_date && t.due_date < today
                    ).length || 0);
                  }, 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Cases */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Processos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : activeCases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Nenhum processo de offboarding ativo
              </p>
            ) : (
              <div className="space-y-2">
                {activeCases.map(c => {
                  const progress = calculateChecklistProgress(c.offboarding_tasks || []);
                  return (
                    <div 
                      key={c.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/retencao/offboarding/${c.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c.employee_name}</span>
                          <Badge className={getTerminationTypeColor(c.termination_type)} variant="outline">
                            {getTerminationTypeLabel(c.termination_type)}
                          </Badge>
                          <Badge className={getOffboardingStatusColor(c.status)} variant="outline">
                            {getOffboardingStatusLabel(c.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {c.department && `${c.department} • `}
                          Último dia: {formatBRT(new Date(c.last_day), "dd 'de' MMM")}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-medium">{progress}% concluído</div>
                          <Badge className={getSurveyStatusColor(c.survey_status)} variant="outline">
                            Pesquisa: {getSurveyStatusLabel(c.survey_status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Cases */}
        {completedCases.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Concluídos Recentemente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedCases.slice(0, 5).map(c => (
                  <div 
                    key={c.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/retencao/offboarding/${c.id}`)}
                  >
                    <div>
                      <span className="font-medium text-sm">{c.employee_name}</span>
                      <div className="text-xs text-muted-foreground">
                        {c.department && `${c.department} • `}
                        {getTerminationTypeLabel(c.termination_type)}
                      </div>
                    </div>
                    <Badge className={getOffboardingStatusColor(c.status)} variant="outline">
                      {getOffboardingStatusLabel(c.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default OffboardingHub;
