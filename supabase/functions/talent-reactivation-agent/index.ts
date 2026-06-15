import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_URL = Deno.env.get("LOVABLE_API_URL") || "https://api.lovable.dev";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

interface ReactivationRequest {
  job_id: string;
  account_id: string;
  candidate_ids: string[];
  mode: "preview" | "send";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: ReactivationRequest = await req.json();
    const { job_id, account_id, candidate_ids, mode } = body;

    if (!job_id || !account_id || !candidate_ids?.length) {
      return new Response(
        JSON.stringify({ error: "job_id, account_id, and candidate_ids are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["preview", "send"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "mode must be 'preview' or 'send'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get job details
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("id, title, description, department, location, employment_type, budget_min, budget_max")
      .eq("id", job_id)
      .single();

    if (!job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get company info
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", account_id)
      .single();

    // 3. Get candidates
    const { data: candidates } = await supabase
      .from("recruitment_candidates")
      .select("id, name, email, phone, tags")
      .in("id", candidate_ids)
      .eq("account_id", account_id);

    if (!candidates?.length) {
      return new Response(
        JSON.stringify({ error: "No candidates found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get process history for all candidates
    const { data: history } = await supabase
      .from("candidate_process_history")
      .select("*")
      .in("candidate_id", candidate_ids)
      .eq("account_id", account_id)
      .order("participated_at", { ascending: false });

    const historyMap = new Map<string, any[]>();
    for (const h of history || []) {
      const arr = historyMap.get(h.candidate_id) || [];
      arr.push(h);
      historyMap.set(h.candidate_id, arr);
    }

    // 5. Get talent bank match scores
    const { data: matchData } = await supabase
      .from("talent_bank_matches")
      .select("candidate_id, similarity_score")
      .eq("job_id", job_id)
      .in("candidate_id", candidate_ids);

    const scoreMap = new Map(
      (matchData || []).map((m: any) => [m.candidate_id, m.similarity_score])
    );

    // 6. Generate messages for each candidate
    const results = [];
    for (const candidate of candidates) {
      const candidateHistory = historyMap.get(candidate.id) || [];
      const matchScore = scoreMap.get(candidate.id) || 0;

      try {
        const message = await generateReactivationMessage(
          candidate,
          job,
          company?.name || "nossa empresa parceira",
          candidateHistory,
          supabase,
          account_id,
        );

        results.push({
          candidate_id: candidate.id,
          candidate_name: candidate.name,
          candidate_phone: candidate.phone,
          candidate_email: candidate.email,
          message,
          match_score: matchScore,
          history_count: candidateHistory.length,
          last_process: candidateHistory[0]?.job_title || null,
          status: "generated",
        });
      } catch (e) {
        console.error(`Error generating message for ${candidate.name}:`, e);
        results.push({
          candidate_id: candidate.id,
          candidate_name: candidate.name,
          message: null,
          status: "error",
          error: e.message,
        });
      }
    }

    // 7. If mode is "send", dispatch messages via WhatsApp
    if (mode === "send") {
      for (const result of results) {
        if (result.status !== "generated" || !result.message) continue;

        const phone = result.candidate_phone;
        if (!phone) {
          result.status = "skipped_no_phone";
          continue;
        }

        try {
          // Send via Z-API (import shared helper)
          const { sendWhatsAppViaZApi, isZApiConfigured } = await import(
            "../_shared/whatsapp-zapi.ts"
          );

          if (!isZApiConfigured()) {
            result.status = "skipped_no_whatsapp";
            continue;
          }

          await sendWhatsAppViaZApi({
            toPhoneE164: phone,
            message: result.message,
          });

          // Record in outreach conversations
          await supabase.from("recruitment_outreach_conversations").insert({
            account_id,
            candidate_id: result.candidate_id,
            contact_name: result.candidate_name,
            contact_phone: phone,
            status: "sent",
            messages: [
              {
                role: "assistant",
                content: result.message,
                timestamp: new Date().toISOString(),
                channel: "whatsapp",
              },
            ],
            reactivation_context: {
              job_id,
              job_title: job.title,
              match_score: result.match_score,
              last_process: result.last_process,
              history_count: result.history_count,
              type: "talent_bank_reactivation",
            },
            response_classification: "no_response",
          });

          // Update match status
          await supabase
            .from("talent_bank_matches")
            .update({ status: "contacted" })
            .eq("job_id", job_id)
            .eq("candidate_id", result.candidate_id);

          result.status = "sent";
        } catch (e) {
          console.error(`WhatsApp send error for ${result.candidate_name}:`, e);
          result.status = "send_failed";
          result.error = e.message;
        }
      }
    }

    return new Response(
      JSON.stringify({
        mode,
        job_title: job.title,
        total: results.length,
        generated: results.filter((r) => r.status === "generated" || r.status === "sent").length,
        sent: results.filter((r) => r.status === "sent").length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("talent-reactivation-agent error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateReactivationMessage(
  candidate: any,
  job: any,
  companyName: string,
  history: any[],
  supabase: any,
  accountId: string,
): Promise<string> {
  const firstName = candidate.name?.split(" ")[0] || "Candidato";
  const mostRecent = history[0];

  const historyContext = mostRecent
    ? `O candidato participou mais recentemente do processo para "${mostRecent.job_title}" com status final: ${mostRecent.final_status}${mostRecent.was_shortlisted ? " (foi shortlistado)" : ""}${mostRecent.feedback_notes ? `. Feedback: ${mostRecent.feedback_notes}` : ""}. Participação em ${new Date(mostRecent.participated_at).toLocaleDateString("pt-BR")}.`
    : "Sem histórico de processos anteriores registrado.";

  const prompt = `Você é um recrutador experiente que está reativando um candidato do banco de talentos. Gere uma mensagem de WhatsApp personalizada e contextualizada.

REGRAS:
- Mensagem curta e profissional (máx 5 parágrafos curtos)
- Comece cumprimentando pelo primeiro nome
- Se há histórico, referencie o processo anterior de forma positiva
- Apresente a nova vaga com 2-3 pontos de interesse
- Termine com UMA pergunta simples de interesse
- Tom: profissional mas caloroso, não corporativo demais
- NÃO use emojis excessivos, máximo 2
- NÃO mencione salário específico
- NÃO use linguagem genérica de template

CANDIDATO:
Nome: ${firstName}
Skills: ${(candidate.tags || []).join(", ") || "N/A"}

HISTÓRICO:
${historyContext}
Total de processos: ${history.length}

NOVA VAGA:
Título: ${job.title}
Empresa: ${companyName}
Descrição: ${job.description || "N/A"}
Local: ${job.location || "Não informado"}
Regime: ${job.employment_type || "Não informado"}

Gere APENAS a mensagem, sem prefixo ou explicação.`;

  const res = await aiFetch(`${LOVABLE_API_URL}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LOVABLE_API_KEY ? { Authorization: `Bearer ${LOVABLE_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  await consumeAICredits({
    supabase, accountId, aiData: data, model: 'google/gemini-2.5-flash',
    referenceType: 'talent_reactivation_message', referenceId: candidate.id,
    description: `Reativação ${firstName} → ${job.title}`,
  });
  return data.choices?.[0]?.message?.content?.trim() || "";
}
