import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { callLLMTool } from '../_shared/llm-tool-call.ts';
import { compressTranscript } from '../_shared/transcript-compress.ts';
import { getEvaluatorTier, shouldCompressTranscript, getMaxTokensForTier, type EvaluatorTier } from '../_shared/evaluator-tier.ts';
import { logAIExecution } from '../_shared/ai-logger.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';
// V2 imports — module loaded so the next-turn wiring (prompt + scoring + shadow
// persistence) is a localized edit. Referenced via `void` to satisfy TS now.
import {
  calculateFinalScoreLegacy,
  loadShadowConfig,
  type StrictnessProfile,
} from '../_shared/culture-evaluation-v2.ts';
import {
  EVALUATION_SYSTEM_PROMPT_V4,
  calculateFinalScoreV4,
} from '../_shared/culture-evaluation-v4.ts';
import { computeInterviewDuration } from '../_shared/computeInterviewDuration.ts';
import { resolvePrompt } from '../_shared/aiPrompts.ts';

const OPTIMIZATION_VERSION = "v1_tooling_cache";

const log = createLogger('culture-interview-complete');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// TYPES
// ============================================================

interface ParsedQA {
  questionIndex: number;
  questionText: string;
  candidateResponse: string;
  aiComment?: string;
  valueLabel?: string;
  aiQuestionSpoken?: string;
  startSeconds?: number;
  endSeconds?: number;
}

interface TranscriptEntry {
  type: 'ai' | 'candidate';
  text: string;
  startSeconds: number;
  endSeconds?: number;
}

interface CultureContext {
  mission: string;
  vision: string;
  values: Array<{ label: string; dos: string[]; donts: string[] }>;
}

interface JobDescriptionContext {
  title: string;
  mission: string;
  responsibilities: string[];
  requiredSkills: string[];
  desiredSkills: string[];
  behavioralCompetencies: string[];
}

interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

interface CriterionEvaluationAI {
  criterionId: string;
  criterionName: string;
  score: number; // 0.0 to 100.0
  justification: string;
  alignmentLevel: 'Baixo' | 'Moderado' | 'Forte';
  positiveEvidence: Array<{
    questionIndex: number;
    quote: string;
    analysis: string;
  }>;
  negativeEvidence: Array<{
    questionIndex: number;
    quote: string;
    analysis: string;
  }>;
  questionsUsed: number[];
}

interface AIEvaluationResponse {
  criteriaEvaluations: CriterionEvaluationAI[];
  overallSummary: string;
  candidateStrengths: string[];
  candidateConcerns: string[];
}

// ============================================================
// CONSTANTS
// ============================================================

const IMPORTANCE_MULTIPLIERS: Record<string, number> = {
  minor: 1,
  moderate: 2,
  important: 3,
  very_important: 4,
  critical: 5,
};

const IMPORTANCE_LABELS: Record<string, string> = {
  minor: "Pouco Importante (x1)",
  moderate: "Moderado (x2)",
  important: "Importante (x3)",
  very_important: "Muito Importante (x4)",
  critical: "Crítico (x5)",
};

// ============================================================
// STEP 1: QUALITATIVE EVALUATION PROMPT (AI-Driven)
// ============================================================

const EVALUATION_SYSTEM_PROMPT = `Você é um especialista sênior em avaliação de fit cultural e RH comportamental.

SUA TAREFA:
Analisar a transcrição de uma entrevista cultural e avaliar o candidato em CADA critério fornecido, com sensibilidade ao contexto e ao estilo da resposta.

PRINCÍPIOS:
1. Para CADA critério, atribua uma nota de 0.0 a 100.0 (percentual de alcance).
2. Justifique a nota citando ou parafraseando as respostas do candidato. Aceite sinais conceituais (princípios, crenças, atitudes declaradas) como evidência válida quando não houver narrativa concreta — apenas pontue um pouco abaixo da faixa "satisfatório" nesse caso.
3. Use as descrições de excelência e sinais de alerta do critério como guia interpretativo, não como checklist rígido.
4. Considere o conjunto da entrevista (incluindo cobertura, follow-ups feitos ou não pelo entrevistador) antes de penalizar ausência de exemplos.

ESCALA DE NOTAS (PERCENTUAL):
- 0-20%: Candidato demonstrou comportamentos CONTRÁRIOS ao critério
- 21-40%: Candidato demonstrou de forma ABSTRATA ou GENÉRICA, sem articulação clara
- 41-60%: Candidato demonstrou PARCIALMENTE (conceitualmente alinhado, mas sem narrativa ou com ressalvas)
- 61-80%: Candidato demonstrou alinhamento SATISFATÓRIO (conceitual claro e/ou narrativa coerente)
- 81-100%: Candidato demonstrou EXCELÊNCIA (alinhamento conceitual + exemplos concretos e consistentes)

NÍVEIS DE ALINHAMENTO:
- Baixo: score < nota mínima do critério
- Moderado: score >= nota mínima e < 80%
- Forte: score >= 80%

Inclua, quando houver, citações diretas das respostas; quando não houver, parafraseie com fidelidade.`;

function buildEvaluationPrompt(
  responses: ParsedQA[],
  criteria: AgentCriterion[],
  context: CultureContext,
  jobContext: JobDescriptionContext | null,
  sellingContent: string,
  icpPatterns?: any,
  tier: EvaluatorTier = "optimized"
): string {
  const compress = shouldCompressTranscript(tier);
  return `
## CONTEXTO DA EMPRESA

Missão: ${context.mission || 'Não informada'}
Visão: ${context.vision || 'Não informada'}

Valores e Comportamentos:
${context.values.length > 0 
  ? context.values.map(v => `- **${v.label}**: Fazemos (${v.dos.join('; ')}), Não fazemos (${v.donts.join('; ')})`).join('\n')
  : 'Não informados'}

${sellingContent ? `
Proposta de Valor da Empresa (EVP):
${sellingContent.substring(0, 2000)}
` : ''}

${jobContext ? `
## VAGA

Cargo: ${jobContext.title}
Missão: ${jobContext.mission || 'Não informada'}
Competências Comportamentais: ${jobContext.behavioralCompetencies.join(', ') || 'Não informadas'}
` : ''}

## CRITÉRIOS DE AVALIAÇÃO (${criteria.length} critérios)

${criteria.map((c, i) => `
### ${i + 1}. ${c.name} (ID: ${c.id})
- **Descrição:** ${c.description}
- **Sinais de EXCELÊNCIA:** ${c.excellenceDescription || 'Não especificado'}
- **Sinais de ALERTA:** ${c.warningSignsDescription || 'Não especificado'}
- **Nota Mínima de Corte:** ${c.minimumScore * 10}% 
- **Importância:** ${IMPORTANCE_LABELS[c.importance]}
- **Peso:** ${c.weight}
`).join('\n')}

## TRANSCRIÇÃO DA ENTREVISTA (${responses.length} perguntas/respostas)

${responses.length === 0 
  ? `⚠️ NENHUMA RESPOSTA CAPTURADA - A entrevista foi encerrada sem respostas. Todas as notas devem ser 0.`
  : responses.map((r, i) => {
      const compactAnswer = compress
        ? (compressTranscript(r.candidateResponse).compressed || r.candidateResponse)
        : r.candidateResponse;
      return `
[P${i}] ${r.questionText}
[R${i}] "${compactAnswer}"
`;
    }).join('\n---\n')}

## INSTRUÇÕES DE AVALIAÇÃO

Avalie o candidato em CADA um dos ${criteria.length} critérios listados acima.

Para CADA critério:
1. Atribua uma nota de 0.0 a 100.0 (percentual de alcance, uma casa decimal) seguindo a escala interpretativa do system prompt.
2. Cite ou parafraseie trechos das respostas como evidência (prefira aspas quando houver narrativa concreta; aceite sinais conceituais quando a resposta for mais abstrata).
3. Justifique a nota em 2-4 frases, fiel às palavras do candidato.
4. Identifique evidências positivas e negativas separadamente.
5. Indique quais perguntas (índices) foram usadas para avaliar o critério.

${responses.length === 0 ? `
⚠️ IMPORTANTE: Como não há respostas, TODAS as notas devem ser 0.0 e justificativas devem explicar a impossibilidade de avaliação.
` : ''}

${icpPatterns ? `
## REFERÊNCIA: PADRÕES DE CANDIDATOS APROVADOS

Dados reais de ${icpPatterns.approvedCount} candidatos que foram APROVADOS em todas as etapas para esta mesma vaga:

${icpPatterns.culturalTraits?.length > 0 ? `Traits culturais mais frequentes entre aprovados: ${icpPatterns.culturalTraits.map((t: any) => `${t.trait} (${t.frequency}%)`).join(', ')}` : ''}
${icpPatterns.discProfiles?.length > 0 ? `Perfis DISC dominantes: ${icpPatterns.discProfiles.map((p: any) => `${p.profile} (${p.percentage}%)`).join(', ')}` : ''}
${icpPatterns.insights?.length > 0 ? `Insights: ${icpPatterns.insights.join('; ')}` : ''}

INSTRUÇÃO ADICIONAL: Ao final do overallSummary, inclua um parágrafo comparando este candidato com o padrão dos ${icpPatterns.approvedCount} aprovados anteriores. Destaque convergências e divergências relevantes. Não penalize divergências, apenas contextualize.
` : ''}

Responda APENAS em JSON válido conforme o schema:
{
  "criteriaEvaluations": [
    {
      "criterionId": "<UUID do critério>",
      "criterionName": "<nome do critério>",
      "score": <0.0 a 100.0>,
      "justification": "<2-4 frases com citações diretas do candidato>",
      "alignmentLevel": "<Baixo|Moderado|Forte>",
      "positiveEvidence": [
        {
          "questionIndex": <número da pergunta>,
          "quote": "<citação direta da resposta entre aspas>",
          "analysis": "<por que isso é positivo para o critério>"
        }
      ],
      "negativeEvidence": [
        {
          "questionIndex": <número>,
          "quote": "<citação direta>",
          "analysis": "<por que isso é negativo>"
        }
      ],
      "questionsUsed": [<índices das perguntas usadas>]
    }
  ],
  "overallSummary": "<síntese qualitativa do candidato em 2-3 parágrafos>",
  "candidateStrengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "candidateConcerns": ["<preocupação 1>", "<preocupação 2>"]
}`;
}

// ============================================================
// STEP 2: DETERMINISTIC SCORING (Code-Driven)
// ============================================================

interface ScoringResult {
  finalScore: number; // 0.0 to 100.0
  recommendation: "RECOMENDADO" | "RECOMENDADO_COM_RESSALVAS" | "NAO_RECOMENDADO";
  failedCriteria: Array<{ name: string; score: number; minimum: number; importance: string }>;
  criteriaWithImpact: Array<{
    criterionId: string;
    criterionName: string;
    score: number;
    weight: number;
    multiplier: number;
    effectiveWeight: number;
    impactPercentage: number;
    minimumPercent: number;
    passed: boolean;
    importance: string;
  }>;
}

function calculateFinalScore(
  criteriaEvaluations: CriterionEvaluationAI[],
  agentCriteria: AgentCriterion[]
): ScoringResult {
  let weightedSum = 0;
  let totalWeight = 0;
  const failedCriteria: ScoringResult["failedCriteria"] = [];
  const criteriaWithImpact: ScoringResult["criteriaWithImpact"] = [];

  for (const evaluation of criteriaEvaluations) {
    const criterion = agentCriteria.find(c => c.id === evaluation.criterionId);
    if (!criterion) {
      log.log(`⚠️ Criterion not found: ${evaluation.criterionId}`);
      continue;
    }

    const multiplier = IMPORTANCE_MULTIPLIERS[criterion.importance] || 1;
    const weight = criterion.weight || 1;
    const effectiveWeight = weight * multiplier;

    weightedSum += evaluation.score * effectiveWeight;
    totalWeight += effectiveWeight;

    // Convert minimum score (0-10) to percentage (0-100)
    const minimumPercent = (criterion.minimumScore || 5) * 10;
    const passed = evaluation.score >= minimumPercent;

    if (!passed) {
      failedCriteria.push({
        name: criterion.name,
        score: evaluation.score,
        minimum: minimumPercent,
        importance: criterion.importance,
      });
    }

    criteriaWithImpact.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      score: evaluation.score,
      weight,
      multiplier,
      effectiveWeight,
      impactPercentage: 0, // Will be calculated after we have totalWeight
      minimumPercent,
      passed,
      importance: criterion.importance,
    });
  }

  // Calculate impact percentages
  if (totalWeight > 0) {
    for (const c of criteriaWithImpact) {
      c.impactPercentage = (c.effectiveWeight / totalWeight) * 100;
    }
  }

  // Final score with 1 decimal place
  const finalScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 10) / 10
    : 0;

  // Determine recommendation
  const criticalFailed = failedCriteria.filter(f =>
    f.importance === 'critical' || f.importance === 'very_important'
  );

  let recommendation: ScoringResult["recommendation"];
  if (finalScore >= 75 && failedCriteria.length === 0) {
    recommendation = "RECOMENDADO";
  } else if (finalScore >= 50 && criticalFailed.length === 0) {
    recommendation = "RECOMENDADO_COM_RESSALVAS";
  } else {
    recommendation = "NAO_RECOMENDADO";
  }

  log.log(`📊 Scoring complete: ${finalScore.toFixed(1)}% - ${recommendation}`);
  log.log(`   Failed criteria: ${failedCriteria.length} (${criticalFailed.length} critical/very_important)`);

  return { finalScore, recommendation, failedCriteria, criteriaWithImpact };
}

// ============================================================
// TRANSCRIPT PARSING
// ============================================================

async function parseTranscript(supabase: any, sessionId: string, transcript: string, questions: any[], transcriptEntries?: TranscriptEntry[]): Promise<ParsedQA[]> {
  const responses: ParsedQA[] = [];
  
  if (!questions || questions.length === 0) {
    log.log("⚠️ No questions to parse");
  }

  // Camada A: Pareamento por Eventos de Condução (Cérebro da entrevista)
  try {
    const { data: events } = await supabase
      .from('voice_interview_events')
      .select('event_type, payload, client_ts')
      .eq('session_id', sessionId)
      .eq('event_type', 'question_started')
      .order('client_ts', { ascending: true });

    if (events && events.length > 0 && transcriptEntries && transcriptEntries.length > 0) {
      log.log(`🎯 Found ${events.length} question_started events. Attempting Layer A: Event-based pairing.`);
      const responses = parseEventBasedTranscript(questions, transcriptEntries, events);
      if (responses.length > 0) {
        log.log(`✅ Layer A success: ${responses.length} responses paired by events`);
        return responses;
      }
      log.log("⚠️ Layer A produced 0 responses, falling back to Layer B");
    }
  } catch (eventErr) {
    log.error("❌ Layer A Error:", eventErr);
  }

  // Camada B: Pareamento por Timestamps estruturados (Se fornecidos pelo frontend)
  if (transcriptEntries && transcriptEntries.length > 0) {
    log.log("📝 Layer B: Using structured transcript entries with timestamps");
    return parseStructuredTranscript(questions, transcriptEntries);
  }

  // Fallback to old string parsing
  if (!transcript) {
    log.log("⚠️ No transcript to parse");
    return responses;
  }

  log.log("📝 Parsing legacy string transcript...");
  const lines = transcript.split('\n').filter(line => line.trim());
  
  const messages: { type: 'ai' | 'candidate', text: string }[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Entrevistadora:') || trimmedLine.startsWith('Entrevistador:') || trimmedLine.startsWith('Gêntia:') || trimmedLine.startsWith('GENTIA:') || trimmedLine.startsWith('AI:') || trimmedLine.startsWith('Interviewer:')) {
      const text = trimmedLine.replace(/^(Entrevistadora|Entrevistador|Gêntia|GENTIA|AI|Interviewer):/, '').trim();
      if (text) messages.push({ type: 'ai', text });
    } else if (trimmedLine.startsWith('Candidato:')) {
      const text = trimmedLine.replace(/^Candidato:/, '').trim();
      if (text) messages.push({ type: 'candidate', text });
    }
  }

  // Pair AI questions with candidate responses using the robust matcher
  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const question = questions[qIdx];
    const qTokens = new Set(_normalizeTokens(question.question_text || ''));
    if (qTokens.size === 0) continue;

    let questionMessageIdx = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type === 'ai') {
        const aiTokens = new Set(_normalizeTokens(messages[i].text));
        let intersection = 0;
        for (const t of qTokens) if (aiTokens.has(t)) intersection++;
        const union = qTokens.size + aiTokens.size - intersection;
        const jaccard = union === 0 ? 0 : intersection / union;
        if ((jaccard >= 0.5 && intersection >= 3) || (intersection >= 3 && intersection === qTokens.size)) {
          questionMessageIdx = i;
          break;
        }
      }
    }

    if (questionMessageIdx === -1) continue;

    let candidateResponse = '';
    let aiComment = '';
    const aiQuestionSpoken = messages[questionMessageIdx].text;
    
    for (let i = questionMessageIdx + 1; i < messages.length; i++) {
      if (messages[i].type === 'candidate') {
        candidateResponse += (candidateResponse ? ' ' : '') + messages[i].text;
      } else if (messages[i].type === 'ai') {
        aiComment = messages[i].text;
        break;
      }
    }

    if (candidateResponse) {
      responses.push({
        questionIndex: qIdx,
        questionText: question.question_text,
        candidateResponse: candidateResponse.trim(),
        aiComment: aiComment || undefined,
        valueLabel: question.value_label || undefined,
        aiQuestionSpoken,
      });
    }
  }

  // Fallback: sequential pairing
  if (responses.length === 0) {
    log.log("⚠️ Using fallback: sequential pairing");
    const candidateMessages = messages.filter(m => m.type === 'candidate');
    const aiMessages = messages.filter(m => m.type === 'ai');
    
    for (let i = 0; i < Math.min(questions.length, candidateMessages.length); i++) {
      responses.push({
        questionIndex: i,
        questionText: questions[i]?.question_text || `Pergunta ${i + 1}`,
        candidateResponse: candidateMessages[i].text,
        valueLabel: questions[i]?.value_label || undefined,
        aiQuestionSpoken: aiMessages[i]?.text,
      });
    }
  }

  log.log(`📊 Parsed ${responses.length} responses from legacy transcript`);
  return responses;
}

// Heuristic: detect AI turns that are pure acknowledgment/transition (no actual new question).
// When the AI starts with these patterns and contains no question mark in the first sentence,
// candidate speech that follows likely belongs to the PREVIOUS question.
const ACK_PREFIXES = /^(é (realmente|muito)|que (bom|ótimo|otimo|interessante|legal)|essa busca|entendo|entendi|perfeito|muito (bom|interessante|legal)|ter (a |)proatividade|excelente|sucesso para você|sucesso para voce|compreendo|isso é|interessante|claro|ótimo|otimo|você (valoriza|tem|mostra)|voce (valoriza|tem|mostra)|fico (feliz|contente)|é (legal|interessante|inspirador)|inspirador|admiro|reconhe(ço|co)|gostei|legal saber|bom saber|sei|certo[, ]|bacana|adoro|que legal)/i;

function isAcknowledgmentOnly(aiText: string): boolean {
  if (!aiText) return false;
  const trimmed = aiText.trim();
  // Get the part before the first question mark or end of first 2 sentences.
  const firstQ = trimmed.indexOf('?');
  // If question mark appears very late (>200 chars), the early part is likely acknowledgment.
  if (firstQ === -1) return ACK_PREFIXES.test(trimmed);
  if (firstQ < 60) return false; // short ack + question = treat as new question normally
  // Long preamble before question: still has a question, so NOT pure ack — but mark for caution.
  return false;
}

function parseStructuredTranscript(questions: any[], entries: TranscriptEntry[]): ParsedQA[] {
  const responses: ParsedQA[] = [];
  const sortedEntries = [...entries].sort((a, b) => a.startSeconds - b.startSeconds);
  
  log.log(`📝 Processing ${sortedEntries.length} transcript entries`);
  
  let questionCounter = 0;
  let i = 0;
  
  while (i < sortedEntries.length) {
    const entry = sortedEntries[i];
    
    if (entry.type === 'ai') {
      // CAMADA 2: if this AI turn is pure acknowledgment AND we already have a previous response,
      // merge any following candidate speech into the PREVIOUS response instead of creating a new Q.
      if (isAcknowledgmentOnly(entry.text) && responses.length > 0) {
        log.log(`🔁 Acknowledgment-only AI turn detected at ${entry.startSeconds}s — merging following candidate speech into previous response`);
        i++;
        const prev = responses[responses.length - 1];
        while (i < sortedEntries.length && sortedEntries[i].type === 'candidate') {
          const c = sortedEntries[i];
          prev.candidateResponse = (prev.candidateResponse + ' ' + c.text).trim();
          prev.endSeconds = c.endSeconds || c.startSeconds || prev.endSeconds;
          i++;
        }
        continue;
      }

      const aiQuestionSpoken = entry.text;
      let candidateResponse = '';
      let responseStartSeconds: number | undefined;
      let responseEndSeconds: number | undefined;
      
      i++;
      while (i < sortedEntries.length && sortedEntries[i].type === 'candidate') {
        const candidateEntry = sortedEntries[i];
        if (!responseStartSeconds) responseStartSeconds = candidateEntry.startSeconds;
        candidateResponse += (candidateResponse ? ' ' : '') + candidateEntry.text;
        responseEndSeconds = candidateEntry.endSeconds || candidateEntry.startSeconds;
        i++;
      }
      
      if (candidateResponse) {
        const matchedQuestion = findMatchingQuestion(questions, aiQuestionSpoken);
        const questionText = matchedQuestion?.question_text || aiQuestionSpoken;
        
        responses.push({
          questionIndex: questionCounter,
          questionText,
          candidateResponse: candidateResponse.trim(),
          aiQuestionSpoken,
          valueLabel: matchedQuestion?.value_label || undefined,
          startSeconds: responseStartSeconds,
          endSeconds: responseEndSeconds,
        });
        questionCounter++;
      }
    } else {
      // Spontaneous candidate entry without preceding AI turn — if there's a previous response,
      // merge in (continuation), otherwise create a standalone entry.
      if (responses.length > 0) {
        const prev = responses[responses.length - 1];
        prev.candidateResponse = (prev.candidateResponse + ' ' + entry.text).trim();
        prev.endSeconds = entry.endSeconds || entry.startSeconds || prev.endSeconds;
      } else {
        responses.push({
          questionIndex: questionCounter,
          questionText: '[Resposta espontânea]',
          candidateResponse: entry.text,
          startSeconds: entry.startSeconds,
          endSeconds: entry.endSeconds,
        });
        questionCounter++;
      }
      i++;
    }
  }
  
  log.log(`📊 Parsed ${responses.length} Q&A pairs from structured entries`);
  return responses;
}

function parseEventBasedTranscript(questions: any[], entries: TranscriptEntry[], events: any[]): ParsedQA[] {
  const responses: ParsedQA[] = [];
  const sortedEntries = [...entries].sort((a, b) => a.startSeconds - b.startSeconds);
  
  // Create timeline of questions from events
  const questionTimeline = events.map((ev, idx) => {
    const nextEv = events[idx + 1];
    return {
      index: ev.payload?.index ?? idx,
      startSeconds: ev.payload?.timestamp || 0, // Fallback if timestamp not in payload
      endSeconds: nextEv ? (nextEv.payload?.timestamp || 999999) : 999999,
      questionText: ev.payload?.text || questions[ev.payload?.index]?.question_text || ''
    };
  });

  for (const q of questionTimeline) {
    // Find all transcript entries that fall within this question's time window
    // We add a small buffer (2s) to catch responses that might have started just before the "event" logged
    const qEntries = sortedEntries.filter(e => 
      e.startSeconds >= (q.startSeconds - 2) && e.startSeconds < q.endSeconds
    );

    const aiTurns = qEntries.filter(e => e.type === 'ai');
    const candidateTurns = qEntries.filter(e => e.type === 'candidate');

    if (candidateTurns.length > 0) {
      const candidateResponse = candidateTurns.map(t => t.text).join(' ').trim();
      const aiQuestionSpoken = aiTurns.map(t => t.text).join(' ').trim() || q.questionText;
      const matchedQuestion = questions[q.index] || findMatchingQuestion(questions, aiQuestionSpoken);

      responses.push({
        questionIndex: q.index,
        questionText: matchedQuestion?.question_text || q.questionText,
        candidateResponse,
        aiQuestionSpoken,
        valueLabel: matchedQuestion?.value_label || undefined,
        startSeconds: candidateTurns[0].startSeconds,
        endSeconds: candidateTurns[candidateTurns.length - 1].endSeconds,
      });
    }
  }

  return responses;
}

// PT-BR stopwords for question matching (filters generic words like "você", "atualmente")
const PT_STOPWORDS = new Set([
  "que","como","para","com","sem","mais","menos","muito","pouco","bem","mal",
  "voce","você","vocês","voces","seu","sua","seus","suas","meu","minha","meus","minhas",
  "nosso","nossa","nossos","nossas","esse","essa","esses","essas","este","esta","estes","estas",
  "isso","isto","aquilo","onde","quando","quem","qual","quais","porque","por","pois",
  "uma","uns","umas","dos","das","nos","nas","aos","pelo","pela","pelos","pelas",
  "atualmente","hoje","agora","então","entao","tudo","nada","algo","alguém","alguem",
  "ser","estar","ter","fazer","poder","sobre","também","tambem","ainda","sempre","nunca",
  "cada","tão","tao","aqui","ali","lá","la","favor","vamos","vou","gente","tipo",
  "coisa","coisas","conte","conta","fala","falar","diga","obrigado","obrigada","beleza",
  "legal","perfeito","entendi","ótimo","otimo","certo","exato",
]);

function _normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !PT_STOPWORDS.has(w));
}

function findMatchingQuestion(questions: any[], aiText: string): any | null {
  if (!questions || questions.length === 0 || !aiText) return null;
  const spokenTokens = new Set(_normalizeTokens(aiText));
  if (spokenTokens.size === 0) return null;

  let best: { q: any; jaccard: number; overlap: number; qTokenCount: number } | null = null;
  for (const q of questions) {
    const qTokens = new Set(_normalizeTokens(q.question_text || ""));
    if (qTokens.size === 0) continue;
    let intersection = 0;
    for (const t of qTokens) if (spokenTokens.has(t)) intersection++;
    const union = qTokens.size + spokenTokens.size - intersection;
    const jaccard = union === 0 ? 0 : intersection / union;
    if (!best || jaccard > best.jaccard) {
      best = { q, jaccard, overlap: intersection, qTokenCount: qTokens.size };
    }
  }
  if (best && best.jaccard >= 0.5 && best.overlap >= 3) return best.q;
  if (best && best.overlap >= 3 && best.overlap === best.qTokenCount) return best.q;
  return null;
}

// ============================================================
// STRUCTURED EVENT LOGGING (debug timeline)
// ============================================================
// Logs em JSON de uma linha para facilitar filtro por sessionId nos
// edge logs do Supabase. Não substitui logs existentes — complementa.
function logEvent(event: string, sessionId: string | null, data: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      fn: 'culture-interview-complete',
      event,
      sessionId,
      ...data,
    }));
  } catch (_e) { /* ignore */ }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Sobrevive a disconnect do cliente: registra a execução completa como
  // background work no Edge Runtime. Se o candidato fechar a aba enquanto a
  // avaliação (LLM + score + update + cobrança) está rodando, o runtime
  // continua processando até o fim em vez de cancelar no meio.
  // Cliente conectado continua recebendo a mesma resposta síncrona de hoje.
  const handlerPromise = (async (): Promise<Response> => {


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { sessionId, transcript, transcriptEntries, durationSeconds, tokenUsage, completedNaturally, force } = body;

    logEvent('complete_attempted', sessionId ?? null, {
      hasTranscript: !!transcript,
      transcriptEntriesCount: Array.isArray(transcriptEntries) ? transcriptEntries.length : 0,
      durationSeconds: durationSeconds ?? null,
      completedNaturally: completedNaturally ?? null,
      force: force === true,
    });




    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // FETCH SESSION
    // ========================
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Test/simulation sessions: roda avaliação completa (transcript, IA,
    // score, áudio, behavioral insights) MAS pula billing, criação de
    // application/funil, orchestrator e notificações. O guard
    // `if (!isTestSession)` é aplicado abaixo nos pontos exatos.
    const isTestSession = (session as any).is_test === true;
    if (isTestSession) {
      console.log("🧪 Test session detected — rodando avaliação completa, sem billing/funil/notificações:", sessionId);
    }

    // ════════════════════════════════════════════════════════════════════
    // COVERAGE GATE — UNIFICADO (simulação + produção)
    // ════════════════════════════════════════════════════════════════════
    // Roda para TODAS as sessões. Comportamento por modo:
    //
    //   SIMULAÇÃO (is_test=true) sem force:
    //     → retorna 409 para o tester continuar respondendo
    //       (UI oferece "Encerrar mesmo assim" via force=true).
    //
    //   PRODUÇÃO (is_test=false) OU simulação com force=true:
    //     → NÃO bloqueia. Registra metadata.partial_coverage + anomalia
    //       early_end_forced (severity=warning) e segue para avaliação,
    //       score parcial e consumeAICredits NORMAL (cobra integral porque
    //       o custo de IA já foi incorrido).
    //
    // Fonte da verdade: culture_interview_responses (count) + coverage_log
    // (semantic match — pega o maior dos dois).
    try {
      const questions = ((session as any).questions as Array<any>) || [];
      const total = (session as any).questions_total ?? questions.length;
      const coverageLog = ((session as any).coverage_log as Array<{ question_index: number }>) || [];
      const coveredIdx = new Set(coverageLog.map((c) => c.question_index));
      // Recompute: count distinct responses as fallback (fonte da verdade real)
      const { count: respCount } = await supabase
        .from("culture_interview_responses")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      const coveredFromLog = (session as any).questions_covered ?? coveredIdx.size;
      const covered = Math.max(coveredFromLog, respCount ?? 0);
      const missing = questions
        .map((q: any, i: number) => ({
          index: i,
          question: q.question_text || `Pergunta ${i + 1}`,
          value_label: q.value_label || null,
        }))
        .filter((q) => !coveredIdx.has(q.index));

      const isPartial = total > 0 && covered < total;

      logEvent('coverage_check', sessionId, {
        isTest: isTestSession, covered, total, missingCount: missing.length, force: force === true, isPartial,
      });

      // 1) SIMULAÇÃO sem force → bloqueia com 409
      if (isPartial && isTestSession && force !== true) {
        const prevMeta = ((session as any).metadata as Record<string, unknown>) || {};
        await supabase
          .from("culture_interview_sessions")
          .update({
            metadata: {
              ...prevMeta,
              early_end_attempted_at: new Date().toISOString(),
              early_end_attempt_coverage: { covered, total },
            },
          })
          .eq("id", sessionId);

        logEvent('blocked_409', sessionId, { isTest: true, covered, total, missing: missing.map(m => m.index) });
        console.log(`🚧 [test gate] sessão ${sessionId}: ${covered}/${total} coberta — encerramento bloqueado (use force=true para forçar)`);
        return new Response(
          JSON.stringify({
            error: "coverage_incomplete",
            reopen: true,
            covered,
            total,
            missing,
            message: `Faltam ${total - covered} pergunta(s) para concluir. Continue respondendo ou envie force=true para encerrar mesmo assim.`,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // 2) PRODUÇÃO parcial OU simulação parcial com force=true
      //    → registra auditoria e SEGUE para avaliação + billing
      if (isPartial) {
        const prevMeta = ((session as any).metadata as Record<string, unknown>) || {};
        await supabase
          .from("culture_interview_sessions")
          .update({
            metadata: {
              ...prevMeta,
              early_end_attempted_at: new Date().toISOString(),
              partial_coverage: {
                covered,
                total,
                forced_by: isTestSession ? "candidate" : "auto_production",
                forced_at: new Date().toISOString(),
                missing: missing.map((m) => m.index),
              },
            },
          })
          .eq("id", sessionId);

        try {
          await supabase
            .from("voice_interview_anomalies")
            .upsert(
              {
                account_id: (session as any).account_id,
                session_id: sessionId,
                session_type: "cultural",
                candidate_id: (session as any).candidate_id ?? null,
                job_id: (session as any).job_id ?? null,
                agent_id: (session as any).agent_id ?? null,
                severity: "warning",
                rule_code: "early_end_forced",
                description: isTestSession
                  ? `Simulação encerrada com cobertura parcial (${covered}/${total}).`
                  : `Entrevista encerrada com cobertura parcial (${covered}/${total}).`,
                suggestion: "Revisar prompt do agente ou questões para garantir cobertura natural.",
                metrics: { covered, total, missing_count: missing.length, is_test: isTestSession },
              },
              { onConflict: "session_id,rule_code" },
            );
        } catch (anomalyErr) {
          console.warn("[coverage gate] falha ao registrar anomalia early_end_forced (continuando):", anomalyErr);
        }
        logEvent('partial_finalize', sessionId, {
          isTest: isTestSession, covered, total, missing: missing.map(m => m.index),
        });
        console.log(
          `⚠️ [coverage gate] sessão ${sessionId} (${isTestSession ? "teste" : "produção"}): finalizando com ${covered}/${total}`,
        );
      }
    } catch (gateErr) {
      console.error("[coverage gate] erro inesperado (continuando para evitar travar candidato):", gateErr);
    }

    // ════════════════════════════════════════════════════════════════════
    // If the candidate produced ZERO usable response in less than 60s and the
    // session did NOT end naturally (i.e. user/AI didn't say goodbye), treat
    // this as a technical failure (mic permission denied / WebRTC dropped /
    // in-app browser blocked / language drift loop) instead of a real 0%
    // evaluation. We:
    //   1) mark status='failed_technical' (UI shows banner, no score shown)
    //   2) DO NOT call the AI evaluator (would just produce a garbage 0%)
    //   3) DO NOT consume credits (account is not charged for a glitch)
    //   4) Return early so the candidate's link can be reused
    // The watchdog has the same logic for sessions abandoned without complete()
    // being called.
    try {
      const partialT = ((session as any).partial_transcript || "").trim();
      const transcriptStr = (typeof transcript === "string" ? transcript : "").trim();
      const candidateSpoke =
        /candidato:|candidate:|user:/i.test(partialT) ||
        /candidato:|candidate:|user:/i.test(transcriptStr);
      const startedAtMs = (session as any).started_at ? new Date((session as any).started_at).getTime() : 0;
      const wallSeconds = startedAtMs ? Math.round((Date.now() - startedAtMs) / 1000) : (durationSeconds ?? 0);
      const isTooShort = wallSeconds > 0 && wallSeconds < 60;
      const isNotNatural = completedNaturally === false || completedNaturally == null;

      if (!candidateSpoke && isTooShort && isNotNatural) {
        console.warn(`⚠️ Technical failure detected for session ${sessionId}: wallSeconds=${wallSeconds}, candidateSpoke=${candidateSpoke}, completedNaturally=${completedNaturally}`);

        await supabase
          .from("culture_interview_sessions")
          .update({
            status: "failed_technical",
            completed_at: new Date().toISOString(),
            completed_naturally: false,
            abandoned_reason: "technical_failure_no_candidate_audio",
            audio_status: (session as any).audio_url ? "available" : "missing",
            duration_seconds: wallSeconds,
            // Never charge for technical failures. If a prior step already
            // debited credits, mark them as reverted (manual revert tracked
            // separately by ops via credits_reverted_at).
            credits_reverted_at: (session as any).credits_consumed_at ? new Date().toISOString() : null,
            matching_analysis: "Sessão encerrada por falha técnica antes da candidata responder. Convite continua válido — a candidata pode tentar novamente pelo mesmo link.",
          })
          .eq("id", sessionId);

        // Telemetry
        if ((session as any).account_id) {
          await supabase.from("voice_interview_events").insert({
            account_id: (session as any).account_id,
            session_id: sessionId,
            session_type: "cultural",
            event_type: "failed_technical_no_candidate_audio",
            payload: {
              wall_seconds: wallSeconds,
              transcript_chars: partialT.length + transcriptStr.length,
              completed_naturally: completedNaturally,
            },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          failed_technical: true,
          message: "Sessão encerrada sem áudio do candidato. Nenhum crédito foi cobrado e a candidata pode tentar novamente pelo mesmo link.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (safeguardErr) {
      console.error("⚠️ failed_technical safeguard error (continuing to normal eval):", safeguardErr);
    }






    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const questions = session.questions || [];
    const accountId = session.account_id;

    // ========================
    // COMPUTE DURATION (single source of truth)
    // Priority: tokenUsage audio seconds → last_activity_at − started_at →
    // client-reported durationSeconds → completed_at − started_at.
    // Used everywhere downstream (session.duration_seconds, token usage row,
    // cost/credits calculation). Idle time after the candidate stops
    // interacting does NOT count.
    // ========================
    const finalDurationSeconds = computeInterviewDuration({
      audioDurationSeconds: (session as any).audio_duration_seconds,
      lastActivityAt: session.last_activity_at,
      startedAt: session.started_at,
      completedAt: new Date().toISOString(),
      clientDurationSeconds: durationSeconds,
    });
    log.log(`⏱️ Duration resolved: ${finalDurationSeconds}s (audio=${(session as any).audio_duration_seconds ?? 'n/a'}, last_activity=${session.last_activity_at ?? 'n/a'}, client=${durationSeconds ?? 'n/a'})`);
    
    
    // ========================
    // PARSE TRANSCRIPT
    // ========================
    log.log("📝 Parsing transcript...");
    
    // First check for pre-saved responses in the database (merge strategy)
    const { data: savedResponses } = await supabase
      .from('culture_interview_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_index');
    
    let parsedResponses: ParsedQA[];
    
    // Normalize transcriptEntries to accept both formats (role/type, timestamp/startSeconds)
    const normalizedEntries: TranscriptEntry[] | undefined = transcriptEntries?.map((e: any) => ({
      type: e.type === 'user' ? 'candidate' : (e.type || e.role || 'candidate'),
      text: e.text,
      startSeconds: e.startSeconds ?? e.timestamp ?? 0,
      endSeconds: e.endSeconds,
    }));

    // SOBERANÍA DOS TURNOS: Se já temos respostas salvas turno-a-turno e NÃO estamos forçando 
    // um reprocessamento completo via transcriptEntries estruturado, preferimos manter o que está no DB.
    // Isso evita a aglutinação ("Resposta espontânea") quando o sistema tenta reconstruir no final.
    const hasValidSavedResponses = savedResponses && savedResponses.length > 0 && savedResponses.some(r => r.candidate_response);

    if (normalizedEntries && normalizedEntries.length > 0 && !hasValidSavedResponses) {
      log.log(`📝 Parsing transcript from ${normalizedEntries.length} structured entries (fallback reconstruction)`);
      parsedResponses = await parseTranscript(supabase, sessionId, transcript, questions, normalizedEntries);
    } else if (hasValidSavedResponses) {
      log.log(`📦 Using ${savedResponses!.length} pre-saved responses from database (turn sovereignty)`);
      parsedResponses = savedResponses!.map(r => ({
        questionIndex: r.question_index,
        questionText: r.question_text,
        candidateResponse: r.candidate_response,
        aiComment: r.ai_comment || undefined,
        valueLabel: r.value_label || undefined,
        aiQuestionSpoken: r.ai_question_spoken || undefined,
        startSeconds: r.start_seconds || undefined,
        endSeconds: r.end_seconds || undefined,
      }));
    } else {
      // Emergency fallback if both are empty/invalid
      log.log("⚠️ No pre-saved responses or entries found, attempting legacy string parsing");
      parsedResponses = await parseTranscript(supabase, sessionId, transcript, questions, normalizedEntries);
    }

    // Save parsed responses to database (ONLY if the table was empty)
    if (parsedResponses.length > 0 && (!savedResponses || savedResponses.length === 0)) {
      const responsesToInsert = parsedResponses.map(r => ({
        session_id: sessionId,
        question_index: r.questionIndex,
        question_text: r.questionText,
        candidate_response: r.candidateResponse,
        ai_comment: r.aiComment || null,
        value_label: r.valueLabel || null,
        ai_question_spoken: r.aiQuestionSpoken || null,
        start_seconds: r.startSeconds || null,
        end_seconds: r.endSeconds || null,
      }));

      const { error: insertError } = await supabase
        .from("culture_interview_responses")
        .insert(responsesToInsert);

      if (insertError) {
        log.error("❌ Error saving responses:", insertError);
      } else {
        log.log("✅ Saved individual responses to database");
      }
    }
    
    log.log(`✅ Total responses: ${parsedResponses.length}`);
    
    const isEarlyTermination = parsedResponses.length < 3;
    if (isEarlyTermination) {
      log.log(`⚠️ Early termination detected: only ${parsedResponses.length} responses`);
    }

    // ========================
    // LOAD CONTEXT DATA
    // ========================
    
    // 1. Culture Context
    log.log("📊 Loading culture context...");
    let cultureContext: CultureContext = { mission: '', vision: '', values: [] };
    
    try {
      const { data: missionData } = await supabase
        .from('mission_sessions')
        .select('analysis')
        .eq('account_id', accountId)
        .maybeSingle();

      const { data: visionData } = await supabase
        .from('vision_sessions')
        .select('analysis, final_vision')
        .eq('account_id', accountId)
        .maybeSingle();

      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      if (valuesSession?.id) {
        const { data: behaviors } = await supabase
          .from('values_behaviors_selections')
          .select('value_label, do_selected, dont_selected')
          .eq('session_id', valuesSession.id);

        if (behaviors && behaviors.length > 0) {
          cultureContext.values = behaviors.map(b => ({
            label: b.value_label,
            dos: b.do_selected || [],
            donts: b.dont_selected || [],
          }));
        }
      }

      cultureContext.mission = (missionData?.analysis as any)?.mission || '';
      cultureContext.vision = visionData?.final_vision || (visionData?.analysis as any)?.vision_inspirational || '';
      
      log.log("✅ Culture context loaded");
    } catch (error) {
      log.error("⚠️ Error loading culture context:", error);
    }

    // 2. Job Description
    log.log("📋 Loading job description...");
    let jobContext: JobDescriptionContext | null = null;
    
    try {
      const { data: recruitmentJob } = await supabase
        .from('recruitment_jobs')
        .select('job_description_id')
        .eq('id', session.job_id)
        .maybeSingle();

      if (recruitmentJob?.job_description_id) {
        const { data: jd } = await supabase
          .from('job_descriptions')
          .select('title, mission, responsibilities, required_skills, desired_skills, behavioral_competencies')
          .eq('id', recruitmentJob.job_description_id)
          .maybeSingle();

        if (jd) {
          jobContext = {
            title: jd.title || '',
            mission: jd.mission || '',
            responsibilities: jd.responsibilities || [],
            requiredSkills: jd.required_skills || [],
            desiredSkills: jd.desired_skills || [],
            behavioralCompetencies: jd.behavioral_competencies || [],
          };
        }
      }
    } catch (error) {
      log.error("⚠️ Error loading job description:", error);
    }

    // 3. Selling Content (EVP)
    log.log("🏢 Loading EVP content...");
    let sellingCompanyContent = '';
    
    try {
      const { data: sellingSession } = await supabase
        .from('selling_company_sessions')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      if (sellingSession?.id) {
        const { data: approvedVersion } = await supabase
          .from('selling_company_versions')
          .select('content')
          .eq('session_id', sellingSession.id)
          .eq('approved', true)
          .maybeSingle();

        if (approvedVersion?.content) {
          sellingCompanyContent = approvedVersion.content;
        }
      }
    } catch (error) {
      log.error("⚠️ Error loading EVP:", error);
    }

    // 4. Agent Criteria
    log.log("📊 Loading agent criteria...");
    let agentCriteria: AgentCriterion[] = [];
    let strictnessProfile: StrictnessProfile = "standard";
    let agentId: string | null = null;
    let overallMinimumScore = 7.0;
    
    try {
      // 4-level fallback for agent resolution:
      // 1. session.agent_id (resolved during interview)
      // 2. recruitment_jobs.agent_id
      // 3. workflow step cultural
      // 4. any active cultural agent for account

      // Level 1: session agent_id
      agentId = session.agent_id || null;
      if (agentId) {
        log.log(`✅ Agent resolved from session: ${agentId}`);
      }

      // Level 2: recruitment_jobs.agent_id
      if (!agentId) {
        const { data: recruitmentJob } = await supabase
          .from('recruitment_jobs')
          .select('agent_id')
          .eq('id', session.job_id)
          .maybeSingle();
        if (recruitmentJob?.agent_id) {
          agentId = recruitmentJob.agent_id;
          log.log(`✅ Agent resolved from job: ${agentId}`);
        }
      }

      // Level 3: workflow step cultural (FIX: tabela correta = recruitment_job_workflow_steps)
      if (!agentId) {
        const { data: workflowStep } = await supabase
          .from('recruitment_job_workflow_steps')
          .select('agent_id')
          .eq('job_id', session.job_id)
          .eq('step_type', 'cultural')
          .eq('is_active', true)
          .not('agent_id', 'is', null)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (workflowStep?.agent_id) {
          agentId = workflowStep.agent_id;
          log.log(`✅ Agent resolved from workflow step: ${agentId}`);
        }
      }

      // Level 4: any active cultural/structured agent for account
      // (seeded agents use type='structured', custom ones may use 'cultural')
      if (!agentId) {
        const { data: defaultAgent } = await supabase
          .from('recruitment_agents')
          .select('id')
          .eq('account_id', accountId)
          .in('type', ['cultural', 'structured'])
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (defaultAgent?.id) {
          agentId = defaultAgent.id;
          log.log(`✅ Agent resolved from account default: ${agentId}`);
        }
      }

      if (!agentId) {
        log.error(`❌ No cultural agent could be resolved for session ${sessionId} (job=${session.job_id}, account=${accountId})`);
      }

      if (agentId) {
        const { data: agentSettings } = await supabase
          .from('recruitment_agents')
          .select('minimum_score, strictness_profile, is_active')
          .eq('id', agentId)
          .maybeSingle();

        if (agentSettings && (agentSettings as any).is_active === false) {
          log.log(`⚠️ Resolved agent ${agentId} is inactive — using its settings anyway (already in use by session)`);
        }

        if (agentSettings?.minimum_score != null) {
          const parsed = typeof agentSettings.minimum_score === 'number'
            ? agentSettings.minimum_score
            : parseFloat(String(agentSettings.minimum_score));
          if (!Number.isNaN(parsed)) {
            overallMinimumScore = Math.round(Math.min(10, Math.max(0, parsed)) * 10) / 10;
          }
        }
        const sp = (agentSettings as any)?.strictness_profile;
        if (sp === 'lenient' || sp === 'standard' || sp === 'strict') {
          strictnessProfile = sp;
        }

        const { data: criteriaData } = await supabase
          .from('recruitment_agent_criteria')
          .select('*')
          .eq('agent_id', agentId)
          .order('weight', { ascending: false });

        if (criteriaData && criteriaData.length > 0) {
          agentCriteria = criteriaData.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            excellenceDescription: c.excellence_description || '',
            warningSignsDescription: c.warning_signs_description || '',
            minimumScore: c.minimum_score ?? 5,
            importance: c.importance as AgentCriterion["importance"],
            weight: c.weight ?? 1,
            color: c.color || 'gray',
          }));
          log.log(`✅ Loaded ${agentCriteria.length} agent criteria`);
        }
      } else {
        log.log("⚠️ No agent found via any fallback level");
      }
    } catch (error) {
      log.error("⚠️ Error loading agent criteria:", error);
    }

    // ========================
    // FETCH ICP LEARNED PATTERNS
    // ========================
    let icpPatterns: any = null;
    try {
      const { data: activeICP } = await supabase
        .from('job_icps')
        .select('learned_patterns, approved_candidates_count')
        .eq('job_id', session.job_id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeICP?.learned_patterns && activeICP.approved_candidates_count > 0) {
        icpPatterns = {
          ...activeICP.learned_patterns,
          approvedCount: activeICP.approved_candidates_count,
        };
        log.log(`📊 ICP patterns loaded: ${activeICP.approved_candidates_count} approved candidates`);
      }
    } catch (error) {
      log.error("⚠️ Error loading ICP patterns:", error);
    }

    // ========================
    // HANDLE NO CRITERIA CASE
    // ========================
    if (agentCriteria.length === 0) {
      log.log("⚠️ No agent criteria found - cannot perform two-step evaluation");
      
      // Fallback: update session with basic info
      const completedAt = new Date();
      await supabase
        .from("culture_interview_sessions")
        .update({
          status: "completed",
          matching_score: 0,
          matching_analysis: "Avaliação não disponível: nenhum critério de avaliação configurado no agente.",
          duration_seconds: finalDurationSeconds,
          completed_at: completedAt.toISOString(),
        })
        .eq("id", sessionId);
      
      return new Response(JSON.stringify({ 
        score: 0, 
        analysis: "Nenhum critério de avaliação configurado",
        recommendation: "NAO_RECOMENDADO",
        pillarEvaluations: [],
        responses: parsedResponses 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // STEP 1: AI QUALITATIVE EVALUATION
    // ========================
    log.log("🤖 STEP 1: Calling Gemini 3 Pro for qualitative evaluation...");

    const evaluatorTier = await getEvaluatorTier(supabase as any, session.account_id);
    log.log(`⚙️  Evaluator tier for account: ${evaluatorTier}`);

    const evaluationPrompt = buildEvaluationPrompt(
      parsedResponses,
      agentCriteria,
      cultureContext,
      jobContext,
      sellingCompanyContent,
      icpPatterns,
      evaluatorTier
    );
    
    const CULTURE_TOOL_SCHEMA = {
      type: "object",
      properties: {
        criteriaEvaluations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              criterionId: { type: "string" },
              criterionName: { type: "string" },
              score: { type: "number" },
              justification: { type: "string" },
              alignmentLevel: { type: "string", enum: ["Baixo", "Moderado", "Forte"] },
              positiveEvidence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionIndex: { type: "number" },
                    quote: { type: "string" },
                    analysis: { type: "string" },
                  },
                  required: ["questionIndex", "quote", "analysis"],
                },
              },
              negativeEvidence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionIndex: { type: "number" },
                    quote: { type: "string" },
                    analysis: { type: "string" },
                  },
                  required: ["questionIndex", "quote", "analysis"],
                },
              },
              questionsUsed: { type: "array", items: { type: "number" } },
              evidenceCount: { type: "number" },
              redFlagsDetected: { type: "array", items: { type: "string" } },
              genericResponseDetected: { type: "boolean" },
              confidenceLevel: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["criterionId", "criterionName", "score", "justification", "alignmentLevel", "positiveEvidence", "negativeEvidence", "questionsUsed", "evidenceCount", "redFlagsDetected", "genericResponseDetected", "confidenceLevel"],
          },
        },
        overallSummary: { type: "string" },
        candidateStrengths: { type: "array", items: { type: "string" } },
        candidateConcerns: { type: "array", items: { type: "string" } },
      },
      required: ["criteriaEvaluations", "overallSummary", "candidateStrengths", "candidateConcerns"],
    } as const;

    // Confiabilidade do tool-call (VALIDADO com dados reais de produção, mai/2026):
    // modelos "pro"/preview falham com "no tool_call" no schema grande do parecer
    // (gemini-2.5-pro 0% ok, gemini-3-pro-preview ~20%); os FLASH funcionam (100%).
    // current_model fica em platform_ai_model_config (hoje: gemini-3-flash-preview).
    // Default e fallback abaixo usam FLASH para NUNCA regredir se a config sumir.
    // (No cutover, com LLM_DIRECT_PROVIDERS, dá pra usar Claude como fallback cross-provider.)
    const PRIMARY_MODEL = await getConfiguredModel("culture-interview-complete", "google/gemini-2.5-flash");
    const FALLBACK_MODEL = "google/gemini-3-flash-preview";

    let aiEvaluation: AIEvaluationResponse = {
      criteriaEvaluations: [],
      overallSummary: "",
      candidateStrengths: [],
      candidateConcerns: [],
    };
    let aiData: any = { usage: {} };
    let evaluationFailed = false;
    let evaluationFailureReason = "";
    let usedModel = PRIMARY_MODEL;

    const tryEvaluate = async (model: string, isFallback: boolean) => {
      const start = Date.now();
      try {
        // V3 is now the production version. V2 remains available here as an inactive fallback.
        const activeEvaluationVersion = 'v4'; // Ativado globalmente conforme solicitado
        const baseSystemPrompt = EVALUATION_SYSTEM_PROMPT_V4;
        const systemPromptKey = activeEvaluationVersion === 'v4' ? 'culture_evaluation_system_v4' : (activeEvaluationVersion === 'v3' ? 'culture_evaluation_system_v3' : 'culture_evaluation_system');
        const systemPrompt = await resolvePrompt(systemPromptKey, {}, baseSystemPrompt);
        const { args, usage } = await callLLMTool<any>({
          model,
          systemPrompt,
          userPrompt: evaluationPrompt,
          tool: {
            name: "submit_culture_evaluation",
            description: "Devolve a avaliação cultural completa do candidato.",
            parameters: CULTURE_TOOL_SCHEMA,
          },
          maxTokens: getMaxTokensForTier(evaluatorTier, "cultural"),
          cacheKey: session.job_id,
        });
        aiEvaluation = {
          criteriaEvaluations: args.criteriaEvaluations || [],
          overallSummary: args.overallSummary || "",
          candidateStrengths: args.candidateStrengths || [],
          candidateConcerns: args.candidateConcerns || [],
        };
        aiData = { usage };
        usedModel = model;

        logAIExecution(supabase, {
          accountId: session.account_id,
          functionName: "culture-interview-complete",
          operation: "culture_evaluation",
          model,
          status: "success",
          tokensUsed: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
          durationMs: Date.now() - start,
          optimizationVersion: OPTIMIZATION_VERSION,
          cachedTokens: (usage as any).cached_tokens ?? null,
          inputSummary: { sessionId, prompt_chars: evaluationPrompt.length, criteria: agentCriteria.length, responses: parsedResponses.length, tier: evaluatorTier, fallback_used: isFallback },
          outputSummary: { criteriaEvaluations: aiEvaluation.criteriaEvaluations.length },
        }).catch(() => {});
        return { ok: true as const };
      } catch (e: any) {
        const msg = String(e?.message || "");
        log.error(`❌ Evaluation tool call failed (${isFallback ? "fallback" : "primary"} model=${model}):`, msg);
        logAIExecution(supabase, {
          accountId: session.account_id,
          functionName: "culture-interview-complete",
          operation: "culture_evaluation",
          model,
          status: "error",
          errorMessage: msg,
          durationMs: Date.now() - start,
          optimizationVersion: OPTIMIZATION_VERSION,
          inputSummary: { sessionId, fallback_used: isFallback },
        }).catch(() => {});
        return { ok: false as const, msg };
      }
    };

    let primary = await tryEvaluate(PRIMARY_MODEL, false);

    // Map hard gateway errors back to original behaviour (don't fall back on 429/402)
    if (!primary.ok && (primary.msg.includes("gateway 429"))) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!primary.ok && (primary.msg.includes("gateway 402"))) {
      return new Response(JSON.stringify({ error: "Payment required" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback path: primary failed for any other reason (no tool_call, parse error, 5xx, timeout)
    if (!primary.ok && PRIMARY_MODEL !== FALLBACK_MODEL) {
      log.log(`🔁 Trying fallback model ${FALLBACK_MODEL}...`);
      const fallback = await tryEvaluate(FALLBACK_MODEL, true);
      if (!fallback.ok) {
        evaluationFailed = true;
        evaluationFailureReason = `primary(${PRIMARY_MODEL}): ${primary.msg} | fallback(${FALLBACK_MODEL}): ${fallback.msg}`;
      }
    } else if (!primary.ok) {
      evaluationFailed = true;
      evaluationFailureReason = primary.msg;
    }

    // Sanity check — if both calls returned 0 criteria, treat as failure too
    if (!evaluationFailed && aiEvaluation.criteriaEvaluations.length === 0) {
      evaluationFailed = true;
      evaluationFailureReason = "AI returned empty criteriaEvaluations array";
    }

    // ========================
    // EARLY EXIT: evaluation failed — save error state, do NOT mark REPROVADO
    // ========================
    if (evaluationFailed) {
      log.error("🚨 Evaluation failed completely. Saving error state instead of score=0.");
      const errorMessage = "⚠️ Avaliação automática falhou por instabilidade do modelo de IA. Clique em 'Reprocessar avaliação' para tentar novamente. Os dados da entrevista (áudio e respostas) estão íntegros.";
      const completedAt = new Date();
      await supabase
        .from("culture_interview_sessions")
        .update({
          status: "completed",
          matching_score: null,
          matching_analysis: errorMessage,
          duration_seconds: finalDurationSeconds,
          completed_at: completedAt.toISOString(),
        })
        .eq("id", sessionId);

      return new Response(JSON.stringify({
        evaluationFailed: true,
        score: null,
        analysis: errorMessage,
        recommendation: null,
        reason: evaluationFailureReason,
        responses: parsedResponses,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.log(`✅ STEP 1 complete: ${aiEvaluation.criteriaEvaluations.length} criteria evaluated using ${usedModel}`);


    // ========================
    // STEP 2: DETERMINISTIC SCORING (legacy + V2 in parallel for shadow mode)
    // ========================
    log.log("🔢 STEP 2: Calculating deterministic score (legacy + V2)...");

    const shadowConfig = await loadShadowConfig(supabase);
    log.log(`🌓 Shadow config: active=${shadowConfig.activeVersion} shadowEnabled=${shadowConfig.shadowEnabled} profile=${strictnessProfile}`);

    const v2EvalInput = aiEvaluation.criteriaEvaluations as any[];

    const legacyResult = calculateFinalScoreLegacy(
      v2EvalInput as any,
      agentCriteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        excellenceDescription: c.excellenceDescription,
        warningSignsDescription: c.warningSignsDescription,
        minimumScore: c.minimumScore,
        importance: c.importance as any,
        weight: c.weight,
      }))
    );

    const v2Result = calculateFinalScoreV4({
      evaluations: v2EvalInput as any,
      agentCriteria: agentCriteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        excellenceDescription: c.excellenceDescription,
        warningSignsDescription: c.warningSignsDescription,
        minimumScore: c.minimumScore,
        importance: c.importance as any,
        weight: c.weight,
      })),
      durationSeconds: finalDurationSeconds ?? null,
      responsesCount: parsedResponses.length,
      totalScriptQuestionsCount: ((session as any).questions_total ?? (Array.isArray(session.questions) ? session.questions.length : 0) ?? parsedResponses.length) || 1,
      strictnessProfile,
    });

    log.log(`📊 LEGACY: ${legacyResult.finalScore.toFixed(1)}% / ${legacyResult.recommendation}`);
    log.log(`📊 V2:     ${v2Result.finalScore.toFixed(1)}% / ${v2Result.recommendation} (audit: ${v2Result.auditTrail.length} rules, redFlags: ${v2Result.redFlagsCount})`);

    // Choose canonical based on platform setting (default: legacy during shadow window)
    const useV2 = shadowConfig.activeVersion === "new";
    const scoringResult: any = useV2
      ? {
          finalScore: v2Result.finalScore,
          recommendation: v2Result.recommendation,
          failedCriteria: v2Result.failedCriteria,
          criteriaWithImpact: v2Result.criteriaWithImpact.map(c => ({
            criterionId: c.criterionId,
            criterionName: c.criterionName,
            score: c.score,
            weight: c.weight,
            multiplier: c.multiplier,
            effectiveWeight: c.effectiveWeight,
            impactPercentage: c.impactPercentage,
            minimumPercent: c.minimumPercent,
            passed: c.passed,
            importance: c.importance,
          })),
        }
      : calculateFinalScore(aiEvaluation.criteriaEvaluations, agentCriteria);

    // Override recommendation if below overall minimum
    const belowOverallMinimum = scoringResult.finalScore < (overallMinimumScore * 10);
    if (belowOverallMinimum) {
      scoringResult.recommendation = "NAO_RECOMENDADO";
      log.log(`🚫 Below overall minimum (${overallMinimumScore * 10}%) - disqualified`);
    }

    log.log(`✅ STEP 2 complete: Final score = ${scoringResult.finalScore.toFixed(1)}% (using ${useV2 ? 'V2' : 'legacy'})`);

    // ========================
    // PERSIST CRITERIA EVALUATIONS
    // ========================
    log.log("💾 Saving criteria evaluations to database...");

    // Dedupe evidences within a single criterion by questionIndex+quote+analysis.
    const dedupeEvidenceList = (list: any[] | undefined) => {
      if (!Array.isArray(list)) return list;
      const seen = new Set<string>();
      const result: any[] = [];
      for (const e of list) {
        const key = `${e?.questionIndex ?? '?'}::${(e?.quote || '').trim().toLowerCase()}::${(e?.analysis || '').trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(e);
      }
      return result;
    };
    
    const evaluationsToInsert = aiEvaluation.criteriaEvaluations.map((ev: any) => {
      const criteriaImpact = scoringResult.criteriaWithImpact.find((c: any) => c.criterionId === ev.criterionId);
      const v2Impact = v2Result.criteriaWithImpact.find(c => c.criterionId === ev.criterionId);

      return {
        session_id: sessionId,
        criterion_id: ev.criterionId,
        criterion_name: ev.criterionName,
        score: ev.score,
        minimum_score_percent: criteriaImpact?.minimumPercent || 50,
        justification: ev.justification,
        alignment_level: ev.alignmentLevel,
        positive_evidence: dedupeEvidenceList(ev.positiveEvidence),
        negative_evidence: dedupeEvidenceList(ev.negativeEvidence),
        questions_used: ev.questionsUsed?.map((qi: number) => {
          const dedupedPos = dedupeEvidenceList(ev.positiveEvidence) as any[] | undefined;
          const dedupedNeg = dedupeEvidenceList(ev.negativeEvidence) as any[] | undefined;
          const allEv = [...(dedupedPos || []), ...(dedupedNeg || [])];
          const evidenceQuotes = allEv
            .filter((e) => e?.questionIndex === qi && (e?.quote || '').trim())
            .map((e) => e.quote.trim());
          return {
            number: qi,
            question: parsedResponses[qi]?.aiQuestionSpoken || parsedResponses[qi]?.questionText || '',
            answer: parsedResponses[qi]?.candidateResponse || '',
            evidenceQuotes,
          };
        }) || [],
        importance: criteriaImpact?.importance || 'moderate',
        weight: criteriaImpact?.weight || 1,
        weight_multiplier: criteriaImpact?.multiplier || 1,
        impact_percentage: criteriaImpact?.impactPercentage || 0,
        passed_minimum: criteriaImpact?.passed || false,
        // V2 transparency fields
        evidence_count: ev.evidenceCount ?? null,
        red_flags: ev.redFlagsDetected ?? [],
        confidence_level: (() => {
          const raw = String(ev.confidenceLevel ?? '').trim().toLowerCase();
          // Normaliza variações PT antigas (cache do prompt) -> EN exigido pelo CHECK do banco
          const map: Record<string, string> = { baixo: 'low', medio: 'medium', médio: 'medium', alto: 'high', low: 'low', medium: 'medium', high: 'high' };
          return map[raw] ?? null;
        })(),
        generic_response_detected: !!ev.genericResponseDetected,
        base_score: ev.score,
        penalty_applied: v2Impact?.penaltyApplied ?? 0,
        legacy_score: ev.score,
      };
    });

    const { error: evalInsertError } = await supabase
      .from('culture_interview_criteria_evaluations')
      .insert(evaluationsToInsert);

    if (evalInsertError) {
      log.error("❌ Error saving criteria evaluations:", evalInsertError);
    } else {
      log.log(`✅ Saved ${evaluationsToInsert.length} criteria evaluations`);
    }

    // ========================
    // BUILD ANALYSIS TEXT
    // ========================
    let fullAnalysis = aiEvaluation.overallSummary;
    
    if (scoringResult.failedCriteria.length > 0) {
      fullAnalysis += `\n\n## ⚠️ Critérios Abaixo do Mínimo:\n`;
      for (const fc of scoringResult.failedCriteria) {
        fullAnalysis += `- **${fc.name}** (${fc.importance}): ${fc.score.toFixed(1)}% < ${fc.minimum}% mínimo\n`;
      }
    }
    
    fullAnalysis += "\n\n## Avaliação por Pilar:\n";
    for (const ev of aiEvaluation.criteriaEvaluations) {
      fullAnalysis += `**${ev.criterionName}** (${ev.alignmentLevel} - ${ev.score.toFixed(1)}%): ${ev.justification}\n\n`;
    }
    
    if (aiEvaluation.candidateStrengths.length > 0) {
      fullAnalysis += "\n## Pontos Fortes:\n";
      fullAnalysis += aiEvaluation.candidateStrengths.map(s => `- ${s}`).join('\n');
    }
    
    if (aiEvaluation.candidateConcerns.length > 0) {
      fullAnalysis += "\n\n## Pontos de Atenção:\n";
      fullAnalysis += aiEvaluation.candidateConcerns.map(c => `- ${c}`).join('\n');
    }

    // ========================
    // BUILD RADAR CHART DATA
    // ========================
    const candidateRadarData = {
      pillars: agentCriteria.map(c => c.name),
      scores: agentCriteria.map(c => {
        const ev = aiEvaluation.criteriaEvaluations.find(e => e.criterionId === c.id);
        return ev?.score || 0;
      }),
    };

    const companyRadarData = {
      pillars: candidateRadarData.pillars,
      scores: agentCriteria.map(c => c.minimumScore * 10),
    };

    // ========================
    // ALIGNED/MISALIGNED RESPONSES
    // ========================
    const allEvidence: Array<{ type: 'positive' | 'negative'; ev: any; criterion: string }> = [];
    for (const ev of aiEvaluation.criteriaEvaluations) {
      for (const pe of ev.positiveEvidence || []) {
        allEvidence.push({ type: 'positive', ev: pe, criterion: ev.criterionName });
      }
      for (const ne of ev.negativeEvidence || []) {
        allEvidence.push({ type: 'negative', ev: ne, criterion: ev.criterionName });
      }
    }

    // Deduplicate evidences that repeat across criteria (same questionIndex + analysis text).
    // Merge criterion labels so the user sees a single entry referencing all criteria it applies to.
    const dedupeEvidence = (items: typeof allEvidence) => {
      const map = new Map<string, { ev: any; criterions: string[] }>();
      for (const item of items) {
        const analysis = (item.ev?.analysis || '').trim();
        const key = `${item.ev?.questionIndex ?? '?'}::${analysis.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.criterions.includes(item.criterion)) {
            existing.criterions.push(item.criterion);
          }
        } else {
          map.set(key, { ev: item.ev, criterions: [item.criterion] });
        }
      }
      return Array.from(map.values());
    };

    const mappedAlignedResponses = dedupeEvidence(allEvidence.filter(e => e.type === 'positive'))
      .slice(0, 5)
      .map(({ ev, criterions }) => {
        const response = parsedResponses[ev.questionIndex];
        return {
          questionIndex: ev.questionIndex,
          questionText: response?.questionText || '',
          candidateResponse: response?.candidateResponse || ev.quote,
          reason: `[${criterions.join(', ')}] ${ev.analysis}`,
          valueLabel: response?.valueLabel || null,
        };
      });

    const mappedMisalignedResponses = dedupeEvidence(allEvidence.filter(e => e.type === 'negative'))
      .slice(0, 5)
      .map(({ ev, criterions }) => {
        const response = parsedResponses[ev.questionIndex];
        return {
          questionIndex: ev.questionIndex,
          questionText: response?.questionText || '',
          candidateResponse: response?.candidateResponse || ev.quote,
          reason: `[${criterions.join(', ')}] ${ev.analysis}`,
          valueLabel: response?.valueLabel || null,
        };
      });

    // ========================
    // AUTO-CREATE APPLICATION
    // (Sessões de teste NÃO criam application — não poluem funil/Kanban)
    // ========================
    if (!isTestSession) {
    log.log("📋 Auto-creating application after interview completion...");
    
    
    try {
      const { data: candidateProfile } = await supabase
        .from("candidate_profiles")
        .select("user_id, full_name, first_name, last_name")
        .eq("id", session.candidate_profile_id)
        .single();

      if (candidateProfile) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", candidateProfile.user_id)
          .single();

        const candidateEmail = userProfile?.email || "";
        const firstName = candidateProfile.first_name || candidateProfile.full_name?.split(' ')[0] || "";
        const lastName = candidateProfile.last_name || candidateProfile.full_name?.split(' ').slice(1).join(' ') || "";

        let candidateId: string | undefined;
        const { data: existingCandidate } = await supabase
          .from("recruitment_candidates")
          .select("id")
          .eq("email", candidateEmail)
          .maybeSingle();

        if (existingCandidate) {
          candidateId = existingCandidate.id;
        } else {
          const { data: newCandidate, error: candidateError } = await supabase
            .from("recruitment_candidates")
            .insert({
              account_id: accountId,
              first_name: firstName,
              last_name: lastName,
              email: candidateEmail,
              stage: "new",
            })
            .select("id")
            .single();

          if (!candidateError && newCandidate) {
            candidateId = newCandidate.id;
          }
        }

        if (candidateId) {
          // Update session with candidate_id for tracking/orchestrator
          await supabase
            .from("culture_interview_sessions")
            .update({ candidate_id: candidateId })
            .eq("id", sessionId);
          
          // Store for later use in tracking
          session.candidate_id = candidateId;
          log.log(`✅ Linked candidate_id ${candidateId} to session`);

          const { data: existingApplication } = await supabase
            .from("recruitment_applications")
            .select("id, status")
            .eq("candidate_id", candidateId)
            .eq("job_id", session.job_id)
            .maybeSingle();

          const desiredStatus = belowOverallMinimum ? "desqualificado" : "applied";

          if (!existingApplication) {
            await supabase
              .from("recruitment_applications")
              .insert({
                candidate_id: candidateId,
                job_id: session.job_id,
                account_id: accountId,
                status: desiredStatus,
              });
            log.log(`✅ Created application for candidate ${candidateId} with status ${desiredStatus}`);
          } else if (
            belowOverallMinimum &&
            existingApplication.status !== "hired" &&
            existingApplication.status !== "rejected" &&
            existingApplication.status !== "desqualificado"
          ) {
            await supabase
              .from("recruitment_applications")
              .update({
                status: "desqualificado",
                update_source: "culture_interview_complete",
              })
              .eq("id", existingApplication.id);
          }
        }
      }
    } catch (appError) {
      log.error("❌ Error in auto-application:", appError);
    }
    } // end if (!isTestSession) — auto-create application



    // ========================
    // UPDATE SESSION
    // ========================
    const completedAt = new Date();
    // finalDurationSeconds was computed earlier (single source of truth).

    // Build pillar evaluations for backward compatibility
    const pillarEvaluations = aiEvaluation.criteriaEvaluations.map(ev => {
      const impact = scoringResult.criteriaWithImpact.find(c => c.criterionId === ev.criterionId);
      return {
        pillar: ev.criterionName,
        alignment: ev.alignmentLevel,
        justification: ev.justification,
        score: ev.score,
        rawScore: ev.score / 10, // Convert to 0-10 for legacy compatibility
        minimumScore: (impact?.minimumPercent || 50) / 10,
        belowMinimum: !impact?.passed,
      };
    });

    const { error: updateError } = await supabase
      .from("culture_interview_sessions")
      .update({
        status: "completed",
        ai_messages: transcript ? [{ role: "transcript", content: transcript }] : [],
        responses: parsedResponses,
        matching_score: scoringResult.finalScore,
        recommendation: scoringResult.recommendation,
        matching_analysis: fullAnalysis,
        duration_seconds: finalDurationSeconds,
        completed_at: completedAt.toISOString(),
        aligned_responses: mappedAlignedResponses,
        misaligned_responses: mappedMisalignedResponses,
        candidate_radar_data: candidateRadarData,
        company_radar_data: companyRadarData,
        completed_naturally: completedNaturally ?? null,
        // Shadow-mode + audit metadata
        legacy_score: legacyResult.finalScore,
        legacy_recommendation: legacyResult.recommendation,
        evidence_floor_passed: v2Result.evidenceFloorPassed,
        red_flags_count: v2Result.redFlagsCount,
        avg_confidence_level: v2Result.avgConfidenceLevel,
        evaluation_audit_trail: {
          version: isTestSession ? 'v3' : (useV2 ? 'v2' : 'legacy'),
          strictness_profile: strictnessProfile,
          shadow_enabled: shadowConfig.shadowEnabled,
          legacy: {
            score: legacyResult.finalScore,
            recommendation: legacyResult.recommendation,
            failed_criteria: legacyResult.failedCriteria,
          },
          v2: {
            score: v2Result.finalScore,
            recommendation: v2Result.recommendation,
            failed_criteria: v2Result.failedCriteria,
            audit_trail: v2Result.auditTrail,
            avg_evidence_count: v2Result.avgEvidenceCount,
            evidence_floor_passed: v2Result.evidenceFloorPassed,
            red_flags_count: v2Result.redFlagsCount,
            avg_confidence_level: v2Result.avgConfidenceLevel,
          },
          diff: {
            score_delta: Math.round((v2Result.finalScore - legacyResult.finalScore) * 10) / 10,
            recommendation_changed: v2Result.recommendation !== legacyResult.recommendation,
          },
        },
      })
      .eq("id", sessionId);

    if (updateError) {
      log.error("❌ Failed to update session:", updateError);
      throw new Error(`Failed to save session: ${updateError.message}`);
    }

    log.log(`✅ Session updated with score: ${scoringResult.finalScore.toFixed(1)}%`);

    // ========================
    // STEP 1.5: BEHAVIORAL INSIGHTS (fire-and-forget, non-blocking)
    // ========================
    try {
      log.log("🧠 STEP 1.5: Generating behavioral insights...");

      // Build transcript text for behavioral analysis
      const transcriptForBehavioral = parsedResponses.map((r, i) => 
        `[Pergunta ${i}] ${r.questionText}\n[Resposta ${i}] "${r.candidateResponse}"`
      ).join('\n---\n');

      // Prepare culture values context for convergence analysis
      const valuesContext = cultureContext.values.map(v => v.label).join(', ');

      const behavioralPrompt = `## TRANSCRIÇÃO DA ENTREVISTA

${transcriptForBehavioral}

## VALORES CULTURAIS DA EMPRESA
${valuesContext || 'Não informados'}

## INSTRUÇÕES

Analise a transcrição acima e extraia insights comportamentais do candidato em 6 dimensões:

1. **Comunicação**: Clareza, articulação, vocabulário, objetividade nas respostas
2. **Raciocínio Estruturado**: Lógica, sequência, uso de exemplos concretos, método STAR
3. **Inteligência Emocional**: Autoconsciência, empatia, gestão de conflitos, maturidade
4. **Liderança e Protagonismo**: Iniciativa, tomada de decisão, influência, responsabilidade
5. **Adaptabilidade**: Flexibilidade, resiliência, abertura a mudanças, aprendizado contínuo
6. **Orientação a Resultados**: Foco em objetivos, métricas, impacto tangível, números concretos

Além disso:
- Estime pré-indicadores DISC (D, I, S, C) de 0 a 100 com base no estilo de comunicação
- Identifique convergências entre os comportamentos observados e os valores culturais da empresa
- Gere 1-3 badges descritivos (ex: "Comunicador Forte", "Pensador Analítico", "Orientado a Resultados")
- Forneça um resumo qualitativo de 2-3 frases sobre o perfil comportamental geral`;

      const behavioralResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: await getConfiguredModel("culture-interview-complete", "google/gemini-2.5-flash"),
          messages: [
            {
              role: "system",
              content: `Você é um psicólogo organizacional especialista em avaliação comportamental. Analise transcrições de entrevistas e extraia insights comportamentais. Responda APENAS via tool calling.`,
            },
            { role: "user", content: behavioralPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_behavioral_insights",
                description: "Salva os insights comportamentais extraídos da entrevista",
                parameters: {
                  type: "object",
                  properties: {
                    communication_score: { type: "number", description: "Score de comunicação 0-100" },
                    structured_reasoning_score: { type: "number", description: "Score de raciocínio estruturado 0-100" },
                    emotional_intelligence_score: { type: "number", description: "Score de inteligência emocional 0-100" },
                    leadership_score: { type: "number", description: "Score de liderança 0-100" },
                    adaptability_score: { type: "number", description: "Score de adaptabilidade 0-100" },
                    results_orientation_score: { type: "number", description: "Score de orientação a resultados 0-100" },
                    disc_indicators: {
                      type: "object",
                      properties: {
                        d: { type: "number", description: "Dominância 0-100" },
                        i: { type: "number", description: "Influência 0-100" },
                        s: { type: "number", description: "Estabilidade 0-100" },
                        c: { type: "number", description: "Conformidade 0-100" },
                        primary_profile: { type: "string", description: "Perfil DISC primário (D, I, S ou C)" },
                        reasoning: { type: "string", description: "Breve justificativa do perfil DISC estimado" },
                      },
                      required: ["d", "i", "s", "c", "primary_profile", "reasoning"],
                    },
                    cultural_convergences: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          value_label: { type: "string", description: "Nome do valor cultural da empresa" },
                          behavioral_dimension: { type: "string", description: "Dimensão comportamental que converge" },
                          evidence: { type: "string", description: "Evidência da convergência com citação" },
                          impact: { type: "string", enum: ["positive", "negative", "neutral"], description: "Tipo de impacto" },
                        },
                        required: ["value_label", "behavioral_dimension", "evidence", "impact"],
                      },
                    },
                    badges: {
                      type: "array",
                      items: { type: "string" },
                      description: "1-3 badges descritivos do perfil comportamental",
                    },
                    summary: { type: "string", description: "Resumo qualitativo do perfil comportamental em 2-3 frases" },
                    dimension_details: {
                      type: "object",
                      properties: {
                        communication: { type: "string", description: "Justificativa detalhada com citações" },
                        structured_reasoning: { type: "string", description: "Justificativa detalhada com citações" },
                        emotional_intelligence: { type: "string", description: "Justificativa detalhada com citações" },
                        leadership: { type: "string", description: "Justificativa detalhada com citações" },
                        adaptability: { type: "string", description: "Justificativa detalhada com citações" },
                        results_orientation: { type: "string", description: "Justificativa detalhada com citações" },
                      },
                      required: ["communication", "structured_reasoning", "emotional_intelligence", "leadership", "adaptability", "results_orientation"],
                    },
                  },
                  required: [
                    "communication_score", "structured_reasoning_score", "emotional_intelligence_score",
                    "leadership_score", "adaptability_score", "results_orientation_score",
                    "disc_indicators", "cultural_convergences", "badges", "summary", "dimension_details"
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_behavioral_insights" } },
        }),
      });

      if (behavioralResponse.ok) {
        const behavioralData = await behavioralResponse.json();
        const toolCall = behavioralData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const insights = JSON.parse(toolCall.function.arguments);
          
          // Calculate overall behavioral score (average of 6 dimensions)
          const overallScore = (
            (insights.communication_score || 0) +
            (insights.structured_reasoning_score || 0) +
            (insights.emotional_intelligence_score || 0) +
            (insights.leadership_score || 0) +
            (insights.adaptability_score || 0) +
            (insights.results_orientation_score || 0)
          ) / 6;

          // Check if job has DISC step configured
          let hasDiscStep = false;
          try {
            const { data: discStep } = await supabase
              .from('recruitment_job_workflow_steps')
              .select('id')
              .eq('job_id', session.job_id)
              .eq('step_type', 'disc')
              .eq('is_active', true)
              .maybeSingle();
            hasDiscStep = !!discStep;
          } catch (e) {
            log.error("⚠️ Error checking DISC step:", e);
          }

          // Persist behavioral insights
          const { error: insightError } = await supabase
            .from('culture_interview_behavioral_insights')
            .upsert({
              session_id: sessionId,
              communication_score: Math.round(insights.communication_score * 10) / 10,
              structured_reasoning_score: Math.round(insights.structured_reasoning_score * 10) / 10,
              emotional_intelligence_score: Math.round(insights.emotional_intelligence_score * 10) / 10,
              leadership_score: Math.round(insights.leadership_score * 10) / 10,
              adaptability_score: Math.round(insights.adaptability_score * 10) / 10,
              results_orientation_score: Math.round(insights.results_orientation_score * 10) / 10,
              overall_behavioral_score: Math.round(overallScore * 10) / 10,
              disc_indicators: hasDiscStep ? insights.disc_indicators : null,
              cultural_convergences: insights.cultural_convergences || [],
              badges: insights.badges || [],
              summary: insights.summary || '',
              dimension_details: insights.dimension_details || {},
            }, { onConflict: 'session_id' });

          if (insightError) {
            log.error("⚠️ Failed to save behavioral insights:", insightError);
          } else {
            log.log(`✅ STEP 1.5 complete: Behavioral score ${overallScore.toFixed(1)}%, badges: [${(insights.badges || []).join(', ')}], DISC saved: ${hasDiscStep}`);
          }
        }
      } else {
        log.error("⚠️ Behavioral insights AI call failed:", behavioralResponse.status);
      }
    } catch (behavioralError) {
      // Non-blocking: log and continue — NEVER prevent orchestrator from running
      log.error("⚠️ STEP 1.5 Behavioral insights failed (non-blocking):", behavioralError);
    }

    // ========================
    // TRACKING & ORCHESTRATOR
    // (Pulado em sessões de teste — orchestrator dispara WhatsApp/e-mail e
    // avança o candidato no funil; tracking só faz sentido em fluxo real.)
    // ========================
    if (!isTestSession) {
    if (session.candidate_id && accountId) {
      try {
        const { data: candidateData } = await supabase
          .from("recruitment_candidates")
          .select("first_touch_source, first_touch_medium, first_touch_campaign")
          .eq("id", session.candidate_id)
          .single();

        await supabase.from("candidate_tracking_events").insert([{
          account_id: accountId,
          candidate_id: session.candidate_id,
          job_id: session.job_id || null,
          event_type: "completed_interview",
          source: candidateData?.first_touch_source || null,
          medium: candidateData?.first_touch_medium || null,
          campaign: candidateData?.first_touch_campaign || null,
          metadata: {
            interview_type: "cultural",
            session_id: sessionId,
            score: scoringResult.finalScore,
            recommendation: scoringResult.recommendation,
          },
        }]);
      } catch (trackingError) {
        log.error("⚠️ Failed to register tracking event:", trackingError);
      }
    }

    // Call orchestrator
    try {
      log.log("🎯 Calling recruitment orchestrator...");
      await supabase.functions.invoke("recruitment-orchestrator", {
        body: {
          candidateId: session.candidate_id,
          jobId: session.job_id,
          accountId: session.account_id,
          completedStepType: "cultural",
          sessionId: sessionId,
          completedNaturally: completedNaturally ?? null,
          attemptNumber: session.attempt_number || 1,
        },
      });
    } catch (orchError) {
      log.error("⚠️ Failed to call orchestrator:", orchError);
    }
    } // end if (!isTestSession) — tracking & orchestrator


    // ========================
    // TOKEN USAGE
    // ========================
    if (tokenUsage) {
      try {
        const AUDIO_INPUT_RATE = 10.00 / 1_000_000;  // $10/1M tokens (gpt-realtime-mini)
        const AUDIO_OUTPUT_RATE = 20.00 / 1_000_000; // $20/1M tokens (gpt-realtime-mini)
        // gemini-3-pro-preview: $1.25/1M input, $10.00/1M output
        const TEXT_INPUT_RATE = 1.25 / 1_000_000;
        const TEXT_OUTPUT_RATE = 10.00 / 1_000_000;
        
        const audioInputTokens = tokenUsage.audioInputTokens || 0;
        const audioOutputTokens = tokenUsage.audioOutputTokens || 0;
        const textInputTokens = aiData?.usage?.prompt_tokens || 0;
        const textOutputTokens = aiData?.usage?.completion_tokens || 0;
        
        const audioInputCost = audioInputTokens * AUDIO_INPUT_RATE;
        const audioOutputCost = audioOutputTokens * AUDIO_OUTPUT_RATE;
        const textCost = (textInputTokens * TEXT_INPUT_RATE) + (textOutputTokens * TEXT_OUTPUT_RATE);
        const totalCost = audioInputCost + audioOutputCost + textCost;
        
        await supabase
          .from('interview_token_usage')
          .upsert({
            account_id: accountId,
            session_id: sessionId,
            session_type: 'cultural',
            job_id: session.job_id,
            candidate_id: session.candidate_id || null,
            audio_input_seconds: tokenUsage.audioInputSeconds || 0,
            audio_output_seconds: tokenUsage.audioOutputSeconds || 0,
            audio_input_tokens: audioInputTokens,
            audio_output_tokens: audioOutputTokens,
            text_input_tokens: textInputTokens,
            text_output_tokens: textOutputTokens,
            audio_input_cost_usd: audioInputCost,
            audio_output_cost_usd: audioOutputCost,
            text_cost_usd: textCost,
            total_cost_usd: totalCost,
            duration_seconds: finalDurationSeconds,
            model_audio: 'gpt-realtime-mini',
            model_text: 'google/gemini-3-pro-preview',
          }, { onConflict: 'session_id,session_type' });
        
        log.log(`💰 Interview cost: $${totalCost.toFixed(4)} USD`);
      } catch (usageErr) {
        log.error("⚠️ Failed to save token usage:", usageErr);
      }
    }

    // ========================
    // CONSUME CREDITS via consumeAICredits (fórmula oficial + margem)
    // Idempotente: se credits_consumed_at já estiver setado (ex: watchdog já cobrou),
    // pula a cobrança aqui.
    //
    // EXCEÇÃO is_test: sessões de simulação (criadas por create-culture-test-session)
    // rodam a avaliação completa para validar o pipeline mas NÃO cobram créditos.
    // O guardrail `check:ai-billing` continua exigindo `consumeAICredits` aqui — só
    // não é executado em modo teste. Ver mem://billing/voice-interview-table-pricing.
    // ========================
    if (!isTestSession) {
    try {
      const alreadyCharged = !!(session as any).credits_consumed_at;
      if (alreadyCharged) {
        log.log(`💳 Skipping credit consumption — session already charged at ${(session as any).credits_consumed_at}`);
      } else {
        // === NOVO MODELO: preço de tabela por minuto ===
        // Cobra `culture_interview_realtime` (0,35 cr/min por padrão) × duração em minutos.
        // A avaliação LLM final já está embutida nesse preço — não cobramos separadamente.
        const minutes = Math.max((finalDurationSeconds || 0) / 60, 0);
        if (minutes <= 0) {
          log.log(`💳 Skipping table-price charge — duration is zero`);
        } else {
          const realtimeResult = await consumeAICredits({
            supabase,
            accountId,
            featureKey: 'culture_interview_realtime',
            quantity: minutes,
            referenceId: sessionId,
            referenceType: 'culture_interview',
            description: `Entrevista cultural por voz - ${minutes.toFixed(1)}min (preço de tabela)`,
            userId: null,
          });
          log.log(`💳 Culture interview (table price): ${realtimeResult.creditsConsumed} créditos (R$${realtimeResult.costBrl.toFixed(2)})`);
        }

        // Marca sessão como cobrada (trava anti-cobrança-duplicada)
        await supabase
          .from('culture_interview_sessions')
          .update({ credits_consumed_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
    } catch (creditErr) {
      log.error("⚠️ Failed to consume credits:", creditErr);
    }
    } else {
      log.log(`🧪 Test session — skipping credit consumption (simulação não cobra créditos)`);
    }




    // ========================
    // RETRY INFO (Auto-Retry Inteligente)
    // ========================
    // Regra: sessões abortadas (completedNaturally=false) -> retentativas ilimitadas.
    // Sessões completas com score baixo -> 1 tentativa adicional (máx. 2).
    const MAX_ATTEMPTS = 2;
    const currentAttempt = session.attempt_number || 1;
    const canRetry = completedNaturally === false
      ? true
      : currentAttempt < MAX_ATTEMPTS;

    // ========================
    // RETURN RESPONSE
    // ========================
    logEvent('finalized', sessionId, {
      isTest: (session as any).is_test === true,
      score: scoringResult.finalScore,
      recommendation: scoringResult.recommendation,
      attemptNumber: currentAttempt,
      completedNaturally: completedNaturally ?? null,
      responsesCount: parsedResponses.length,
    });

    return new Response(JSON.stringify({ 
      score: scoringResult.finalScore, 
      analysis: fullAnalysis,
      recommendation: scoringResult.recommendation,
      pillarEvaluations,
      criteriaEvaluations: aiEvaluation.criteriaEvaluations,
      scoringDetails: scoringResult,
      responses: parsedResponses,
      canRetry,
      attemptNumber: currentAttempt,
      maxAttempts: MAX_ATTEMPTS,
      completedNaturally: completedNaturally ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    logEvent('error', null, { message: error instanceof Error ? error.message : String(error) });
    log.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  })();

  // Registra como background work — runtime não cancela mesmo após disconnect.
  try {
    // @ts-ignore — global do Supabase Edge / Deno Deploy
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      // @ts-ignore
      EdgeRuntime.waitUntil(handlerPromise);
    }
  } catch { /* fallback silencioso — comportamento atual */ }

  return await handlerPromise;
});

