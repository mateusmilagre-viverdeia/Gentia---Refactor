import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Calendar, Sparkles, Palette, BookOpen, FolderOpen } from "lucide-react";
import { HubProgressCard } from "@/components/gamification";
import { ToolCard, HubHeader, HubSection, type ToolStatus } from "@/components/hub";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";

const culturaTools = [
  {
    title: "Criação de Cultura",
    description: "Construa seu código de cultura através dos 8 pilares fundamentais: Valores, Energia, Desenvolvimento, Missão, Visão, Decisão, Indicadores e Projetos",
    icon: Lightbulb,
    url: "/cultura/criacao",
    stepId: "criacao_cultura",
    order: 1,
    category: "planejamento",
  },
  {
    title: "Evento de Cultura",
    description: "Planeje e organize eventos para fortalecer e disseminar a cultura organizacional da sua empresa",
    icon: Calendar,
    url: "/cultura/evento",
    stepId: "evento_cultura",
    order: 2,
    category: "planejamento",
  },
  {
    title: "Criador de Slides",
    description: "Gere apresentações profissionais do seu código de cultura para compartilhar com o time",
    icon: Palette,
    url: "/cultura/criador-culture-code",
    stepId: "culture_code",
    order: 3,
    category: "planejamento",
  },
  {
    title: "Biblioteca de Cultura",
    description: "Visualize e gerencie o PDF do código de cultura da sua empresa",
    icon: BookOpen,
    url: "/cultura/biblioteca",
    stepId: "biblioteca_cultura",
    order: 4,
    category: "planejamento",
  },
  {
    title: "Modelos de Código de Cultura",
    description: "Explore modelos de códigos de cultura de referência para benchmarking e inspiração",
    icon: FolderOpen,
    url: "/cultura/modelos",
    stepId: "modelos_cultura",
    order: 5,
    category: "planejamento",
  },
  {
    title: "Rituais de Cultura",
    description: "Defina os rituais e práticas diárias que reforçam os valores e comportamentos desejados",
    icon: Sparkles,
    url: "/cultura/rituais",
    stepId: "rituais_cultura",
    order: 6,
    category: "dia_a_dia",
  },
];

const CulturaHub = () => {
  const navigate = useNavigate();
  const { journeys } = useJourneyProgress();
  
  const culturaJourney = journeys.find(j => j.id === 'cultura');

  const getStepStatus = (stepId: string): ToolStatus => {
    if (!culturaJourney) return 'available';
    const step = culturaJourney.steps.find(s => s.id === stepId);
    return (step?.status as ToolStatus) || 'available';
  };

  const planejamentoTools = culturaTools.filter(t => t.category === "planejamento");
  const diaADiaTools = culturaTools.filter(t => t.category === "dia_a_dia");

  return (
    <AppLayout 
      title="Cultura Organizacional"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Cultura" }
      ]}
    >
      <div className="space-y-6">
        <HubHeader
          title="Cultura Organizacional"
          description="Construa, implemente e mantenha viva a cultura da sua empresa"
        >
          <HubProgressCard journeyId="cultura" />
        </HubHeader>

        <HubSection title="Planejamento e Criação">
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

        <HubSection title="Gestão do Dia a Dia">
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

export default CulturaHub;
