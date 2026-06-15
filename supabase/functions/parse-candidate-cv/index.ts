// Edge Function: parse-candidate-cv
// Pipeline híbrido: extrai texto do PDF com unpdf (grátis) e envia somente texto
// para Gemini Flash Lite. Fallback: se texto < 300 chars (CV escaneado/imagem),
// envia o PDF binário para o LLM.
// Cobra créditos via consumeAICredits (fórmula oficial com margem).
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { extractText, getDocumentProxy } from "npm:unpdf@0.11.0";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PARSE_MODEL = "google/gemini-2.5-flash-lite";
const MIN_TEXT_LEN = 300;

interface ParsePayload {
  candidate_id: string;
  account_id: string;
  cv_storage_path?: string; // ex: "career-xxx/123-resume.pdf" no bucket external-resumes
  cv_url?: string; // alternativa: URL completa
}

const SYSTEM_PROMPT = `Você é um extrator de currículos. Receba o conteúdo de um CV e devolva JSON estruturado.
Responda APENAS com JSON válido (sem markdown, sem comentários) com este schema:
{
  "full_name": string|null,
  "email": string|null,
  "phone": string|null,
  "linkedin_url": string|null,
  "location": string|null,
  "professional_summary": string|null,
  "seniority_level": "estagio"|"junior"|"pleno"|"senior"|"especialista"|"lideranca"|null,
  "total_years_experience": number|null,
  "current_position": string|null,
  "current_company": string|null,
  "work_history": [{"position": string, "company": string, "start_date": "YYYY-MM"|null, "end_date": "YYYY-MM"|null, "is_current": boolean, "responsibilities": string|null}],
  "education": [{"course_name": string, "degree_type": string, "institution": string|null, "year": number|null}],
  "skills": [string],
  "languages": [{"language": string, "level": string|null}],
  "certifications": [{"name": string, "issuer": string|null, "year": number|null}]
}
Não invente dados. Use null/array vazio quando não houver informação.`;

async function callLLM(content: { type: "text" | "file"; data: string; mimeType?: string }) {
  // Desacoplado do Lovable Gateway: aiFetch roteia pelo `model` (gemini-2.5-flash-lite -> Google direto).
  const userContent: any[] = content.type === "text"
    ? [{ type: "text", text: `Currículo (texto extraído):\n\n${content.data}` }]
    : [
        { type: "text", text: "Currículo em PDF (escaneado/visual). Extraia os dados via OCR." },
        { type: "image_url", image_url: { url: `data:${content.mimeType};base64,${content.data}` } },
      ];

  const res = await aiFetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: PARSE_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error ${res.status}: ${text}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content || "{}";
  const usage = json.usage || {};
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  return { parsed, usage };
}

async function downloadPdf(supabase: any, payload: ParsePayload): Promise<Uint8Array> {
  if (payload.cv_storage_path) {
    const { data, error } = await supabase.storage
      .from("external-resumes")
      .download(payload.cv_storage_path.replace(/^external-resumes\//, ""));
    if (error) throw new Error(`storage download: ${error.message}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  if (payload.cv_url) {
    const res = await fetch(payload.cv_url);
    if (!res.ok) throw new Error(`fetch cv: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  throw new Error("cv_storage_path or cv_url required");
}

async function hashBuffer(buf: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload: ParsePayload = await req.json();
    if (!payload.candidate_id || !payload.account_id) {
      return new Response(JSON.stringify({ error: "candidate_id and account_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve CV path se não fornecido
    if (!payload.cv_storage_path && !payload.cv_url) {
      const { data: cand } = await supabase
        .from("recruitment_candidates")
        .select("id, email")
        .eq("id", payload.candidate_id)
        .maybeSingle();
      if (!cand) throw new Error("candidate not found");
      const { data: prof } = await supabase
        .from("candidate_profiles")
        .select("cv_url")
        .eq("user_id", cand.email) // best-effort, normalmente não bate
        .maybeSingle();
      if (prof?.cv_url) payload.cv_storage_path = prof.cv_url;
    }

    if (!payload.cv_storage_path && !payload.cv_url) {
      return new Response(JSON.stringify({ error: "no CV available for candidate" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuf = await downloadPdf(supabase, payload);
    const cvHash = await hashBuffer(pdfBuf);

    // Idempotência: se já parseamos esse mesmo arquivo, devolve cache
    const { data: existing } = await supabase
      .from("candidate_cv_intelligence")
      .select("id, cv_hash, parse_status")
      .eq("candidate_id", payload.candidate_id)
      .maybeSingle();

    if (existing?.cv_hash === cvHash && existing.parse_status === "success") {
      return new Response(JSON.stringify({ ok: true, cached: true, intelligence_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pipeline híbrido: extrai texto com unpdf
    let extractedText = "";
    let extractionMethod = "unpdf_text";
    try {
      const pdf = await getDocumentProxy(pdfBuf);
      const { text } = await extractText(pdf, { mergePages: true });
      extractedText = (Array.isArray(text) ? text.join("\n") : text).trim();
    } catch (e) {
      console.warn("[parse-cv] unpdf failed, using binary fallback:", e);
    }

    let llmResult;
    let costUsd = 0;
    if (extractedText.length >= MIN_TEXT_LEN) {
      llmResult = await callLLM({ type: "text", data: extractedText.slice(0, 100_000) });
      const inTok = llmResult.usage.prompt_tokens || 0;
      const outTok = llmResult.usage.completion_tokens || 0;
      // Gemini 2.5 Flash Lite: ~$0.075/1M in, $0.30/1M out (text)
      costUsd = (inTok * 0.075 + outTok * 0.30) / 1_000_000;
    } else {
      // Fallback: PDF como imagem (cobre escaneados)
      extractionMethod = "binary_vision";
      const base64 = btoa(String.fromCharCode(...pdfBuf));
      llmResult = await callLLM({ type: "file", data: base64, mimeType: "application/pdf" });
      const inTok = llmResult.usage.prompt_tokens || 0;
      const outTok = llmResult.usage.completion_tokens || 0;
      costUsd = (inTok * 0.10 + outTok * 0.40) / 1_000_000;
    }

    // Cobra créditos pela operação (fórmula oficial com margem)
    await consumeAICredits({
      supabase,
      accountId: payload.account_id,
      aiData: { usage: llmResult.usage },
      model: PARSE_MODEL,
      referenceId: payload.candidate_id,
      referenceType: `parse_cv_${extractionMethod}`,
      description: `Parse CV (${extractionMethod}) - candidato ${payload.candidate_id}`,
      userId: null,
    });

    const data = llmResult.parsed || {};

    // candidate_profile_id é resolvido depois (no bloco de prefill)
    const profileId: string | null = null;

    const intelRow = {
      account_id: payload.account_id,
      candidate_id: payload.candidate_id,
      candidate_profile_id: profileId,
      cv_url: payload.cv_storage_path || payload.cv_url,
      cv_hash: cvHash,
      parsed_at: new Date().toISOString(),
      parser_version: "hybrid_v1",
      extraction_method: extractionMethod,
      full_name: data.full_name || null,
      email: data.email || null,
      phone: data.phone || null,
      linkedin_url: data.linkedin_url || null,
      location: data.location || null,
      professional_summary: data.professional_summary || null,
      seniority_level: data.seniority_level || null,
      total_years_experience: data.total_years_experience ?? null,
      current_position: data.current_position || null,
      current_company: data.current_company || null,
      work_history: data.work_history || [],
      education: data.education || [],
      skills: data.skills || [],
      languages: data.languages || [],
      certifications: data.certifications || [],
      raw_text: extractedText.slice(0, 50_000) || null,
      cost_usd: costUsd,
      tokens_used: (llmResult.usage.prompt_tokens || 0) + (llmResult.usage.completion_tokens || 0),
      parse_status: "success",
    };

    let intelId: string;
    if (existing) {
      const { data: upd, error } = await supabase
        .from("candidate_cv_intelligence")
        .update(intelRow)
        .eq("id", existing.id)
        .select("id").single();
      if (error) throw error;
      intelId = upd.id;
    } else {
      const { data: ins, error } = await supabase
        .from("candidate_cv_intelligence")
        .insert(intelRow)
        .select("id").single();
      if (error) throw error;
      intelId = ins.id;
    }

    // Auto-prefill candidate_profiles (campos vazios apenas — preserva input manual)
    try {
      const { data: cand } = await supabase
        .from("recruitment_candidates")
        .select("email").eq("id", payload.candidate_id).single();
      const email = (data.email || cand?.email || "").toLowerCase().trim();
      if (email) {
        // Localizar user pelo email via admin API
        const { data: users } = await supabase.auth.admin.listUsers({ filter: `email.eq.${email}` } as any).catch(() => ({ data: null } as any));
        const userId = (users?.users && users.users[0]?.id) || null;
        if (userId) {
          const { data: targetProf } = await supabase
            .from("candidate_profiles")
            .select("id, phone, linkedin_url, city")
            .eq("user_id", userId)
            .maybeSingle();
          if (targetProf) {
            const patch: any = {};
            if (!targetProf.phone && data.phone) patch.phone = data.phone;
            if (!targetProf.linkedin_url && data.linkedin_url) patch.linkedin_url = data.linkedin_url;
            if (!targetProf.city && data.location) patch.city = data.location;
            if (Object.keys(patch).length) {
              await supabase.from("candidate_profiles").update(patch).eq("id", targetProf.id);
            }
            await supabase.from("candidate_cv_intelligence")
              .update({ candidate_profile_id: targetProf.id }).eq("id", intelId);
          }
        }
      }
    } catch (e) {
      console.warn("[parse-cv] prefill skipped:", e);
    }

    console.log(`[parse-cv] OK candidate=${payload.candidate_id} method=${extractionMethod} cost=$${costUsd.toFixed(6)}`);

    return new Response(JSON.stringify({
      ok: true,
      intelligence_id: intelId,
      extraction_method: extractionMethod,
      cost_usd: costUsd,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[parse-cv] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
