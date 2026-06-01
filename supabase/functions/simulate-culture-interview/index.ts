// Internal QA tool — Super Admin only. Runs a text-based simulation of the
// cultural fit voice interview to verify that the interviewer AI follows the
// structured questions. NOT customer-facing; does NOT debit credits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AgentQuestion {
  id: string;
  question_text: string;
  position: number;
}

const PERSONA_PROMPTS: Record<string, string> = {
  balanced:
    "Você é um candidato simulado para QA. Responda às perguntas da entrevistadora de forma natural e razoavelmente desenvolvida (3 a 6 frases). Dê exemplos concretos quando faz sentido. Quando ela disser que terminou, diga 'pode encerrar'.",
  short:
    "Você é um candidato simulado que responde de forma muito curta (1 frase). Não dê exemplos a menos que insistam. Quando ela disser que terminou, diga 'pode encerrar'.",
  evasive:
    "Você é um candidato simulado que dá respostas vagas e evita exemplos. Use generalidades. Quando ela disser que terminou, diga 'pode encerrar'.",
  detailed:
    "Você é um candidato simulado que dá respostas detalhadas com 2 exemplos concretos por pergunta. Quando ela disser que terminou, diga 'pode encerrar'.",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topicKeywords(question: string): string[] {
  const stop = new Set([
    "voce","como","que","qual","quais","sobre","para","com","uma","seu","sua","seus","suas","mais","menos","quando","onde","fala","conta","me","de","da","do","das","dos","em","ou","e","a","o","os","as","um","ao","aos","na","nos","na","nas","pelo","pela","por","isso","essa","esse","essas","esses","esta","este","estas","estes","ja","ainda","tem","seja","muito","pouco","bem","mal","ser","estar","ter","poder",
  ]);
  return normalize(question)
    .split(" ")
    .filter((w) => w.length > 3 && !stop.has(w));
}

function isQuestionCovered(question: string, interviewerTurns: string[]): boolean {
  const keys = topicKeywords(question).slice(0, 6);
  if (keys.length === 0) return false;
  const joined = normalize(interviewerTurns.join(" \n "));
  let hits = 0;
  for (const k of keys) if (joined.includes(k)) hits++;
  return hits / keys.length >= 0.5;
}

async function chat(openaiKey: string, model: string, messages: any[], temperature = 0.7) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Auth — Super Admin only
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;

  const { data: isSuper } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userId });
  if (!isSuper) {
    return new Response(JSON.stringify({ error: "Forbidden — Super Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const { jobId, persona = "balanced", candidateName = "Candidato Teste", maxTurns = 60 } = body || {};
  if (!jobId) {
    return new Response(JSON.stringify({ error: "jobId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fetch job, agent, questions, company
  const { data: job } = await supabaseAdmin
    .from("recruitment_jobs")
    .select("id, agent_id, account_id, title")
    .eq("id", jobId)
    .single();
  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let agentId = job.agent_id as string | null;
  if (!agentId) {
    const { data: step } = await supabaseAdmin
      .from("recruitment_job_workflow_steps")
      .select("agent_id")
      .eq("job_id", jobId)
      .eq("step_type", "cultural")
      .eq("is_active", true)
      .not("agent_id", "is", null)
      .limit(1)
      .maybeSingle();
    agentId = step?.agent_id ?? null;
  }
  if (!agentId) {
    const { data: any } = await supabaseAdmin
      .from("recruitment_agents")
      .select("id")
      .eq("account_id", job.account_id)
      .eq("type", "structured")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    agentId = any?.id ?? null;
  }
  if (!agentId) {
    return new Response(JSON.stringify({ error: "No cultural agent for this job" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: qRows } = await supabaseAdmin
    .from("recruitment_agent_questions")
    .select("id, question_text, position")
    .eq("agent_id", agentId)
    .order("position", { ascending: true });
  const questions: AgentQuestion[] = (qRows ?? []).map((q, i) => ({
    id: q.id,
    question_text: q.question_text,
    position: q.position ?? i + 1,
  }));
  if (questions.length === 0) {
    return new Response(JSON.stringify({ error: "Agent has no questions" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Resolve company name
  const { data: acc } = await supabaseAdmin.from("accounts").select("name").eq("id", job.account_id).maybeSingle();
  const companyName = acc?.name ?? "a empresa";
  const firstName = candidateName.split(" ")[0];

  // Create simulation row
  const { data: sim, error: simErr } = await supabaseAdmin
    .from("voice_interview_simulations")
    .insert({
      job_id: jobId,
      account_id: job.account_id,
      agent_id: agentId,
      triggered_by: userId,
      persona,
      status: "running",
      questions_total: questions.length,
    })
    .select("id")
    .single();
  if (simErr) {
    return new Response(JSON.stringify({ error: simErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const simId = sim.id;

  const questionsText = questions.map((q, i) => `${i + 1}. ${q.question_text}`).join("\n");

  const interviewerSystem = `Você é uma entrevistadora de matching cultural profissional e acolhedora da empresa ${companyName}.
Conduza a entrevista em PORTUGUÊS DO BRASIL com ${firstName}.

SUAS PERGUNTAS (cubra TODAS, na ordem):
${questionsText}

Regras:
- Faça abertura curta, alinhe expectativas, depois faça as perguntas uma por vez.
- Aceite a resposta, reaja brevemente ("entendi", "interessante"), e avance.
- No máximo 2 follow-ups por tema.
- Ao final, diga literalmente: "Pronto, agora já pode clicar em encerrar!".
- Nunca mencione "Gêntia".`;

  const candidateSystem = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.balanced;

  const interviewerMessages: any[] = [{ role: "system", content: interviewerSystem }];
  const candidateMessages: any[] = [{ role: "system", content: candidateSystem }];
  const transcript: Array<{ role: "interviewer" | "candidate"; text: string; ts: number }> = [];
  const interviewerTurns: string[] = [];
  const startedAt = Date.now();

  const model = "gpt-5-mini";
  let ended = false;
  let turns = 0;
  let errorMessage: string | null = null;

  try {
    // Kick off — interviewer speaks first
    let interviewerText = await chat(openaiKey, model, interviewerMessages);
    interviewerMessages.push({ role: "assistant", content: interviewerText });
    candidateMessages.push({ role: "user", content: interviewerText });
    transcript.push({ role: "interviewer", text: interviewerText, ts: Date.now() - startedAt });
    interviewerTurns.push(interviewerText);
    turns++;

    while (!ended && turns < maxTurns) {
      const candidateText = await chat(openaiKey, model, candidateMessages, 0.8);
      candidateMessages.push({ role: "assistant", content: candidateText });
      interviewerMessages.push({ role: "user", content: candidateText });
      transcript.push({ role: "candidate", text: candidateText, ts: Date.now() - startedAt });
      turns++;

      interviewerText = await chat(openaiKey, model, interviewerMessages);
      interviewerMessages.push({ role: "assistant", content: interviewerText });
      candidateMessages.push({ role: "user", content: interviewerText });
      transcript.push({ role: "interviewer", text: interviewerText, ts: Date.now() - startedAt });
      interviewerTurns.push(interviewerText);
      turns++;

      if (/encerrar/i.test(interviewerText) && /pronto/i.test(interviewerText)) ended = true;
    }
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  // Coverage analysis
  const coverageMap = questions.map((q) => ({
    id: q.id,
    position: q.position,
    question: q.question_text,
    covered: isQuestionCovered(q.question_text, interviewerTurns),
  }));
  const questionsCovered = coverageMap.filter((c) => c.covered).length;
  const adherence = questions.length ? Number((questionsCovered / questions.length).toFixed(3)) : 0;

  // Deviation: questions not covered
  const deviations = coverageMap.filter((c) => !c.covered).map((c) => ({ id: c.id, position: c.position, question: c.question }));

  const status = errorMessage ? "failed" : ended ? "completed" : "timeout";

  await supabaseAdmin
    .from("voice_interview_simulations")
    .update({
      status,
      questions_covered: questionsCovered,
      adherence_score: adherence,
      turns_count: turns,
      transcript,
      coverage_map: coverageMap,
      deviations,
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", simId);

  return new Response(
    JSON.stringify({
      simulationId: simId,
      status,
      questionsTotal: questions.length,
      questionsCovered,
      adherenceScore: adherence,
      turns,
      durationMs: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
