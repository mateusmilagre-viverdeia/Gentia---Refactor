// Cross-match executor: computes cosine similarity between candidate and other open jobs,
// generates AI reasoning for high-score matches, inserts suggestions and creates internal notifications.
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCORE_THRESHOLD = 75; // 0-100

interface Payload {
  trigger: "candidate_rejected" | "job_created" | "talent_pool_added" | "manual";
  candidato_id?: string;
  vaga_id?: string;
  account_id: string;
}

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function parseEmbedding(raw: any): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

async function generateReasoning(
  candidateContext: string,
  sourceJobTitle: string | null,
  targetJobTitle: string,
  score: number,
  supabase?: any,
  accountId?: string,
): Promise<string> {
  const apiKey = "direct";
  if (!apiKey) return `Compatibilidade de ${score}% entre o perfil e a vaga "${targetJobTitle}".`;

  try {
    const resp = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Você é um recrutador sênior. Em até 2 frases curtas e diretas (máx 220 caracteres), explique por que este candidato pode ser interessante para a vaga destino. Foque em skills, senioridade e contexto. Não use bullets.",
          },
          {
            role: "user",
            content: `Vaga origem: ${sourceJobTitle || "—"}\nVaga destino: ${targetJobTitle}\nScore: ${score}%\nContexto do candidato: ${candidateContext.slice(0, 1000)}`,
          },
        ],
      }),
    });
    if (!resp.ok) throw new Error(`AI ${resp.status}`);
    const data = await resp.json();
    if (supabase && accountId) {
      try {
        await consumeAICredits({
          supabase, accountId, aiData: data,
          model: 'google/gemini-2.5-flash-lite',
          referenceType: 'crossmatch_reasoning',
          description: `Cross-match reasoning para ${targetJobTitle}`,
        });
      } catch (e) { console.error('[crossmatch-executar] billing error', e); }
    }
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || `Compatibilidade de ${score}% com a vaga "${targetJobTitle}".`;
  } catch (e) {
    console.error("[crossmatch-executar] reasoning error", e);
    return `Compatibilidade de ${score}% com a vaga "${targetJobTitle}".`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const { trigger, candidato_id, vaga_id, account_id } = payload;
    if (!account_id) throw new Error("account_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let createdSuggestions = 0;
    let skipped = 0;
    let notificationsCreated = 0;

    // Resolve target candidates and target jobs based on trigger
    let candidateIds: string[] = [];
    let jobIds: string[] = [];

    if ((trigger === "candidate_rejected" || trigger === "talent_pool_added") && candidato_id) {
      candidateIds = [candidato_id];
      // open jobs of the same account
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", account_id)
        .in("status", ["active", "published"]);
      jobIds = (jobs || []).map((j) => j.id);
    } else if (trigger === "job_created" && vaga_id) {
      jobIds = [vaga_id];
      const { data: cands } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("account_id", account_id)
        .limit(200);
      candidateIds = (cands || []).map((c) => c.id);
    } else {
      // manual: full sweep limited
      const [{ data: cands }, { data: jobs }] = await Promise.all([
        supabase
          .from("recruitment_candidates")
          .select("id")
          .eq("account_id", account_id)
          .limit(100),
        supabase
          .from("recruitment_jobs")
          .select("id")
          .eq("account_id", account_id)
          .in("status", ["active", "published"]),
      ]);
      candidateIds = (cands || []).map((c) => c.id);
      jobIds = (jobs || []).map((j) => j.id);
    }

    if (candidateIds.length === 0 || jobIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, skipped: 0, message: "no candidates or jobs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load candidate embeddings (account-scoped)
    const { data: candEmbeds } = await supabase
      .from("candidate_embeddings")
      .select("candidate_id, embedding, content_text")
      .eq("account_id", account_id)
      .in("candidate_id", candidateIds);

    // Load job ICPs
    const { data: jobIcps } = await supabase
      .from("recruitment_job_icps" as any)
      .select("job_id, embedding, profile_summary, ideal_profile")
      .in("job_id", jobIds);

    const { data: jobMeta } = await supabase
      .from("recruitment_jobs")
      .select("id, title, recruiter_id, owner_id, account_id")
      .in("id", jobIds);

    const jobMetaMap = new Map<string, any>((jobMeta || []).map((j) => [j.id, j]));
    const jobTitleMap = new Map<string, string>((jobMeta || []).map((j) => [j.id, j.title]));

    // Candidate name lookup for notifications
    const { data: candMeta } = await supabase
      .from("recruitment_candidates")
      .select("id, name, first_name, last_name")
      .in("id", candidateIds);
    const candNameMap = new Map<string, string>(
      (candMeta || []).map((c: any) => [
        c.id,
        c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Candidato",
      ]),
    );

    // Build per-job embedding map
    const jobEmbedMap = new Map<string, { embedding: number[] | null; summary: string }>();
    for (const ic of jobIcps || []) {
      const e = parseEmbedding((ic as any).embedding);
      const summary =
        (ic as any).profile_summary ||
        (typeof (ic as any).ideal_profile === "string"
          ? (ic as any).ideal_profile
          : JSON.stringify((ic as any).ideal_profile || {})) ||
        "";
      jobEmbedMap.set((ic as any).job_id, { embedding: e, summary });
    }

    // Source job per candidate (used for context)
    const { data: applications } = await supabase
      .from("recruitment_applications")
      .select("candidate_id, job_id")
      .in("candidate_id", candidateIds)
      .eq("account_id", account_id);
    const sourceJobByCand = new Map<string, string>();
    for (const app of applications || []) {
      if (!sourceJobByCand.has(app.candidate_id)) sourceJobByCand.set(app.candidate_id, app.job_id);
    }

    // Iterate candidates × jobs
    for (const ce of candEmbeds || []) {
      const candEmbed = parseEmbedding((ce as any).embedding);
      if (!candEmbed) continue;
      const candText: string = (ce as any).content_text || "";
      const candidateId = (ce as any).candidate_id;
      const sourceJobId = sourceJobByCand.get(candidateId) || null;
      const sourceJobTitle = sourceJobId ? jobTitleMap.get(sourceJobId) || null : null;

      for (const targetJobId of jobIds) {
        if (sourceJobId === targetJobId) continue;
        const jm = jobEmbedMap.get(targetJobId);
        if (!jm?.embedding) continue;

        const sim = cosineSim(candEmbed, jm.embedding);
        const score = Math.round(sim * 100);
        if (score < SCORE_THRESHOLD) {
          skipped++;
          continue;
        }

        const targetTitle = jobTitleMap.get(targetJobId) || "Vaga";
        const reasoning = await generateReasoning(candText, sourceJobTitle, targetTitle, score, supabase, account_id);

        const { data: inserted, error: insErr } = await supabase
          .from("recruitment_cross_match_suggestions")
          .insert({
            account_id,
            source_candidate_id: candidateId,
            source_job_id: sourceJobId,
            suggested_job_id: targetJobId,
            match_score: score,
            reasoning,
            status: "pending",
          })
          .select("id")
          .single();

        if (insErr) {
          if ((insErr as any).code === "23505") {
            skipped++;
          } else {
            console.error("[crossmatch-executar] insert error", insErr);
          }
          continue;
        }

        createdSuggestions++;

        // Internal notification for the target job owner / recruiter
        const targetJob = jobMetaMap.get(targetJobId);
        const ownerUserId = targetJob?.recruiter_id || targetJob?.owner_id;
        if (ownerUserId) {
          const candName = candNameMap.get(candidateId) || "Candidato";
          const { error: notifErr } = await supabase.from("notifications").insert({
            account_id,
            user_id: ownerUserId,
            type: "cross_match_suggestion",
            title: `Novo match: ${candName} (${score}%)`,
            message: `Sugestão de cross-match para "${targetTitle}". ${reasoning.slice(0, 140)}`,
            target_url: `/atracao-contratacao/recrutamento/hunting?tab=crossmatch&suggestion=${inserted?.id || ""}`,
            entity_type: "cross_match_suggestion",
            entity_id: inserted?.id || null,
            priority: "normal",
            dedupe_key: `crossmatch:${inserted?.id || ""}`,
          });
          if (!notifErr) notificationsCreated++;
          else console.error("[crossmatch-executar] notification error", notifErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trigger,
        created: createdSuggestions,
        skipped,
        notifications: notificationsCreated,
        candidates: candidateIds.length,
        jobs: jobIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[crossmatch-executar] error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
