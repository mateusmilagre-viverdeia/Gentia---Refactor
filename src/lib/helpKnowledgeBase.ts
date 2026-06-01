// Quick questions for the help chat (fallback when no page-specific questions)
export const quickQuestions = [
  {
    id: 'what-is-pulse',
    label: 'O que é o Pulse?',
    question: 'O que é o Pulse e como funciona?'
  },
  {
    id: 'how-to-answer',
    label: 'Como respondo a pesquisa?',
    question: 'Como faço para responder a pesquisa diária do Pulse?'
  },
  {
    id: 'what-is-streak',
    label: 'O que é Streak?',
    question: 'O que é o Streak e como ganho pontos?'
  },
  {
    id: 'is-anonymous',
    label: 'É anônimo?',
    question: 'Minhas respostas no Pulse são anônimas?'
  },
  {
    id: 'culture-start',
    label: 'Por onde começar?',
    question: 'Por onde devo começar a construir a cultura da empresa?'
  },
  {
    id: 'invite-team',
    label: 'Convidar equipe',
    question: 'Como convido membros da minha equipe para a plataforma?'
  }
];

// Complete page context mapping for better AI responses
export const pageContextMap: Record<string, string> = {
  // Dashboard
  '/': 'Dashboard Principal - Visão geral e próximos passos',
  '/dashboard': 'Dashboard Principal - Visão geral e próximos passos',
  
  // Diagnóstico
  '/diagnostico': 'Diagnóstico Empresarial - Avaliação inicial',
  '/app/assessment/roip': 'Assessment ROIP - Avaliação de Retorno sobre Investimento em Pessoas',
  '/app/assessment/roip/instructions': 'Instruções do Assessment ROIP',
  '/app/assessment/roip/questionnaire': 'Questionário do Assessment ROIP',
  '/app/assessment/roip/results': 'Resultados do Assessment ROIP',
  
  // Cultura - Criação
  '/cultura/criacao': 'Criação de Cultura - Construa os pilares culturais',
  '/cultura/criacao?tab=missao': 'Construtor de Missão - Defina o propósito da empresa',
  '/cultura/criacao?tab=visao': 'Construtor de Visão - Defina o futuro desejado',
  '/cultura/criacao?tab=valores': 'Construtor de Valores - Defina as crenças fundamentais',
  '/cultura/criacao?tab=indicadores': 'Indicadores Estratégicos - Defina métricas de sucesso',
  '/cultura/criacao?tab=projetos': 'Projetos Estratégicos - Planeje iniciativas-chave',
  '/cultura/criacao?tab=energia': 'Rituais de Energia - Configure rituais diários',
  '/cultura/criacao?tab=desenvolvimento': 'Rituais de Desenvolvimento - Configure rituais de crescimento',
  '/cultura/criacao?tab=decisao': 'Framework de Decisão - Como a empresa decide',
  '/cultura/criacao?tab=resumo': 'Resumo da Cultura - Visão consolidada',
  
  // Cultura - Legado (rotas antigas)
  '/cultura/visao': 'Construtor de Visão (legado)',
  '/cultura/missao': 'Construtor de Missão (legado)',
  '/cultura/valores': 'Construtor de Valores (legado)',
  '/cultura/comportamentos': 'Definir Comportamentos Observáveis (legado)',
  '/cultura/criacao-de-cultura': 'Criação de Cultura (legado)',
  
  // Cultura - Rituais e Eventos
  '/cultura/rituais-de-cultura': 'Rituais de Cultura - Práticas recorrentes',
  '/cultura/evento-de-cultura': 'Evento de Cultura - Planejamento de eventos',
  '/cultura/criador-culture-code': 'Criador de Culture Code - Documento visual da cultura',
  '/cultura/culture-code': 'Culture Code - Documento Cultural',
  
  // Atração e Contratação
  '/atracao': 'Hub de Atração - Recrute pessoas alinhadas',
  '/atracao-contratacao': 'Hub de Atração e Contratação',
  '/atracao-contratacao/atracao': 'Vendendo a Empresa - Atraia talentos',
  '/atracao-contratacao/funil-contratacao': 'Funil de Contratação - Gerencie o processo seletivo',
  '/atracao-contratacao/organograma': 'Organograma - Estrutura da empresa',
  '/atracao-contratacao/vagas': 'Vagas - Publique oportunidades',
  '/atracao-contratacao/job-description': 'Gerador de Job Description com IA',
  '/atracao-contratacao/perguntas-valores': 'Perguntas de Valores para Entrevistas',
  '/atracao-contratacao/candidatos': 'Gestão de Candidatos',
  
  // Retenção - Pulse
  '/retencao/pulse': 'Hub do Pulse - Central de ferramentas de engajamento',
  '/retencao/pulse/daily': 'Pulse Diário - Responder pesquisa de hoje',
  '/retencao/pulse/historico': 'Histórico do Pulse - Visualizar respostas passadas',
  '/retencao/pulse/dashboard': 'Dashboard do Líder - Métricas da equipe',
  '/retencao/pulse/admin': 'Administração do Pulse - Configurações gerais',
  '/retencao/pulse/admin/drivers': 'Gerenciar Drivers de Engajamento',
  '/retencao/pulse/admin/pillars': 'Gerenciar Pilares',
  '/retencao/pulse/admin/questions': 'Gerenciar Perguntas',
  
  // Retenção - Outros módulos
  '/retencao': 'Hub de Retenção - Engaje e desenvolva pessoas',
  '/retencao/disc': 'Assessment DISC - Perfil comportamental',
  '/retencao/qa': 'Assessment Q&A - Fit cultural',
  '/retencao/maturidade-time': 'Maturidade do Time - Avaliação de desenvolvimento',
  '/retencao/habilidade-unica': 'Habilidade Única - Descoberta de talentos',
  '/retencao/avaliacao-desempenho': 'Avaliação de Desempenho',
  '/retencao/analisador-pessoas': 'Analisador de Pessoas - Análise baseada em valores',
  '/retencao/onboarding': 'Onboarding - Integração de novos colaboradores',
  '/retencao/questionarios': 'Questionários - Pesquisas de engajamento',
  '/retencao/colaboradores': 'Gestão de Colaboradores',
  '/retencao/evolucao': 'Evolução - Desenvolvimento contínuo',
  
  // Jornadas e Gamificação
  '/jornadas': 'Jornadas - Trilhas de implementação guiadas',
  '/conquistas': 'Conquistas - Badges e gamificação',
  
  // Configurações
  '/settings': 'Configurações',
  '/settings/organization': 'Configurações da Organização',
  '/settings/members': 'Gerenciar Equipe - Convites e permissões',
  '/settings/profile': 'Meu Perfil - Dados pessoais',
  '/settings/notifications': 'Notificações - Configurar alertas',
  '/settings/security': 'Segurança - Senha e autenticação',
  '/settings/billing': 'Faturamento - Planos e pagamentos',
  
  // Recrutamento AI
  '/atracao-contratacao/recrutamento': 'Hub de Recrutamento AI - Central de ferramentas de atração',
  '/atracao-contratacao/recrutamento/vagas': 'Gestão de Vagas com ICP - Perfil de Candidato Ideal',
  '/atracao-contratacao/recrutamento/hunting': 'Hunting AI - Busca automatizada de candidatos',
  '/atracao-contratacao/recrutamento/outreach': 'Outreach - Campanhas de abordagem WhatsApp/Email',
  '/atracao-contratacao/recrutamento/hunting-outreach': 'Hunting Outreach - Campanhas integradas',
  '/atracao-contratacao/recrutamento/agents': 'Agentes de Recrutamento AI - Assistentes virtuais',
  '/atracao-contratacao/recrutamento/analytics': 'Analytics de Recrutamento - Métricas e dashboards',
  '/atracao-contratacao/recrutamento/talent-pool': 'Talent Pool - Banco de talentos',
  '/atracao-contratacao/recrutamento/interviews': 'Entrevistas e Avaliações AI',
  '/atracao-contratacao/recrutamento/settings': 'Configurações de Recrutamento AI',
  '/atracao-contratacao/recrutamento/pipeline': 'Pipeline de Candidatos - Visão Kanban',
  '/atracao-contratacao/recrutamento/candidates': 'Lista de Candidatos - Gestão centralizada',
  
  // Outros
  '/onboarding': 'Onboarding Inicial da Plataforma',
  '/convite': 'Aceitar Convite',
};

export function getPageContext(pathname: string, search?: string): string {
  const fullPath = search ? `${pathname}${search}` : pathname;
  
  // Try exact match with query params first
  if (pageContextMap[fullPath]) {
    return pageContextMap[fullPath];
  }
  
  // Try exact match without query params
  if (pageContextMap[pathname]) {
    return pageContextMap[pathname];
  }
  
  // Try prefix match (longest match first)
  const matchingPath = Object.keys(pageContextMap)
    .filter(path => pathname.startsWith(path.split('?')[0]))
    .sort((a, b) => b.length - a.length)[0];
  
  return matchingPath ? pageContextMap[matchingPath] : pathname;
}
