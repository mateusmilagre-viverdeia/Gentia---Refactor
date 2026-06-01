import { Step } from "react-joyride";

export type TourRole = "employee" | "leader" | "admin";

// Steps para todos os usuários (colaboradores)
const employeeSteps: Step[] = [
  {
    target: '[data-tour="pulse-welcome"]',
    content: "Bem-vindo ao Pulse! Aqui você acompanha seu bem-estar e engajamento no trabalho através de perguntas diárias rápidas.",
    placement: "center",
    disableBeacon: true,
    title: "🎯 Pesquisa Pulse",
  },
  {
    target: '[data-tour="pulse-daily"]',
    content: "Responda perguntas diárias sobre seu bem-estar e engajamento. São perguntas rápidas com emojis que levam menos de 1 minuto!",
    placement: "bottom",
    title: "📊 Pulse Diário",
  },
  {
    target: '[data-tour="pulse-history"]',
    content: "Acompanhe sua evolução ao longo do tempo. Veja suas respostas anteriores e observe tendências no seu bem-estar.",
    placement: "bottom",
    title: "📈 Meu Histórico",
  },
  {
    target: '[data-tour="pulse-access-level"]',
    content: "Aqui você pode ver seu nível de acesso atual e quais funcionalidades estão disponíveis para você.",
    placement: "bottom",
    title: "🔑 Seu Acesso",
  },
];

// Steps adicionais para líderes
const leaderSteps: Step[] = [
  {
    target: '[data-tour="pulse-leader-dashboard"]',
    content: "Como líder, você tem acesso ao Dashboard da sua equipe. Acompanhe métricas, tendências e identifique oportunidades de melhoria.",
    placement: "bottom",
    title: "👥 Dashboard do Líder",
  },
  {
    target: '[data-tour="pulse-actions"]',
    content: "Crie e gerencie planos de ação baseados nos feedbacks da sua equipe. Transforme insights em melhorias concretas!",
    placement: "bottom",
    title: "📋 Planos de Ação",
  },
];

// Steps adicionais para admins
const adminSteps: Step[] = [
  {
    target: '[data-tour="pulse-dashboard-general"]',
    content: "Acesse a visão completa de métricas, tendências e alertas de toda a organização. Identifique padrões e áreas que precisam de atenção.",
    placement: "bottom",
    title: "📊 Dashboard Geral",
  },
  {
    target: '[data-tour="pulse-admin"]',
    content: "Configure perguntas, equipes, usuários e regras de gamificação. Personalize o Pulse para as necessidades da sua empresa.",
    placement: "bottom",
    title: "⚙️ Administração",
  },
];

// Step final
const conclusionStep: Step = {
  target: '[data-tour="pulse-welcome"]',
  content: "Você está pronto para começar! Lembre-se: responder diariamente ajuda você e sua equipe a construir um ambiente de trabalho melhor. 🚀",
  placement: "center",
  title: "🎉 Pronto para começar!",
};

export const getTourSteps = (role: TourRole): Step[] => {
  const steps: Step[] = [...employeeSteps];

  if (role === "leader" || role === "admin") {
    steps.push(...leaderSteps);
  }

  if (role === "admin") {
    steps.push(...adminSteps);
  }

  steps.push(conclusionStep);

  return steps;
};

export const getTotalSteps = (role: TourRole): number => {
  return getTourSteps(role).length;
};
