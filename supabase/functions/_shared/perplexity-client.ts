// Perplexity sonar-pro client for grounded web research

export interface PerplexityResult {
  content: string;
  citations: string[];
  usage: { prompt_tokens: number; completion_tokens: number };
  model: string;
}

export async function perplexitySearch(opts: {
  query: string;
  systemPrompt?: string;
  recency?: "day" | "week" | "month" | "year";
  domainFilter?: string[];
  model?: string;
}): Promise<PerplexityResult> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not configured");

  const model = opts.model ?? "sonar-pro";
  const body: any = {
    model,
    messages: [
      {
        role: "system",
        content:
          opts.systemPrompt ??
          "Você é um pesquisador de mercado. Responda em português brasileiro, objetivamente, com números e fontes recentes (últimos 12 meses).",
      },
      { role: "user", content: opts.query },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  };
  if (opts.recency) body.search_recency_filter = opts.recency;
  if (opts.domainFilter?.length) body.search_domain_filter = opts.domainFilter;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Perplexity failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    citations: data.citations ?? [],
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
    model: data.model || model,
  };
}

export async function firecrawlScrape(url: string): Promise<{ markdown: string; title?: string } | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const md = data?.markdown ?? data?.data?.markdown ?? "";
    if (!md) return null;
    return { markdown: md.slice(0, 12000), title: data?.metadata?.title ?? data?.data?.metadata?.title };
  } catch (e) {
    console.warn("[firecrawl] scrape error:", url, e);
    return null;
  }
}
