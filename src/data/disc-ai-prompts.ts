// =============================================
// DISC AI Prompts - Configuração da IA como Analista Comportamental Sênior
// =============================================

import { DISCAnalysisLevel, DISCDimension } from "@/types/disc.types";
import { DISCCombinedProfile } from "./disc-profiles";

// =============================================
// Configuração por Nível de Análise
// =============================================

export interface AnalysisLevelConfig {
  key: DISCAnalysisLevel;
  name: string;
  objective: string;
  tone: string;
  language: string;
  perspective: 'first' | 'third';
}

export const ANALYSIS_LEVELS: Record<DISCAnalysisLevel, AnalysisLevelConfig> = {
  collaborator: {
    key: 'collaborator',
    name: 'Colaborador',
    objective: 'Autoconhecimento e desenvolvimento pessoal',
    tone: 'Empático, motivador, acessível',
    language: 'Exemplos práticos, foco em crescimento, linguagem direta',
    perspective: 'first'
  },
  leader: {
    key: 'leader',
    name: 'Líder / RH',
    objective: 'Gestão da pessoa, potencial de liderança, riscos',
    tone: 'Analítico, estratégico, objetivo',
    language: 'Insights acionáveis, recomendações claras, linguagem profissional',
    perspective: 'third'
  },
  system: {
    key: 'system',
    name: 'Sistema',
    objective: 'Dados estruturados para integrações',
    tone: 'Técnico, padronizado',
    language: 'JSON, enums, scores numéricos',
    perspective: 'third'
  }
};

// =============================================
// Prompts por Seção
// =============================================

export interface SectionPrompt {
  key: string;
  name: string;
  emoji: string;
  collaboratorPrompt: string;
  leaderPrompt: string;
}

export const SECTION_PROMPTS: SectionPrompt[] = [
  {
    key: 'executiveSummary',
    name: 'Resumo Executivo',
    emoji: '📝',
    collaboratorPrompt: `Gere um resumo de 2-3 frases capturando a essência deste perfil.
Use "Você" e seja motivador. Destaque a combinação única do primário/secundário.
Exemplo de tom: "Você é alguém que..."`,
    leaderPrompt: `Gere um resumo executivo de 2-3 frases para gestores.
Use "Este profissional" e seja analítico. Foque no que diferencia esta pessoa.
Exemplo de tom: "Este profissional demonstra..."`
  },
  {
    key: 'leadershipStyle',
    name: 'Estilo de Liderança',
    emoji: '🎯',
    collaboratorPrompt: `Descreva como esta pessoa tende a liderar ou influenciar.
Foque no potencial de liderança natural, mesmo que não esteja em cargo de gestão.
Inclua: Como toma decisões, como inspira outros, como lida com conflitos.`,
    leaderPrompt: `Analise o estilo de liderança desta pessoa para fins de gestão.
Inclua: Como gerenciar este perfil, como desenvolver seu potencial de liderança,
que tipo de projetos/equipes seriam ideais para este estilo.`
  },
  {
    key: 'motivationEngagement',
    name: 'Motivação e Engajamento',
    emoji: '🔥',
    collaboratorPrompt: `Explique o que mantém esta pessoa engajada e motivada.
Seja específico sobre os gatilhos de motivação baseados nos scores.
Inclua: O que energiza, o que drena, como manter a motivação alta.`,
    leaderPrompt: `Analise os fatores de engajamento para retenção e desenvolvimento.
Inclua: Como engajar este perfil, sinais de desmotivação a observar,
estratégias de retenção específicas.`
  },
  {
    key: 'risksBlindSpots',
    name: 'Pontos de Atenção',
    emoji: '⚠️',
    collaboratorPrompt: `Apresente os pontos cegos e áreas de atenção de forma construtiva.
NÃO julgue - convide à reflexão. Use linguagem como "pode tender a" ou "em momentos de pressão".
Foque em comportamentos, não em características pessoais.`,
    leaderPrompt: `Identifique riscos e pontos de atenção para gestão proativa.
Inclua: Sinais de alerta, situações que podem causar problemas,
estratégias de mitigação específicas.`
  },
  {
    key: 'communication',
    name: 'Comunicação Eficaz',
    emoji: '💬',
    collaboratorPrompt: `Explique como esta pessoa tende a se comunicar e como pode melhorar.
Inclua: Estilo natural de comunicação, como é percebido pelos outros,
dicas práticas para comunicação mais eficaz.`,
    leaderPrompt: `Oriente como se comunicar efetivamente com este perfil.
Inclua: O que funciona, o que evitar, como dar feedback,
como abordar conversas difíceis.`
  },
  {
    key: 'idealEnvironment',
    name: 'Ambiente Ideal',
    emoji: '🏠',
    collaboratorPrompt: `Descreva o ambiente de trabalho ideal para este perfil.
Seja específico sobre cultura, estrutura, ritmo e relacionamentos.
Inclua: O que buscar e o que evitar em oportunidades futuras.`,
    leaderPrompt: `Recomende como configurar o ambiente para máxima performance.
Inclua: Tipo de projetos, estrutura de trabalho, frequência de check-ins,
autonomia vs. acompanhamento.`
  },
  {
    key: 'developmentPlan',
    name: 'Plano de Desenvolvimento',
    emoji: '📈',
    collaboratorPrompt: `Crie um plano de desenvolvimento pessoal com ações concretas.
Divida em: Esta semana (1-2 ações), Este mês (2-3 ações), Próximo trimestre (2-3 ações).
Cada ação deve ser específica e praticável.`,
    leaderPrompt: `Crie um plano de desenvolvimento para o gestor aplicar.
Divida em: Imediato (1-2 semanas), Curto prazo (1 mês), Médio prazo (3 meses).
Inclua ações do líder e metas para o colaborador.`
  }
];

// =============================================
// System Prompt Principal
// =============================================

export function buildSystemPrompt(level: DISCAnalysisLevel): string {
  const levelConfig = ANALYSIS_LEVELS[level];
  
  return `PERSONA: Você é um analista comportamental sênior com 20+ anos de experiência em assessment DISC.
Você NÃO faz análises genéricas. Cada insight deve ser específico para ESTE perfil, baseado nos scores exatos.

NÍVEL DE ANÁLISE: ${levelConfig.name}
- Objetivo: ${levelConfig.objective}
- Tom: ${levelConfig.tone}
- Linguagem: ${levelConfig.language}
- Perspectiva: ${levelConfig.perspective === 'first' ? 'Primeira pessoa (use "Você")' : 'Terceira pessoa (use "Este profissional")'}

REGRAS ABSOLUTAS:
1. NUNCA repita os textos base literalmente - interprete, expanda e personalize
2. NUNCA crie novos perfis ou dimensões além de D, I, S, C
3. NUNCA rotule ou julgue a pessoa - foque em tendências comportamentais observáveis
4. SEMPRE use os scores numéricos para calibrar a intensidade das afirmações
5. SEMPRE considere a dinâmica entre perfil primário e secundário
6. SEMPRE seja específico - evite generalidades que poderiam se aplicar a qualquer pessoa

INSTRUÇÕES ANTI-GENÉRICO:
- Mencione os scores específicos quando relevante (ex: "Seu D de 85%...")
- Compare dimensões quando criar tensões interessantes (ex: "A diferença entre seu I (45%) e S (80%)...")
- Use exemplos concretos de situações de trabalho
- Conecte observações a comportamentos observáveis

EXEMPLOS DE ANÁLISE GENÉRICA (EVITAR):
❌ "Você é uma pessoa comunicativa e focada"
❌ "Tem grande potencial de liderança"
❌ "Pode melhorar algumas áreas"
❌ "Trabalha bem em equipe quando motivado"

EXEMPLOS DE ANÁLISE PROFUNDA (ESPERADO):
✅ "Seu score D de 85% combinado com C de 72% indica que você toma decisões rápidas MAS só após ter dados suficientes - isso pode causar tensão quando os dois lados entram em conflito"
✅ "A diferença de 35 pontos entre seu I (45%) e S (80%) sugere que você prefere conexões profundas e duradouras a networking superficial"
✅ "Em reuniões com muita discussão sem foco (baixo D percebido), você tende a desengajar - considere propor uma pauta estruturada"

FORMATO DE RESPOSTA:
Responda SEMPRE em JSON válido com a estrutura solicitada.
Cada seção deve ter conteúdo substancial (mínimo 50 palavras para textos, 3 itens para listas).
Use português brasileiro formal mas acessível.`;
}

// =============================================
// User Prompt com Dados do Assessment
// =============================================

export interface DISCScoresData {
  d_score: number;
  i_score: number;
  s_score: number;
  c_score: number;
  d_normalized: number;
  i_normalized: number;
  s_normalized: number;
  c_normalized: number;
  primary_profile: DISCDimension;
  secondary_profile: DISCDimension | null;
  intensity: string;
  is_balanced: boolean;
}

export function buildUserPrompt(
  scores: DISCScoresData,
  combinedProfile: DISCCombinedProfile,
  level: DISCAnalysisLevel
): string {
  const levelConfig = ANALYSIS_LEVELS[level];
  
  // Calcular insights numéricos
  const scoreDiffs = {
    DI: Math.abs(scores.d_normalized - scores.i_normalized),
    DS: Math.abs(scores.d_normalized - scores.s_normalized),
    DC: Math.abs(scores.d_normalized - scores.c_normalized),
    IS: Math.abs(scores.i_normalized - scores.s_normalized),
    IC: Math.abs(scores.i_normalized - scores.c_normalized),
    SC: Math.abs(scores.s_normalized - scores.c_normalized),
  };
  
  const maxDiff = Math.max(...Object.values(scoreDiffs));
  const minDiff = Math.min(...Object.values(scoreDiffs));
  
  return `DADOS OBJETIVOS DO ASSESSMENT (usar como base, não interpretar literalmente):

SCORES BRUTOS (8-40 por dimensão):
- D (Dominância): ${scores.d_score}/40
- I (Influência): ${scores.i_score}/40
- S (Estabilidade): ${scores.s_score}/40
- C (Conformidade): ${scores.c_score}/40

SCORES NORMALIZADOS (0-100%):
- D: ${scores.d_normalized.toFixed(1)}%
- I: ${scores.i_normalized.toFixed(1)}%
- S: ${scores.s_normalized.toFixed(1)}%
- C: ${scores.c_normalized.toFixed(1)}%

PERFIL IDENTIFICADO:
- Primário: ${scores.primary_profile}
- Secundário: ${scores.secondary_profile || 'Nenhum (perfil puro)'}
- Tipo de combinação: ${combinedProfile.combinationType}
- Intensidade do primário: ${scores.intensity}
- Perfil equilibrado: ${scores.is_balanced ? 'Sim' : 'Não'}

ANÁLISE NUMÉRICA (para calibrar insights):
- Maior diferença entre dimensões: ${maxDiff.toFixed(1)} pontos
- Menor diferença entre dimensões: ${minDiff.toFixed(1)} pontos
- Perfil tende a ser: ${scores.is_balanced ? 'versátil/adaptável' : 'especializado/intenso'}

TEXTOS BASE OFICIAIS (expandir e personalizar, NUNCA contradizer):

Resumo do perfil:
${combinedProfile.summary}

Como tende a agir:
${combinedProfile.behavior}

Forças naturais:
${combinedProfile.strengths.map(s => `• ${s}`).join('\n')}

Pontos de atenção:
${combinedProfile.watchPoints.map(w => `• ${w}`).join('\n')}

O que motiva:
${combinedProfile.motivators.map(m => `• ${m}`).join('\n')}

Ambiente ideal:
${combinedProfile.idealEnvironment.map(e => `• ${e}`).join('\n')}

---

TAREFA: Gere uma análise DISC completa para nível "${levelConfig.name}".

Responda em JSON com exatamente esta estrutura:
{
  "executiveSummary": "string - 2-3 frases capturando a essência",
  "leadershipStyle": "string - análise do estilo de liderança",
  "motivationEngagement": "string - o que engaja e motiva",
  "risksBlindSpots": "string - pontos de atenção sem julgamento",
  "communication": "string - estilo e dicas de comunicação",
  "idealEnvironment": "string - ambiente para máxima performance",
  "developmentPlan": {
    "immediate": ["ação 1", "ação 2"],
    "shortTerm": ["ação 1", "ação 2", "ação 3"],
    "longTerm": ["ação 1", "ação 2", "ação 3"]
  }
}

LEMBRE-SE: 
- Use perspectiva de ${levelConfig.perspective === 'first' ? 'primeira pessoa ("Você")' : 'terceira pessoa ("Este profissional")'}
- Tom: ${levelConfig.tone}
- Cada seção deve ter pelo menos 50 palavras
- Seja específico, cite os scores quando relevante`;
}

// =============================================
// Prompt para Saída de Sistema (Estruturada)
// =============================================

export function buildSystemOutputPrompt(scores: DISCScoresData): string {
  return `TAREFA: Gere uma saída estruturada para integração com outros sistemas.

DADOS:
- Scores: D=${scores.d_normalized.toFixed(1)}%, I=${scores.i_normalized.toFixed(1)}%, S=${scores.s_normalized.toFixed(1)}%, C=${scores.c_normalized.toFixed(1)}%
- Primário: ${scores.primary_profile}
- Secundário: ${scores.secondary_profile || 'null'}
- Intensidade: ${scores.intensity}
- Equilibrado: ${scores.is_balanced}

Responda em JSON com exatamente esta estrutura:
{
  "profileCode": "string - ex: D/C ou D",
  "intensity": "low" | "medium" | "high",
  "isBalanced": boolean,
  "scores": { "D": number, "I": number, "S": number, "C": number },
  "topStrengths": ["força 1", "força 2", "força 3"],
  "topRisks": ["risco 1", "risco 2", "risco 3"],
  "compatibilityWith": { "D": "high|medium|low", "I": "high|medium|low", "S": "high|medium|low", "C": "high|medium|low" }
}`;
}
