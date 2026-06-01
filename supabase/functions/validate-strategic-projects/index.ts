import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const rateLimitResult = await checkRateLimit(req, 'validate-strategic-projects', 50);
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { projects, vision, indicators, segment } = await req.json();

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum projeto fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const projectsList = projects
      .map((p: { name: string; perspective: string }, i: number) => `${i + 1}. "${p.name}" (Perspectiva: ${p.perspective})`)
      .join("\n");

    const systemPrompt = `Você é um consultor estratégico sênior especializado em Balanced Scorecard (BSC) e planejamento estratégico empresarial.

Sua tarefa é analisar projetos selecionados por um cliente e determinar se são REALMENTE projetos estratégicos ou se são táticos, operacionais ou apenas ações pontuais.

DEFINIÇÕES:
- **Estratégico**: Transforma a empresa, cria vantagem competitiva sustentável, conecta-se diretamente à visão de futuro. Horizonte de 2-5 anos. Impacto organizacional amplo.
- **Tático**: Melhoria departamental ou de processo específico. Importante mas não transformador. Horizonte de 6-18 meses.
- **Operacional**: Manutenção ou otimização de rotinas existentes. Necessário mas não diferenciador.
- **Ação Pontual**: Tarefa única, iniciativa isolada sem continuidade estratégica. Não é projeto, é atividade.

REGRAS PARA NOMES SUGERIDOS:
- Dê nomes que transmitam ambição e direção estratégica
- O nome deve comunicar o "para quê" e não apenas o "o quê"
- Exemplos: "Implementar CRM" → "Programa de Inteligência Comercial e Relacionamento"
- Explique o conceito por trás do nome sugerido

REGRAS PARA SUBSTITUIÇÕES:
- Só sugira substituição para projetos classificados como Tático, Operacional ou Ação Pontual
- A substituição deve ser um projeto genuinamente estratégico na mesma perspectiva BSC
- A substituição deve estar alinhada à visão e aos indicadores da empresa`;

    const userPrompt = `VISÃO DA EMPRESA: ${vision || "Não informada"}

INDICADORES ESTRATÉGICOS: ${indicators?.length > 0 ? indicators.join(", ") : "Não informados"}

SEGMENTO: ${segment || "Não informado"}

PROJETOS PARA ANÁLISE:
${projectsList}

Analise cada projeto acima.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analyses",
              description: "Return the strategic analysis for each project",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        project_name: { type: "string", description: "Original project name" },
                        classification: {
                          type: "string",
                          enum: ["estrategico", "tatico", "operacional", "acao_pontual"],
                        },
                        justification: { type: "string", description: "Why this classification" },
                        suggested_name: { type: "string", description: "More strategic name suggestion" },
                        name_concept: { type: "string", description: "Explanation of the suggested name concept" },
                        alignment_score: {
                          type: "number",
                          description: "1-5 alignment with vision and indicators",
                        },
                        replacement_suggestion: {
                          type: "object",
                          nullable: true,
                          properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                            perspective: { type: "string" },
                          },
                          required: ["name", "description", "perspective"],
                        },
                      },
                      required: [
                        "project_name",
                        "classification",
                        "justification",
                        "suggested_name",
                        "name_concept",
                        "alignment_score",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["analyses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analyses" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit_exceeded", message: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", message: "Credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ analyses: parsed.analyses }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("validate-strategic-projects error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
