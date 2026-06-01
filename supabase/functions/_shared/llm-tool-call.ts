// Wrapper for Lovable AI Gateway calls using tool calling (structured output).
// Eliminates JSON-parse failures, allows tight max_tokens, and standardizes
// retries + cost extraction.
//
// Usage:
//   const { args, usage } = await callLLMTool({
//     model: "google/gemini-3-flash-preview",
//     systemPrompt: "...",
//     userPrompt: "...",
//     tool: { name: "submit_evaluation", description: "...", parameters: {...JSON Schema...} },
//     maxTokens: 2000,
//   });

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
  /** Optional API key override (defaults to LOVABLE_API_KEY env). */
  apiKey?: string;
  /**
   * Optional stable identifier (e.g. job_id) used as OpenAI `prompt_cache_key`
   * to bias the cache router. Gemini implicit caching ignores it; this is a
   * no-op for Gemini models. Improves hit-rate when many calls share a prefix.
   */
  cacheKey?: string;
}

export interface CallLLMToolResult<T = Record<string, unknown>> {
  /** Parsed structured arguments returned by the tool call. */
  args: T;
  /** Raw usage object from the gateway (prompt_tokens, completion_tokens, total_tokens). */
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cached_tokens?: number;
  };
  /** Raw response (for debugging). */
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

export async function callLLMTool<T = Record<string, unknown>>(
  params: CallLLMToolParams
): Promise<CallLLMToolResult<T>> {
  const apiKey = params.apiKey || Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const retries = params.retries ?? 1;
  const maxTokens = params.maxTokens ?? 2500;

  const body: Record<string, unknown> = {
    model: params.model,
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
    tool_choice: { type: "function", function: { name: params.tool.name } },
  };

  // OpenAI prompt cache hint (no-op on Gemini). Improves cache hit-rate when
  // many calls share the same prefix (e.g. all candidates for the same job).
  if (params.cacheKey) {
    body.prompt_cache_key = params.cacheKey;
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        // Don't retry 4xx (auth, payment, validation); only 429 + 5xx
        if (res.status !== 429 && res.status < 500) {
          throw new LLMToolError(`LLM gateway ${res.status}: ${txt}`, res.status);
        }
        lastError = new LLMToolError(`LLM gateway ${res.status}: ${txt}`, res.status);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];

      if (!toolCall?.function?.arguments) {
        // Some models may fall back to content if tool calling not supported.
        // Try parsing content as JSON as a last resort.
        const content = choice?.message?.content;
        if (content) {
          try {
            const cleaned = String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const m = cleaned.match(/\{[\s\S]*\}/);
            if (m) {
              return {
                args: JSON.parse(m[0]) as T,
                usage: json.usage || {},
                raw: json,
              };
            }
          } catch (_e) {
            // fall through
          }
        }
        throw new LLMToolError("LLM returned no tool_call and no parsable JSON content", 500);
      }

      let parsed: T;
      try {
        parsed = JSON.parse(toolCall.function.arguments) as T;
      } catch (e) {
        throw new LLMToolError(`Failed to parse tool arguments JSON: ${(e as Error).message}`, 500);
      }

      return {
        args: parsed,
        usage: json.usage || {},
        raw: json,
      };
    } catch (e) {
      lastError = e;
      if (e instanceof LLMToolError && e.status !== 429 && e.status < 500) throw e;
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("LLM tool call failed");
}
