import { DISCDimension } from '@/types/disc.types';
import { DISCLeaderView } from './disc-profiles';

// =============================================
// Dados da Visão do Líder/RH por Perfil DISC
// =============================================

export const DISC_LEADER_DATA: Record<DISCDimension, DISCLeaderView> = {
  D: {
    executiveSummary: 
      'Profissional orientado a resultados com forte capacidade de tomada de decisão. ' +
      'Lidera naturalmente em situações de pressão e entrega com velocidade. ' +
      'Precisa de autonomia e desafios constantes para manter engajamento. ' +
      'Gerenciamento eficaz requer espaço para decidir e metas claras.',
    howToLead: [
      'Dê autonomia e espaço para tomar decisões',
      'Estabeleça metas claras, desafiadoras e mensuráveis',
      'Evite microgerenciamento - confie na execução',
      'Reconheça resultados alcançados de forma direta',
      'Ofereça desafios progressivos para manter engajamento',
      'Seja direto no feedback - evite rodeios'
    ],
    howToCommunicate: [
      'Vá direto ao ponto - seja objetivo e conciso',
      'Apresente opções e recomendações, não apenas problemas',
      'Use dados e fatos para fundamentar argumentos',
      'Respeite o tempo - reuniões curtas e focadas',
      'Foque em resultados e impactos esperados',
      'Evite detalhes excessivos desnecessários'
    ],
    teamContribution: [
      'Acelera entregas e cria senso de urgência produtivo',
      'Assume riscos calculados que outros evitam',
      'Toma decisões difíceis rapidamente',
      'Eleva o padrão de performance do time',
      'Mantém foco em resultados sob pressão',
      'Assume responsabilidades de liderança naturalmente'
    ],
    teamRisks: [
      'Pode atropelar processos para acelerar resultados',
      'Pode gerar conflitos com perfis mais colaborativos (S/I)',
      'Risco de decisões precipitadas sem análise suficiente',
      'Pode intimidar colegas mais reservados',
      'Tendência a centralizar decisões importantes',
      'Pode desmotivar-se com rotina e tarefas repetitivas'
    ],
    bestAllocation: [
      'Projetos de turnaround que exigem decisão rápida',
      'Liderança de times com metas agressivas',
      'Situações de crise que precisam de direcionamento',
      'Áreas com alto grau de autonomia e accountability',
      'Negociações importantes e fechamento de deals',
      'Projetos novos que precisam sair do zero'
    ],
    developmentRecommendations: [
      'Coaching focado em escuta ativa e empatia',
      'Feedback 360 sobre impacto nos diferentes perfis do time',
      'Mentoria com líderes de perfil S ou C para desenvolver paciência',
      'Projetos colaborativos que exijam consenso',
      'Treinamento em delegação efetiva e empowerment',
      'Sessões de reflexão sobre processo vs resultado'
    ]
  },
  I: {
    executiveSummary: 
      'Profissional com alta capacidade de engajamento e comunicação. ' +
      'Constrói relacionamentos com facilidade e motiva equipes com energia positiva. ' +
      'Precisa de variedade, reconhecimento e liberdade criativa. ' +
      'Gerenciamento eficaz requer estrutura suave e celebração de conquistas.',
    howToLead: [
      'Dê visibilidade e reconhecimento público às conquistas',
      'Ofereça variedade de projetos e atividades',
      'Permita liberdade criativa dentro de limites claros',
      'Crie oportunidades de interação e colaboração',
      'Evite rotinas rígidas e excesso de regras',
      'Use um tom amigável e entusiasmado'
    ],
    howToCommunicate: [
      'Comece com conexão pessoal antes do business',
      'Use um tom amigável e entusiasmado',
      'Conte histórias e use exemplos visuais',
      'Deixe espaço para diálogo e troca de ideias',
      'Valorize as sugestões mesmo que precise redirecionar',
      'Evite tom frio ou excessivamente formal'
    ],
    teamContribution: [
      'Cria ambiente positivo e motivador',
      'Facilita networking e conexões internas/externas',
      'Traz criatividade e pensamento inovador',
      'Engaja stakeholders e promove iniciativas',
      'Resolve conflitos com diplomacia',
      'Mantém o moral do time em momentos difíceis'
    ],
    teamRisks: [
      'Pode comprometer-se demais e não entregar tudo',
      'Dificuldade em manter foco em tarefas detalhadas',
      'Tendência a evitar conflitos necessários',
      'Pode dispersar energia com muitos projetos simultâneos',
      'Decisões às vezes baseadas mais em emoção que análise',
      'Pode frustrar-se com rotina e processos repetitivos'
    ],
    bestAllocation: [
      'Funções de relacionamento e atendimento ao cliente',
      'Liderança de projetos colaborativos',
      'Apresentações e representação institucional',
      'Onboarding e integração de novos membros',
      'Projetos de inovação e brainstorming',
      'Gestão de stakeholders e parcerias'
    ],
    developmentRecommendations: [
      'Coaching em gestão do tempo e priorização',
      'Ferramentas de acompanhamento de compromissos assumidos',
      'Treinamento em feedback construtivo e conflitos produtivos',
      'Pareamento com perfil C para equilibrar criatividade com análise',
      'Projetos com entregas bem definidas e prazos claros',
      'Desenvolvimento de foco em deep work'
    ]
  },
  S: {
    executiveSummary: 
      'Profissional confiável com excelente capacidade de suporte e colaboração. ' +
      'Mantém estabilidade do time e constrói relacionamentos duradouros. ' +
      'Precisa de previsibilidade, tempo para adaptação e reconhecimento de lealdade. ' +
      'Gerenciamento eficaz requer comunicação antecipada de mudanças.',
    howToLead: [
      'Comunique mudanças com antecedência e contexto',
      'Dê tempo adequado para adaptação a novos processos',
      'Reconheça consistência e lealdade regularmente',
      'Ofereça ambiente estável e previsível quando possível',
      'Peça opinião em particular, não em grupos grandes',
      'Evite pressão por decisões imediatas'
    ],
    howToCommunicate: [
      'Use um tom calmo e acolhedor',
      'Explique o porquê das mudanças e decisões',
      'Dê tempo para processar informações importantes',
      'Seja sincero e demonstre interesse genuíno',
      'Evite tom agressivo ou confrontativo',
      'Reconheça contribuições silenciosas e consistentes'
    ],
    teamContribution: [
      'Mantém estabilidade e harmonia do time',
      'Oferece suporte genuíno aos colegas',
      'Executa processos com consistência e confiabilidade',
      'Media conflitos com calma e imparcialidade',
      'Preserva conhecimento institucional e histórico',
      'Cria ambiente seguro para vulnerabilidade'
    ],
    teamRisks: [
      'Pode resistir a mudanças necessárias',
      'Dificuldade em dizer não e estabelecer limites',
      'Pode evitar confrontos necessários para o time',
      'Ritmo mais lento em situações de urgência',
      'Tendência a sacrificar necessidades próprias',
      'Pode não expressar discordâncias importantes'
    ],
    bestAllocation: [
      'Funções que exigem consistência e confiabilidade',
      'Suporte a clientes e atendimento contínuo',
      'Processos operacionais e administrativos',
      'Onboarding e mentoria de novos colaboradores',
      'Gestão de projetos de longo prazo',
      'Áreas que exigem memória institucional'
    ],
    developmentRecommendations: [
      'Coaching em assertividade e estabelecimento de limites',
      'Exposição gradual a pequenas mudanças controladas',
      'Treinamento em tomada de decisão sob pressão',
      'Pareamento com perfil D para desenvolver velocidade',
      'Projetos que exijam posicionamento e liderança',
      'Feedback sobre quando dizer não seria apropriado'
    ]
  },
  C: {
    executiveSummary: 
      'Profissional com alta capacidade analítica e comprometimento com qualidade. ' +
      'Entrega trabalho preciso e fundamentado em dados. ' +
      'Precisa de informações completas, tempo para análise e autonomia técnica. ' +
      'Gerenciamento eficaz requer respeito por seu rigor e prazos realistas.',
    howToLead: [
      'Forneça informações completas e dados relevantes',
      'Dê tempo adequado para análise antes de decisões',
      'Respeite a necessidade de precisão e qualidade',
      'Evite mudanças frequentes de direção sem justificativa',
      'Reconheça expertise técnica de forma específica',
      'Ofereça prazos realistas para entregas de qualidade'
    ],
    howToCommunicate: [
      'Seja preciso e traga dados para fundamentar',
      'Use lógica e evidências em argumentos',
      'Respeite a necessidade de detalhes técnicos',
      'Evite generalizações sem base em dados',
      'Dê tempo para processar antes de esperar resposta',
      'Valorize questionamentos como contribuição'
    ],
    teamContribution: [
      'Eleva o padrão de qualidade do time',
      'Identifica riscos e problemas antecipadamente',
      'Traz profundidade técnica e expertise',
      'Documenta processos e decisões',
      'Garante precisão em entregas críticas',
      'Questiona para melhorar soluções'
    ],
    teamRisks: [
      'Análise paralisante em decisões importantes',
      'Perfeccionismo pode atrasar entregas',
      'Pode ser excessivamente crítico com colegas',
      'Dificuldade em decidir sem informação completa',
      'Resistência a improvisar quando necessário',
      'Pode frustrar perfis mais ágeis (D/I)'
    ],
    bestAllocation: [
      'Funções que exigem precisão e análise',
      'Controle de qualidade e auditoria',
      'Planejamento estratégico e análise de dados',
      'Desenvolvimento técnico especializado',
      'Documentação e padronização de processos',
      'Projetos que exigem profundidade técnica'
    ],
    developmentRecommendations: [
      'Coaching para definir critérios de "bom o suficiente"',
      'Treinamento em tomada de decisão com informação incompleta',
      'Pareamento com perfil I para desenvolver flexibilidade',
      'Projetos com ciclos curtos e entregas incrementais',
      'Exposição a ambientes ágeis e iterativos',
      'Desenvolvimento de tolerância a imperfeição'
    ]
  }
};

// =============================================
// Função para Obter Visão do Líder Combinada
// =============================================

export function getLeaderView(
  primaryProfile: DISCDimension,
  secondaryProfile: DISCDimension | null
): DISCLeaderView {
  const primary = DISC_LEADER_DATA[primaryProfile];
  
  if (!secondaryProfile) {
    return primary;
  }
  
  const secondary = DISC_LEADER_DATA[secondaryProfile];
  
  // Combina dados primário e secundário
  return {
    executiveSummary: primary.executiveSummary,
    howToLead: [
      ...primary.howToLead.slice(0, 4),
      ...secondary.howToLead.slice(0, 2)
    ],
    howToCommunicate: [
      ...primary.howToCommunicate.slice(0, 4),
      ...secondary.howToCommunicate.slice(0, 2)
    ],
    teamContribution: [
      ...primary.teamContribution.slice(0, 4),
      ...secondary.teamContribution.slice(0, 2)
    ],
    teamRisks: [
      ...primary.teamRisks.slice(0, 4),
      ...secondary.teamRisks.slice(0, 2)
    ],
    bestAllocation: [
      ...primary.bestAllocation.slice(0, 4),
      ...secondary.bestAllocation.slice(0, 2)
    ],
    developmentRecommendations: [
      ...primary.developmentRecommendations.slice(0, 4),
      ...secondary.developmentRecommendations.slice(0, 2)
    ]
  };
}
