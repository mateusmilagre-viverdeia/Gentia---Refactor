import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { OnboardingMetricsCards } from "@/components/onboarding/OnboardingMetricsCards";
import { OnboardingProcessList } from "@/components/onboarding/OnboardingProcessList";
import { useOnboardingProcesses } from "@/hooks/useOnboardingProcesses";
import { useOrganization } from "@/contexts/OrganizationContext";
import { HubHeader } from "@/components/hub";

const OnboardingHub = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  
  const { 
    processes, 
    isLoading 
  } = useOnboardingProcesses(currentOrganization?.id);

  const activeProcesses = processes?.filter(
    p => p.status === 'active' || p.status === 'draft'
  ) || [];
  
  const completedProcesses = processes?.filter(
    p => p.status === 'completed'
  ) || [];

  return (
    <AppLayout 
      title="Onboarding"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Onboarding" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Onboarding"
          description="Gerencie processos de integração de novos colaboradores com acompanhamento completo"
        >
          <Button size="sm" onClick={() => navigate('/retencao/onboarding/novo')}>
            <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
            Novo Onboarding
          </Button>
        </HubHeader>

        <OnboardingMetricsCards 
          activeCount={activeProcesses.length}
          completedCount={completedProcesses.length}
          totalProcesses={processes?.length || 0}
          isLoading={isLoading}
        />

        <OnboardingProcessList 
          processes={activeProcesses}
          isLoading={isLoading}
          title="Processos Ativos"
          emptyMessage="Nenhum processo de onboarding ativo"
        />

        {completedProcesses.length > 0 && (
          <OnboardingProcessList 
            processes={completedProcesses}
            isLoading={isLoading}
            title="Concluídos Recentemente"
            emptyMessage="Nenhum processo concluído"
            showLimit={3}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default OnboardingHub;
