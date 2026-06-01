import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { Target, UserPlus, Network, Users } from "lucide-react";
import { HubProgressCard } from "@/components/gamification";
import { ToolCard, HubHeader, HubSection, type ToolStatus } from "@/components/hub";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";

const atracaoTools = [
  {
    title: "Atração",
    description: "Crie conteúdos e estratégias para atrair talentos alinhados com a cultura da sua empresa",
    icon: Target,
    url: "/atracao-contratacao/atracao",
    stepId: "vendendo_empresa",
    order: 1,
    category: "planejamento",
  },
  {
    title: "Contratação",
    description: "Configure seu processo seletivo com funil de contratação e perguntas baseadas em valores",
    icon: UserPlus,
    url: "/atracao-contratacao/contratacao",
    stepId: "perguntas_valores",
    order: 2,
    category: "planejamento",
  },
  {
    title: "Organograma",
    description: "Visualize e gerencie a estrutura organizacional da sua empresa",
    icon: Network,
    url: "/atracao-contratacao/contratacao/organograma",
    stepId: "organograma",
    order: 3,
    category: "dia_a_dia",
  },
  {
    title: "Recrutamento e Seleção",
    description: "Gerencie candidatos, vagas, entrevistas e processos seletivos",
    icon: Users,
    url: "/atracao-contratacao/recrutamento",
    stepId: "recrutamento_selecao",
    order: 4,
    category: "dia_a_dia",
  },
];

const AtracaoHub = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneyProgress();
  
  const atracaoJourney = journeys.find(j => j.id === 'atracao');

  const getStepStatus = (stepId: string): ToolStatus => {
    if (!atracaoJourney) return 'available';
    const step = atracaoJourney.steps.find(s => s.id === stepId);
    return (step?.status as ToolStatus) || 'available';
  };

  const planejamentoTools = atracaoTools.filter(t => t.category === "planejamento");
  const diaADiaTools = atracaoTools.filter(t => t.category === "dia_a_dia");

  return (
    <AppLayout 
      title="Atração e Contratação"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Atração e Contratação" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Atração e Contratação"
          description="Atraia e contrate pessoas alinhadas com a cultura da sua empresa"
        >
          <HubProgressCard journeyId="atracao" />
        </HubHeader>

        <HubSection title="Planejamento e Estratégia" columns={2}>
          {planejamentoTools.map((tool) => (
            <ToolCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              onClick={() => navigate(tool.url)}
              status={getStepStatus(tool.stepId)}
              category="primary"
            />
          ))}
        </HubSection>

        <HubSection title="Gestão do Dia a Dia" columns={2}>
          {diaADiaTools.map((tool) => (
            <ToolCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              onClick={() => navigate(tool.url)}
              status={getStepStatus(tool.stepId)}
              category="blue"
              isDailyUse
            />
          ))}
        </HubSection>
      </div>
    </AppLayout>
  );
};

export default AtracaoHub;
