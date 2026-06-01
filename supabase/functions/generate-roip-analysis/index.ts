import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  roip_assessment_id: z.string().uuid("roip_assessment_id deve ser um UUID válido")
});

// ============================================
// METODOLOGIA ROIP - BASE DE CONHECIMENTO COMPLETA
// Extraído do documento oficial "Método ROIP" da EP+
// ============================================
const ROIP_METHODOLOGY = {
  // FUNDAMENTOS TEÓRICOS
  fundamentos: {
    tese_central: "Pessoas são o maior centro de custo e a maior alavanca da empresa. O ROIP transforma 'gente' em lógica mensurável de lucro, usando LUCRO POR COLABORADOR como métrica-norte.",
    problema_resolvido: "Custo Invisível - vazamentos que não aparecem claramente no DRE: rotatividade, desengajamento e improdutividade que derrubam margem e previsibilidade.",
    principio: "Cultura deixa de ser abstrata e vira sistema de gestão + execução com tecnologia/IA. É o único método que conecta cultura diretamente ao lucro.",
    metrica_norte: "Lucro por Colaborador = (Receita Total - Custos Totais) / Número de Colaboradores"
  },

  // ESTRUTURA MACRO
  estrutura: {
    pilares: ["Cultura", "Atração", "Retenção", "Resultado"],
    fluxo_causal: "Cultura define padrão e decisão → Atração traz gente certa → Retenção sustenta performance e reduz perdas → Resultado converte em lucro por colaborador e eficiência",
    ciclos_execucao: "48h / 7d / 30d / 60d / 90d"
  },

  // MARCOS DE EXECUÇÃO
  marcos: {
    marco_0: {
      nome: "Diagnóstico ROIP",
      prazo: "até 48h",
      descricao: "Fotografia do estado atual + quantificação do custo invisível + priorização inicial",
      ferramentas: ["Assessment ROIP", "Calculadora ROIP"],
      entregaveis: ["Relatório de diagnóstico", "Mapa de prioridades", "Estimativa de perdas anuais"]
    },
    marco_1: {
      nome: "Plano 90 dias",
      prazo: "7 dias após Marco 0",
      descricao: "Roadmap estruturado com entregas em 30/60/90 dias",
      ferramentas: ["Planejamento estratégico", "Linha do tempo visual"],
      entregaveis: ["Roadmap 30/60/90", "Definição de papéis e responsáveis", "Metas e indicadores por fase", "Rituais e cadência de acompanhamento"]
    }
  },

  // FASES DO PROJETO
  fases: {
    fase_1: {
      nome: "Diagnóstico e Planejamento",
      prazo: "7-15 dias",
      objetivo: "Mapear estado atual e desenhar plano de ação",
      entregaveis: ["Assessment completo", "Plano 90 dias validado", "Quick wins identificados"]
    },
    fase_2: {
      nome: "Implementação e Execução",
      prazo: "90 dias por módulo",
      objetivo: "Executar as iniciativas priorizadas",
      entregaveis: ["Pilares implementados", "Ferramentas GENTIA configuradas", "Equipe treinada"]
    },
    fase_3: {
      nome: "Reavaliação e Iteração",
      prazo: "cada 30-60 dias",
      objetivo: "Medir resultados e ajustar rota",
      entregaveis: ["Novo Assessment ROIP", "Comparativo de evolução", "Ajustes no plano"]
    }
  },

  // DETALHAMENTO POR PILAR
  pilares_detalhados: {
    cultura: {
      definicao: "Define padrão e comportamento. É a fundação de tudo.",
      componentes_8_pilares: ["Missão", "Visão", "Valores", "DNA do Time", "Propósito", "Identidade", "Rituais", "Comunicação"],
      ordem_implementacao: "Missão → Visão → Valores → DNA → Propósito → Identidade → Rituais → Comunicação",
      prazo_planejamento: "15-35 dias",
      prazo_execucao: "60-180 dias (depende do tamanho da empresa)",
      entregaveis_planejamento: ["Código cultural completo (8 pilares)", "Design do evento de cultura", "Arquitetura de rituais", "Plano de cascateamento"],
      entregaveis_execucao: ["Evento de cultura realizado", "Rituais implantados", "Cascateamento para todas as áreas", "Líderes treinados no método"],
      impacto: "Base para todos os outros pilares. Cultura fraca = contratações erradas = turnover alto"
    },
    atracao: {
      definicao: "Traz as pessoas certas, alinhadas à cultura.",
      principio: "Culture First: contratar por cultura, treinar por técnica",
      prazo_planejamento: "15-30 dias",
      prazo_execucao: "7-30 dias por processo seletivo",
      entregaveis_planejamento: ["Scorecards por função", "Funil de seleção estruturado", "Roteiros de entrevista por valores", "Modelo de onboarding 7/14/30 dias"],
      entregaveis_execucao: ["Funil rodando", "Ciclos de seleção", "Ajustes de pipeline", "Feedback estruturado"],
      impacto: "Reduz custo de contratação errada em até 50%",
      prerequisito: "Cultura definida (pelo menos Valores)"
    },
    retencao: {
      definicao: "Sustenta performance e reduz perdas.",
      foco: "Desenvolvimento contínuo, engajamento e satisfação",
      prazo_planejamento: "30-60 dias",
      prazo_execucao: "7-30 dias por iniciativa, contínuo para pesquisas",
      entregaveis_planejamento: ["Mapa de retenção", "Cadência de liderança (1:1, feedback)", "Trilhas de desenvolvimento", "Termômetro de engajamento (Pulse)"],
      entregaveis_execucao: ["Cadências de liderança rodando", "PDIs em execução", "Pesquisas Pulse ativas", "Ações corretivas implementadas"],
      impacto: "Redução de turnover em até 53%, aumento de engajamento em 36%"
    },
    resultado: {
      definicao: "Converte em lucro por colaborador e eficiência.",
      sistema: "SOEP - Sistema Operacional Estratégico de Performance",
      componentes: ["Planejamento Estratégico", "Modelo de Gestão", "Gestão de Processos"],
      prazos: {
        planejamento_estrategico: "45-75 dias",
        modelo_gestao: "30-45 dias",
        gestao_processos: "45-75 dias"
      },
      prazo_execucao: "7-15 dias por macroetapa",
      impacto: "Aumento de produtividade em até 34%, aumento de lucro em até 26%"
    }
  },

  // RESULTADOS ESPERADOS (BENCHMARKS INTERNOS EP+)
  resultados_esperados: {
    reducao_rotatividade: "53%",
    aumento_engajamento: "36%",
    aumento_produtividade: "34%",
    aumento_lucro: "26%",
    payback_medio: "até 90 dias",
    fonte: "Média dos últimos 100 projetos EP+"
  },

  // FORMATOS DE ENTREGA DA CONSULTORIA
  formatos_entrega: {
    consultoria_quinzenal: {
      descricao: "Encontros 1:1 para implementar estratégia",
      frequencia: "Quinzenal",
      duracao: "1-2 horas por sessão"
    },
    implementation_day: {
      descricao: "Imersões mensais alternando Cultura e Atração",
      frequencia: "Mensal",
      duracao: "4-8 horas por dia"
    },
    imersao_presencial: {
      descricao: "2 dias em SP focado em Cultura e Visão Estratégica",
      frequencia: "Pontual (início do projeto)",
      duracao: "2 dias completos"
    },
    leader_program: {
      descricao: "Treinamento quinzenal de líderes no método ROIP",
      frequencia: "Quinzenal",
      duracao: "1-2 horas por sessão"
    }
  },

  // TECNOLOGIAS
  tecnologias: {
    gentia: {
      pilares: ["Cultura", "Atração", "Retenção"],
      descricao: "Software completo para gestão de pessoas com IA"
    },
    soep: {
      pilares: ["Resultado"],
      descricao: "Sistema Operacional Estratégico de Performance",
      url: "https://soep.eppartners.com.br"
    }
  }
};

// Converter metodologia para string para o prompt
const ROIP_METHODOLOGY_TEXT = `
## METODOLOGIA ROIP (Retorno sobre Investimento em Pessoas)

### TESE CENTRAL
${ROIP_METHODOLOGY.fundamentos.tese_central}

### PROBLEMA QUE O ROIP RESOLVE
${ROIP_METHODOLOGY.fundamentos.problema_resolvido}

### MÉTRICA-NORTE
${ROIP_METHODOLOGY.fundamentos.metrica_norte}

### OS 4 PILARES DO ROIP

1. **CULTURA** (Fundação)
   - ${ROIP_METHODOLOGY.pilares_detalhados.cultura.definicao}
   - 8 Pilares: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.componentes_8_pilares.join(', ')}
   - Ordem: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.ordem_implementacao}
   - Prazo Planejamento: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.prazo_planejamento}
   - Prazo Execução: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.prazo_execucao}
   - Impacto: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.impacto}

2. **ATRAÇÃO** (Entrada)
   - ${ROIP_METHODOLOGY.pilares_detalhados.atracao.definicao}
   - Princípio: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.principio}
   - Prazo Planejamento: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.prazo_planejamento}
   - Prazo Execução: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.prazo_execucao}
   - Impacto: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.impacto}
   - Pré-requisito: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.prerequisito}

3. **RETENÇÃO** (Manutenção)
   - ${ROIP_METHODOLOGY.pilares_detalhados.retencao.definicao}
   - Foco: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.foco}
   - Prazo Planejamento: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.prazo_planejamento}
   - Prazo Execução: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.prazo_execucao}
   - Impacto: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.impacto}

4. **RESULTADO** (Saída)
   - ${ROIP_METHODOLOGY.pilares_detalhados.resultado.definicao}
   - Sistema: ${ROIP_METHODOLOGY.pilares_detalhados.resultado.sistema}
   - Componentes: ${ROIP_METHODOLOGY.pilares_detalhados.resultado.componentes.join(', ')}
   - Impacto: ${ROIP_METHODOLOGY.pilares_detalhados.resultado.impacto}

### FLUXO CAUSAL DO ROIP
${ROIP_METHODOLOGY.estrutura.fluxo_causal}

- Cultura fraca = contratações erradas
- Contratações erradas = turnover alto
- Turnover alto = perda de produtividade
- Perda de produtividade = lucro comprometido

### MARCOS DE EXECUÇÃO
- **Marco 0** (${ROIP_METHODOLOGY.marcos.marco_0.prazo}): ${ROIP_METHODOLOGY.marcos.marco_0.nome}
  - ${ROIP_METHODOLOGY.marcos.marco_0.descricao}
  - Ferramentas: ${ROIP_METHODOLOGY.marcos.marco_0.ferramentas.join(', ')}

- **Marco 1** (${ROIP_METHODOLOGY.marcos.marco_1.prazo}): ${ROIP_METHODOLOGY.marcos.marco_1.nome}
  - ${ROIP_METHODOLOGY.marcos.marco_1.descricao}
  - Entregáveis: ${ROIP_METHODOLOGY.marcos.marco_1.entregaveis.join(', ')}

### FASES DO PROJETO
- **Fase 1** (${ROIP_METHODOLOGY.fases.fase_1.prazo}): ${ROIP_METHODOLOGY.fases.fase_1.nome}
- **Fase 2** (${ROIP_METHODOLOGY.fases.fase_2.prazo}): ${ROIP_METHODOLOGY.fases.fase_2.nome}
- **Fase 3** (${ROIP_METHODOLOGY.fases.fase_3.prazo}): ${ROIP_METHODOLOGY.fases.fase_3.nome}

### PRAZOS DE PLANEJAMENTO POR PILAR
- Cultura: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.prazo_planejamento}
- Atração: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.prazo_planejamento}
- Retenção: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.prazo_planejamento}
- Resultado: Planejamento Estratégico ${ROIP_METHODOLOGY.pilares_detalhados.resultado.prazos.planejamento_estrategico} | Modelo de Gestão ${ROIP_METHODOLOGY.pilares_detalhados.resultado.prazos.modelo_gestao} | Processos ${ROIP_METHODOLOGY.pilares_detalhados.resultado.prazos.gestao_processos}

### PRAZOS DE EXECUÇÃO POR PILAR
- Cultura: ${ROIP_METHODOLOGY.pilares_detalhados.cultura.prazo_execucao}
- Atração: ${ROIP_METHODOLOGY.pilares_detalhados.atracao.prazo_execucao}
- Retenção: ${ROIP_METHODOLOGY.pilares_detalhados.retencao.prazo_execucao}
- Resultado: ${ROIP_METHODOLOGY.pilares_detalhados.resultado.prazo_execucao}

### RESULTADOS ESPERADOS (Benchmarks EP+)
- Redução de ${ROIP_METHODOLOGY.resultados_esperados.reducao_rotatividade} em rotatividade
- Aumento de ${ROIP_METHODOLOGY.resultados_esperados.aumento_engajamento} em engajamento
- Aumento de ${ROIP_METHODOLOGY.resultados_esperados.aumento_produtividade} em produtividade
- Aumento de ${ROIP_METHODOLOGY.resultados_esperados.aumento_lucro} em lucro
- Payback: ${ROIP_METHODOLOGY.resultados_esperados.payback_medio}

### FORMATOS DE ENTREGA DA CONSULTORIA
- **Consultoria Quinzenal**: ${ROIP_METHODOLOGY.formatos_entrega.consultoria_quinzenal.descricao}
- **Implementation Day**: ${ROIP_METHODOLOGY.formatos_entrega.implementation_day.descricao}
- **Imersão Presencial**: ${ROIP_METHODOLOGY.formatos_entrega.imersao_presencial.descricao}
- **Leader Program**: ${ROIP_METHODOLOGY.formatos_entrega.leader_program.descricao}

### TECNOLOGIAS OFICIAIS
- **GENTIA**: Software para ${ROIP_METHODOLOGY.tecnologias.gentia.pilares.join(', ')}
- **SOEP**: ${ROIP_METHODOLOGY.tecnologias.soep.descricao} (${ROIP_METHODOLOGY.tecnologias.soep.url})
`;

// ============================================
// FERRAMENTAS GENTIA - MAPEAMENTO COMPLETO
// ============================================
const GENTIA_TOOLS = {
  cultura: [
    { 
      id: 'criacao-cultura', 
      nome: 'Criação de Cultura', 
      rota: '/cultura/criacao', 
      descricao: 'Construção dos 8 pilares de cultura organizacional (Missão, Visão, Valores, DNA, Propósito, Identidade, Rituais, Comunicação)',
      prazo_planejamento: '15-35 dias',
      prazo_execucao: '60-180 dias',
      ordem_sugerida: 1
    },
    { 
      id: 'evento-cultura', 
      nome: 'Evento de Cultura', 
      rota: '/cultura/evento', 
      descricao: 'Planejamento e execução do evento de comunicação da cultura para o time',
      prazo: '7-14 dias',
      ordem_sugerida: 2,
      prerequisito: 'criacao-cultura'
    },
    { 
      id: 'rituais-cultura', 
      nome: 'Rituais de Cultura', 
      rota: '/cultura/rituais', 
      descricao: 'Framework para criação e implementação de rituais que reforçam a cultura no dia a dia',
      prazo: '7-14 dias',
      ordem_sugerida: 3,
      prerequisito: 'evento-cultura'
    },
    { 
      id: 'culture-code', 
      nome: 'Culture Code', 
      rota: '/cultura/criador-culture-code', 
      descricao: 'Documento visual consolidado da cultura organizacional para onboarding e comunicação',
      prazo: '3-7 dias',
      ordem_sugerida: 4,
      prerequisito: 'criacao-cultura'
    }
  ],
  atracao: [
    { 
      id: 'vendendo-empresa', 
      nome: 'Vendendo a Empresa', 
      rota: '/atracao-contratacao/atracao', 
      descricao: 'Construção do employer branding para atrair talentos alinhados à cultura',
      prazo: '7-15 dias',
      ordem_sugerida: 1
    },
    { 
      id: 'organograma', 
      nome: 'Organograma', 
      rota: '/atracao-contratacao/contratacao/organograma', 
      descricao: 'Estrutura organizacional com hierarquia e clareza de funções',
      prazo: '3-7 dias',
      ordem_sugerida: 2
    },
    { 
      id: 'job-description', 
      nome: 'Job Description', 
      rota: '/atracao-contratacao/contratacao/job-description', 
      descricao: 'Descrição de cargos com clareza de papéis e responsabilidades',
      prazo: '3-5 dias por cargo',
      ordem_sugerida: 3
    },
    { 
      id: 'contratacao-cultura', 
      nome: 'Contratação por Cultura', 
      rota: '/atracao-contratacao/contratacao/perguntas-valores', 
      descricao: 'Perguntas de entrevista baseadas nos valores organizacionais (Culture First)',
      prazo: '5-10 dias',
      ordem_sugerida: 4,
      prerequisito: 'criacao-cultura'
    },
    { 
      id: 'funil-contratacao', 
      nome: 'Funil de Contratação', 
      rota: '/atracao-contratacao/contratacao/funil', 
      descricao: 'Processo seletivo estruturado com etapas definidas',
      prazo: '7-15 dias',
      ordem_sugerida: 5
    },
    { 
      id: 'recrutamento', 
      nome: 'Recrutamento com IA', 
      rota: '/atracao-contratacao/recrutamento', 
      descricao: 'Sistema completo de R&S com IA e metodologia Culture First',
      prazo: 'Contínuo',
      ordem_sugerida: 6
    }
  ],
  retencao: [
    { 
      id: 'onboarding', 
      nome: 'Onboarding', 
      rota: '/retencao/onboarding', 
      descricao: 'Processo estruturado de integração de novos colaboradores',
      prazo: '7-14 dias para setup, 90 dias por colaborador',
      ordem_sugerida: 1
    },
    { 
      id: 'disc', 
      nome: 'Assessment DISC', 
      rota: '/retencao/assessment-disc', 
      descricao: 'Avaliação de perfil comportamental para autoconhecimento e gestão de times',
      prazo: '3-7 dias',
      ordem_sugerida: 2
    },
    { 
      id: 'qa', 
      nome: 'Teste QA (Quociente de Adversidade)', 
      rota: '/retencao/assessment-qa', 
      descricao: 'Avaliação de resiliência e capacidade de lidar com adversidades',
      prazo: '3-7 dias',
      ordem_sugerida: 3
    },
    { 
      id: 'habilidade-unica', 
      nome: 'Habilidade Única', 
      rota: '/retencao/habilidade-unica', 
      descricao: 'Identificação dos talentos únicos de cada colaborador',
      prazo: '7-14 dias',
      ordem_sugerida: 4
    },
    { 
      id: 'analisador-pessoas', 
      nome: 'Analisador de Pessoas', 
      rota: '/retencao/analisador-pessoas', 
      descricao: 'Avaliação de colaboradores baseada nos valores organizacionais',
      prazo: '7-14 dias',
      ordem_sugerida: 5,
      prerequisito: 'criacao-cultura'
    },
    { 
      id: 'avaliacao-desempenho', 
      nome: 'Avaliação de Desempenho', 
      rota: '/retencao/avaliacao-desempenho', 
      descricao: 'Metodologia de 4 Blocos (performance vs alinhamento cultural)',
      prazo: '14-30 dias',
      ordem_sugerida: 6
    },
    { 
      id: 'maturidade-time', 
      nome: 'Maturidade do Time', 
      rota: '/retencao/maturidade-time', 
      descricao: 'Avaliação do nível de autonomia e desenvolvimento do time',
      prazo: '7-14 dias',
      ordem_sugerida: 7
    },
    { 
      id: 'evolucao', 
      nome: 'Sistema de Evolução', 
      rota: '/retencao/evolucao', 
      descricao: 'Framework de desenvolvimento contínuo orientado a resultado',
      prazo: '14-30 dias para setup',
      ordem_sugerida: 8
    },
    { 
      id: 'cargos-salarios', 
      nome: 'Cargos e Salários', 
      rota: '/retencao/cargos-salarios', 
      descricao: 'Estrutura de cargos, níveis e faixas salariais',
      prazo: '30-60 dias',
      ordem_sugerida: 9
    },
    { 
      id: 'people-performance', 
      nome: 'People Performance', 
      rota: '/retencao/people-performance', 
      descricao: 'Dashboard consolidado de performance individual e do time',
      prazo: '3-7 dias para setup',
      ordem_sugerida: 10
    },
    { 
      id: 'questionarios', 
      nome: 'Questionários', 
      rota: '/retencao/questionarios', 
      descricao: 'Pesquisas personalizadas de satisfação, clima e engajamento',
      prazo: '3-7 dias por pesquisa',
      ordem_sugerida: 11
    },
    { 
      id: 'pulse', 
      nome: 'Pesquisa Pulse', 
      rota: '/retencao/pulse', 
      descricao: 'Acompanhamento diário de engajamento e bem-estar com alertas de retenção',
      prazo: 'Contínuo',
      ordem_sugerida: 12
    }
  ],
  resultado: [
    { 
      id: 'soep', 
      nome: 'Software SOEP', 
      rota: 'https://soep.eppartners.com.br', 
      descricao: 'Sistema Operacional Estratégico de Performance - Gestão de OKRs, projetos e indicadores',
      prazo: '45-75 dias para implementação',
      ordem_sugerida: 1,
      externo: true
    }
  ]
};

// Questions mapping for context
const QUESTIONS_MAP: Record<number, { text: string; pillar: string }> = {
  1: { text: "Nossa cultura organizacional é claramente definida e comunicada", pillar: "Cultura" },
  2: { text: "Os valores da empresa são praticados no dia a dia", pillar: "Cultura" },
  3: { text: "Existe alinhamento entre liderança e equipes sobre a direção da empresa", pillar: "Cultura" },
  4: { text: "A comunicação interna é transparente e eficaz", pillar: "Cultura" },
  5: { text: "O ambiente de trabalho promove colaboração e inovação", pillar: "Cultura" },
  6: { text: "Conseguimos atrair candidatos qualificados para nossas vagas", pillar: "Atração" },
  7: { text: "Nossa marca empregadora é reconhecida no mercado", pillar: "Atração" },
  8: { text: "O processo seletivo é eficiente e bem estruturado", pillar: "Atração" },
  9: { text: "Oferecemos pacote de benefícios competitivo", pillar: "Atração" },
  10: { text: "Temos clareza sobre o perfil ideal para cada posição", pillar: "Atração" },
  11: { text: "A taxa de turnover está dentro de níveis saudáveis", pillar: "Retenção" },
  12: { text: "Investimos em desenvolvimento e capacitação dos colaboradores", pillar: "Retenção" },
  13: { text: "Existem planos de carreira claros e transparentes", pillar: "Retenção" },
  14: { text: "O clima organizacional é positivo e engajador", pillar: "Retenção" },
  15: { text: "Reconhecemos e valorizamos o bom desempenho", pillar: "Retenção" },
  16: { text: "Temos metas claras e mensuráveis para as equipes", pillar: "Resultado" },
  17: { text: "Acompanhamos indicadores de performance regularmente", pillar: "Resultado" },
  18: { text: "A produtividade das equipes atende às expectativas", pillar: "Resultado" },
  19: { text: "Conseguimos entregar resultados consistentes", pillar: "Resultado" },
  20: { text: "Existe cultura de melhoria contínua e aprendizado", pillar: "Resultado" },
};

// Benchmarks por segmento de mercado
const SEGMENT_BENCHMARKS: Record<string, Record<string, number>> = {
  'Tecnologia': { Cultura: 75, Atração: 72, Retenção: 68, Resultado: 74 },
  'Varejo': { Cultura: 62, Atração: 58, Retenção: 55, Resultado: 65 },
  'Serviços': { Cultura: 68, Atração: 64, Retenção: 62, Resultado: 68 },
  'Indústria': { Cultura: 64, Atração: 60, Retenção: 65, Resultado: 70 },
  'Saúde': { Cultura: 70, Atração: 66, Retenção: 64, Resultado: 72 },
  'Educação': { Cultura: 72, Atração: 62, Retenção: 70, Resultado: 66 },
  'Financeiro': { Cultura: 68, Atração: 70, Retenção: 66, Resultado: 75 },
  'Agronegócio': { Cultura: 60, Atração: 55, Retenção: 60, Resultado: 68 },
  'Logística': { Cultura: 58, Atração: 54, Retenção: 52, Resultado: 65 },
  'default': { Cultura: 65, Atração: 62, Retenção: 60, Resultado: 68 },
};

// Salário médio estimado por porte
const SALARY_BY_SIZE: Record<string, number> = {
  'Microempresa (até 9 funcionários)': 3500,
  'Pequena (10-49 funcionários)': 4500,
  'Média (50-249 funcionários)': 6000,
  'Grande (250+ funcionários)': 8500,
  'default': 5000,
};

// Número médio de funcionários por porte
const EMPLOYEES_BY_SIZE: Record<string, number> = {
  'Microempresa (até 9 funcionários)': 5,
  'Pequena (10-49 funcionários)': 25,
  'Média (50-249 funcionários)': 120,
  'Grande (250+ funcionários)': 500,
  'default': 50,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = inputSchema.safeParse(rawInput);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(JSON.stringify({ 
        error: 'Dados de entrada inválidos', 
        details: validationResult.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roip_assessment_id } = validationResult.data;
    console.log('Generating ROIP analysis for assessment:', roip_assessment_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Fetch assessment data and answers
    const [assessmentRes, answersRes, resultsRes] = await Promise.all([
      supabaseClient
        .from('roip_assessments')
        .select('*')
        .eq('id', roip_assessment_id)
        .single(),
      supabaseClient
        .from('roip_answers')
        .select('*')
        .eq('roip_assessment_id', roip_assessment_id)
        .order('question_id'),
      supabaseClient
        .from('roip_results')
        .select('*')
        .eq('roip_assessment_id', roip_assessment_id)
        .maybeSingle()
    ]);

    if (assessmentRes.error || !assessmentRes.data) {
      console.error('Assessment not found:', assessmentRes.error);
      return new Response(JSON.stringify({ 
        error: 'Assessment não encontrado' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assessment = assessmentRes.data;
    const answers = answersRes.data || [];
    const existingResults = resultsRes.data;

    console.log('Assessment data loaded:', {
      company: assessment.company_name,
      segment: assessment.company_segment,
      size: assessment.company_size,
      answers_count: answers.length,
      roip_simulation_id: assessment.roip_simulation_id
    });

    // ============================================
    // BUSCAR DADOS DA CALCULADORA ROIP (SE EXISTIR)
    // ============================================
    let simulationData = null;
    let hasRealFinancialData = false;

    if (assessment.roip_simulation_id) {
      const { data: simulation, error: simError } = await supabaseClient
        .from('roip_simulations')
        .select('*')
        .eq('id', assessment.roip_simulation_id)
        .single();

      if (!simError && simulation) {
        simulationData = simulation;
        hasRealFinancialData = true;
        console.log('Real financial data loaded from calculator:', {
          simulation_id: simulation.id,
          nome_empresa: simulation.nome_empresa,
          has_resultados: !!simulation.resultados_calculadora
        });
      } else {
        console.log('No simulation data found or error:', simError?.message);
      }
    }

    // Get benchmarks for this segment
    const segmentBenchmarks = SEGMENT_BENCHMARKS[assessment.company_segment] || SEGMENT_BENCHMARKS['default'];
    
    // Use real data from calculator if available, otherwise use estimates
    let avgSalary: number;
    let numEmployees: number;
    let realFinancialData: any = null;

    if (hasRealFinancialData && simulationData?.resultados_calculadora?.resultados) {
      const dados = simulationData.dados_simulacao;
      const resultados = simulationData.resultados_calculadora.resultados;
      
      avgSalary = dados.salarioMedio || SALARY_BY_SIZE[assessment.company_size] || SALARY_BY_SIZE['default'];
      numEmployees = dados.funcionarios || EMPLOYEES_BY_SIZE[assessment.company_size] || EMPLOYEES_BY_SIZE['default'];
      
      realFinancialData = {
        fonte: 'dados_reais_calculadora',
        faturamento_anual: dados.faturamento,
        numero_funcionarios: dados.funcionarios,
        salario_medio: dados.salarioMedio,
        taxa_rotatividade: dados.rotatividade,
        custo_turnover_anual: resultados.custosRotatividade?.total || 0,
        custo_desengajamento: resultados.custoDesengajamento?.custoAtual || 0,
        custo_improdutividade: resultados.custoImprodutividade || 0,
        perda_total: resultados.perdaTotal || 0,
        percentual_perda: resultados.percentualPerda || 0,
        receita_por_funcionario: resultados.receitaPorFuncionario || 0,
        lucro_por_funcionario: resultados.lucroPorFuncionario || 0,
        cenarios_economia: resultados.cenariosEconomia || null,
        detalhes_rotatividade: resultados.custosRotatividade || null,
        detalhes_desengajamento: resultados.custoDesengajamento || null
      };
      
      console.log('Using real financial data:', {
        faturamento: realFinancialData.faturamento_anual,
        funcionarios: realFinancialData.numero_funcionarios,
        perda_total: realFinancialData.perda_total
      });
    } else {
      avgSalary = SALARY_BY_SIZE[assessment.company_size] || SALARY_BY_SIZE['default'];
      numEmployees = EMPLOYEES_BY_SIZE[assessment.company_size] || EMPLOYEES_BY_SIZE['default'];
      console.log('Using estimated data (no calculator simulation linked)');
    }

    // Calculate pillar scores
    const pillarScores: Record<string, { total: number; count: number; score: number; answers: Array<{qId: number; value: number; text: string}> }> = {
      Cultura: { total: 0, count: 0, score: 0, answers: [] },
      Atração: { total: 0, count: 0, score: 0, answers: [] },
      Retenção: { total: 0, count: 0, score: 0, answers: [] },
      Resultado: { total: 0, count: 0, score: 0, answers: [] },
    };

    // Map answers with questions for context
    const answersWithContext = answers.map(answer => {
      const questionInfo = QUESTIONS_MAP[answer.question_id];
      if (questionInfo) {
        pillarScores[questionInfo.pillar].total += answer.answer_value;
        pillarScores[questionInfo.pillar].count += 1;
        pillarScores[questionInfo.pillar].answers.push({
          qId: answer.question_id,
          value: answer.answer_value,
          text: questionInfo.text
        });
      }
      return {
        question_id: answer.question_id,
        question_text: questionInfo?.text || `Pergunta ${answer.question_id}`,
        pillar: questionInfo?.pillar || 'Desconhecido',
        answer_value: answer.answer_value,
        answer_label: getAnswerLabel(answer.answer_value)
      };
    });

    // Calculate final scores
    Object.keys(pillarScores).forEach(pillar => {
      const data = pillarScores[pillar];
      if (data.count > 0) {
        data.score = Math.round((data.total / (data.count * 5)) * 100);
      }
    });

    const overallScore = Math.round(
      Object.values(pillarScores).reduce((sum, p) => sum + p.score, 0) / 4
    );

    const classification = overallScore >= 70 ? 'GREEN' : overallScore >= 50 ? 'YELLOW' : 'RED';

    // Identify patterns and correlations
    const identifyPatterns = () => {
      const patterns: Array<{type: string; description: string; pillars: string[]}> = [];
      
      // Check for Culture-Retention correlation
      if (pillarScores.Cultura.score < 50 && pillarScores.Retenção.score < 60) {
        patterns.push({
          type: 'correlação_negativa',
          description: 'Cultura fraca impactando diretamente a retenção de talentos',
          pillars: ['Cultura', 'Retenção']
        });
      }
      
      // Check for Attraction-Results correlation
      if (pillarScores.Atração.score < 50 && pillarScores.Resultado.score < 60) {
        patterns.push({
          type: 'correlação_negativa',
          description: 'Dificuldade em atrair talentos afetando a capacidade de entrega',
          pillars: ['Atração', 'Resultado']
        });
      }
      
      // Check for inconsistencies within pillars
      Object.entries(pillarScores).forEach(([pillar, data]) => {
        const values = data.answers.map(a => a.value);
        const max = Math.max(...values);
        const min = Math.min(...values);
        if (max - min >= 3) {
          patterns.push({
            type: 'inconsistência',
            description: `Respostas muito variadas no pilar ${pillar} (de ${min} a ${max})`,
            pillars: [pillar]
          });
        }
      });
      
      return patterns;
    };

    const patterns = identifyPatterns();

    // Calculate ROI estimates
    const estimatedTurnoverRate = pillarScores.Retenção.score < 50 ? 0.30 : 
                                   pillarScores.Retenção.score < 70 ? 0.20 : 0.12;
    const turnoverCost = avgSalary * 6; // 6 meses de salário por desligamento
    const annualTurnoverCost = Math.round(numEmployees * estimatedTurnoverRate * turnoverCost);
    
    const vacancyCostPerMonth = avgSalary * 1.5; // perda de produtividade
    const avgTimeToFill = pillarScores.Atração.score < 50 ? 90 : pillarScores.Atração.score < 70 ? 60 : 45;
    const annualVacancyCost = Math.round((numEmployees * estimatedTurnoverRate) * (avgTimeToFill / 30) * vacancyCostPerMonth);

    // ============================================
    // REGRA DE PRIORIZAÇÃO FIXA ROIP
    // Ordem imutável: Cultura → Atração → Retenção → Resultado
    // O pilar prioritário é SEMPRE o primeiro NÃO-VERDE (<=70%) na ordem
    // ============================================
    const PILLAR_ORDER = ['Cultura', 'Atração', 'Retenção', 'Resultado'];
    
    // Função que aplica a regra de priorização fixa ROIP
    const getPriorityPillarByROIP = (scores: Record<string, { score: number }>) => {
      // Regra: O pilar prioritário é SEMPRE o primeiro na ordem que NÃO esteja verde (>70%)
      for (const pillar of PILLAR_ORDER) {
        const score = scores[pillar]?.score || 0;
        if (score <= 70) {
          return { 
            pillar, 
            score, 
            reason: `Primeiro pilar não-verde na ordem ROIP (Cultura → Atração → Retenção → Resultado). ${pillar} está em ${score}%, abaixo do limiar de 70%.`
          };
        }
      }
      // Se todos estiverem verdes, priorizar Cultura (manutenção da base)
      return { 
        pillar: 'Cultura', 
        score: scores['Cultura']?.score || 0, 
        reason: 'Todos os pilares estão verdes (>70%) - priorizar Cultura para manutenção da base organizacional.'
      };
    };
    
    // Aplica a regra de priorização ROIP
    const priorityResult = getPriorityPillarByROIP(pillarScores);
    
    console.log('ROIP Prioritization applied:', {
      priority_pillar: priorityResult.pillar,
      priority_score: priorityResult.score,
      reason: priorityResult.reason,
      all_scores: Object.entries(pillarScores).map(([k, v]) => `${k}: ${v.score}%`)
    });
    
    // Ordena pilares seguindo a ordem FIXA ROIP (não por score!)
    const pillarsPrioritized = PILLAR_ORDER.map((pillarName, index) => {
      const data = pillarScores[pillarName] || { score: 0 };
      const benchmark = segmentBenchmarks[pillarName] || 65;
      const score = data.score;
      
      // Verifica se pode avançar (anterior está verde)
      const canAdvance = index === 0 || (pillarScores[PILLAR_ORDER[index - 1]]?.score || 0) > 70;
      
      return {
        ordem: index + 1,
        pilar: pillarName,
        score_atual: score,
        benchmark: benchmark,
        gap: score - benchmark,
        status: score < 50 ? 'critico' : score <= 70 ? 'atencao' : 'saudavel',
        e_prioritario: pillarName === priorityResult.pillar,
        pode_avancar: canAdvance,
        prazo_planejamento: null,
        justificativa_priorizacao: pillarName === priorityResult.pillar ? priorityResult.reason : null
      };
    });

    // Build context for AI
    const context = {
      empresa: {
        nome: assessment.company_name,
        segmento: assessment.company_segment,
        porte: assessment.company_size,
        numero_funcionarios_estimado: numEmployees,
        salario_medio_estimado: avgSalary,
        tem_dados_calculadora: hasRealFinancialData,
      },
      resultado_geral: {
        score: overallScore,
        classificacao: classification,
        classificacao_descritiva: getClassificationLabel(classification)
      },
      pilares: Object.entries(pillarScores).map(([name, data]) => ({
        nome: name,
        score: data.score,
        benchmark_segmento: segmentBenchmarks[name],
        gap_vs_benchmark: data.score - segmentBenchmarks[name],
        status: data.score >= 70 ? 'Verde' : data.score >= 50 ? 'Amarelo' : 'Vermelho',
        respostas_detalhadas: data.answers.map(a => ({
          pergunta: a.text,
          nota: a.value,
          classificacao: getAnswerLabel(a.value)
        }))
      })),
      pilares_priorizados: pillarsPrioritized,
      priorizacao_roip: {
        pilar_prioritario: priorityResult.pillar,
        score_pilar_prioritario: priorityResult.score,
        justificativa: priorityResult.reason,
        ordem_fixa: PILLAR_ORDER,
        regra: 'O pilar prioritário é sempre o PRIMEIRO na ordem (Cultura → Atração → Retenção → Resultado) que NÃO esteja verde (>70%)'
      },
      respostas_detalhadas: answersWithContext,
      padroes_identificados: patterns,
      pilar_mais_fraco: Object.entries(pillarScores)
        .sort((a, b) => a[1].score - b[1].score)[0][0],
      pilar_mais_forte: Object.entries(pillarScores)
        .sort((a, b) => b[1].score - a[1].score)[0][0],
      // Financial data - real if available, estimated otherwise
      dados_financeiros: hasRealFinancialData && realFinancialData ? {
        fonte: 'dados_reais_calculadora',
        ...realFinancialData
      } : {
        fonte: 'estimativa_por_porte',
        custo_turnover_anual_estimado: annualTurnoverCost,
        custo_vacancia_anual_estimado: annualVacancyCost,
        taxa_turnover_estimada: `${Math.round(estimatedTurnoverRate * 100)}%`,
        tempo_medio_contratacao_dias: avgTimeToFill,
        impacto_total_anual: annualTurnoverCost + annualVacancyCost,
      },
      estimativas_financeiras: {
        custo_turnover_anual_estimado: annualTurnoverCost,
        custo_vacancia_anual_estimado: annualVacancyCost,
        taxa_turnover_estimada: `${Math.round(estimatedTurnoverRate * 100)}%`,
        tempo_medio_contratacao_dias: avgTimeToFill,
        impacto_total_anual: annualTurnoverCost + annualVacancyCost,
      },
      benchmarks_segmento: segmentBenchmarks,
      ferramentas_gentia_disponiveis: GENTIA_TOOLS,
    };

    console.log('Context built for AI:', {
      overall_score: overallScore,
      classification,
      weakest_pillar: context.pilar_mais_fraco,
      strongest_pillar: context.pilar_mais_forte,
      patterns_count: patterns.length,
      estimated_annual_cost: annualTurnoverCost + annualVacancyCost
    });

    // Call AI for analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `## IDENTIDADE
Você é um Consultor Sênior Certificado na Metodologia ROIP (Retorno sobre Investimento em Pessoas), desenvolvida pela EP+ para maximizar o lucro por colaborador.

Você é especialista em diagnosticar problemas de gestão de pessoas e recomendar soluções exclusivamente dentro do ecossistema GENTIA + SOEP.

Você está preparando um relatório executivo estratégico sobre os resultados do Assessment ROIP, que será apresentado ao C-Level da empresa (CEO, CHRO, CFO).

${ROIP_METHODOLOGY_TEXT}

## REGRAS CRÍTICAS - SIGA RIGOROSAMENTE

1. **ÚNICA FERRAMENTA**: A ÚNICA ferramenta que você recomenda é o SOFTWARE GENTIA (para Cultura, Atração e Retenção) e o SOFTWARE SOEP (para Resultado). NUNCA mencione outras ferramentas, softwares ou plataformas.

2. **ÚNICO MÉTODO**: O ÚNICO método é o ROIP. NUNCA mencione OKR, Scrum, Agile, ou qualquer outra metodologia como método principal. Se precisar citar, sempre como complemento ao ROIP.

3. **ZERO CONCORRENTES**: NUNCA mencione ferramentas concorrentes (Gupy, Kenoby, Feedz, Qulture.Rocks, etc). ZERO menções.

4. **PROXIMOS PASSOS = GENTIA**: Todos os próximos passos DEVEM apontar para funcionalidades específicas do GENTIA ou SOEP, usando as rotas exatas fornecidas.

5. **PRAZOS ROIP**: Use os prazos definidos na metodologia ROIP para cada ferramenta.

6. **FLUXO CAUSAL**: Sempre explique a correlação entre pilares:
   - Cultura fraca = contratações erradas
   - Contratações erradas = turnover alto  
   - Turnover alto = perda de produtividade
   - Perda de produtividade = lucro comprometido

## PRIORIZAÇÃO ROIP (CRÍTICA E IMUTÁVEL)

**ORDEM FIXA**: Cultura → Atração → Retenção → Resultado

**REGRA FUNDAMENTAL**:
- O pilar prioritário é SEMPRE o primeiro pilar na ordem acima que NÃO esteja verde (>70%)
- Você só avança para o próximo pilar se o anterior estiver verde
- Mesmo que pilares posteriores tenham scores menores, NUNCA priorize fora da ordem
- Se todos estiverem verdes, o pilar prioritário é Cultura (manutenção da base)

### EXEMPLOS PRÁTICOS DE PRIORIZAÇÃO:

**EXEMPLO 1:**
- Cultura: 45% | Atração: 30% | Retenção: 80% | Resultado: 25%
→ PILAR PRIORITÁRIO: **CULTURA** (primeiro não-verde na ordem)

**EXEMPLO 2:**
- Cultura: 75% | Atração: 40% | Retenção: 20% | Resultado: 85%
→ PILAR PRIORITÁRIO: **ATRAÇÃO** (Cultura está verde, Atração é o próximo não-verde)

**EXEMPLO 3:**
- Cultura: 85% | Atração: 78% | Retenção: 45% | Resultado: 90%
→ PILAR PRIORITÁRIO: **RETENÇÃO** (Cultura e Atração verdes, Retenção é o próximo não-verde)

**EXEMPLO 4:**
- Cultura: 90% | Atração: 85% | Retenção: 80% | Resultado: 60%
→ PILAR PRIORITÁRIO: **RESULTADOS** (todos anteriores verdes, Resultados não está verde)

**EXEMPLO 5:**
- Cultura: 90% | Atração: 85% | Retenção: 95% | Resultado: 88%
→ PILAR PRIORITÁRIO: **CULTURA** (todos verdes = manutenção da cultura como base)

**IMPORTANTE**: O campo 'priorizacao_roip' no contexto já contém o pilar prioritário calculado corretamente. USE esse valor.

## REGRA CRÍTICA DE DADOS FINANCEIROS (OBRIGATÓRIA)

**SE houver "DADOS FINANCEIROS REAIS (DA CALCULADORA ROIP)" no contexto:**
1. Use EXATAMENTE os valores fornecidos - NÃO calcule, NÃO estime, NÃO arredonde
2. No campo "impacto_financeiro", copie os valores literalmente:
   - custo_turnover_atual.valor = custo_turnover_anual exato da calculadora
   - perda_produtividade.valor = custo_improdutividade exato da calculadora
   - custo_vacancia.valor = custo_desengajamento exato da calculadora
3. Defina fonte_dados = "dados_reais"
4. Inclua nota_fonte = "Dados reais da Calculadora ROIP - valores exatos informados pela empresa"

**SE NÃO houver dados reais:**
1. Use estimativas baseadas no porte da empresa
2. Defina fonte_dados = "estimativa"
3. Inclua nota_fonte = "Estimativa baseada no porte e segmento da empresa"

## REGRA DE COERÊNCIA DO PLANO (CRÍTICA)

Todas as seções de plano de ação DEVEM estar alinhadas e formar um plano coeso:

1. **Roadmap de Implementação** → Define os marcos e pilares prioritários (seguindo ordem ROIP)
2. **Fases de Implementação (tempo_implementacao)** → Detalha O QUE fazer em cada fase (0-30, 30-60, 60-90 dias)
3. **Quick Wins** → Ações RÁPIDAS que podem ser feitas DENTRO da Fase Inicial (0-30 dias)
4. **Próximos 3 Passos** → As 3 PRIMEIRAS ações concretas a fazer AGORA

### REGRAS DE CONSISTÊNCIA OBRIGATÓRIAS:
- Os Quick Wins DEVEM aparecer na Fase Inicial (0-30 dias)
- Os Próximos 3 Passos DEVEM ser as primeiras ações do Roadmap
- As Fases DEVEM seguir a mesma lógica do Roadmap
- TODAS as ferramentas sugeridas DEVEM ser do mesmo conjunto em todas as seções
- O Pilar Prioritário DEVE estar presente como foco em todas as seções

### EXEMPLO DE COERÊNCIA (SE pilar prioritário = Retenção):
- Quick Wins: "Implementar Pulse para medir engajamento" (ferramenta de Retenção)
- Próximo Passo 1: Ferramenta = Pulse | Pilar = Retenção
- Fase Inicial: "Implementar Pulse e identificar alertas de retenção"
- Roadmap: Retenção como pilar 1 na ordem de implementação

### ANTI-PADRÕES (EVITAR):
- ❌ Quick Win em "Cultura" quando o pilar prioritário é "Retenção"
- ❌ Próximos Passos mencionando ferramentas diferentes das Quick Wins
- ❌ Fases desconectadas do Roadmap
- ❌ Cada seção recomendando coisas diferentes

## FERRAMENTAS POR PILAR (recomende 1-3 por diagnóstico)

Para cada pilar no diagnostico_pilares, recomende de 1 a 3 ferramentas:
- 1 ferramenta: quando há UMA solução clara e prioritária
- 2 ferramentas: quando há uma principal e uma complementar
- 3 ferramentas: quando o problema é complexo e requer abordagem múltipla

## CLASSIFICAÇÕES PADRONIZADAS

**Status por pilar:**
- Crítico: < 50% 🔴
- Atenção: 51-70% 🟡
- Adequado: > 70% 🟢
- Excelente: ≥ 85% 🟢 (destaque)

**Classificação geral do assessment:**
- CRÍTICO: score geral < 50%
- EM DESENVOLVIMENTO: 51-70%
- CONSOLIDADO: 71-84%
- EXCELÊNCIA: ≥ 85%

## FERRAMENTAS GENTIA DISPONÍVEIS

${JSON.stringify(GENTIA_TOOLS, null, 2)}

## FORMATO DE RESPOSTA
Retorne APENAS um JSON válido com esta estrutura:
{
  "classificacao_geral": "CRÍTICO | EM DESENVOLVIMENTO | CONSOLIDADO | EXCELÊNCIA",
  "carta_ao_ceo": "Parágrafo de 4-5 frases no estilo de uma carta executiva direta ao CEO, resumindo a situação estratégica, o principal risco e a oportunidade de maior impacto. Tom: direto, estratégico, orientado a resultados.",
  "resumo_executivo": "3-4 frases resumindo diagnóstico, principal gap e recomendação prioritária",
  "pilar_prioritario": "Nome do pilar que requer atenção imediata e por quê",
  "roadmap_implementacao": {
    "marco_atual": "Diagnóstico ROIP",
    "proximo_marco": "Plano 90 dias",
    "timeline_estimado": "X-Y dias para implementação completa",
    "pilares_priorizados": [
      {
        "ordem": 1,
        "pilar": "Cultura | Atração | Retenção | Resultado",
        "score_atual": 52,
        "benchmark": 65,
        "status": "critico | atencao | saudavel",
        "prazo_estimado": "X-Y dias"
      }
    ],
    "proximos_3_passos": [
      {
        "ordem": 1,
        "ferramenta": {
          "id": "id da ferramenta do GENTIA_TOOLS",
          "nome": "Nome da ferramenta",
          "rota": "/rota/no/sistema",
          "externo": false
        },
        "pilar": "Cultura | Atração | Retenção | Resultado",
        "objetivo": "Frase de 10-15 palavras descrevendo o que será alcançado com esta ferramenta",
        "por_que_agora": "Justificativa baseada no score e urgência",
        "prazo_sugerido": "X-Y dias",
        "resultado_esperado": "Benefício específico e mensurável (10-15 palavras)",
        "prerequisito": "id da ferramenta prerequisito ou null"
      }
    ]
  },
  "analise_correlacoes": [
    {
      "relacao": "Cadeia causal clara: Pilar X baixo → Efeito Y → Consequência Z (máx 18 palavras)",
      "impacto": "Frase de 20-30 palavras explicando o risco direto para o negócio de forma clara, completa e acionável",
      "evidencia": "Dados específicos do assessment que comprovam esta correlação",
      "custo_estimado": "Valor monetário em Reais associado a esta perda (usar dados da calculadora se disponíveis)"
    }
  ],
  "impacto_financeiro": {
    "fonte_dados": "dados_reais | estimativa",
    "nota_fonte": "Texto indicando se veio da Calculadora ROIP ou é estimativa por porte",
    "custo_turnover_atual": {
      "valor": "R$ X.XXX",
      "calculo": "Fórmula utilizada (use dados reais se disponíveis)",
      "economia_potencial": "R$ X.XXX com melhorias"
    },
    "custo_vacancia": {
      "valor": "R$ X.XXX",
      "calculo": "Fórmula utilizada",
      "reducao_potencial": "R$ X.XXX possível"
    },
    "perda_produtividade": {
      "valor": "R$ X.XXX",
      "calculo": "Baseado nos gaps identificados",
      "recuperacao_potencial": "R$ X.XXX ganho possível"
    },
    "cenarios_economia": {
      "pessimista": "R$ X.XXX/ano (se disponível da calculadora)",
      "realista": "R$ X.XXX/ano",
      "otimista": "R$ X.XXX/ano"
    },
    "roi_projetos_sugeridos": [
      {
        "projeto": "Nome da iniciativa GENTIA",
        "investimento_estimado": "R$ X.XXX",
        "retorno_estimado": "R$ X.XXX/ano",
        "roi": "X%",
        "payback": "X meses",
        "pilar_impactado": "Cultura | Atração | Retenção | Resultado"
      }
    ],
    "resumo_impacto": "Frase resumindo o custo total dos gaps e potencial de economia"
  },
  "diagnostico_pilares": [
    {
      "pilar": "Cultura | Atração | Retenção | Resultado",
      "status": "Crítico | Atenção | Adequado | Excelente",
      "score": 52,
      "benchmark_segmento": 65,
      "gap": -13,
      "plano_acao": [
        "Ação específica 1 em até 15 palavras - prática e implementável",
        "Ação específica 2 em até 15 palavras - prática e implementável",
        "Ação específica 3 em até 15 palavras - prática e implementável"
      ],
      "ferramentas_gentia_recomendadas": [
        {
          "id": "id da ferramenta 1 (obrigatória)",
          "nome": "Nome da ferramenta prioritária",
          "rota": "/rota/no/sistema"
        },
        {
          "id": "id da ferramenta 2 (opcional, se relevante)",
          "nome": "Nome da ferramenta complementar",
          "rota": "/rota/no/sistema"
        },
        {
          "id": "id da ferramenta 3 (opcional, se relevante)",
          "nome": "Nome da ferramenta de apoio",
          "rota": "/rota/no/sistema"
        }
      ]
    }
  ],
  "alertas_criticos": ["Riscos urgentes que precisam de atenção imediata"],
  "quick_wins": [
    {
      "acao": "Ação concreta em 6-10 palavras",
      "ferramenta_gentia": "Nome da ferramenta no GENTIA",
      "esforco": "Baixo | Médio | Alto",
      "impacto": "Baixo | Médio | Alto",
      "prazo": "Tempo para implementar",
      "resultado_esperado": "Resultado esperado em 10-15 palavras, claro e mensurável"
    }
  ],
  "metricas_acompanhamento": [
    {
      "metrica": "Nome do indicador",
      "valor_atual_estimado": "X%",
      "meta_sugerida": "Y%",
      "prazo": "30 | 60 | 90 dias",
      "impacto_financeiro": "R$ X.XXX/ano"
    }
  ],
  "tempo_implementacao": {
    "fase_inicial": "0-30 dias: Quick wins e diagnóstico aprofundado",
    "fase_consolidacao": "30-60 dias: Implementação dos pilares prioritários",
    "fase_sustentacao": "60-90 dias: Consolidação e reavaliação"
  }
}`;

    // Build financial data section based on source
    const financialDataSection = hasRealFinancialData && realFinancialData ? `
### 💰 DADOS FINANCEIROS REAIS (DA CALCULADORA ROIP)
## ⚠️ ATENÇÃO: VOCÊ DEVE USAR EXATAMENTE ESTES VALORES NO CAMPO "impacto_financeiro"!
## NÃO CALCULE. NÃO ESTIME. NÃO ARREDONDE. COPIE OS VALORES ABAIXO LITERALMENTE.

### VALORES EXATOS A USAR:
- **Custo de Turnover Anual** (usar em custo_turnover_atual.valor): R$ ${realFinancialData.custo_turnover_anual?.toLocaleString('pt-BR') || '0'}
- **Custo de Desengajamento** (usar em custo_vacancia.valor): R$ ${realFinancialData.custo_desengajamento?.toLocaleString('pt-BR') || '0'}
- **Perda de Produtividade** (usar em perda_produtividade.valor): R$ ${realFinancialData.custo_improdutividade?.toLocaleString('pt-BR') || '0'}
- **PERDA TOTAL ANUAL**: R$ ${realFinancialData.perda_total?.toLocaleString('pt-BR') || '0'} (${(realFinancialData.percentual_perda || 0).toFixed(1)}% do faturamento)

### DADOS CONTEXTUAIS:
- Faturamento Anual: R$ ${realFinancialData.faturamento_anual?.toLocaleString('pt-BR') || 'N/A'}
- Número de Funcionários: ${realFinancialData.numero_funcionarios}
- Salário Médio: R$ ${realFinancialData.salario_medio?.toLocaleString('pt-BR') || 'N/A'}
- Taxa de Rotatividade: ${realFinancialData.taxa_rotatividade || 0}%
- Receita por Funcionário: R$ ${realFinancialData.receita_por_funcionario?.toLocaleString('pt-BR') || 'N/A'}
- Lucro por Funcionário: R$ ${realFinancialData.lucro_por_funcionario?.toLocaleString('pt-BR') || 'N/A'}

${realFinancialData.cenarios_economia ? `
### CENÁRIOS DE ECONOMIA POTENCIAL (usar em cenarios_economia):
- **Cenário Pessimista**: R$ ${realFinancialData.cenarios_economia.pessimista?.economiaTotal?.toLocaleString('pt-BR') || '0'}/ano
- **Cenário Realista**: R$ ${realFinancialData.cenarios_economia.realista?.economiaTotal?.toLocaleString('pt-BR') || '0'}/ano
- **Cenário Otimista**: R$ ${realFinancialData.cenarios_economia.otimista?.economiaTotal?.toLocaleString('pt-BR') || '0'}/ano
` : ''}

### OBRIGATÓRIO PARA impacto_financeiro:
- fonte_dados: "dados_reais"
- nota_fonte: "Dados reais da Calculadora ROIP - valores exatos informados pela empresa"
` : `
### ESTIMATIVAS FINANCEIRAS (Sem dados da Calculadora ROIP):
- Custo anual estimado de turnover: R$ ${annualTurnoverCost.toLocaleString('pt-BR')}
- Custo anual estimado de vacância: R$ ${annualVacancyCost.toLocaleString('pt-BR')}
- Impacto total anual estimado: R$ ${(annualTurnoverCost + annualVacancyCost).toLocaleString('pt-BR')}
- Salário médio estimado: R$ ${avgSalary.toLocaleString('pt-BR')}
- Taxa de turnover estimada: ${Math.round(estimatedTurnoverRate * 100)}%

### OBRIGATÓRIO PARA impacto_financeiro:
- fonte_dados: "estimativa"
- nota_fonte: "Estimativa baseada no porte e segmento da empresa. Para dados precisos, use a Calculadora ROIP."
`;

    const userPrompt = `## DADOS COMPLETOS DO ASSESSMENT ROIP:

${JSON.stringify(context, null, 2)}

## INSTRUÇÕES PARA ANÁLISE:

Você está analisando os resultados da **${assessment.company_name}**, uma empresa do segmento **${assessment.company_segment}** de porte **${assessment.company_size}** (aproximadamente ${numEmployees} funcionários).

### DADOS CHAVE:
- **Score Geral**: ${overallScore}% (${getClassificationLabel(classification)})
- **Pilar Mais Crítico**: ${context.pilar_mais_fraco} (${pillarScores[context.pilar_mais_fraco].score}%)
- **Pilar Mais Forte**: ${context.pilar_mais_forte} (${pillarScores[context.pilar_mais_forte].score}%)
- **Padrões Identificados**: ${patterns.length > 0 ? patterns.map(p => p.description).join('; ') : 'Nenhum padrão crítico detectado'}
- **Fonte de Dados Financeiros**: ${hasRealFinancialData ? '✅ DADOS REAIS da Calculadora ROIP' : '⚠️ Estimativas por porte'}

${financialDataSection}

### BENCHMARKS DO SEGMENTO ${assessment.company_segment.toUpperCase()}:
${Object.entries(segmentBenchmarks).map(([pilar, bench]) => {
  const score = pillarScores[pilar]?.score || 0;
  const gap = score - bench;
  return `- ${pilar}: Benchmark ${bench}% | Empresa ${score}% | Gap: ${gap > 0 ? '+' : ''}${gap}%`;
}).join('\n')}

### PRIORIZAÇÃO ROIP APLICADA:
- **PILAR PRIORITÁRIO**: ${priorityResult.pillar} (${priorityResult.score}%)
- **JUSTIFICATIVA**: ${priorityResult.reason}
- **ORDEM FIXA**: Cultura → Atração → Retenção → Resultado

### SCORES POR PILAR (seguindo ordem ROIP):
${PILLAR_ORDER.map((p, i) => {
  const score = pillarScores[p]?.score || 0;
  const status = score < 50 ? '🔴 Crítico' : score <= 70 ? '🟡 Atenção' : '🟢 Saudável';
  const isPriority = p === priorityResult.pillar ? ' ⭐ PRIORITÁRIO' : '';
  return `${i + 1}. ${p}: ${score}% ${status}${isPriority}`;
}).join('\n')}

### REGRAS FINAIS:
1. A "Carta ao CEO" deve ser impactante, direta e focada em valor para o negócio
2. O "roadmap_implementacao" DEVE conter ferramentas GENTIA com rotas exatas
3. **CRÍTICO**: O pilar prioritário é **${priorityResult.pillar}** - foque suas recomendações nele primeiro
4. Siga a sequência ROIP: Cultura → Atração → Retenção → Resultado
5. NUNCA mencione ferramentas externas ao GENTIA/SOEP
6. Use os prazos da metodologia ROIP
7. Mesmo que outros pilares tenham scores mais baixos, respeite a ordem fixa de priorização
8. Para cada pilar em diagnostico_pilares, recomende 1 a 3 ferramentas no campo "ferramentas_gentia_recomendadas" (array)

### VALIDAÇÃO OBRIGATÓRIA:
Antes de finalizar sua resposta, verifique:
✅ O pilar prioritário está correto conforme a ordem ROIP?
✅ Considerei que só avanço para o próximo pilar se o anterior estiver verde (>70%)?
✅ Meu diagnóstico e plano de ação estão focados no pilar prioritário?
✅ Todas as ferramentas sugeridas são do GENTIA ou SOEP?
✅ Os Quick Wins, Próximos Passos e Fases estão COERENTES entre si?
✅ Os dados financeiros estão EXATAMENTE como informados (se houver dados reais)?
✅ Cada pilar tem de 1 a 3 ferramentas recomendadas no array "ferramentas_gentia_recomendadas"?

Gere uma análise completa, estratégica e orientada a resultados usando EXCLUSIVAMENTE o GENTIA e a metodologia ROIP.`;

    console.log('Calling AI for analysis...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições excedido. Tente novamente em alguns minutos." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Créditos insuficientes. Adicione créditos ao workspace." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate required fields
    if (!analysis.classificacao_geral || !analysis.roadmap_implementacao) {
      throw new Error("AI response missing required fields");
    }

    // CRITICAL: Overwrite AI-generated values with backend-calculated values
    // The AI sometimes ignores instructions and generates incorrect priority pillar
    analysis.pilar_prioritario = `${priorityResult.pillar} (${priorityResult.score}%)`;
    
    console.log(`Forcing pilar_prioritario to: ${analysis.pilar_prioritario}`);

    // Ensure diagnostico_pilares has correct scores from backend calculation
    if (analysis.diagnostico_pilares) {
      analysis.diagnostico_pilares = analysis.diagnostico_pilares.map((dp: any) => {
        const pillarKey = dp.pilar.replace(' Organizacional', '').replace(' e Contratação', '');
        const pillarData = pillarScores[pillarKey] || pillarScores[dp.pilar];
        const score = pillarData?.score || dp.score;
        return {
          ...dp,
          score: score,
          benchmark_segmento: segmentBenchmarks[pillarKey] || segmentBenchmarks[dp.pilar] || dp.benchmark_segmento
        };
      });
    }

    // Ensure roadmap has correct pillar prioritization
    if (analysis.roadmap_implementacao?.pilares_priorizados) {
      analysis.roadmap_implementacao.pilares_priorizados = pillarsPrioritized;
    }

    // CRITICAL: Overwrite financial data with REAL calculator values (not AI estimates)
    if (hasRealFinancialData && realFinancialData) {
      console.log('Forcing REAL financial data from calculator into impacto_financeiro');
      
      const formatCurrency = (value: number) => `R$ ${(value || 0).toLocaleString('pt-BR')}`;
      
      // Override impacto_financeiro with actual calculator values
      analysis.impacto_financeiro = {
        fonte_dados: 'dados_reais',
        nota_fonte: 'Dados reais da Calculadora ROIP - valores exatos informados pela empresa',
        custo_turnover_atual: {
          valor: formatCurrency(realFinancialData.custo_turnover_anual || 0),
          calculo: `Baseado em ${realFinancialData.taxa_rotatividade || 0}% de rotatividade anual`,
          economia_potencial: formatCurrency((realFinancialData.custo_turnover_anual || 0) * 0.5)
        },
        perda_desengajamento: {
          valor: formatCurrency(realFinancialData.custo_desengajamento || 0),
          calculo: 'Custo com baixo engajamento da equipe',
          recuperacao_potencial: formatCurrency((realFinancialData.custo_desengajamento || 0) * 0.36)
        },
        perda_produtividade: {
          valor: formatCurrency(realFinancialData.custo_improdutividade || 0),
          calculo: 'Calculado pela Calculadora ROIP baseado em benchmarks',
          recuperacao_potencial: formatCurrency((realFinancialData.custo_improdutividade || 0) * 0.3)
        },
        // Cenários de economia da calculadora
        cenarios_economia: realFinancialData.cenarios_economia ? {
          pessimista: formatCurrency(realFinancialData.cenarios_economia.pessimista?.economiaTotal || 0),
          realista: formatCurrency(realFinancialData.cenarios_economia.realista?.economiaTotal || 0),
          otimista: formatCurrency(realFinancialData.cenarios_economia.otimista?.economiaTotal || 0)
        } : undefined,
        resumo_impacto: `Perda total de ${formatCurrency(realFinancialData.perda_total || 0)}/ano (${(realFinancialData.percentual_perda || 0).toFixed(1)}% do faturamento)`,
        // Keep any ROI projetos from AI response
        roi_projetos_sugeridos: analysis.impacto_financeiro?.roi_projetos_sugeridos || []
      };
      
      // Explicitly remove custo_vacancia - user doesn't want to show it
      delete analysis.impacto_financeiro.custo_vacancia;
      
      console.log('Financial data overwritten:', {
        turnover: analysis.impacto_financeiro.custo_turnover_atual.valor,
        produtividade: analysis.impacto_financeiro.perda_produtividade.valor
      });
    }

    // Garantir que perda_desengajamento sempre existe (fallback se não houver dados da calculadora)
    if (!analysis.impacto_financeiro?.perda_desengajamento) {
      const estimatedDisengagementCost = numEmployees * avgSalary * 0.15; // 15% do custo salarial
      const formatCurrencyFallback = (value: number) => `R$ ${(value || 0).toLocaleString('pt-BR')}`;
      
      if (!analysis.impacto_financeiro) {
        analysis.impacto_financeiro = {};
      }
      
      analysis.impacto_financeiro.perda_desengajamento = {
        valor: formatCurrencyFallback(estimatedDisengagementCost),
        calculo: 'Estimativa: 15% do custo salarial anual (benchmark de mercado)',
        recuperacao_potencial: formatCurrencyFallback(estimatedDisengagementCost * 0.36)
      };
      
      console.log('Fallback perda_desengajamento created:', analysis.impacto_financeiro.perda_desengajamento);
    }

    console.log("Analysis parsed and corrected successfully");

    // Save or update results
    const pillarScoresJson = {
      cultura: pillarScores.Cultura.score,
      atracao: pillarScores.Atração.score,
      retencao: pillarScores.Retenção.score,
      resultado: pillarScores.Resultado.score,
    };

    if (existingResults) {
      const { error: updateError } = await supabaseClient
        .from('roip_results')
        .update({
          overall_score: overallScore,
          pillar_scores: pillarScoresJson,
          ai_analysis: analysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResults.id);

      if (updateError) {
        console.error('Error updating results:', updateError);
        throw updateError;
      }
      console.log('Results updated');
    } else {
      const { error: insertError } = await supabaseClient
        .from('roip_results')
        .insert({
          roip_assessment_id,
          overall_score: overallScore,
          pillar_scores: pillarScoresJson,
          ai_analysis: analysis
        });

      if (insertError) {
        console.error('Error inserting results:', insertError);
        throw insertError;
      }
      console.log('Results inserted');
    }

    // Update assessment overall_score
    await supabaseClient
      .from('roip_assessments')
      .update({ 
        overall_score: overallScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', roip_assessment_id);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      scores: {
        overall: overallScore,
        pillars: pillarScoresJson
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-roip-analysis:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function getAnswerLabel(value: number): string {
  const labels: Record<number, string> = {
    1: 'Discordo totalmente',
    2: 'Discordo parcialmente',
    3: 'Neutro',
    4: 'Concordo parcialmente',
    5: 'Concordo totalmente'
  };
  return labels[value] || 'Desconhecido';
}

function getClassificationLabel(classification: string): string {
  const labels: Record<string, string> = {
    'GREEN': 'Organização Madura',
    'YELLOW': 'Em Desenvolvimento',
    'RED': 'Atenção Crítica'
  };
  return labels[classification] || classification;
}
