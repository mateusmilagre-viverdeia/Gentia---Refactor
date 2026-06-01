// Coverage status para entrevista técnica.
// Paridade com `culture-interview-coverage-status`, adaptada para a realidade
// da técnica: `technical_interview_responses` só é gravada no FIM (em
// technical-interview-complete). Durante a entrevista existem apenas:
//   - session.questions (skills planejadas)
//   - session.partial_transcript (atualizado pelo heartbeat a cada 30s)
//
// Heurística: cada bloco "\nEntrevistador:" no partial_transcript representa
// uma pergunta feita pela IA. covered ≈ max(0, blocos - 1), porque o último
// bloco geralmente ainda está sendo respondido. canEnd = covered >= 70% do total.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TechnicalQuestion {
  skill?: string;
  skillType?: "required" | "desired";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("sessionId");
    if (!sessionId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      sessionId = body?.sessionId ?? null;
    }
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error } = await supabase
      .from("technical_interview_sessions")
      .select("id, status, questions, transcript, partial_transcript, job_description_context")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (session.questions as TechnicalQuestion[] | null) || [];
    const jdContext = (session.job_description_context as { requiredSkills?: string[] } | null) || {};
    const total =
      questions.length > 0
        ? questions.length
        : Array.isArray(jdContext.requiredSkills)
          ? jdContext.requiredSkills.length
          : 0;

    // Heurística melhorada: cobertura = nº de respostas reais do candidato
    // (blocos "Candidato:" no transcript). Antes contávamos só "Entrevistador:"
    // -1, o que subestimava quando a IA reformulava muito. Agora usamos o min
    // entre (aiBlocks - 1) e candidateBlocks como sinal mais robusto: se o
    // candidato respondeu N vezes E a IA fez N+1 perguntas, então N skills
    // foram efetivamente cobertas. Quando há transcript final, ele é preferido.
    const transcript: string = (session.transcript as string | null) || (session.partial_transcript as string | null) || "";
    const aiBlocks = (transcript.match(/\bEntrevistador\s*:/gi) || []).length;
    const candidateBlocks = (transcript.match(/\bCandidato\s*:/gi) || []).length;
    // Se há candidateBlocks, use-os diretamente (cada resposta = 1 skill respondida).
    // Caso contrário, fallback para aiBlocks - 1 (compat com transcripts antigos).
    const rawCovered = candidateBlocks > 0
      ? candidateBlocks
      : Math.max(0, aiBlocks - 1);
    const covered = total > 0 ? Math.min(rawCovered, total) : rawCovered;

    const missing = questions
      .map((q, i) => ({
        index: i,
        skill: q.skill || `Skill ${i + 1}`,
        type: (q.skillType as "required" | "desired") || "required",
      }))
      .slice(covered);

    const canEnd = total > 0 ? covered >= Math.ceil(total * 0.7) : true;

    return new Response(
      JSON.stringify({
        sessionId,
        status: session.status,
        total,
        covered,
        missing,
        canEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
