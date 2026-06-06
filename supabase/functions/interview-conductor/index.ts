// interview-conductor (v2.1)
// ------------------------------------------------------------------
// Backend-driven turn loop for the voice culture interview.
// Frontend only handles WebRTC + UI. The model gets a tiny system prompt
// and only speaks lines that the server hands to it via response.create.
//
// Endpoints (POST):
//   /next-turn   { sessionId, speculative? }   speculative=true → read-only preview
//   /commit-turn { sessionId, turnId, candidateTranscript, startSec, endSec }
//   /abort       { sessionId, reason? }
//
// v2.1 changes:
// - New phase `awaiting_start` between opening and first question (confirmation).
// - Label expansion: short rótulos (Nome, Idade, ...) become natural questions.
// - Speculative next-turn for latency hiding (no state mutation).
// Protected: mem://architecture/voice-interview-resilience-principles

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Phase = "opening" | "awaiting_start" | "asking" | "followup" | "closing" | "done";

type FollowupBucket = "context" | "example" | "impact" | "learning";

interface ConductorState {
  phase: Phase;
  currentTurnId?: string | null;
  currentSay?: string | null;
  currentQuestionIndex?: number;
  isFollowup?: boolean;
  repeatCount?: number;
  useStoredSay?: boolean;
  // Caminho 1 melhorado: anti-repetição de ACK/follow-up e bucket do próximo follow-up.
  lastAck?: string | null;
  lastFollowup?: string | null;
  followupBucket?: FollowupBucket | null;
  closingVariant?: string | null;
  // Anti-loop: quantas vezes o coverage_rescue redirecionou para cada qi.
  // Após 2 tentativas no mesmo qi, força-incluir no coverage_log para
  // permitir o closing (evita o bug do wrap-around em factuais curtas).
  coverageRescueByQi?: Record<string, number>;
}


interface SessionQuestion {
  id?: string;
  position?: number;
  question_text: string;
  value_label?: string | null;
  requires_thinking_time?: boolean;
}

// Follow-ups agrupados por bucket. Bucket é escolhido por heurística leve
// no commit-turn (regex puro, sem LLM). Gatilho NÃO mudou: continua sendo
// wc < SHORT_RESPONSE_WORDS && !factual && fu < MAX_FOLLOWUPS_PER_QUESTION.
const FOLLOWUP_PHRASES: Array<{ bucket: FollowupBucket; text: string }> = [
  { bucket: "context",  text: "Pode me contar um pouco mais?" },
  { bucket: "context",  text: "Quer detalhar um pouco?" },
  { bucket: "context",  text: "Como foi isso na prática?" },
  { bucket: "example",  text: "Quer dar um exemplo?" },
  { bucket: "example",  text: "Tem algum caso concreto que vem à cabeça?" },
  { bucket: "example",  text: "Aconteceu alguma situação específica assim?" },
  { bucket: "impact",   text: "E o que aconteceu depois?" },
  { bucket: "impact",   text: "Qual foi o resultado disso?" },
  { bucket: "impact",   text: "Como você se sentiu nessa situação?" },
  { bucket: "learning", text: "O que você aprendeu com isso?" },
  { bucket: "learning", text: "Faria diferente hoje?" },
  { bucket: "learning", text: "O que mudou depois dessa experiência?" },
];

const MAX_FOLLOWUPS_PER_QUESTION = 1;
const SHORT_RESPONSE_WORDS = 4;

// ACKs curados (~24). Sem bajulação, sem juízo de conteúdo, sem viés de
// validação. Concatenados no início da próxima pergunta.
const ACKS: string[] = [
  // Neutros curtos
  "Entendi.", "Certo.", "Ok.", "Anotado.", "Compreendi.",
  // Reconhecimento
  "Faz sentido.", "Entendi sua lógica.", "Boa colocação.", "Interessante.",
  // Validação de exemplo
  "Bom exemplo.", "Legal esse exemplo.", "Boa, exemplo bem concreto.",
  // Continuidade leve
  "Show.", "Bacana.", "Perfeito.", "Ótimo.", "Beleza.",
  // Agradecimento
  "Obrigada por compartilhar.", "Obrigada pelo contexto.", "Valeu por trazer isso.",
  // Transição
  "Tá ótimo.", "Anotei aqui.", "Boa, vamos seguir.", "Pode ser, vamos em frente.",
];

// Hash 32-bit do turn_id inteiro (FNV-1a) — distribuição mais uniforme que
// charCodeAt(0) % len, que tinha entropia baixíssima e repetia muito.
function hashTurnId(turnId: string): number {
  let h = 0x811c9dc5;
  const s = String(turnId || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function pickAck(turnId: string, lastAck?: string | null): string {
  const h = hashTurnId(turnId);
  let idx = h % ACKS.length;
  if (lastAck && ACKS[idx] === lastAck) idx = (idx + 1) % ACKS.length;
  return ACKS[idx];
}

function pickFollowupByBucket(
  turnId: string,
  bucket: FollowupBucket,
  lastFollowup?: string | null,
): string {
  const pool = FOLLOWUP_PHRASES.filter((f) => f.bucket === bucket);
  const list = pool.length ? pool : FOLLOWUP_PHRASES;
  const h = hashTurnId(turnId);
  let idx = h % list.length;
  if (lastFollowup && list[idx].text === lastFollowup && list.length > 1) {
    idx = (idx + 1) % list.length;
  }
  return list[idx].text;
}

// Heurística leve (regex puro) para escolher bucket do follow-up.
const VAGUE_RE = /\b(acho que|talvez|mais ou menos|meio que|sei l[áa]|tipo assim|eu diria que)\b/i;
const PAST_VERB_RE = /\b(fui|tive|consegui|fiz|fizemos|aprendi|percebi|notei|liderei|gerenciei|implementei|criei|resolvi|enfrentei|trabalhei|comecei|terminei|virei|mudei|cresci|ajudei|montei|vendi|entreguei|negociei|contratei|demiti|descobri|errei|acertei|deu certo|deu errado|aconteceu)\b|\w+(?:ei|ou|amos|aram|aste|este|iu)\b/i;

function chooseFollowupBucket(transcript: string, followupCount: number): FollowupBucket {
  const t = String(transcript || "");
  // 2º follow-up sempre vai para impact/learning para variar
  if (followupCount >= 1) return followupCount % 2 === 0 ? "impact" : "learning";
  if (VAGUE_RE.test(t)) return "example";
  if (PAST_VERB_RE.test(t)) return "impact";
  return "context";
}

// Perguntas factuais/screening: resposta naturalmente curta e completa
// (nome, idade, cargo etc). NUNCA disparar follow-up "me conta mais".
const FACTUAL_LABELS = new Set([
  "nome", "nome completo", "idade",
  "formação", "formacao", "formação acadêmica", "formacao academica",
  "cargo", "cargo atual", "tempo na empresa",
  "experiência", "experiencia",
  "email", "e-mail", "telefone", "whatsapp",
  "cidade", "estado",
  "pretensão salarial", "pretensao salarial",
]);

function isFactualQuestion(rawText: string | null | undefined): boolean {
  const raw = String(rawText || "").trim();
  if (!raw) return false;
  const key = raw.toLowerCase().replace(/[?:.!,]/g, "").trim();
  return FACTUAL_LABELS.has(key);
}

// ───────── candidate intent detection ─────────
// Quando o candidato pede repetição, esclarecimento ou volta. Sem isso o
// conductor tratava tudo como resposta válida e avançava cegamente.
type CandidateIntent = "repeat" | "back" | "clarify" | "answer";

const REPEAT_PATTERNS = [
  /\bn[ãa]o\s+entendi\b/i,
  /\bn[ãa]o\s+ouvi\b/i,
  /\bn[ãa]o\s+peguei\b/i,
  /\bn[ãa]o\s+escutei\b/i,
  /\bpode\s+repetir\b/i,
  /\brepete\s+(a\s+)?pergunta\b/i,
  /\brepetir\b/i,
  /\bfala\s+de\s+novo\b/i,
  /\bde\s+novo\s*\??$/i,
  /\bperdi\s+(o\s+)?(final|come[çc]o|meio)\b/i,
  /\bparou\s+no\s+meio\b/i,
  /\bcortou\b/i,
  /^\s*como\s*\??\s*$/i,
  /^\s*o\s*qu[eê]\s*\??\s*$/i,
  /^\s*h[ãa]\s*\??\s*$/i,
  /^\s*oi\s*\??\s*$/i,
];

const BACK_PATTERNS = [
  /\bvolt(a|ar|amos)\b.*\b(pergunta|anterior)\b/i,
  /\bpergunta\s+anterior\b/i,
  /\bpodemos\s+voltar\b/i,
  /\bvolta\s+(a|à)\s+anterior\b/i,
];

const CLARIFY_PATTERNS = [
  /\bcomo\s+assim\b/i,
  /\bo\s+que\s+(voc[êe]\s+)?quis\s+dizer\b/i,
  /\bpode\s+(re)?explicar\b/i,
  /\breformular\b/i,
  /\bn[ãa]o\s+ficou\s+claro\b/i,
];

function detectIntent(text: string): CandidateIntent {
  const t = String(text || "").trim();
  if (!t) return "answer";
  if (BACK_PATTERNS.some((r) => r.test(t))) return "back";
  // REPEAT/CLARIFY só valem em utterances curtas — evita falso-positivo
  // dentro de uma resposta longa que menciona "não entendi" no meio.
  if (wordCount(t) <= 12) {
    if (CLARIFY_PATTERNS.some((r) => r.test(t))) return "clarify";
    if (REPEAT_PATTERNS.some((r) => r.test(t))) return "repeat";
  }
  return "answer";
}

const MAX_REPEATS_PER_QUESTION = 2;

// ───────── label expansion ─────────
// Cultural question banks sometimes seed short labels (Nome, Idade, ...)
// that the model expanded into screening-style questions. Expand them
// deterministically on the server so ai_question_spoken stores a full,
// natural Portuguese sentence and the AI doesn't have to improvise.
const LABEL_MAP: Record<string, string> = {
  "nome": "Para começarmos, qual é o seu nome completo?",
  "idade": "Qual é a sua idade?",
  "formação": "Conta um pouco sobre a sua formação acadêmica.",
  "formacao": "Conta um pouco sobre a sua formação acadêmica.",
  "cargo": "Qual é o seu cargo atual?",
  "cargo atual": "Qual é o seu cargo atual?",
  "tempo na empresa": "Há quanto tempo você está na empresa atual?",
  "experiência": "Me conta um pouco da sua experiência profissional.",
  "experiencia": "Me conta um pouco da sua experiência profissional.",
};

function expandLabel(text: string): { expanded: string; wasExpanded: boolean } {
  const raw = String(text || "").trim();
  if (!raw) return { expanded: raw, wasExpanded: false };
  const key = raw.toLowerCase().replace(/[?:.!,]/g, "").trim();
  if (LABEL_MAP[key]) return { expanded: LABEL_MAP[key], wasExpanded: true };
  // Heuristic: very short rótulos (≤25 chars, no question mark, no verb-ish
  // structure) → wrap into a soft natural prompt.
  if (raw.length <= 25 && !raw.includes("?") && !/\s(me|você|voce|conta|fala|descreve)\s/i.test(raw)) {
    return { expanded: `Sobre ${raw.toLowerCase()}: pode me contar um pouco?`, wasExpanded: true };
  }
  return { expanded: raw, wasExpanded: false };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstNameOf(fullName: string | null | undefined, fallback = "candidato"): string {
  if (!fullName) return fallback;
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

function wordCount(s: string): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function buildOpening(firstName: string, companyName: string): string {
  return `Olá ${firstName}, tudo bem? Sou a entrevistadora de ${companyName} e vou conversar com você por alguns minutos sobre suas experiências e seu jeito de trabalhar. É uma conversa tranquila, pode pensar antes de responder. Tudo certo para começar?`;
}

// B2: closing speak naturalizado. 4 variantes determinísticas baseadas em
// sinais já disponíveis. Sufixo "Pode clicar em encerrar." é IDÊNTICO em
// todas as variantes — é contrato com o frontend (mostra botão Encerrar).
interface ClosingMetrics {
  durationMin: number;     // (now - started_at) / 60000
  coveragePct: number;     // covered / total
  followupsUsed: number;   // entries com match_source === 'conductor_followup'
}
type ClosingVariant = "padrao" | "rapida" | "longa" | "fluida";

function chooseClosingVariant(m: ClosingMetrics): ClosingVariant {
  // Toda variante "especial" exige coverage 100%. Se houve resgate de
  // pergunta pendente (coverage < 100% ao chegar no closing), cai no padrão.
  const full = m.coveragePct >= 0.999;
  if (full && m.durationMin > 0 && m.durationMin < 10) return "rapida";
  if (full && m.durationMin > 20) return "longa";
  if (full && m.followupsUsed === 0 && m.durationMin >= 10 && m.durationMin <= 20) return "fluida";
  return "padrao";
}

function buildClosingText(firstName: string, variant: ClosingVariant): string {
  // Sufixo fixo — não alterar (contrato com frontend).
  const SUFFIX = "Quero lhe agradecer pelo seu tempo. Por favor, clique no botão Encerrar entrevista para finalizar a nossa conexão. Muito obrigada e até logo!";
  switch (variant) {
    case "rapida":
      return `Pronto, chegamos ao final da entrevista. ${firstName}, obrigada pelas respostas diretas e objetivas. Foi ótimo conversar. ${SUFFIX}`;
    case "longa":
      return `Pronto, chegamos ao final da entrevista. ${firstName}, muito obrigada pelo tempo e pelos exemplos detalhados. Conversa muito rica. ${SUFFIX}`;
    case "fluida":
      return `Pronto, chegamos ao final da entrevista. ${firstName}, obrigada pela conversa fluida. Foi um prazer. ${SUFFIX}`;
    case "padrao":
    default:
      return `Pronto, chegamos ao final da entrevista. ${firstName}, muito obrigada pela conversa! Foi um prazer conhecer você. ${SUFFIX}`;
  }
}

function buildClosing(
  firstName: string,
  startedAt: string | null | undefined,
  coverageLog: Array<{ question_index: number; match_source?: string | null }>,
  total: number,
): { text: string; variant: ClosingVariant; metrics: ClosingMetrics } {
  const started = startedAt ? new Date(startedAt).getTime() : 0;
  const durationMin = started > 0 ? (Date.now() - started) / 60000 : 0;
  const covered = new Set(coverageLog.map((c) => c.question_index)).size;
  const coveragePct = total > 0 ? covered / total : 0;
  const followupsUsed = coverageLog.filter((c) => c.match_source === "conductor_followup").length;
  const metrics: ClosingMetrics = { durationMin, coveragePct, followupsUsed };
  const variant = chooseClosingVariant(metrics);
  return { text: buildClosingText(firstName, variant), variant, metrics };
}

async function loadSession(supabase: ReturnType<typeof createClient>, sessionId: string) {
  const { data, error } = await supabase
    .from("culture_interview_sessions")
    .select(
      "id, account_id, candidate_id, status, is_test, questions, questions_total, questions_covered, " +
        "current_question_index, current_followup_count, conductor_state, conductor_enabled, " +
        "started_at, completed_at, coverage_log",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadDisplayName(
  supabase: ReturnType<typeof createClient>,
  candidateId: string | null | undefined,
  accountId: string | null | undefined,
): Promise<{ firstName: string; companyName: string }> {
  let firstName = "candidato";
  let companyName = "nossa empresa";
  if (candidateId) {
    const { data: cand } = await supabase
      .from("recruitment_candidates")
      .select("first_name, last_name")
      .eq("id", candidateId)
      .maybeSingle();
    if (cand) {
      const c = cand as { first_name?: string | null; last_name?: string | null };
      firstName = firstNameOf(c.first_name || c.last_name, "candidato");
    }
  }
  if (accountId) {
    const { data: acc } = await supabase
      .from("companies")
      .select("name")
      .eq("id", accountId)
      .maybeSingle();
    const a = acc as { name?: string | null } | null;
    if (a?.name) companyName = a.name;
  }
  return { firstName, companyName };
}


async function logEvent(
  supabase: ReturnType<typeof createClient>,
  accountId: string | null | undefined,
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  if (!accountId) return;
  try {
    await supabase.from("voice_interview_events").insert({
      account_id: accountId,
      session_id: sessionId,
      session_type: "cultural",
      event_type: eventType,
      payload,
    });
  } catch (e) {
    console.warn("logEvent failed", e);
  }
}

interface NextTurnResult {
  action: "speak" | "end" | "wait";
  say: string;
  turnId: string;
  questionIndex: number;
  isFollowup: boolean;
  phase: Phase;
  coverage: { covered: number; total: number };
  speculative?: boolean;
}

async function computeNextTurn(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  speculative = false,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const session = await loadSession(supabase, sessionId);
  if (!session) return { status: 404, body: { error: "session_not_found" } };
  const s = session as {
    account_id: string | null;
    candidate_id: string | null;
    status: string;
    questions: SessionQuestion[] | null;
    questions_total: number | null;
    questions_covered: number | null;
    current_question_index: number;
    current_followup_count: number;
    conductor_state: ConductorState | null;
    conductor_enabled: boolean;
    started_at: string | null;
    coverage_log: Array<{ question_index: number; match_source?: string | null }> | null;
  };

  if (!s.conductor_enabled) {
    return { status: 400, body: { error: "conductor_disabled_for_session" } };
  }
  if (s.status === "completed" || s.status === "cancelled" || s.status === "expired") {
    return {
      status: 200,
      body: { action: "end", say: "", phase: "done", turnId: "", questionIndex: -1, isFollowup: false, coverage: { covered: s.questions_covered ?? 0, total: s.questions_total ?? 0 } },
    };
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  const total = s.questions_total ?? questions.length;
  if (!questions.length) return { status: 400, body: { error: "no_questions" } };

  const prevState = s.conductor_state || {};
  let phase: Phase = prevState.phase || "opening";
  let qi = s.current_question_index ?? 0;
  let fu = s.current_followup_count ?? 0;

  // ── Coverage gate ──
  // Antes de qualquer transição para "closing", validar se TODAS as perguntas
  // foram realmente cobertas. Se faltar alguma, redirecionar para a primeira
  // pendente em vez de encerrar. Evita encerramento precoce quando o índice
  // avança mas o coverage_log não consolida (resposta curta, follow-up, etc).
  //
  // ANTI-LOOP: cada qi só pode ser "resgatado" no máximo 2 vezes. Se passar
  // disso, a pergunta é considerada efetivamente coberta e o gate libera o
  // closing. Sem isso, factuais com resposta curta ficavam fora do log e o
  // gate redirecionava infinitamente (bug Aline 01/jun, sessão wrap-around).
  const coverageLogArr = Array.isArray(s.coverage_log)
    ? (s.coverage_log as Array<{ question_index: number }>)
    : [];
  const coveredSetGate = new Set(coverageLogArr.map((c) => c.question_index));
  const rescueByQi: Record<string, number> = { ...(prevState.coverageRescueByQi ?? {}) };
  const MAX_RESCUE_PER_QI = 2;
  const isExhausted = (i: number) => (rescueByQi[String(i)] ?? 0) >= MAX_RESCUE_PER_QI;
  // qis "efetivamente cobertos" = no coverage_log OU já tentamos resgatar 2x.
  const effectivelyCovered = (i: number) => coveredSetGate.has(i) || isExhausted(i);
  const firstMissingIndex = (): number => {
    for (let i = 0; i < total; i++) if (!effectivelyCovered(i)) return i;
    return -1;
  };

  const { firstName, companyName } = await loadDisplayName(supabase, s.candidate_id, s.account_id);

  let say = "";
  let action: "speak" | "end" | "wait" = "speak";
  let isFollowup = false;
  let labelExpanded = false;
  let coverageRescue = false;
  const turnId = crypto.randomUUID();
  const prevPhase = prevState.phase;

  // Closing variant (B2) é calculado uma vez quando precisamos da fala de fechamento.
  let closingVariant: ClosingVariant | null = null;
  const coverageLogTyped = (s.coverage_log ?? []) as Array<{ question_index: number; match_source?: string | null }>;


  if (phase === "opening") {
    say = buildOpening(firstName, companyName);
    qi = 0;
    fu = 0;
    phase = "awaiting_start";
  } else if (phase === "awaiting_start") {
    // Candidate confirmed → ask first question. computeNextTurn is called
    // again right after commit-turn, which advances awaiting_start → asking.
    if (qi >= total && coveredSetGate.size < total) {
      const miss = firstMissingIndex();
      if (miss >= 0) { qi = miss; coverageRescue = true; }
    }
    if (qi >= total) {
      const c = buildClosing(firstName, s.started_at, coverageLogTyped, total);
      say = c.text;
      closingVariant = c.variant;
      phase = "closing";
    } else {
      const expansion = expandLabel(questions[qi].question_text);
      say = expansion.expanded;
      labelExpanded = expansion.wasExpanded;
      phase = "asking";
    }
  } else if (phase === "asking") {
    if (qi >= total && firstMissingIndex() >= 0) {
      // Coverage gate: índice estourou mas faltam perguntas. Volta para a
      // primeira pendente em vez de encerrar.
      const miss = firstMissingIndex();
      if (miss >= 0) { qi = miss; coverageRescue = true; }
    }
    if (qi >= total) {
      const c = buildClosing(firstName, s.started_at, coverageLogTyped, total);
      say = c.text;
      closingVariant = c.variant;
      phase = "closing";

    } else if (coverageRescue) {
      const expansion = expandLabel(questions[qi].question_text);
      say = `Antes de encerrarmos, faltou uma pergunta. ${expansion.expanded}`;
      labelExpanded = expansion.wasExpanded;
    } else if (prevState.useStoredSay && prevState.currentSay) {
      // Resposta de intent (repeat/back/clarify) preparou a próxima fala
      // com prefixo pronto — usar direto, sem ack nem re-expansão.
      say = prevState.currentSay;
    } else {
      const expansion = expandLabel(questions[qi].question_text);
      // Prefix com reação curta só quando vier de uma resposta real
      // (não na primeira pergunta após a abertura, nem em follow-ups,
      // nem no closing).
      const cameFromResponse =
        qi > 0 && (prevPhase === "asking" || prevPhase === "followup");
      say = cameFromResponse
        ? `${pickAck(turnId, prevState.lastAck ?? null)} ${expansion.expanded}`
        : expansion.expanded;
      labelExpanded = expansion.wasExpanded;
    }
  } else if (phase === "followup") {
    const bucket: FollowupBucket = (prevState.followupBucket as FollowupBucket | null) ?? "context";
    say = pickFollowupByBucket(turnId, bucket, prevState.lastFollowup ?? null);
    isFollowup = true;
  } else if (phase === "closing") {
    // Última linha de defesa: se ainda há perguntas não cobertas E não excedeu
    // o budget de rescue, NÃO encerra.
    if (firstMissingIndex() >= 0) {
      const miss = firstMissingIndex();
      if (miss >= 0) {
        qi = miss;
        coverageRescue = true;
        phase = "asking";
        const expansion = expandLabel(questions[qi].question_text);
        say = `Antes de encerrarmos, faltou uma pergunta. ${expansion.expanded}`;
        labelExpanded = expansion.wasExpanded;
      } else {
        action = "end";
        say = "";
        phase = "done";
      }
    } else if (prevState.phase === "closing") {

      // Se já estávamos em closing e viemos para o computeNextTurn de novo,
      // significa que o turno de fala da despedida já foi disparado/commitado.
      // Agora sim, encerramos a conexão.
      action = "end";
      say = "";
      phase = "done";
    } else {
      // Primeira vez entrando em closing: vamos falar a despedida!
      const c = buildClosing(firstName, s.started_at, coverageLogTyped, total);
      say = c.text;
      action = "speak";
      // Mantemos phase como "closing" para que o próximo ciclo (após o commit-turn) caia no "done".
    }
  } else if (phase === "done") {
    action = "end";
    say = "";
  }

  if (coverageRescue) {
    // Incrementa o contador para o qi resgatado. Após MAX_RESCUE_PER_QI,
    // `effectivelyCovered(qi)` vira true e o gate libera o closing.
    const key = String(qi);
    rescueByQi[key] = (rescueByQi[key] ?? 0) + 1;
    console.log("[conductor] coverage_rescue", {
      sessionId, covered: coveredSetGate.size, total, redirectedTo: qi,
      rescueAttempt: rescueByQi[key], cap: MAX_RESCUE_PER_QI,
    });
  }

  // Calcular novos last_ack / last_followup para anti-repetição no próximo turno.
  let newLastAck: string | null = prevState.lastAck ?? null;
  let newLastFollowup: string | null = prevState.lastFollowup ?? null;
  if (isFollowup) {
    newLastFollowup = say;
  } else if (phase === "asking" && say) {
    // Detectar se o say começou com um ACK (até o primeiro ponto).
    const firstSentence = say.split(/(?<=\.)\s/)[0];
    if (ACKS.includes(firstSentence)) newLastAck = firstSentence;
  }

  const nextState: ConductorState = {
    phase,
    currentTurnId: turnId,
    currentSay: say,
    currentQuestionIndex: qi,
    isFollowup,
    repeatCount: prevState.repeatCount ?? 0,
    useStoredSay: false,
    lastAck: newLastAck,
    lastFollowup: newLastFollowup,
    followupBucket: prevState.followupBucket ?? null,
    closingVariant: closingVariant ?? prevState.closingVariant ?? null,
    coverageRescueByQi: rescueByQi,
  };


  if (!speculative) {
    const updates: Record<string, unknown> = {
      conductor_state: nextState,
      current_question_index: qi,
      current_followup_count: fu,
      last_activity_at: new Date().toISOString(),
    };
    if (s.status === "pending" && action === "speak") {
      updates.status = "in_progress";
      updates.started_at = new Date().toISOString();
    }
    const { error: updErr } = await supabase
      .from("culture_interview_sessions")
      .update(updates)
      .eq("id", sessionId);
    if (updErr) {
      console.error("next-turn update failed", updErr);
      return { status: 500, body: { error: "next_turn_update_failed" } };
    }
    await logEvent(supabase, s.account_id, sessionId, "conductor_next_turn", {
      phase,
      action,
      questionIndex: qi,
      isFollowup,
      turnId,
      sayLen: say.length,
      labelExpanded,
      closingVariant: closingVariant ?? undefined,
      followupBucket: isFollowup ? (prevState.followupBucket ?? "context") : undefined,
    });
  }

  return {
    status: 200,
    body: {
      action,
      say,
      turnId,
      questionIndex: qi,
      isFollowup,
      phase,
      coverage: { covered: s.questions_covered ?? 0, total },
      speculative,
      labelExpanded,
    } satisfies NextTurnResult & { labelExpanded: boolean },
  };
}

async function persistTurn(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  body: { turnId: string; candidateTranscript: string; startSec: number; endSec: number },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const session = await loadSession(supabase, sessionId);
  if (!session) return { status: 404, body: { error: "session_not_found" } };
  const s = session as {
    account_id: string | null;
    questions: SessionQuestion[] | null;
    questions_total: number | null;
    questions_covered: number | null;
    current_question_index: number;
    current_followup_count: number;
    conductor_state: ConductorState | null;
    conductor_enabled: boolean;
    coverage_log: Array<{ question_index: number }> | null;
  };

  if (!s.conductor_enabled) return { status: 400, body: { error: "conductor_disabled" } };
  const state = s.conductor_state || {};
  if (!state.currentTurnId || state.currentTurnId !== body.turnId) {
    return {
      status: 200,
      body: { ok: true, stale: true, coverage: { covered: s.questions_covered ?? 0, total: s.questions_total ?? 0 } },
    };
  }
  const phase = state.phase || "asking";

  // awaiting_start: any non-empty candidate utterance counts as confirmation.
  // Don't persist a response — just advance to "asking" q0.
  if (phase === "awaiting_start") {
    const transcript = String(body.candidateTranscript || "").trim();
    const confirmed = wordCount(transcript) > 0;
    const { error: sessUpdErr } = await supabase
      .from("culture_interview_sessions")
      .update({
        conductor_state: {
          phase: confirmed ? "asking" : "awaiting_start",
          currentTurnId: null,
          currentSay: null,
          currentQuestionIndex: 0,
          isFollowup: false,
        } satisfies ConductorState,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (sessUpdErr) console.error("awaiting_start update failed", sessUpdErr);
    await logEvent(supabase, s.account_id, sessionId, "conductor_commit_turn", {
      phase, confirmed, nextPhase: confirmed ? "asking" : "awaiting_start",
    });
    return { status: 200, body: { ok: true, confirmed, nextPhase: confirmed ? "asking" : "awaiting_start", coverage: { covered: s.questions_covered ?? 0, total: s.questions_total ?? 0 } } };
  }

  if (phase !== "asking" && phase !== "followup") {
    return {
      status: 200,
      body: { ok: true, noResponse: true, coverage: { covered: s.questions_covered ?? 0, total: s.questions_total ?? 0 } },
    };
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  const qi = state.currentQuestionIndex ?? s.current_question_index ?? 0;
  const total = s.questions_total ?? questions.length;
  const q = questions[qi];
  const rawQuestionText = q?.question_text || `Pergunta ${qi + 1}`;
  const questionText = expandLabel(rawQuestionText).expanded;
  const valueLabel = (q as { value_label?: string | null } | undefined)?.value_label ?? null;
  const aiSpoken = state.currentSay || questionText;
  const transcript = String(body.candidateTranscript || "").trim();
  const startSec = Number.isFinite(body.startSec) ? Math.max(0, Math.floor(body.startSec)) : 0;
  const endSec = Number.isFinite(body.endSec) ? Math.max(startSec, Math.floor(body.endSec)) : startSec;

  // ─── Intent detection: repeat / back / clarify ───
  // Roda ANTES de persistir a resposta e ANTES de avançar. Se for um pedido
  // do candidato (não uma resposta real), o conductor reage e não trata
  // como cobertura. Sem isso a IA seguia em frente cegamente.
  const intent: CandidateIntent =
    (phase === "asking" || phase === "followup") ? detectIntent(transcript) : "answer";

  if (intent === "repeat" || intent === "clarify" || intent === "back") {
    const questionsArr = Array.isArray(s.questions) ? s.questions : [];
    const totalQ = s.questions_total ?? questionsArr.length;
    const prevRepeats = state.repeatCount ?? 0;
    let targetQi = qi;
    let prefix = "";
    let nextRepeats = prevRepeats;
    let resolvedIntent: CandidateIntent = intent;

    if (intent === "back") {
      targetQi = Math.max(0, qi - 1);
      prefix = "Claro, voltando à anterior. ";
      nextRepeats = 0;
    } else if (prevRepeats + 1 > MAX_REPEATS_PER_QUESTION) {
      // 3ª tentativa: desencalha e segue para a próxima.
      targetQi = Math.min(totalQ, qi + 1);
      prefix = "Sem problema, vamos para a próxima. ";
      nextRepeats = 0;
      resolvedIntent = "answer"; // efeito final é avanço
    } else {
      prefix = intent === "clarify" ? "Posso reformular. " : "Claro, vou repetir. ";
      nextRepeats = prevRepeats + 1;
    }

    const targetText =
      targetQi >= totalQ
        ? buildClosing(
            (await loadDisplayName(supabase, null, s.account_id)).firstName,
            (s as { started_at?: string | null }).started_at ?? null,
            (Array.isArray(s.coverage_log) ? s.coverage_log : []) as Array<{ question_index: number; match_source?: string | null }>,
            totalQ,
          ).text
        : prefix + expandLabel(questionsArr[targetQi]?.question_text || "").expanded;

    // Em BACK, remove a pergunta do coverage_log (se já estava lá) e
    // limpa a resposta gravada para que o candidato possa responder de novo.
    const existingLogB = Array.isArray(s.coverage_log) ? s.coverage_log : [];
    const cleanedLog =
      intent === "back"
        ? existingLogB.filter((c) => c.question_index !== targetQi)
        : existingLogB;

    if (intent === "back") {
      try {
        await supabase
          .from("culture_interview_responses")
          .delete()
          .eq("session_id", sessionId)
          .eq("question_index", targetQi);
      } catch (e) {
        console.warn("back: failed to clear previous response", e);
      }
    }

    const nextPhaseI: Phase = targetQi >= totalQ ? "closing" : "asking";
    const { error: intentUpdErr } = await supabase
      .from("culture_interview_sessions")
      .update({
        current_question_index: targetQi,
        current_followup_count: 0,
        conductor_state: {
          phase: nextPhaseI,
          currentTurnId: null,
          currentSay: targetText,
          currentQuestionIndex: targetQi,
          isFollowup: false,
          repeatCount: nextRepeats,
          useStoredSay: true,
        } satisfies ConductorState,
        coverage_log: cleanedLog,
        questions_covered: cleanedLog.length,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (intentUpdErr) console.error("intent update failed", intentUpdErr);

    await logEvent(supabase, s.account_id, sessionId, "conductor_commit_turn", {
      phase,
      questionIndex: qi,
      intent: resolvedIntent,
      detectedIntent: intent,
      repeatCount: nextRepeats,
      nextPhase: nextPhaseI,
      nextQuestionIndex: targetQi,
      wordCount: wordCount(transcript),
    });

    return {
      status: 200,
      body: {
        ok: true,
        intent: resolvedIntent,
        coverage: { covered: cleanedLog.length, total: totalQ },
        nextPhase: nextPhaseI,
      },
    };
  }


  if (phase === "followup") {
    const { error: upErr } = await supabase
      .from("culture_interview_responses")
      .update({
        follow_up_question: aiSpoken,
        follow_up_response: transcript,
        end_seconds: endSec,
      })
      .eq("session_id", sessionId)
      .eq("question_index", qi);
    if (upErr) console.error("followup update failed", upErr);
  } else {
    const { error: upErr } = await supabase
      .from("culture_interview_responses")
      .upsert(
        {
          session_id: sessionId,
          question_index: qi,
          question_text: questionText,
          candidate_response: transcript,
          ai_question_spoken: aiSpoken,
          value_label: valueLabel,
          start_seconds: startSec,
          end_seconds: endSec,
        },
        { onConflict: "session_id,question_index", ignoreDuplicates: false },
      );
    if (upErr) {
      console.error("commit-turn upsert failed", upErr);
      return { status: 500, body: { error: "persist_failed", details: upErr.message } };
    }
  }

  const existingLog = Array.isArray(s.coverage_log) ? s.coverage_log : [];
  const covered = new Set(existingLog.map((c) => c.question_index));
  const wcEarly = wordCount(transcript);
  const factualEarly = isFactualQuestion(rawQuestionText);
  // realResponse: respostas substantivas (>2 palavras) entram no coverage_log.
  // Mas para perguntas factuais (Nome, Idade, Cidade...) a resposta é
  // naturalmente curta (1-2 palavras) e VÁLIDA. Se não contássemos, o
  // gate de cobertura no closing entraria em loop infinito (bug Aline 01/jun).
  const isAcceptable = wcEarly > 2 || (factualEarly && wcEarly >= 1);
  let updatedLog = existingLog;
  // Cobertura consolida tanto na pergunta principal ("asking") quanto em
  // follow-ups substantivos. Sem isso, perguntas que só receberam resposta
  // útil no follow-up ficavam fora do coverage_log e o índice avançava
  // levando a um encerramento precoce.
  if ((phase === "asking" || phase === "followup") && isAcceptable && !covered.has(qi)) {
    updatedLog = [
      ...existingLog,
      {
        question_index: qi,
        ai_question_text: aiSpoken,
        response_excerpt: transcript.slice(0, 200),
        covered_at: new Date().toISOString(),
        match_source: phase === "followup" ? "conductor_followup" : "conductor",
      },
    ];
  }



  let nextPhase: Phase;
  let nextQi = qi;
  let nextFu = s.current_followup_count ?? 0;
  let nextFollowupBucket: FollowupBucket | null = null;
  const wc = wcEarly;
  const factual = factualEarly;
  if (phase === "asking" && !factual && wc < SHORT_RESPONSE_WORDS && nextFu < MAX_FOLLOWUPS_PER_QUESTION) {
    nextPhase = "followup";
    nextFollowupBucket = chooseFollowupBucket(transcript, nextFu);
    nextFu = nextFu + 1;
  } else {
    nextQi = qi + 1;
    nextFu = 0;
    nextPhase = nextQi >= total ? "closing" : "asking";
  }


  const newCoveredCount = updatedLog.length;
  const { error: sessUpdErr } = await supabase
    .from("culture_interview_sessions")
    .update({
      current_question_index: nextQi,
      current_followup_count: nextFu,
      conductor_state: {
        phase: nextPhase,
        currentTurnId: null,
        currentSay: null,
        currentQuestionIndex: nextQi,
        isFollowup: nextPhase === "followup",
        repeatCount: nextQi !== qi ? 0 : (state.repeatCount ?? 0),
        useStoredSay: false,
        // Preservar anti-repetição entre turnos.
        lastAck: state.lastAck ?? null,
        lastFollowup: state.lastFollowup ?? null,
        followupBucket: nextFollowupBucket,
        closingVariant: state.closingVariant ?? null,
        coverageRescueByQi: state.coverageRescueByQi ?? {},
      } satisfies ConductorState,

      coverage_log: updatedLog,
      questions_covered: newCoveredCount,
      questions_total: total,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (sessUpdErr) console.error("session update after commit failed", sessUpdErr);

  await logEvent(supabase, s.account_id, sessionId, "conductor_commit_turn", {
    phase,
    questionIndex: qi,
    isFollowup: phase === "followup",
    wordCount: wc,
    factualSkipFollowup: factual && phase === "asking" && wc < SHORT_RESPONSE_WORDS,
    nextPhase,
    nextQuestionIndex: nextQi,
    coverageAfter: newCoveredCount,
    nextFollowupBucket: nextFollowupBucket ?? undefined,
  });

  return {
    status: 200,
    body: { ok: true, coverage: { covered: newCoveredCount, total }, nextPhase },
  };
}

async function handleAbort(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  reason: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const session = await loadSession(supabase, sessionId);
  if (!session) return { status: 404, body: { error: "session_not_found" } };
  const s = session as {
    account_id: string | null;
    is_test: boolean | null;
    status: string;
    questions_total: number | null;
    questions_covered: number | null;
    started_at: string | null;
  };

  const total = s.questions_total ?? 0;
  const covered = s.questions_covered ?? 0;
  const naturalThreshold = 0.7;
  const completedNaturally = total > 0 ? covered / total >= naturalThreshold : false;
  const now = new Date();
  const startedAt = s.started_at ? new Date(s.started_at) : null;
  const durationSec = startedAt ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000)) : null;

  const { error: updErr } = await supabase
    .from("culture_interview_sessions")
    .update({
      status: "completed",
      completed_at: now.toISOString(),
      completed_naturally: completedNaturally,
      duration_seconds: durationSec,
      last_activity_at: now.toISOString(),
      conductor_state: { phase: "done" } satisfies ConductorState,
    })
    .eq("id", sessionId);
  if (updErr) {
    console.error("abort update failed", updErr);
    return { status: 500, body: { error: "abort_update_failed" } };
  }

  await logEvent(supabase, s.account_id, sessionId, "conductor_abort", {
    reason: reason || "manual",
    completedNaturally,
    durationSec,
    covered,
    total,
  });

  if (!s.is_test) {
    try {
      await supabase.functions.invoke("culture-interview-complete", {
        body: { sessionId, isPartial: !completedNaturally },
      });
    } catch (e) {
      console.warn("could not invoke culture-interview-complete after abort", e);
    }
  }

  return {
    status: 200,
    body: { ok: true, completedNaturally, durationSec, coverage: { covered, total } },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";
    const body = await req.json().catch(() => ({}));
    const sessionId = String((body as { sessionId?: string }).sessionId || "");
    if (!sessionId) return jsonResponse({ error: "sessionId_required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (path === "next-turn") {
      const speculative = Boolean((body as { speculative?: boolean }).speculative)
        || url.searchParams.get("speculative") === "true";
      const r = await computeNextTurn(supabase, sessionId, speculative);
      return jsonResponse(r.body, r.status);
    }
    if (path === "commit-turn") {
      const r = await persistTurn(supabase, sessionId, {
        turnId: String((body as { turnId?: string }).turnId || ""),
        candidateTranscript: String((body as { candidateTranscript?: string }).candidateTranscript || ""),
        startSec: Number((body as { startSec?: number }).startSec ?? 0),
        endSec: Number((body as { endSec?: number }).endSec ?? 0),
      });
      return jsonResponse(r.body, r.status);
    }
    if (path === "abort") {
      const r = await handleAbort(
        supabase,
        sessionId,
        String((body as { reason?: string }).reason || "").slice(0, 80) || null,
      );
      return jsonResponse(r.body, r.status);
    }

    return jsonResponse({ error: "unknown_action", path }, 404);
  } catch (e) {
    console.error("interview-conductor error", e);
    return jsonResponse(
      { error: "internal_error", message: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
