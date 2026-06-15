import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  let uploadId: string | null = null;

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    uploadId = body?.uploadId;
    if (!uploadId) {
      return new Response(JSON.stringify({ error: "uploadId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load upload record
    const { data: upload, error: upErr } = await supabaseAdmin
      .from("offline_interview_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();
    if (upErr || !upload) {
      return new Response(JSON.stringify({ error: "Upload not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Membership
    const { data: membership } = await supabaseAdmin
      .from("account_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("account_id", upload.account_id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark transcribing
    await supabaseAdmin
      .from("offline_interview_uploads")
      .update({ status: "transcribing", error_message: null })
      .eq("id", uploadId);

    // Download audio
    const { data: audioData, error: dlErr } = await supabaseAdmin.storage
      .from("offline-interviews")
      .download(upload.audio_path);
    if (dlErr || !audioData) {
      throw new Error(`Download failed: ${dlErr?.message || "no data"}`);
    }

    // Transcribe via Whisper
    const fileName = upload.audio_path.split("/").pop() || "interview.webm";
    const sttForm = new FormData();
    sttForm.append("file", audioData, fileName);
    sttForm.append("model", "whisper-1");
    sttForm.append("language", upload.language || "pt");
    sttForm.append("response_format", "verbose_json");
    sttForm.append("timestamp_granularities[]", "segment");

    const sttResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: sttForm,
    });
    if (!sttResp.ok) {
      const t = await sttResp.text();
      throw new Error(`Whisper error ${sttResp.status}: ${t.substring(0, 200)}`);
    }
    const transcription = await sttResp.json();
    const rawText: string = transcription.text || "";
    const audioDurationSec = typeof transcription.duration === 'number' ? transcription.duration : 0;
    if (!rawText || rawText.length < 30) {
      throw new Error("Transcrição muito curta ou vazia");
    }

    // Bill Whisper transcription by audio duration
    if (audioDurationSec > 0) {
      await consumeAICredits({
        supabase: supabaseAdmin,
        accountId: upload.account_id,
        durationSeconds: audioDurationSec,
        model: 'openai/whisper-1',
        referenceId: uploadId,
        referenceType: 'offline_interview_whisper',
        description: `Whisper transcrição offline (upload ${uploadId})`,
        userId: user.id,
      });
    }

    // Build a speaker-formatted transcript using segments (no diarization, but
    // the cultural eval reuses Q/A extraction from raw text below).
    let formattedTranscript = rawText;
    if (Array.isArray(transcription.segments) && transcription.segments.length > 0) {
      formattedTranscript = transcription.segments
        .map((s: any) => `(${Number(s.start).toFixed(1)}s-${Number(s.end).toFixed(1)}s): ${String(s.text).trim()}`)
        .join("\n");
    }

    await supabaseAdmin
      .from("offline_interview_uploads")
      .update({ status: "evaluating", transcription_text: rawText })
      .eq("id", uploadId);

    const evaluationTypes: string[] = upload.evaluation_types || [];
    const result: { cultureSessionId?: string; technicalSessionId?: string; cultureScore?: number; technicalScore?: number } = {};

    // ----------------- CULTURAL EVALUATION -----------------
    if (evaluationTypes.includes("cultural")) {
      const cultureSessionId = await createCultureSessionFromOffline({
        supabaseAdmin,
        upload,
        userId: user.id,
        rawText,
        formattedTranscript,
      });
      result.cultureSessionId = cultureSessionId;

      // Trigger evaluation using existing edge (re-uses prompts unchanged)
      const evalResp = await fetch(`${supabaseUrl}/functions/v1/reprocess-culture-evaluation`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ sessionId: cultureSessionId }),
      });
      if (evalResp.ok) {
        const r = await evalResp.json();
        result.cultureScore = r?.score;
      } else {
        console.error("Cultural eval failed", await evalResp.text());
      }

      await supabaseAdmin
        .from("offline_interview_uploads")
        .update({ culture_session_id: cultureSessionId })
        .eq("id", uploadId);
    }

    // ----------------- TECHNICAL EVALUATION -----------------
    if (evaluationTypes.includes("technical")) {
      const techSessionId = await createTechnicalSessionFromOffline({
        supabaseAdmin,
        upload,
        userId: user.id,
        rawText,
      });
      result.technicalSessionId = techSessionId;

      const evalResp = await fetch(`${supabaseUrl}/functions/v1/technical-interview-complete`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({
          sessionId: techSessionId,
          transcript: rawText,
          completedNaturally: true,
        }),
      });
      if (evalResp.ok) {
        const r = await evalResp.json();
        result.technicalScore = r?.overallScore ?? r?.score;
      } else {
        console.error("Technical eval failed", await evalResp.text());
      }

      await supabaseAdmin
        .from("offline_interview_uploads")
        .update({ technical_session_id: techSessionId })
        .eq("id", uploadId);
    }

    await supabaseAdmin
      .from("offline_interview_uploads")
      .update({ status: "done" })
      .eq("id", uploadId);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Process error:", e);
    if (uploadId) {
      await supabaseAdmin
        .from("offline_interview_uploads")
        .update({ status: "failed", error_message: String(e?.message || e).substring(0, 500) })
        .eq("id", uploadId);
    }
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ====================================================================
// Helpers
// ====================================================================

async function createCultureSessionFromOffline(args: {
  supabaseAdmin: any; upload: any; userId: string; rawText: string; formattedTranscript: string;
}) {
  const { supabaseAdmin, upload, userId, rawText, formattedTranscript } = args;

  // Resolve cultural agent for this account/job (same fallback used elsewhere)
  let agentId: string | null = null;
  const { data: job } = await supabaseAdmin
    .from("recruitment_jobs").select("agent_id").eq("id", upload.job_id).maybeSingle();
  agentId = job?.agent_id || null;
  if (!agentId) {
    const { data: step } = await supabaseAdmin
      .from("recruitment_job_workflow_steps")
      .select("agent_id").eq("job_id", upload.job_id).eq("step_type", "cultural").eq("is_active", true)
      .not("agent_id", "is", null).order("position", { ascending: true }).limit(1)
      .maybeSingle();
    agentId = step?.agent_id || null;
  }
  if (!agentId) {
    const { data: agent } = await supabaseAdmin
      .from("recruitment_agents")
      .select("id").eq("account_id", upload.account_id).in("type", ["cultural", "structured"]).eq("is_active", true)
      .limit(1).maybeSingle();
    agentId = agent?.id || null;
  }

  // Load agent's seeded questions (best-effort) to map Q&A
  let questions: any[] = [];
  if (agentId) {
    const { data: agentRow } = await supabaseAdmin
      .from("recruitment_agents").select("default_questions").eq("id", agentId).maybeSingle();
    const dq = agentRow?.default_questions;
    if (Array.isArray(dq)) questions = dq;
  }

  // Insert session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("culture_interview_sessions")
    .insert({
      account_id: upload.account_id,
      job_id: upload.job_id,
      candidate_id: upload.candidate_id,
      agent_id: agentId,
      status: "completed",
      started_at: upload.recorded_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      questions,
      audio_storage_path: upload.audio_path,
      source: "offline_upload",
      recorded_at: upload.recorded_at || null,
      imported_by: userId,
      import_notes: upload.notes || null,
      partial_transcript: rawText,
    })
    .select("id")
    .single();

  if (sErr || !session) throw new Error(`Failed to create culture session: ${sErr?.message}`);

  // Use AI to split transcript into Q/A pairs
  const LOVABLE_API_KEY = "direct";
  let pairs: Array<{ questionIndex: number; questionText: string; candidateResponse: string; valueLabel?: string; startSeconds?: number; endSeconds?: number }> = [];

  if (LOVABLE_API_KEY) {
    const expectedQs: string[] = questions
      .map((q: any) => (typeof q === "string" ? q : q?.text || q?.question || ""))
      .filter(Boolean);

    const parsePrompt = `Você receberá a transcrição de uma entrevista CULTURAL feita PRESENCIALMENTE (gravada em áudio). Pode haver dois falantes (entrevistador humano e candidato).

## TRANSCRIÇÃO BRUTA (com timestamps)
${formattedTranscript}

${expectedQs.length > 0 ? `## PERGUNTAS DE REFERÊNCIA (do agente cultural)
${expectedQs.map((q, i) => `[Q${i}] ${q}`).join("\n")}` : "## SEM PERGUNTAS DE REFERÊNCIA — extraia os tópicos abordados"}

## TAREFA
Extraia pares pergunta/resposta. O entrevistador faz perguntas; o candidato responde. Capture as respostas COMPLETAS do candidato (incluindo exemplos e histórias).

Responda APENAS em JSON válido:
{
  "pairs": [
    { "questionIndex": <índice da pergunta de referência mais similar, ou -1>, "questionText": "<pergunta>", "candidateResponse": "<resposta completa>", "startSeconds": <num|null>, "endSeconds": <num|null>, "valueLabel": "<tema|null>" }
  ]
}`;

    try {
      const aiResp = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um especialista em processamento de transcrições de entrevistas. Extraia pares pergunta/resposta com precisão." },
            { role: "user", content: parsePrompt },
          ],
        }),
      });
      if (aiResp.ok) {
        const aiJson = await aiResp.json();
        // Bill Q/A parsing LLM
        await consumeAICredits({
          supabase: supabaseAdmin,
          accountId: upload.account_id,
          aiData: aiJson,
          model: 'google/gemini-2.5-flash',
          referenceId: upload.id,
          referenceType: 'offline_interview_parse',
          description: `Q/A parsing entrevista offline (upload ${upload.id})`,
          userId: null,
        });
        const text = aiJson.choices?.[0]?.message?.content || "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          pairs = parsed.pairs || [];
        }
      }
    } catch (e) {
      console.error("Q/A parsing failed:", e);
    }
  }

  // Fallback: single pair with full transcript
  if (pairs.length === 0) {
    pairs = [{
      questionIndex: 0,
      questionText: "Entrevista presencial completa",
      candidateResponse: rawText,
    }];
  }

  const responsesToInsert = pairs.map((p, i) => ({
    session_id: session.id,
    question_index: p.questionIndex >= 0 ? p.questionIndex : i,
    question_text: p.questionText,
    candidate_response: p.candidateResponse,
    value_label: p.valueLabel || null,
    start_seconds: p.startSeconds || null,
    end_seconds: p.endSeconds || null,
  }));

  await supabaseAdmin.from("culture_interview_responses").insert(responsesToInsert);

  return session.id as string;
}

async function createTechnicalSessionFromOffline(args: {
  supabaseAdmin: any; upload: any; userId: string; rawText: string;
}) {
  const { supabaseAdmin, upload, userId, rawText } = args;

  // Resolve technical agent + load JD context
  let agentId: string | null = null;
  const { data: step } = await supabaseAdmin
    .from("recruitment_job_workflow_steps")
    .select("agent_id").eq("job_id", upload.job_id).eq("step_type", "technical").eq("is_active", true)
    .not("agent_id", "is", null).order("position", { ascending: true }).limit(1)
    .maybeSingle();
  agentId = step?.agent_id || null;
  if (!agentId) {
    const { data: agent } = await supabaseAdmin
      .from("recruitment_agents")
      // Taxonomia atual: o agente técnico tem type 'adaptive' (não 'technical', que não existe no DB).
      .select("id").eq("account_id", upload.account_id).in("type", ["adaptive", "technical"]).eq("is_active", true)
      .limit(1).maybeSingle();
    agentId = agent?.id || null;
  }

  const { data: jobRow } = await supabaseAdmin
    .from("recruitment_jobs")
    .select("title, mission, required_skills, desired_skills, responsibilities")
    .eq("id", upload.job_id)
    .maybeSingle();

  const jobDescriptionContext = jobRow ? {
    title: jobRow.title,
    mission: jobRow.mission || "",
    requiredSkills: jobRow.required_skills || [],
    desiredSkills: jobRow.desired_skills || [],
    responsibilities: jobRow.responsibilities || [],
  } : null;

  // Build a minimal "questions" list from required+desired skills so that
  // technical-interview-complete can iterate skills as usual.
  const skillsList: any[] = [];
  for (const s of (jobRow?.required_skills || [])) {
    skillsList.push({ skill: s, skillType: "required", level: 3, questionText: `Avalie ${s}`, isFromBank: false });
  }
  for (const s of (jobRow?.desired_skills || [])) {
    skillsList.push({ skill: s, skillType: "desired", level: 3, questionText: `Avalie ${s}`, isFromBank: false });
  }

  const { data: session, error: sErr } = await supabaseAdmin
    .from("technical_interview_sessions")
    .insert({
      account_id: upload.account_id,
      job_id: upload.job_id,
      candidate_id: upload.candidate_id,
      agent_id: agentId,
      status: "completed",
      started_at: upload.recorded_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      questions: skillsList,
      transcript: rawText,
      audio_storage_path: upload.audio_path,
      job_description_context: jobDescriptionContext,
      source: "offline_upload",
      recorded_at: upload.recorded_at || null,
      imported_by: userId,
      import_notes: upload.notes || null,
    })
    .select("id")
    .single();

  if (sErr || !session) throw new Error(`Failed to create technical session: ${sErr?.message}`);

  return session.id as string;
}
