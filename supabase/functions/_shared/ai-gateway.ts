// Substitui o LOVABLE AI GATEWAY por chamadas DIRETAS aos provedores (Gemini/OpenAI/Claude).
//
// É um DROP-IN do fetch ao gateway: as functions trocam
//    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", init)
// por
//    aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", init)
// e NADA MAIS muda — aiFetch roteia pelo `model` do body e devolve um Response
// OpenAI-compatible (mesmo formato `choices[0].message...` / `data[].embedding`),
// então o parsing existente continua válido. NÃO depende de LOVABLE_API_KEY.
//
// Roteamento por prefixo/nome do model:
//   google/* | gemini* | (default) -> Google (endpoint OpenAI-compat) [GEMINI_API_KEY]
//   gpt* | openai/* | o1/o3        -> OpenAI                          [OPENAI_API_KEY]
//   claude* | anthropic/*          -> Anthropic Messages API (nativa, traduzida p/ OpenAI)

const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const OPENAI_BASE = "https://api.openai.com/v1";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type Provider = "google" | "openai" | "anthropic";

function providerOf(model: string): Provider {
  const m = (model || "").toLowerCase();
  if (m.startsWith("claude") || m.startsWith("anthropic/")) return "anthropic";
  if (m.startsWith("gpt") || m.startsWith("openai/") || m.startsWith("o1") || m.startsWith("o3")) return "openai";
  return "google";
}
function stripPrefix(model: string): string {
  return (model || "").replace(/^(google|openai|anthropic)\//, "");
}
function envKey(name: string): string {
  const k = Deno.env.get(name);
  if (!k) throw new Error(`${name} não configurada (desacoplamento direto)`);
  return k;
}

// Retry em erros transientes (429 / 5xx — ex.: gemini-flash devolve 503 sob carga).
// As functions inline não tinham retry próprio; centralizar aqui deixa todas resilientes.
async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let res = await fetch(url, init);
  for (let attempt = 0; attempt < retries && (res.status === 429 || res.status >= 500); attempt++) {
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    res = await fetch(url, init);
  }
  return res;
}

export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  const payload = init?.body ? JSON.parse(init.body as string) : {};
  const provider = providerOf(payload.model);
  const isEmbeddings = url.includes("/embeddings");

  // ---------- EMBEDDINGS ----------
  if (isEmbeddings) {
    const model = stripPrefix(payload.model);
    if (provider === "openai") {
      return fetchWithRetry(`${OPENAI_BASE}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${envKey("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, model }),
      });
    }
    // Google embeddings (API nativa). ⚠️ text-embedding-004/embedding-001 foram
    // DESCONTINUADOS na API Gemini (AI Studio key); o único disponível é
    // gemini-embedding-001, configurado p/ outputDimensionality=768 (cabe na coluna
    // vector(768)). ATENÇÃO: os vetores EXISTENTES foram gerados com text-embedding-004
    // (modelo diferente = espaço vetorial diferente) → é preciso RE-EMBED de todas as
    // entidades p/ a busca semântica ficar consistente. Até lá, similaridade entre
    // vetores novos e antigos NÃO é confiável.
    const key = envKey("GEMINI_API_KEY");
    const EMB_MODEL = "gemini-embedding-001";
    const inputs: string[] = Array.isArray(payload.input) ? payload.input : [payload.input];
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMB_MODEL}:batchEmbedContents?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: inputs.map((t) => ({ model: `models/${EMB_MODEL}`, content: { parts: [{ text: t }] }, outputDimensionality: 768 })) }),
      },
    );
    const d = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: d?.error ?? d }), { status: res.status, headers: { "Content-Type": "application/json" } });
    }
    const data = (d.embeddings || []).map((e: any, i: number) => ({ object: "embedding", index: i, embedding: e.values }));
    return new Response(JSON.stringify({ object: "list", data, model }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // ---------- CHAT (Anthropic nativo, traduzido p/ OpenAI) ----------
  if (provider === "anthropic") return anthropicAsOpenAI(payload);

  // ---------- CHAT (Google/OpenAI — OpenAI-compat, passa direto) ----------
  const base = provider === "openai" ? OPENAI_BASE : GOOGLE_BASE;
  const key = provider === "openai" ? envKey("OPENAI_API_KEY") : envKey("GEMINI_API_KEY");
  const body: Record<string, unknown> = { ...payload, model: stripPrefix(payload.model) };
  if (provider === "google") {
    // Campos EXCLUSIVOS da OpenAI que o endpoint OpenAI-compat do Google rejeita com
    // HTTP 400 ("Unknown name ...") -> remove p/ Google (defensivo, caso o chamador envie).
    delete (body as Record<string, unknown>).prompt_cache_key;
    delete (body as Record<string, unknown>).prompt_cache_retention;
    // tool_choice forçado-por-nome -> MALFORMED_FUNCTION_CALL; usa "auto".
    if (body.tools && body.tool_choice && typeof body.tool_choice === "object") body.tool_choice = "auto";
    // VELOCIDADE: Gemini Flash faz "thinking" por padrão (~3x mais lento, gasta tokens).
    // O gateway Lovable já rodava SEM thinking -> reasoning_effort="none" restaura a
    // velocidade original. (Modelos "pro" exigem thinking -> não mexe; respeita o
    // reasoning_effort que o chamador eventualmente já tenha definido.)
    if (!("reasoning_effort" in body) && !String(body.model).toLowerCase().includes("pro")) {
      body.reasoning_effort = "none";
    }
  }
  return fetchWithRetry(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Anthropic Messages API (nativa) -> Response no formato OpenAI chat.completions.
async function anthropicAsOpenAI(payload: any): Promise<Response> {
  const key = envKey("ANTHROPIC_API_KEY");
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const system = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n\n");
  const msgs = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const body: Record<string, unknown> = {
    model: stripPrefix(payload.model),
    max_tokens: payload.max_tokens ?? payload.max_completion_tokens ?? 2048,
    messages: msgs,
  };
  if (system) body.system = system;
  if (Array.isArray(payload.tools) && payload.tools.length) {
    body.tools = payload.tools.map((t: any) => ({
      name: t.function?.name, description: t.function?.description, input_schema: t.function?.parameters,
    }));
    if (payload.tool_choice && typeof payload.tool_choice === "object") {
      body.tool_choice = { type: "tool", name: payload.tool_choice.function?.name };
    }
  }

  const res = await fetchWithRetry(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data?.error ?? data }), {
      status: res.status, headers: { "Content-Type": "application/json" },
    });
  }
  let content = "";
  let tool_calls: unknown[] | undefined;
  for (const block of data.content || []) {
    if (block.type === "text") content += block.text;
    else if (block.type === "tool_use") {
      (tool_calls ||= []).push({ id: block.id, type: "function", function: { name: block.name, arguments: JSON.stringify(block.input) } });
    }
  }
  const openai = {
    id: data.id,
    object: "chat.completion",
    model: data.model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: tool_calls ? null : content, ...(tool_calls ? { tool_calls } : {}) },
      finish_reason: data.stop_reason === "tool_use" ? "tool_calls" : "stop",
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
  return new Response(JSON.stringify(openai), { status: 200, headers: { "Content-Type": "application/json" } });
}
