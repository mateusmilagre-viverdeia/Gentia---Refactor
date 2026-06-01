// Anthropic Claude client with tool_use + token tracking
// Used by Premium Market Research generator

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface AnthropicToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicResult {
  toolCalls: AnthropicToolCall[];
  text: string;
  usage: { prompt_tokens: number; completion_tokens: number };
  model: string;
  raw: any;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | any[];
}

export async function callClaudeWithTool(opts: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  tool: { name: string; description?: string; input_schema: any };
  maxTokens?: number;
  temperature?: number;
}): Promise<AnthropicResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const body = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.3,
    system: opts.systemPrompt,
    messages: [{ role: "user", content: opts.userMessage }],
    tools: [opts.tool],
    tool_choice: { type: "tool", name: opts.tool.name },
  };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${opts.model} failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const toolCalls: AnthropicToolCall[] = [];
  let text = "";
  for (const block of data.content || []) {
    if (block.type === "tool_use") {
      toolCalls.push({ name: block.name, input: block.input });
    } else if (block.type === "text") {
      text += block.text;
    }
  }

  return {
    toolCalls,
    text,
    usage: {
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
    },
    model: data.model || opts.model,
    raw: data,
  };
}
