// Perguntas rápidas contextuais por página
export const quickQuestionsByPage: Record<string, Array<{ id: string; label: string; question: string }>> = {
  // Criação de Cultura - Missão
  '/cultura/criacao?tab=missao': [
    { id: 'missao-1', label: 'Por onde começar?', question: 'Por onde devo começar a construir a missão da empresa?' },
    { id: 'missao-2', label: 'Diferença missão/visão', question: 'Qual a diferença entre missão e visão?' },
    { id: 'missao-3', label: 'Exemplos de missão', question: 'Pode me dar exemplos de boas missões empresariais?' },
    { id: 'missao-4', label: 'Como finalizar?', question: 'Como sei que minha missão está pronta?' },
  ],
  
  // Criação de Cultura - Visão
  '/cultura/criacao?tab=visao': [
    { id: 'visao-1', label: 'O que é visão?', question: 'O que é a visão de uma empresa e para que serve?' },
    { id: 'visao-2', label: 'Monte Everest', question: 'O que é o exercício do Monte Everest na construção da visão?' },
    { id: 'visao-3', label: 'Prazo da visão', question: 'Qual o prazo ideal para uma visão empresarial?' },
    { id: 'visao-4', label: 'Exemplos de visão', question: 'Pode me dar exemplos de boas visões de futuro?' },
  ],
  
  // Criação de Cultura - Valores
  '/cultura/criacao?tab=valores': [
    { id: 'valores-1', label: 'O que são valores?', question: 'O que são valores organizacionais e qual sua importância?' },
    { id: 'valores-2', label: 'Quantos valores?', question: 'Quantos valores devo definir para minha empresa?' },
    { id: 'valores-3', label: 'Comportamentos', question: 'O que são comportamentos observáveis e como defini-los?' },
    { id: 'valores-4', label: 'Exemplos de valores', question: 'Pode me dar exemplos de valores e seus comportamentos?' },
  ],
  
  // Criação de Cultura - Indicadores
  '/cultura/criacao?tab=indicadores': [
    { id: 'indicadores-1', label: 'O que são?', question: 'O que são indicadores estratégicos e para que servem?' },
    { id: 'indicadores-2', label: 'Como definir?', question: 'Como defino os indicadores certos para minha empresa?' },
    { id: 'indicadores-3', label: 'Metas SMART', question: 'O que são metas SMART e como aplicá-las aos indicadores?' },
  ],
  
  // Criação de Cultura - Projetos
  '/cultura/criacao?tab=projetos': [
    { id: 'projetos-1', label: 'Projetos estratégicos', question: 'O que são projetos estratégicos e como identificá-los?' },
    { id: 'projetos-2', label: 'Priorização', question: 'Como priorizar os projetos estratégicos?' },
    { id: 'projetos-3', label: 'Acompanhamento', question: 'Como acompanhar o progresso dos projetos?' },
  ],
  
  // Criação de Cultura - Energia
  '/cultura/criacao?tab=energia': [
    { id: 'energia-1', label: 'O que são rituais?', question: 'O que são rituais de energia e como funcionam?' },
    { id: 'energia-2', label: 'Quantos selecionar?', question: 'Quantos rituais de energia devo selecionar?' },
    { id: 'energia-3', label: 'Implementar rituais', question: 'Como implementar rituais de energia na rotina da equipe?' },
    { id: 'energia-4', label: 'Criar rituais', question: 'Posso criar meus próprios rituais de energia?' },
  ],
  
  // Criação de Cultura - Desenvolvimento
  '/cultura/criacao?tab=desenvolvimento': [
    { id: 'dev-1', label: 'Rituais de dev', question: 'O que são rituais de desenvolvimento e qual a diferença para energia?' },
    { id: 'dev-2', label: 'Como selecionar?', question: 'Como escolho os rituais de desenvolvimento certos?' },
    { id: 'dev-3', label: 'Frequência', question: 'Com que frequência devo realizar rituais de desenvolvimento?' },
  ],
  
  // Criação de Cultura - Decisão
  '/cultura/criacao?tab=decisao': [
    { id: 'decisao-1', label: 'Framework', question: 'O que é um framework de tomada de decisão?' },
    { id: 'decisao-2', label: 'Autonomia', question: 'Como definir níveis de autonomia para decisões?' },
    { id: 'decisao-3', label: 'Documentar', question: 'Por que documentar como a empresa toma decisões?' },
  ],
  
  // Culture Code
  '/cultura/criador-culture-code': [
    { id: 'cc-1', label: 'O que é?', question: 'O que é um Culture Code e para que serve?' },
    { id: 'cc-2', label: 'O que incluir?', question: 'O que devo incluir no Culture Code da empresa?' },
    { id: 'cc-3', label: 'Como usar?', question: 'Como usar o Culture Code no dia a dia?' },
    { id: 'cc-4', label: 'Compartilhar', question: 'Como compartilhar o Culture Code com a equipe?' },
  ],
  
  // Evento de Cultura
  '/cultura/evento-de-cultura': [
    { id: 'evento-1', label: 'O que é?', question: 'O que é um evento de cultura e qual seu propósito?' },
    { id: 'evento-2', label: 'Formato ideal', question: 'Qual o formato ideal para um evento de cultura?' },
    { id: 'evento-3', label: 'Quanto tempo?', question: 'Quanto tempo deve durar um evento de cultura?' },
    { id: 'evento-4', label: 'Quem participa?', question: 'Quem deve participar do evento de cultura?' },
  ],
  
  // Rituais de Cultura
  '/cultura/rituais-de-cultura': [
    { id: 'ritual-1', label: 'O que são?', question: 'O que são rituais de cultura?' },
    { id: 'ritual-2', label: 'Exemplos', question: 'Pode me dar exemplos de rituais de cultura eficazes?' },
    { id: 'ritual-3', label: 'Implementar', question: 'Como implementar rituais na rotina da empresa?' },
  ],
  
  // Pulse
  '/retencao/pulse': [
    { id: 'pulse-1', label: 'O que é Pulse?', question: 'O que é o Pulse e como funciona?' },
    { id: 'pulse-2', label: 'Como responder?', question: 'Como faço para responder a pesquisa diária do Pulse?' },
    { id: 'pulse-3', label: 'Streak', question: 'O que é o Streak e como ganho pontos?' },
    { id: 'pulse-4', label: 'É anônimo?', question: 'Minhas respostas no Pulse são anônimas?' },
  ],
  '/retencao/pulse/daily': [
    { id: 'daily-1', label: 'Como responder?', question: 'Como respondo a pesquisa diária?' },
    { id: 'daily-2', label: 'Streak', question: 'O que acontece se eu perder meu streak?' },
    { id: 'daily-3', label: 'Frequência', question: 'Com que frequência devo responder?' },
  ],
  '/retencao/pulse/dashboard': [
    { id: 'dash-1', label: 'Interpretar dados', question: 'Como interpreto os dados do dashboard?' },
    { id: 'dash-2', label: 'Drivers', question: 'O que são os drivers de engajamento?' },
    { id: 'dash-3', label: 'Plano de ação', question: 'Como criar um plano de ação baseado nos resultados?' },
  ],
  
  // DISC
  '/retencao/disc': [
    { id: 'disc-1', label: 'O que é DISC?', question: 'O que é o assessment DISC e para que serve?' },
    { id: 'disc-2', label: 'Como aplicar?', question: 'Como aplico o DISC na minha equipe?' },
    { id: 'disc-3', label: 'Perfis DISC', question: 'Quais são os 4 perfis DISC e suas características?' },
    { id: 'disc-4', label: 'Interpretar', question: 'Como interpreto os resultados do DISC?' },
  ],
  
  // Maturidade do Time
  '/retencao/maturidade-time': [
    { id: 'mat-1', label: 'O que é?', question: 'O que é a avaliação de maturidade do time?' },
    { id: 'mat-2', label: 'Como avaliar?', question: 'Como faço para avaliar a maturidade da minha equipe?' },
    { id: 'mat-3', label: 'Níveis', question: 'Quais são os níveis de maturidade de um time?' },
  ],
  
  // Habilidade Única
  '/retencao/habilidade-unica': [
    { id: 'hab-1', label: 'O que é?', question: 'O que é a habilidade única e como descobri-la?' },
    { id: 'hab-2', label: 'Como usar?', question: 'Como usar a habilidade única no desenvolvimento de pessoas?' },
    { id: 'hab-3', label: 'Para quem?', question: 'Para quem devo aplicar a análise de habilidade única?' },
  ],
  
  // Avaliação de Desempenho
  '/retencao/avaliacao-desempenho': [
    { id: 'desemp-1', label: 'Como funciona?', question: 'Como funciona a avaliação de desempenho na plataforma?' },
    { id: 'desemp-2', label: 'Frequência', question: 'Com que frequência devo fazer avaliações de desempenho?' },
    { id: 'desemp-3', label: 'Feedback', question: 'Como dar feedback construtivo baseado na avaliação?' },
  ],
  
  // Analisador de Pessoas
  '/retencao/analisador-pessoas': [
    { id: 'analise-1', label: 'O que é?', question: 'O que é o analisador de pessoas e como funciona?' },
    { id: 'analise-2', label: 'Critérios', question: 'Quais critérios usar para analisar pessoas?' },
    { id: 'analise-3', label: 'Decisões', question: 'Como usar a análise para tomar decisões sobre pessoas?' },
  ],
  
  // Funil de Contratação
  '/atracao-contratacao/funil-contratacao': [
    { id: 'funil-1', label: 'O que é?', question: 'O que é o funil de contratação?' },
    { id: 'funil-2', label: 'Etapas', question: 'Quais etapas devo incluir no meu funil?' },
    { id: 'funil-3', label: 'Customizar', question: 'Como customizo o funil para minha empresa?' },
  ],
  
  // Organograma
  '/atracao-contratacao/organograma': [
    { id: 'org-1', label: 'Como montar?', question: 'Como monto o organograma da empresa?' },
    { id: 'org-2', label: 'Arrastar pessoas', question: 'Como adiciono pessoas no organograma?' },
    { id: 'org-3', label: 'Hierarquia', question: 'Como defino a hierarquia no organograma?' },
  ],
  
  // Perguntas de Valores
  '/atracao-contratacao/perguntas-valores': [
    { id: 'perg-1', label: 'O que são?', question: 'O que são perguntas de valores para entrevistas?' },
    { id: 'perg-2', label: 'Como gerar?', question: 'Como gero perguntas baseadas nos meus valores?' },
    { id: 'perg-3', label: 'Usar na entrevista', question: 'Como usar essas perguntas durante a entrevista?' },
  ],
  
  // Vendendo a Empresa
  '/atracao-contratacao/atracao': [
    { id: 'vend-1', label: 'O que é?', question: 'O que significa "vender a empresa" para candidatos?' },
    { id: 'vend-2', label: 'EVP', question: 'O que é uma proposta de valor ao colaborador (EVP)?' },
    { id: 'vend-3', label: 'Conteúdo', question: 'Que tipo de conteúdo devo criar para atrair talentos?' },
  ],
  
  // ROIP
  '/app/assessment/roip': [
    { id: 'roip-1', label: 'O que é ROIP?', question: 'O que é ROIP (Retorno sobre Investimento em Pessoas)?' },
    { id: 'roip-2', label: 'Como calcular?', question: 'Como o ROIP é calculado?' },
    { id: 'roip-3', label: 'Resultados', question: 'Como interpreto os resultados do assessment ROIP?' },
  ],
  
  // Dashboard Principal
  '/': [
    { id: 'home-1', label: 'Por onde começar?', question: 'Por onde devo começar na plataforma?' },
    { id: 'home-2', label: 'Jornadas', question: 'O que são as jornadas e como funcionam?' },
    { id: 'home-3', label: 'Conquistas', question: 'Como ganho badges e pontos na plataforma?' },
    { id: 'home-4', label: 'Convidar equipe', question: 'Como convido membros da minha equipe?' },
  ],
  
  // Configurações
  '/settings': [
    { id: 'set-1', label: 'Convidar equipe', question: 'Como convido novos membros para a equipe?' },
    { id: 'set-2', label: 'Perfis', question: 'Quais são os diferentes perfis de acesso?' },
    { id: 'set-3', label: 'Notificações', question: 'Como configuro as notificações?' },
  ],
  '/settings/members': [
    { id: 'memb-1', label: 'Convidar', question: 'Como convido um novo membro?' },
    { id: 'memb-2', label: 'Permissões', question: 'Quais são as diferentes permissões de acesso?' },
    { id: 'memb-3', label: 'Remover', question: 'Como removo um membro da equipe?' },
  ],
  
  // ============ RECRUTAMENTO AI ============
  
  '/atracao-contratacao/recrutamento': [
    { id: 'rec-1', label: 'Por onde começar?', question: 'Por onde devo começar no módulo de Recrutamento AI?' },
    { id: 'rec-2', label: 'O que é ICP?', question: 'O que é ICP (Perfil de Candidato Ideal) e como uso?' },
    { id: 'rec-3', label: 'Hunting vs Outreach', question: 'Qual a diferença entre Hunting e Outreach?' },
    { id: 'rec-4', label: 'Agentes AI', question: 'Como funcionam os agentes de recrutamento AI?' },
  ],
  
  '/atracao-contratacao/recrutamento/vagas': [
    { id: 'vaga-1', label: 'O que é ICP?', question: 'O que é o ICP (Perfil de Candidato Ideal) e como a IA gera?' },
    { id: 'vaga-2', label: 'DISC ideal?', question: 'Como defino o perfil DISC ideal para uma vaga?' },
    { id: 'vaga-3', label: 'Publicar vaga', question: 'Como publico uma vaga na página de carreiras?' },
    { id: 'vaga-4', label: 'Threshold', question: 'O que é threshold de match e como configurar?' },
  ],
  
  '/atracao-contratacao/recrutamento/hunting': [
    { id: 'hunt-1', label: 'Como funciona?', question: 'Como funciona o Hunting AI de candidatos?' },
    { id: 'hunt-2', label: 'Match Score', question: 'O que significa o Match Score dos candidatos?' },
    { id: 'hunt-3', label: 'DISC inferido', question: 'Como a IA infere o DISC de um candidato pelos posts?' },
    { id: 'hunt-4', label: 'Importar candidatos', question: 'Como importo candidatos do Hunting para o funil?' },
  ],
  
  '/atracao-contratacao/recrutamento/outreach': [
    { id: 'out-1', label: 'Nova campanha', question: 'Como crio uma campanha de abordagem de candidatos?' },
    { id: 'out-2', label: 'WhatsApp', question: 'Como funciona o envio de mensagens via WhatsApp?' },
    { id: 'out-3', label: 'Personalização', question: 'A IA personaliza as mensagens automaticamente?' },
    { id: 'out-4', label: 'Métricas', question: 'Como acompanho as métricas de conversão do outreach?' },
  ],
  
  '/atracao-contratacao/recrutamento/agents': [
    { id: 'agent-1', label: 'O que são agentes?', question: 'O que são os agentes de recrutamento AI?' },
    { id: 'agent-2', label: 'Como configurar?', question: 'Como configuro um agente de recrutamento?' },
    { id: 'agent-3', label: 'Tipos de agentes', question: 'Quais tipos de agentes de recrutamento existem?' },
    { id: 'agent-4', label: 'Monitorar', question: 'Como monitoro as conversas dos agentes?' },
  ],
  
  '/atracao-contratacao/recrutamento/analytics': [
    { id: 'analytics-1', label: 'Métricas principais', question: 'Quais são as métricas principais de recrutamento?' },
    { id: 'analytics-2', label: 'TAT', question: 'O que é TAT (Time to Accept) e qual o benchmark?' },
    { id: 'analytics-3', label: 'Conversão', question: 'Como interpreto as taxas de conversão do funil?' },
    { id: 'analytics-4', label: 'Custo por contratação', question: 'Como calculo o custo por contratação?' },
  ],
  
  '/atracao-contratacao/recrutamento/talent-pool': [
    { id: 'pool-1', label: 'O que é?', question: 'O que é o Talent Pool e para que serve?' },
    { id: 'pool-2', label: 'Como usar?', question: 'Como uso o banco de talentos para novas vagas?' },
    { id: 'pool-3', label: 'Filtrar', question: 'Como filtro candidatos no Talent Pool?' },
  ],
  
  // ============ METODOLOGIA GENTIA ============
  
  '/diagnostico': [
    { id: 'diag-1', label: 'O que é ROIP?', question: 'O que é ROIP (Retorno sobre Investimento em Pessoas)?' },
    { id: 'diag-2', label: '4 Pilares', question: 'Quais são os 4 pilares do GENTIA?' },
    { id: 'diag-3', label: 'Custo turnover', question: 'Como calculo o custo de turnover da minha empresa?' },
    { id: 'diag-4', label: 'Próximos passos', question: 'O que fazer depois do diagnóstico?' },
  ],
};

// Função para obter perguntas contextuais baseadas na rota atual
export function getQuickQuestionsForPage(pathname: string, search: string): Array<{ id: string; label: string; question: string }> | null {
  const fullPath = `${pathname}${search}`;
  
  // Tentar match exato primeiro
  if (quickQuestionsByPage[fullPath]) {
    return quickQuestionsByPage[fullPath];
  }
  
  // Tentar só pathname
  if (quickQuestionsByPage[pathname]) {
    return quickQuestionsByPage[pathname];
  }
  
  // Tentar match por prefixo (mais longo primeiro)
  const matchingPath = Object.keys(quickQuestionsByPage)
    .filter(path => pathname.startsWith(path.split('?')[0]))
    .sort((a, b) => b.length - a.length)[0];
  
  if (matchingPath) {
    return quickQuestionsByPage[matchingPath];
  }
  
  return null;
}
