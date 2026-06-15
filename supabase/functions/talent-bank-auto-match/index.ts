import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';
import { aiFetch } from "../_shared/ai-gateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_URL = Deno.env.get("LOVABLE_API_URL") || "https://api.lovable.dev";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { job_id, account_id } = await req.json();

    if (!job_id || !account_id) {
      return new Response(
        JSON.stringify({ error: "job_id and account_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get job details
    const { data: job, error: jobErr } = await supabase
      .from("recruitment_jobs")
      .select("id, title, description, department, location, employment_type")
      .eq("id", job_id)
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found", details: jobErr }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Use existing match_candidates_for_job DB function
    const { data: matches, error: matchErr } = await supabase
      .rpc("match_candidates_for_job", {
        p_job_id: job_id,
        p_account_id: account_id,
        match_threshold: 0.6,
        match_count: 30,
      });

    if (matchErr) {
      console.error("Match error:", matchErr);
      return new Response(
        JSON.stringify({ error: "Failed to match candidates", details: matchErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No candidates found in talent bank" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateIds = matches.map((m: any) => m.candidate_id);

    // 3. Get candidate details
    const { data: candidates } = await supabase
      .from("recruitment_candidates")
      .select("id, name, email, phone, tags, source")
      .in("id", candidateIds)
      .eq("account_id", account_id);

    // 4. Get process history for these candidates
    const { data: history } = await supabase
      .from("candidate_process_history")
      .select("*")
      .in("candidate_id", candidateIds)
      .eq("account_id", account_id);

    // 5. Apply cooldown filter — exclude candidates contacted in last 90 days
    const { data: recentOutreach } = await supabase
      .from("recruitment_outreach_conversations")
      .select("candidate_id, created_at")
      .in("candidate_id", candidateIds)
      .eq("account_id", account_id)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const recentlyContacted = new Set(
      (recentOutreach || []).map((r: any) => r.candidate_id)
    );

    // 6. Filter and enrich matches
    const candidateMap = new Map(
      (candidates || []).map((c: any) => [c.id, c])
    );
    const historyMap = new Map<string, any[]>();
    for (const h of history || []) {
      const arr = historyMap.get(h.candidate_id) || [];
      arr.push(h);
      historyMap.set(h.candidate_id, arr);
    }

    const filteredMatches = matches
      .filter((m: any) => !recentlyContacted.has(m.candidate_id))
      .filter((m: any) => candidateMap.has(m.candidate_id))
      .slice(0, 20);

    // 7. Generate match reasoning via AI for top candidates
    const enrichedMatches = [];
    for (const match of filteredMatches) {
      const candidate = candidateMap.get(match.candidate_id);
      const candidateHistory = historyMap.get(match.candidate_id) || [];
      const historyIds = candidateHistory.map((h: any) => h.id);

      let reasoning = "";
      try {
        reasoning = await generateMatchReasoning(
          job,
          candidate,
          candidateHistory,
          match.similarity,
          supabase,
          account_id
        );
      } catch (e) {
        console.error("AI reasoning error:", e);
        reasoning = `Score de similaridade: ${(match.similarity * 100).toFixed(0)}%`;
        if (candidateHistory.some((h: any) => h.was_shortlisted)) {
          reasoning += ". Candidato foi shortlistado em processo anterior.";
        }
      }

      enrichedMatches.push({
        account_id,
        job_id,
        candidate_id: match.candidate_id,
        similarity_score: match.similarity,
        match_reasoning: reasoning,
        source_history_ids: historyIds,
        status: "pending",
      });
    }

    // 8. Upsert matches
    if (enrichedMatches.length > 0) {
      const { error: upsertErr } = await supabase
        .from("talent_bank_matches")
        .upsert(enrichedMatches, { onConflict: "job_id,candidate_id" });

      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
      }

      // 9. Create notification
      await supabase.from("hunting_notifications").insert({
        account_id,
        type: "talent_bank_match",
        title: `${enrichedMatches.length} candidatos do banco encontrados`,
        message: `A vaga "${job.title}" tem ${enrichedMatches.length} candidatos compatíveis no banco de talentos.`,
        reference_id: job_id,
        reference_type: "job",
      });
    }

    // 10. Trigger cross-match (talent_pool_added) for top candidates so suggestions appear in M7 inbox
    try {
      const topCandidates = enrichedMatches.slice(0, 5);
      for (const m of topCandidates) {
        await fetch(`${SUPABASE_URL}/functions/v1/crossmatch-executar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            account_id,
            trigger: "talent_pool_added",
            candidato_id: m.candidate_id,
          }),
        }).catch((e) => console.error("crossmatch trigger failed:", e));
      }
    } catch (e) {
      console.error("crossmatch fan-out error:", e);
    }

    return new Response(
      JSON.stringify({
        matches: enrichedMatches.length,
        total_candidates_checked: matches.length,
        filtered_by_cooldown: recentlyContacted.size,
        top_score: enrichedMatches[0]?.similarity_score || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("talent-bank-auto-match error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateMatchReasoning(
  job: any,
  candidate: any,
  history: any[],
  similarity: number,
  supabase?: any,
  accountId?: string
): Promise<string> {
  const historyContext = history
    .map(
      (h) =>
        `- ${h.job_title}: ${h.final_status}${h.was_shortlisted ? " (shortlistado)" : ""}${h.feedback_notes ? ` — ${h.feedback_notes}` : ""}`
    )
    .join("\n");

  const prompt = `Analise este match entre uma vaga e um candidato do banco de talentos. Gere uma justificativa concisa (2-3 frases) explicando por que este candidato é relevante para a vaga.

VAGA: ${job.title}
Descrição: ${job.description || "N/A"}
Localização: ${job.location || "N/A"}

CANDIDATO: ${candidate.name}
Tags/Skills: ${(candidate.tags || []).join(", ") || "N/A"}
Score de similaridade: ${(similarity * 100).toFixed(0)}%

HISTÓRICO DE PROCESSOS:
${historyContext || "Sem histórico registrado"}

Responda APENAS com a justificativa, sem prefixo.`;

  const res = await aiFetch(`${LOVABLE_API_URL}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LOVABLE_API_KEY ? { Authorization: `Bearer ${LOVABLE_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();

  // Bill LLM tokens for reasoning generation
  if (supabase && accountId) {
    await consumeAICredits({
      supabase,
      accountId,
      aiData: data,
      model: 'google/gemini-2.5-flash-lite',
      referenceId: candidate?.id || null,
      referenceType: 'talent_bank_match_reasoning',
      description: `Match talent bank: ${job?.title || 'vaga'} × ${candidate?.name || 'candidato'}`,
      userId: null,
    });
  }

  return data.choices?.[0]?.message?.content?.trim() || `Similaridade de ${(similarity * 100).toFixed(0)}%`;
}
