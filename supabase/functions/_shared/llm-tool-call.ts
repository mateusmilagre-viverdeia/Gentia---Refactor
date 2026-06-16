// Wrapper de LLM com tool-calling (saída estruturada) + ROTEAMENTO POR PROVEDOR.
//
// COMPORTAMENTO PADRÃO (seguro): roteia TUDO pelo Lovable AI Gateway — idêntico
// ao de antes. Só quando `LLM_DIRECT_PROVIDERS=true` ele roteia DIRETO por prefixo
// do modelo (desacoplando do gateway — plano em docs/LLM_AUDIT.md §6):
//   - claude* / anthropic/*  -> Anthropic Messages API (NATIVA, via anthropic-client.ts)
//   - gpt*    / openai/*      -> OpenAI (endpoint OpenAI-compatible)
//   - gemini* / google/*      -> Google AI (endpoint OpenAI-compatible)
//   - perplexity/ e demais    -> Gateway (fallback)
// Por provedor: se a key estiver ausente/placeholder, cai no gateway naquela
// chamada (degrada com graça). Mantém a MESMA interface callLLMTool() — as ~90
// functions que importam NÃO mudam. Ativar só no cutover, com as keys reais.

import { callClaudeWithTool } from "./anthropic-client.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GOOGLE_OPENAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's parameters (the structured output). */
  parameters: Record<string, unknown>;
}

export interface CallLLMToolParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  tool: ToolDefinition;
  maxTokens?: number;
  /** Number of retries on transient errors (5xx, 429). Default 1. */
  retries?: number;
  /** Optional API key override (defaults to LOVABLE_API_KEY env) — força o gateway. */
  apiKey?: string;
  /** Optional stable identifier para OpenAI `prompt_cache_key`. NÃO é no-op no Gemini:
   *  o endpoint OpenAI-compat do Google REJEITA o campo com HTTP 400, então ele só é
   *  enviado quando endpoint != GOOGLE_OPENAI_URL (ver callOpenAICompatible). */
  cacheKey?: string;
  /** Modelos de fallback, tentados em ordem se o primário falhar (LLM_AUDIT §7). */
  fallbackModels?: string[];
}

export interface CallLLMToolResult<T = Record<string, unknown>> {
  args: T;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cached_tokens?: number;
  };
  raw?: unknown;
}

class LLMToolError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "LLMToolError";
  }
}

// --- Roteamento -------------------------------------------------------------
// Direto = flag ON **ou** gateway indisponível. Como o Lovable Gateway foi REMOVIDO
// no cutover (LOVABLE_API_KEY ausente), o fallback p/ gateway não existe mais → força
// direto sempre, independente da flag. Se LOVABLE_API_KEY ainda existir (ambiente de
// transição), respeita a flag (comportamento anterior).
function directEnabled(): boolean {
  const flag = (Deno.env.get("LLM_DIRECT_PROVIDERS") ?? "").toLowerCase() === "true";
  const gatewayGone = !Deno.env.get("LOVABLE_API_KEY");
  return flag || gatewayGone;
}
/** key válida = existe e não é o placeholder "PENDING_..." (cutover). */
function keyOk(v?: string | null): v is string {
  return !!v && !v.startsWith("PENDING_");
}
function stripPrefix(model: string): string {
  return model.replace(/^(google|openai|anthropic|perplexity)\//i, "");
}

// --- Caminho OpenAI-compatible (gateway, OpenAI direto, Google direto) -------
async function callOpenAICompatible<T>(
  endpoint: string,
  apiKey: string,
  model: string,
  params: CallLLMToolParams,
): Promise<CallLLMToolResult<T>> {
  const retries = params.retries ?? 1;
  const maxTokens = params.maxTokens ?? 2500;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    max_completion_tokens: maxTokens,
    tools: [
      {
        type: "function",
        function: {
          name: params.tool.name,
          description: params.tool.description,
          parameters: params.tool.parameters,
        },
      },
    ],
    // Google (OpenAI-compat) REJEITA tool_choice forçado-por-nome (retorna
    // MALFORMED_FUNCTION_CALL). Com "auto" + 1 tool + instrução, ele chama a tool
    // corretamente (validado). Gateway/OpenAI: mantêm o forçado. Fallback de parse
    // de JSON no content cobre o caso raro de "auto" não chamar.
    tool_choice: endpoint === GOOGLE_OPENAI_URL
      ? "auto"
      : { type: "function", function: { name: params.tool.name } },
  };
  // prompt_cache_key é EXCLUSIVO da OpenAI. O endpoint OpenAI-compat do Google REJEITA
  // campos desconhecidos com HTTP 400 ("Unknown name prompt_cache_key") -> zerava o parecer
  // (técnico e cultural) no modo direto. O gateway Lovable tolerava; o desacople expôs.
  // Só envia p/ OpenAI direto (ou gateway), NUNCA p/ Google.
  if (params.cacheKey && endpoint !== GOOGLE_OPENAI_URL) body.prompt_cache_key = params.cacheKey;
  // VELOCIDADE: Gemini Flash faz "thinking" por padrão (~3-4x mais lento; o gateway
  // Lovable rodava SEM). reasoning_effort="none" restaura a velocidade. Modelos "pro"
  // exigem thinking -> não mexe. (Mesmo fix do _shared/ai-gateway.ts, mas este caminho
  // do wrapper faz fetch próprio e não passa pelo aiFetch.)
  if (endpoint === GOOGLE_OPENAI_URL && !model.toLowerCase().includes("pro")) {
    body.reasoning_effort = "none";
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status !== 429 && res.status < 500) {
          throw new LLMToolError(`LLM ${res.status}: ${txt}`, res.status);
        }
        lastError = new LLMToolError(`LLM ${res.status}: ${txt}`, res.status);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];

      if (!toolCall?.function?.arguments) {
        const content = choice?.message?.content;
        if (content) {
          try {
            const cleaned = String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const m = cleaned.match(/\{[\s\S]*\}/);
            if (m) return { args: JSON.parse(m[0]) as T, usage: json.usage || {}, raw: json };
          } catch (_e) { /* fall through */ }
        }
        throw new LLMToolError("LLM returned no tool_call and no parsable JSON content", 500);
      }

      let parsed: T;
      try {
        parsed = JSON.parse(toolCall.function.arguments) as T;
      } catch (e) {
        throw new LLMToolError(`Failed to parse tool arguments JSON: ${(e as Error).message}`, 500);
      }
      return { args: parsed, usage: json.usage || {}, raw: json };
    } catch (e) {
      lastError = e;
      if (e instanceof LLMToolError && e.status !== 429 && e.status < 500) throw e;
      if (attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM tool call failed");
}

// --- Caminho Anthropic NATIVO (Messages API) --------------------------------
// NOTA: usar modelos que aceitam `temperature` (Haiku 4.5 / Sonnet 4.6 — ver
// LLM_AUDIT.md). Opus 4.7/4.8 rejeitam temperature; se forem usados, ajustar o
// anthropic-client para não enviá-la.
async function callAnthropic<T>(
  model: string,
  params: CallLLMToolParams,
): Promise<CallLLMToolResult<T>> {
  const r = await callClaudeWithTool({
    model,
    systemPrompt: params.systemPrompt,
    userMessage: params.userPrompt,
    tool: {
      name: params.tool.name,
      description: params.tool.description,
      input_schema: params.tool.parameters,
    },
    maxTokens: params.maxTokens ?? 2500,
  });
  const tc = r.toolCalls[0];
  if (!tc) throw new LLMToolError("Claude returned no tool_use block", 500);
  return {
    args: tc.input as T,
    usage: {
      prompt_tokens: r.usage.prompt_tokens,
      completion_tokens: r.usage.completion_tokens,
      total_tokens: (r.usage.prompt_tokens ?? 0) + (r.usage.completion_tokens ?? 0),
      cached_tokens: r.usage.cached_tokens ?? 0,
    },
    raw: r.raw,
  };
}

// --- Roteamento de UMA tentativa (provedor do `model`) ----------------------
function routeOnce<T>(model: string, params: CallLLMToolParams): Promise<CallLLMToolResult<T>> {
  const m = model.toLowerCase();

  // Gateway = comportamento padrão (idêntico ao anterior) e também quando o
  // chamador passa um apiKey explícito (override do gateway).
  const gateway = () => {
    const key = params.apiKey || Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");
    return callOpenAICompatible<T>(LOVABLE_AI_URL, key, model, params); // mantém o prefixo provider/
  };

  if (!directEnabled() || params.apiKey) return gateway();

  // Flag ON: roteia direto por provedor (com fallback ao gateway se faltar key)
  if (m.startsWith("claude") || m.startsWith("anthropic/")) {
    return keyOk(Deno.env.get("ANTHROPIC_API_KEY"))
      ? callAnthropic<T>(stripPrefix(model), params)
      : gateway();
  }
  if (m.startsWith("gpt") || m.startsWith("openai/")) {
    const k = Deno.env.get("OPENAI_API_KEY");
    return keyOk(k) ? callOpenAICompatible<T>(OPENAI_URL, k, stripPrefix(model), params) : gateway();
  }
  if (m.startsWith("gemini") || m.startsWith("google/")) {
    const k = Deno.env.get("GEMINI_API_KEY");
    return keyOk(k) ? callOpenAICompatible<T>(GOOGLE_OPENAI_URL, k, stripPrefix(model), params) : gateway();
  }
  // perplexity/* e desconhecidos -> gateway (por enquanto)
  return gateway();
}

// --- API pública: primário + CADEIA DE FALLBACK por modelo (LLM_AUDIT §7) ----
// Tenta `params.model`; se falhar, tenta `params.fallbackModels` em ordem (ex.:
// modelo "pro" instável -> flash -> claude). Sem fallbackModels = 1 tentativa
// (comportamento idêntico ao anterior). Cada modelo já tem seus próprios retries
// de transiente (429/5xx) dentro de routeOnce.
export async function callLLMTool<T = Record<string, unknown>>(
  params: CallLLMToolParams,
): Promise<CallLLMToolResult<T>> {
  const chain = [params.model, ...(params.fallbackModels ?? [])].filter(Boolean);
  let lastError: unknown = null;
  for (let i = 0; i < chain.length; i++) {
    try {
      return await routeOnce<T>(chain[i], params);
    } catch (e) {
      lastError = e;
      if (i < chain.length - 1) {
        console.warn(
          `[llm-tool-call] modelo "${chain[i]}" falhou (${String((e as Error)?.message).slice(0, 120)}); ` +
            `tentando fallback "${chain[i + 1]}"`,
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM tool call failed");
}
