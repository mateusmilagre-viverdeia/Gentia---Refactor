// Process External Entry — extracts candidate data from CV via Lovable AI
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = "direct"!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function md5(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("MD5", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateAndStoreEmbedding(
  supabase: any,
  candidateId: string,
  accountId: string,
  text: string,
  entryId?: string,
) {
  if (!OPENAI_API_KEY) {
    console.warn("[process-external-entry] OPENAI_API_KEY missing, skipping embedding");
    return;
  }
  if (!text?.trim()) return;
  try {
    const truncated = text.slice(0, 8000);
    const contentHash = await md5(truncated);

    const { data: existing } = await supabase
      .from("candidate_embeddings")
      .select("id, content_hash")
      .eq("candidate_id", candidateId)
      .eq("source_type", "external_intake")
      .maybeSingle();

    if (existing?.content_hash === contentHash) return;

    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: truncated }),
    });
    if (!embRes.ok) {
      console.error("[process-external-entry] embedding API error", embRes.status, await embRes.text());
      return;
    }
    const embJson = await embRes.json();
    const vector = embJson.data?.[0]?.embedding;
    if (!vector) return;

    try {
      await consumeAICredits({
        supabase,
        accountId,
        aiData: { usage: embJson.usage },
        model: 'openai/text-embedding-3-small',
        referenceType: 'external_entry_embedding',
        referenceId: entryId || candidateId,
        description: 'Embedding de currículo externo',
      });
    } catch (e) { console.error('[process-external-entry] embedding billing error', e); }


    const payload = {
      account_id: accountId,
      candidate_id: candidateId,
      source_type: "external_intake",
      content_text: truncated,
      content_hash: contentHash,
      embedding: vector,
    };
    if (existing) {
      await supabase.from("candidate_embeddings").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("candidate_embeddings").insert(payload);
    }
  } catch (e) {
    console.error("[process-external-entry] embedding error", e);
  }
}

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "extract_candidate_data",
    description: "Extrai dados estruturados de um currículo",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Nome completo" },
        email: { type: "string" },
        phone: { type: "string" },
        current_position: { type: "string" },
        current_company: { type: "string" },
        years_of_experience: { type: "number" },
        skills: { type: "array", items: { type: "string" } },
        education: { type: "string" },
        location: { type: "string" },
        summary: { type: "string", description: "Resumo profissional curto" },
      },
      required: ["full_name"],
      additionalProperties: false,
    },
  },
};

async function extractTextFromPdf(supabase: any, fileUrl: string): Promise<string> {
  // Get signed URL and try Firecrawl-like extraction; fallback to raw bytes->text
  const { data: signed } = await supabase.storage.from("external-resumes").createSignedUrl(fileUrl, 600);
  if (!signed?.signedUrl) return "";
  try {
    // Simple extraction: try fetching as text. For real PDFs, the AI receives raw bytes via attachments instead.
    const res = await fetch(signed.signedUrl);
    const buf = await res.arrayBuffer();
    // Basic strings extraction (good enough for many text-based PDFs)
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(buf);
    const printable = raw.replace(/[^\x20-\x7E\nÀ-ÿ]/g, " ").replace(/\s+/g, " ");
    return printable.slice(0, 20000);
  } catch (e) {
    console.error("[process-external-entry] pdf extract failed", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entry_id } = await req.json();
    if (!entry_id) {
      return new Response(JSON.stringify({ error: "entry_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: entry, error: entryErr } = await supabase
      .from("candidate_external_entries")
      .select("*")
      .eq("id", entry_id)
      .single();

    if (entryErr || !entry) {
      return new Response(JSON.stringify({ error: "Entry not found" }), { status: 404, headers: corsHeaders });
    }

    await supabase
      .from("candidate_external_entries")
      .update({ processing_status: "processing" })
      .eq("id", entry_id);

    // Build extraction context
    let context = entry.raw_content || "";
    if (entry.file_url) {
      const pdfText = await extractTextFromPdf(supabase, entry.file_url);
      context = `${context}\n\n---CV CONTENT---\n${pdfText}`;
    }

    if (!context.trim()) {
      await supabase
        .from("candidate_external_entries")
        .update({ processing_status: "failed", error_message: "No content to extract" })
        .eq("id", entry_id);
      return new Response(JSON.stringify({ error: "no content" }), { status: 400, headers: corsHeaders });
    }

    // Call Lovable AI
    const aiRes = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você extrai dados estruturados de currículos. Sempre retorne os dados via tool call. Use texto em português.",
          },
          {
            role: "user",
            content: `Extraia os dados do candidato a partir deste conteúdo:\n\n${context.slice(0, 12000)}`,
          },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "function", function: { name: "extract_candidate_data" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[process-external-entry] AI error", aiRes.status, errText);
      await supabase
        .from("candidate_external_entries")
        .update({ processing_status: "failed", error_message: `AI error ${aiRes.status}` })
        .eq("id", entry_id);
      return new Response(JSON.stringify({ error: "AI failed" }), { status: 500, headers: corsHeaders });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase
        .from("candidate_external_entries")
        .update({ processing_status: "failed", error_message: "No tool call returned" })
        .eq("id", entry_id);
      return new Response(JSON.stringify({ error: "no extraction" }), { status: 500, headers: corsHeaders });
    }

    try {
      await consumeAICredits({
        supabase,
        accountId: entry.account_id,
        aiData: aiJson,
        model: 'google/gemini-2.5-flash',
        referenceType: 'external_entry_extraction',
        referenceId: entry_id,
        description: 'Extração de currículo externo via IA',
      });
    } catch (e) { console.error('[process-external-entry] LLM billing error', e); }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Deduplicate: email → phone → name+company
    let candidateId: string | null = null;
    let isDuplicate = false;

    if (extracted.email) {
      const { data } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("account_id", entry.account_id)
        .ilike("email", extracted.email)
        .maybeSingle();
      if (data) {
        candidateId = data.id;
        isDuplicate = true;
      }
    }

    if (!candidateId && (extracted.phone || entry.sender)) {
      const phoneToMatch = (extracted.phone || entry.sender).replace(/\D/g, "");
      if (phoneToMatch.length >= 8) {
        const { data } = await supabase
          .from("recruitment_candidates")
          .select("id, phone")
          .eq("account_id", entry.account_id);
        const match = data?.find((c: any) => {
          const cp = (c.phone || "").replace(/\D/g, "");
          return cp && (cp === phoneToMatch || cp.endsWith(phoneToMatch) || phoneToMatch.endsWith(cp));
        });
        if (match) {
          candidateId = match.id;
          isDuplicate = true;
        }
      }
    }

    if (!candidateId && extracted.full_name && extracted.current_company) {
      const { data } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("account_id", entry.account_id)
        .ilike("name", extracted.full_name)
        .ilike("current_company", extracted.current_company)
        .maybeSingle();
      if (data) {
        candidateId = data.id;
        isDuplicate = true;
      }
    }

    // Create or update candidate
    if (candidateId) {
      await supabase
        .from("recruitment_candidates")
        .update({
          email: extracted.email || undefined,
          phone: extracted.phone || entry.sender,
          current_position: extracted.current_position,
          current_company: extracted.current_company,
          skills: extracted.skills,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);
    } else {
      const { data: newCand, error: candErr } = await supabase
        .from("recruitment_candidates")
        .insert({
          account_id: entry.account_id,
          name: extracted.full_name,
          email: extracted.email,
          phone: extracted.phone || entry.sender,
          current_position: extracted.current_position,
          current_company: extracted.current_company,
          location: extracted.location,
          skills: extracted.skills,
          summary: extracted.summary,
          source: entry.channel === "whatsapp" ? "whatsapp_intake" : "email_intake",
          cv_url: entry.file_url,
        })
        .select()
        .single();

      if (candErr) {
        console.error("[process-external-entry] candidate create error", candErr);
        await supabase
          .from("candidate_external_entries")
          .update({ processing_status: "failed", error_message: candErr.message, extracted_data: extracted })
          .eq("id", entry_id);
        return new Response(JSON.stringify({ error: candErr.message }), { status: 500, headers: corsHeaders });
      }
      candidateId = newCand.id;
    }

    // Mark entry as completed
    await supabase
      .from("candidate_external_entries")
      .update({
        processing_status: isDuplicate ? "duplicate" : "completed",
        candidate_id: candidateId,
        extracted_data: extracted,
        processed_at: new Date().toISOString(),
      })
      .eq("id", entry_id);

    // Generate embedding for semantic search
    const embeddingText = [
      extracted.full_name,
      extracted.current_position,
      extracted.current_company,
      extracted.location,
      extracted.summary,
      Array.isArray(extracted.skills) ? extracted.skills.join(", ") : "",
      extracted.education,
    ].filter(Boolean).join(" | ");
    if (candidateId && embeddingText) {
      await generateAndStoreEmbedding(supabase, candidateId, entry.account_id, embeddingText, entry_id);
    }

    // Trigger cross-match (talent pool added)
    fetch(`${SUPABASE_URL}/functions/v1/crossmatch-executar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ trigger: "talent_pool_added", candidate_id: candidateId, account_id: entry.account_id }),
    }).catch((e) => console.warn("[process-external-entry] crossmatch trigger failed", e));

    // Internal notification
    await supabase.from("notifications").insert({
      account_id: entry.account_id,
      type: "external_entry_received",
      title: isDuplicate ? "Currículo duplicado recebido" : "Novo currículo recebido",
      body: `${extracted.full_name} via ${entry.channel === "whatsapp" ? "WhatsApp" : "E-mail"}${extracted.current_position ? ` — ${extracted.current_position}` : ""}`,
      target_url: `/recruitment/candidates/${candidateId}`,
      dedupe_key: `external_entry:${entry_id}`,
      priority: "normal",
    }).select();

    // Update intake config counter
    if (entry.channel === "email") {
      const { error: counterError } = await supabase.rpc("increment_email_intake_counter", { p_account_id: entry.account_id });
      if (counterError) {
        await supabase
          .from("email_intake_config")
          .update({ total_received: 1, last_received_at: new Date().toISOString() })
          .eq("account_id", entry.account_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, candidate_id: candidateId, duplicate: isDuplicate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[process-external-entry] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
