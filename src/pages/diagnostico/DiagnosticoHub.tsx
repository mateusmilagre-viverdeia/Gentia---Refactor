import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { LineChart, Calculator, TrendingUp, ClipboardList } from "lucide-react";
import { HubProgressCard } from "@/components/gamification";
import { ToolCard, HubHeader, HubSection, type ToolStatus } from "@/components/hub";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

const diagnosticoTools = [
  {
    title: "Calculadora ROIP",
    description: "Calcule e projete o retorno financeiro dos investimentos em gestão de pessoas",
    icon: Calculator,
    url: "/diagnostico/calculadora-roip",
    stepId: "calculadora_roip",
    status: "available" as const,
    order: 1,
  },
  {
    title: "Assessment ROIP",
    description: "Avaliação completa do Retorno sobre Investimento em Pessoas da sua organização",
    icon: LineChart,
    url: "/app/assessment/roip",
    stepId: "assessment_roip",
    status: "requires_calculator" as const,
    order: 2,
  },
  {
    title: "Evolução ROIP",
    description: "Acompanhe a evolução dos diagnósticos ao longo do tempo com gráficos e análise de IA",
    icon: TrendingUp,
    url: "/roip/evolution",
    stepId: "evolucao_roip",
    status: "available" as const,
    order: 3,
  },
  {
    title: "Plano de Implementação",
    description: "Plano personalizado de implementação com IA baseado no seu diagnóstico e soluções contratadas",
    icon: ClipboardList,
    url: "/diagnostico/plano-implementacao",
    stepId: "plano_implementacao",
    status: "available" as const,
    order: 4,
  },
];

const DiagnosticoHub = () => {
  const navigate = useNavigate();
  const { currentAccount } = useOrganization();
  const { journeys } = useJourneyProgress();
  const [hasSimulation, setHasSimulation] = useState(false);
  const [checkingSimulation, setCheckingSimulation] = useState(true);
  
  const diagnosticoJourney = journeys.find(j => j.id === 'diagnostico');

  useEffect(() => {
    const checkSimulations = async () => {
      if (!currentAccount?.id) {
        setCheckingSimulation(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('roip_simulations')
          .select('id')
          .eq('account_id', currentAccount.id)
          .limit(1);

        setHasSimulation(data && data.length > 0);
      } catch (error) {
        console.error('Error checking simulations:', error);
      } finally {
        setCheckingSimulation(false);
      }
    };

    checkSimulations();
  }, [currentAccount?.id]);

  const getToolStatus = (stepId: string, toolStatus: string): ToolStatus => {
    if (toolStatus === 'coming_soon') return 'coming_soon';
    if (toolStatus === 'requires_calculator' && !hasSimulation) return 'locked';
    if (!diagnosticoJourney) return 'available';
    const step = diagnosticoJourney.steps.find(s => s.id === stepId);
    return (step?.status as ToolStatus) || 'available';
  };

  return (
    <AppLayout 
      title="Onboarding"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Onboarding" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Onboarding"
          description="Avalie e meça o estado atual da sua organização antes de iniciar a transformação cultural"
        >
          <HubProgressCard journeyId="diagnostico" />
        </HubHeader>

        <HubSection title="Ferramentas de Diagnóstico">
          {diagnosticoTools.map((tool) => (
            <ToolCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              onClick={() => navigate(tool.url)}
              status={getToolStatus(tool.stepId, tool.status)}
              category="primary"
              lockedMessage="Complete a Calculadora ROIP para desbloquear"
            />
          ))}
        </HubSection>
      </div>
    </AppLayout>
  );
};

export default DiagnosticoHub;
