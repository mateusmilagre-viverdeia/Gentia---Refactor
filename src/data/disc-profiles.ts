// =============================================
// Textos Oficiais de Devolutiva DISC
// Estes são os textos base que a IA deve respeitar
// =============================================

import { DISCDimension } from '@/types/disc.types';

export interface DISCCommunicationStyle {
  howTheyPrefer: string[];
  whatToAvoid: string[];
  tips: string[];
}

export interface DISCLeaderView {
  executiveSummary: string;
  howToLead: string[];
  howToCommunicate: string[];
  teamContribution: string[];
  teamRisks: string[];
  bestAllocation: string[];
  developmentRecommendations: string[];
}

export interface DISCProfileText {
  dimension: DISCDimension;
  name: string;
  title: string; // Ex: "Executor", "Engajador"
  behavior: string;
  strengths: string[];
  watchPoints: string[];
  motivators: string[];
  idealEnvironment: string[];
  communicationStyle: DISCCommunicationStyle;
  developmentTips: string[];
}

export interface DISCCombinedProfile {
  combinationType: string; // Ex: "D/C"
  primaryProfile: DISCDimension;
  secondaryProfile: DISCDimension | null;
  summary: string;
  behavior: string;
  strengths: string[];
  watchPoints: string[];
  motivators: string[];
  idealEnvironment: string[];
  communicationStyle: DISCCommunicationStyle;
  developmentTips: string[];
}

// =============================================
// Textos Base - Perfil D (Dominância / Executor)
// =============================================

export const DISC_PROFILE_D: DISCProfileText = {
  dimension: 'D',
  name: 'Dominância',
  title: 'Executor',
  behavior: 
    'Você age de forma direta e assertiva, focando em resultados rápidos e concretos. ' +
    'Assume riscos calculados com naturalidade e prefere liderar a seguir. ' +
    'Toma decisões com agilidade e não hesita em enfrentar desafios de frente. ' +
    'Sua comunicação é objetiva e orientada à ação.',
  strengths: [
    'Tomada de decisão rápida e assertiva',
    'Forte foco em resultados e metas',
    'Resiliência sob pressão e adversidades',
    'Visão estratégica de longo prazo',
    'Iniciativa para começar projetos',
    'Capacidade de assumir responsabilidades',
    'Determinação para superar obstáculos'
  ],
  watchPoints: [
    'Pode parecer impaciente ou insensível em certas situações',
    'Tendência a atropelar processos para acelerar resultados',
    'Dificuldade em delegar e confiar no ritmo dos outros',
    'Resistência a atividades que exigem atenção a detalhes',
    'Pode intimidar pessoas com perfis mais reservados',
    'Risco de decisões precipitadas sem análise suficiente'
  ],
  motivators: [
    'Desafios complexos e ambiciosos',
    'Autonomia para tomar decisões',
    'Conquistas tangíveis e reconhecíveis',
    'Reconhecimento por resultados alcançados',
    'Oportunidades de crescimento e avanço',
    'Competição saudável e meritocracia'
  ],
  idealEnvironment: [
    'Ambiente dinâmico e orientado a resultados',
    'Alto grau de autonomia e liberdade de ação',
    'Metas claras e desafiadoras',
    'Poucos controles burocráticos desnecessários',
    'Cultura que valoriza a performance',
    'Oportunidades de liderança e influência'
  ],
  communicationStyle: {
    howTheyPrefer: [
      'Seja direto e vá ao ponto',
      'Apresente opções, não problemas',
      'Respeite o tempo - seja conciso',
      'Foque em resultados e impactos'
    ],
    whatToAvoid: [
      'Rodeios e explicações longas',
      'Focar apenas em problemas sem soluções',
      'Microgerenciamento excessivo',
      'Falta de clareza nos objetivos'
    ],
    tips: [
      'Inicie com a conclusão ou recomendação',
      'Traga dados objetivos de suporte',
      'Dê autonomia para a execução',
      'Reconheça conquistas de forma direta'
    ]
  },
  developmentTips: [
    'Pratique a escuta ativa antes de decidir',
    'Reserve tempo para entender perspectivas diferentes',
    'Delegue mais e confie no processo dos outros',
    'Celebre as pequenas vitórias da equipe',
    'Desenvolva paciência em situações que exigem processo',
    'Busque feedback sobre como suas decisões impactam outros'
  ]
};

// =============================================
// Textos Base - Perfil I (Influência / Engajador)
// =============================================

export const DISC_PROFILE_I: DISCProfileText = {
  dimension: 'I',
  name: 'Influência',
  title: 'Engajador',
  behavior: 
    'Você se comunica com entusiasmo e naturalidade, construindo relacionamentos com facilidade. ' +
    'Influencia pelo carisma e pela capacidade de engajar pessoas em torno de ideias. ' +
    'Prefere ambientes colaborativos e valoriza a interação humana em tudo que faz. ' +
    'Sua energia positiva é contagiante e você inspira os outros com otimismo.',
  strengths: [
    'Comunicação persuasiva e envolvente',
    'Habilidade natural para networking',
    'Criatividade e pensamento inovador',
    'Capacidade de motivar e inspirar equipes',
    'Otimismo contagiante mesmo em dificuldades',
    'Facilidade em criar ambientes positivos',
    'Adaptabilidade em situações sociais'
  ],
  watchPoints: [
    'Pode ser disperso quando há muitos estímulos',
    'Dificuldade em manter rotinas e processos repetitivos',
    'Tendência a tomar decisões baseadas em emoção',
    'Pode evitar conflitos necessários',
    'Risco de comprometer-se demais e não entregar',
    'Dificuldade em manter foco em tarefas detalhadas'
  ],
  motivators: [
    'Reconhecimento social e visibilidade',
    'Novidades e projetos inovadores',
    'Interação humana frequente e significativa',
    'Liberdade criativa para propor soluções',
    'Celebrações e marcos de conquista',
    'Ambiente colaborativo e amigável'
  ],
  idealEnvironment: [
    'Ambiente social e colaborativo',
    'Variedade de atividades e projetos',
    'Pouca rotina e espaço para improviso',
    'Liberdade para expressar criatividade',
    'Reconhecimento público de contribuições',
    'Equipe diversa e comunicativa'
  ],
  communicationStyle: {
    howTheyPrefer: [
      'Use um tom amigável e entusiasmado',
      'Comece com uma conexão pessoal',
      'Seja visual e conte histórias',
      'Deixe espaço para diálogo e ideias'
    ],
    whatToAvoid: [
      'Tom frio ou excessivamente formal',
      'Ir direto ao ponto sem conexão prévia',
      'Limitar criatividade com muitas regras',
      'Críticas em público ou tom negativo'
    ],
    tips: [
      'Valorize as ideias mesmo que precise redirecionar',
      'Use exemplos e casos de sucesso',
      'Dê reconhecimento público quando possível',
      'Permita colaboração em vez de impor'
    ]
  },
  developmentTips: [
    'Crie sistemas para acompanhar compromissos assumidos',
    'Pratique dizer não para proteger sua energia',
    'Reserve momentos de foco sem interrupções',
    'Documente decisões importantes por escrito',
    'Desenvolva tolerância a conflitos necessários',
    'Equilibre entusiasmo com análise de viabilidade'
  ]
};

// =============================================
// Textos Base - Perfil S (Estabilidade / Colaborador)
// =============================================

export const DISC_PROFILE_S: DISCProfileText = {
  dimension: 'S',
  name: 'Estabilidade',
  title: 'Colaborador',
  behavior: 
    'Você busca harmonia e estabilidade em suas interações, apoiando genuinamente a equipe. ' +
    'Prefere processos conhecidos e trabalha de forma consistente e confiável. ' +
    'Sua lealdade é uma marca registrada, e você valoriza relacionamentos duradouros. ' +
    'Age como um pilar de suporte, ouvindo atentamente e mediando situações com calma.',
  strengths: [
    'Escuta ativa e empática',
    'Paciência excepcional com pessoas e processos',
    'Excelente trabalho em equipe',
    'Confiabilidade e consistência nas entregas',
    'Capacidade de mediar conflitos',
    'Lealdade e comprometimento de longo prazo',
    'Criação de ambientes harmoniosos'
  ],
  watchPoints: [
    'Resistência a mudanças bruscas ou inesperadas',
    'Dificuldade em dizer não e estabelecer limites',
    'Tendência a evitar confrontos necessários',
    'Ritmo mais lento em situações de urgência',
    'Pode sacrificar necessidades próprias pelos outros',
    'Dificuldade em expressar discordância'
  ],
  motivators: [
    'Segurança e previsibilidade no trabalho',
    'Reconhecimento de sua lealdade e dedicação',
    'Ambiente harmonioso e sem conflitos',
    'Tempo adequado para adaptação a mudanças',
    'Relacionamentos genuínos e duradouros',
    'Contribuição para o bem-estar da equipe'
  ],
  idealEnvironment: [
    'Ambiente previsível e estruturado',
    'Cultura colaborativa e de apoio mútuo',
    'Baixo nível de conflitos interpessoais',
    'Relacionamentos profissionais duradouros',
    'Ritmo de trabalho constante e sustentável',
    'Clareza sobre expectativas e processos'
  ],
  communicationStyle: {
    howTheyPrefer: [
      'Use um tom calmo e acolhedor',
      'Dê tempo para processar informações',
      'Seja sincero e demonstre interesse genuíno',
      'Explique o porquê das mudanças'
    ],
    whatToAvoid: [
      'Pressão por decisões imediatas',
      'Mudanças bruscas sem aviso prévio',
      'Tom agressivo ou confrontativo',
      'Ignorar suas contribuições silenciosas'
    ],
    tips: [
      'Comunique mudanças com antecedência',
      'Reconheça sua consistência e lealdade',
      'Peça opinião em particular, não em grupo',
      'Ofereça suporte durante transições'
    ]
  },
  developmentTips: [
    'Pratique expressar discordância de forma assertiva',
    'Estabeleça limites saudáveis para proteger seu tempo',
    'Experimente pequenas mudanças de rotina regularmente',
    'Peça feedback sobre quando dizer não seria apropriado',
    'Desenvolva conforto com ambiguidade temporária',
    'Celebre suas próprias necessidades além das do grupo'
  ]
};

// =============================================
// Textos Base - Perfil C (Conformidade / Analista)
// =============================================

export const DISC_PROFILE_C: DISCProfileText = {
  dimension: 'C',
  name: 'Conformidade',
  title: 'Analista',
  behavior: 
    'Você analisa cuidadosamente antes de agir, buscando precisão e qualidade em tudo. ' +
    'Segue padrões e processos com rigor, questionando para entender profundamente. ' +
    'Sua abordagem é metódica e baseada em dados e evidências. ' +
    'Prefere fundamentar decisões em análise sólida, evitando improvisos desnecessários.',
  strengths: [
    'Análise crítica e pensamento lógico',
    'Atenção excepcional a detalhes',
    'Comprometimento com qualidade',
    'Organização e sistematização de informações',
    'Pensamento estruturado e metodológico',
    'Capacidade de identificar riscos e falhas',
    'Expertise técnica profunda'
  ],
  watchPoints: [
    'Tendência ao perfeccionismo excessivo',
    'Análise paralisante (overthinking)',
    'Pode ser excessivamente crítico consigo e com outros',
    'Distanciamento emocional em certas situações',
    'Dificuldade em decidir sem informação completa',
    'Resistência a improvisar ou flexibilizar'
  ],
  motivators: [
    'Busca por qualidade e excelência técnica',
    'Oportunidades de desenvolver expertise',
    'Acesso a informações completas e precisas',
    'Tempo adequado para análise profunda',
    'Reconhecimento por competência técnica',
    'Ambientes que valorizam a precisão'
  ],
  idealEnvironment: [
    'Ambiente estruturado com padrões claros',
    'Acesso a dados e informações de qualidade',
    'Autonomia técnica para resolver problemas',
    'Espaço tranquilo para concentração',
    'Expectativas claras de qualidade',
    'Cultura que valoriza competência e expertise'
  ],
  communicationStyle: {
    howTheyPrefer: [
      'Seja preciso e traga dados',
      'Dê tempo para análise antes de decidir',
      'Use lógica e evidências',
      'Respeite a necessidade de detalhes'
    ],
    whatToAvoid: [
      'Generalizações sem base em dados',
      'Pressão por decisões sem informação',
      'Mudanças frequentes de direção',
      'Ignorar preocupações com qualidade'
    ],
    tips: [
      'Forneça contexto e dados antecipadamente',
      'Valorize suas análises e questionamentos',
      'Dê prazos realistas para entregas de qualidade',
      'Reconheça expertise de forma específica'
    ]
  },
  developmentTips: [
    'Defina critérios de "bom o suficiente" antes de começar',
    'Pratique tomar decisões com informação incompleta',
    'Busque conexões emocionais além das técnicas',
    'Aceite que imperfeição às vezes é aceitável',
    'Desenvolva tolerância a mudanças de última hora',
    'Equilibre análise com ação em tempo hábil'
  ]
};

// =============================================
// Mapa de Perfis para Acesso Rápido
// =============================================

export const DISC_PROFILES: Record<DISCDimension, DISCProfileText> = {
  D: DISC_PROFILE_D,
  I: DISC_PROFILE_I,
  S: DISC_PROFILE_S,
  C: DISC_PROFILE_C
};

// =============================================
// Textos de Combinação de Perfis
// =============================================

interface CombinationConfig {
  summary: string;
  behaviorAddition: string;
  synergies: string[];
  tensions: string[];
}

// Matriz de combinações: como o secundário modifica o primário
const COMBINATION_MATRIX: Record<string, CombinationConfig> = {
  // D como primário
  'D/I': {
    summary: 'Executor Comunicador',
    behaviorAddition: 'Combina a orientação a resultados com habilidade de engajar pessoas, liderando com carisma e determinação.',
    synergies: ['Liderança carismática', 'Persuasão orientada a resultados', 'Energia para mobilizar equipes'],
    tensions: ['Equilibrar velocidade com engajamento', 'Dosar assertividade com empatia']
  },
  'D/S': {
    summary: 'Executor Consistente',
    behaviorAddition: 'Une a busca por resultados com a capacidade de construir relações estáveis, liderando com firmeza e lealdade.',
    synergies: ['Liderança estável', 'Resultados sustentáveis', 'Confiança da equipe'],
    tensions: ['Equilibrar urgência com paciência', 'Mudança vs estabilidade']
  },
  'D/C': {
    summary: 'Executor Analítico',
    behaviorAddition: 'Combina a orientação a resultados com análise precisa, tomando decisões rápidas fundamentadas em dados.',
    synergies: ['Decisões rápidas e precisas', 'Resultados com qualidade', 'Estratégia fundamentada'],
    tensions: ['Equilibrar velocidade com análise', 'Ação vs perfeição']
  },
  
  // I como primário
  'I/D': {
    summary: 'Engajador Direcionado',
    behaviorAddition: 'Combina o carisma natural com foco em objetivos concretos, influenciando pessoas para alcançar metas.',
    synergies: ['Influência orientada a resultados', 'Energia produtiva', 'Comunicação assertiva'],
    tensions: ['Equilibrar relacionamento com entregas', 'Entusiasmo com objetividade']
  },
  'I/S': {
    summary: 'Engajador Acolhedor',
    behaviorAddition: 'Une entusiasmo com genuíno cuidado pelas pessoas, criando ambientes positivos e seguros.',
    synergies: ['Relacionamentos profundos', 'Ambiente motivador', 'Suporte emocional à equipe'],
    tensions: ['Equilibrar otimismo com realismo', 'Novidade com continuidade']
  },
  'I/C': {
    summary: 'Engajador Criterioso',
    behaviorAddition: 'Combina criatividade e comunicação com análise cuidadosa, propondo ideias inovadoras com fundamentação.',
    synergies: ['Ideias criativas e viáveis', 'Comunicação precisa', 'Inovação fundamentada'],
    tensions: ['Equilibrar espontaneidade com método', 'Entusiasmo com precisão']
  },
  
  // S como primário
  'S/D': {
    summary: 'Colaborador Determinado',
    behaviorAddition: 'Une estabilidade com capacidade de agir quando necessário, apoiando a equipe enquanto busca resultados.',
    synergies: ['Suporte assertivo', 'Estabilidade produtiva', 'Confiança com entrega'],
    tensions: ['Equilibrar paciência com urgência', 'Harmonia com confronto necessário']
  },
  'S/I': {
    summary: 'Colaborador Comunicativo',
    behaviorAddition: 'Combina lealdade e suporte com habilidade de conectar pessoas, criando redes de colaboração genuína.',
    synergies: ['Relacionamentos fortes', 'Comunicação empática', 'Ambiente acolhedor'],
    tensions: ['Equilibrar profundidade com variedade', 'Rotina com dinamismo']
  },
  'S/C': {
    summary: 'Colaborador Metódico',
    behaviorAddition: 'Une estabilidade com precisão, executando processos com consistência e qualidade impecável.',
    synergies: ['Processos confiáveis', 'Qualidade consistente', 'Suporte técnico'],
    tensions: ['Equilibrar flexibilidade com padrões', 'Pessoas com processos']
  },
  
  // C como primário
  'C/D': {
    summary: 'Analista Decisivo',
    behaviorAddition: 'Combina análise rigorosa com capacidade de agir, entregando soluções de qualidade com agilidade.',
    synergies: ['Decisões fundamentadas rápidas', 'Qualidade com produtividade', 'Análise orientada a resultados'],
    tensions: ['Equilibrar perfeição com pragmatismo', 'Análise com ação']
  },
  'C/I': {
    summary: 'Analista Comunicador',
    behaviorAddition: 'Une precisão técnica com habilidade de explicar complexidade, traduzindo dados em insights acessíveis.',
    synergies: ['Comunicação técnica clara', 'Análise criativa', 'Engajamento com dados'],
    tensions: ['Equilibrar detalhe com simplicidade', 'Precisão com flexibilidade']
  },
  'C/S': {
    summary: 'Analista Consistente',
    behaviorAddition: 'Combina rigor analítico com paciência e consistência, entregando qualidade de forma sustentável.',
    synergies: ['Qualidade sustentável', 'Processos robustos', 'Suporte técnico confiável'],
    tensions: ['Equilibrar velocidade com qualidade', 'Mudança com continuidade']
  }
};

// =============================================
// Função de Combinação de Perfis
// =============================================

export function getCombinedProfile(
  primaryProfile: DISCDimension,
  secondaryProfile: DISCDimension | null
): DISCCombinedProfile {
  const primary = DISC_PROFILES[primaryProfile];
  
  // Se não há secundário, retorna perfil puro
  if (!secondaryProfile) {
    return {
      combinationType: primaryProfile,
      primaryProfile,
      secondaryProfile: null,
      summary: `${primary.title} Puro`,
      behavior: primary.behavior,
      strengths: primary.strengths,
      watchPoints: primary.watchPoints,
      motivators: primary.motivators,
      idealEnvironment: primary.idealEnvironment,
      communicationStyle: primary.communicationStyle,
      developmentTips: primary.developmentTips
    };
  }
  
  const secondary = DISC_PROFILES[secondaryProfile];
  const combinationKey = `${primaryProfile}/${secondaryProfile}`;
  const config = COMBINATION_MATRIX[combinationKey];
  
  if (!config) {
    // Fallback se combinação não encontrada
    return {
      combinationType: combinationKey,
      primaryProfile,
      secondaryProfile,
      summary: `${primary.title} / ${secondary.title}`,
      behavior: primary.behavior,
      strengths: [...primary.strengths.slice(0, 4), ...secondary.strengths.slice(0, 3)],
      watchPoints: [...primary.watchPoints.slice(0, 3), ...secondary.watchPoints.slice(0, 3)],
      motivators: [...primary.motivators.slice(0, 3), ...secondary.motivators.slice(0, 3)],
      idealEnvironment: [...primary.idealEnvironment.slice(0, 3), ...secondary.idealEnvironment.slice(0, 3)],
      communicationStyle: {
        howTheyPrefer: [...primary.communicationStyle.howTheyPrefer.slice(0, 2), ...secondary.communicationStyle.howTheyPrefer.slice(0, 2)],
        whatToAvoid: [...primary.communicationStyle.whatToAvoid.slice(0, 2), ...secondary.communicationStyle.whatToAvoid.slice(0, 2)],
        tips: [...primary.communicationStyle.tips.slice(0, 2), ...secondary.communicationStyle.tips.slice(0, 2)]
      },
      developmentTips: [...primary.developmentTips.slice(0, 3), ...secondary.developmentTips.slice(0, 3)]
    };
  }
  
  // Combina behavior com adição específica
  const combinedBehavior = `${primary.behavior} ${config.behaviorAddition}`;
  
  // Combina forças: primárias + sinergias + algumas secundárias
  const combinedStrengths = [
    ...primary.strengths.slice(0, 4),
    ...config.synergies,
    ...secondary.strengths.slice(0, 2)
  ];
  
  // Combina pontos de atenção: primários + tensões + alguns secundários
  const combinedWatchPoints = [
    ...primary.watchPoints.slice(0, 3),
    ...config.tensions,
    ...secondary.watchPoints.slice(0, 2)
  ];
  
  // Combina motivadores
  const combinedMotivators = [
    ...primary.motivators.slice(0, 4),
    ...secondary.motivators.slice(0, 2)
  ];
  
  // Combina ambiente ideal
  const combinedEnvironment = [
    ...primary.idealEnvironment.slice(0, 4),
    ...secondary.idealEnvironment.slice(0, 2)
  ];

  // Combina estilo de comunicação
  const combinedCommunicationStyle: DISCCommunicationStyle = {
    howTheyPrefer: [
      ...primary.communicationStyle.howTheyPrefer.slice(0, 3),
      ...secondary.communicationStyle.howTheyPrefer.slice(0, 1)
    ],
    whatToAvoid: [
      ...primary.communicationStyle.whatToAvoid.slice(0, 3),
      ...secondary.communicationStyle.whatToAvoid.slice(0, 1)
    ],
    tips: [
      ...primary.communicationStyle.tips.slice(0, 3),
      ...secondary.communicationStyle.tips.slice(0, 1)
    ]
  };

  // Combina dicas de desenvolvimento
  const combinedDevelopmentTips = [
    ...primary.developmentTips.slice(0, 4),
    ...secondary.developmentTips.slice(0, 2)
  ];
  
  return {
    combinationType: combinationKey,
    primaryProfile,
    secondaryProfile,
    summary: config.summary,
    behavior: combinedBehavior,
    strengths: [...new Set(combinedStrengths)], // Remove duplicatas
    watchPoints: [...new Set(combinedWatchPoints)],
    motivators: [...new Set(combinedMotivators)],
    idealEnvironment: [...new Set(combinedEnvironment)],
    communicationStyle: combinedCommunicationStyle,
    developmentTips: [...new Set(combinedDevelopmentTips)]
  };
}

// =============================================
// Prompt Base para Integração com IA
// =============================================

export function generateAIPromptBase(combinedProfile: DISCCombinedProfile): string {
  return `
INSTRUÇÕES PARA EXPANSÃO DA DEVOLUTIVA DISC

REGRAS OBRIGATÓRIAS:
1. Use os textos base abaixo como fundamento inquestionável
2. Você pode EXPANDIR e PERSONALIZAR, mas NUNCA CONTRADIZER os textos oficiais
3. Mantenha linguagem humana, empática e corporativa
4. Foque em desenvolvimento e não em julgamento
5. Use exemplos práticos quando possível

PERFIL IDENTIFICADO: ${combinedProfile.combinationType}
RESUMO: ${combinedProfile.summary}

TEXTOS BASE OFICIAIS (NÃO CONTRADIZER):

COMO TENDE A AGIR:
${combinedProfile.behavior}

FORÇAS NATURAIS:
${combinedProfile.strengths.map(s => `• ${s}`).join('\n')}

PONTOS DE ATENÇÃO:
${combinedProfile.watchPoints.map(p => `• ${p}`).join('\n')}

O QUE MOTIVA:
${combinedProfile.motivators.map(m => `• ${m}`).join('\n')}

AMBIENTE IDEAL:
${combinedProfile.idealEnvironment.map(e => `• ${e}`).join('\n')}

COMO SE COMUNICAR:
O que funciona: ${combinedProfile.communicationStyle.howTheyPrefer.join(', ')}
O que evitar: ${combinedProfile.communicationStyle.whatToAvoid.join(', ')}
Dicas: ${combinedProfile.communicationStyle.tips.join(', ')}

DICAS DE DESENVOLVIMENTO:
${combinedProfile.developmentTips.map(d => `• ${d}`).join('\n')}

---
IMPORTANTE: Qualquer expansão deve respeitar e reforçar estes textos base, nunca contradizê-los.
`.trim();
}
