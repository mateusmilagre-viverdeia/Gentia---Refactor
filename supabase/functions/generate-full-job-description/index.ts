import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, "generate-full-job-description", 50);
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { jobTitle, area, cultureContext } = await req.json();

    if (!jobTitle || jobTitle.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "jobTitle é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const model = await getConfiguredModel(
      "generate-full-job-description",
      "google/gemini-3-flash-preview"
    );

    // Build context sections
    const contextParts: string[] = [];
    if (cultureContext?.mission) {
      contextParts.push(`Missão da empresa: ${cultureContext.mission}`);
    }
    if (cultureContext?.vision) {
      contextParts.push(`Visão da empresa: ${cultureContext.vision}`);
    }
    if (cultureContext?.values?.length) {
      contextParts.push(`Valores da empresa: ${cultureContext.values.join(", ")}`);
    }
    if (cultureContext?.sellingCompanyContent) {
      contextParts.push(
        `Conteúdo "Vendendo a Empresa" (use para extrair benefícios e desenvolvimento quando possível):\n${cultureContext.sellingCompanyContent}`
      );
    }

    const systemPrompt = `Você é um especialista em RH e descrição de cargos no mercado brasileiro.
Gere um Job Description completo e profissional para o cargo informado.

${contextParts.length > 0 ? "CONTEXTO DA EMPRESA:\n" + contextParts.join("\n\n") : ""}

REGRAS IMPORTANTES:
- Missão: 2-3 frases descrevendo o propósito do cargo
- Indicadores: métricas mensuráveis sob responsabilidade do cargo (máximo 5)
- Responsabilidades: atividades principais do dia-a-dia (máximo 5)
- Competências técnicas obrigatórias: hard skills essenciais (exatamente 3)
- Competências técnicas desejáveis: hard skills que agregam valor (máximo 5)
- Competências comportamentais: soft skills alinhadas com o perfil ideal para o cargo E com os valores da empresa quando disponíveis (máximo 6)
- Desenvolvimento: o que o profissional vai aprender/desenvolver neste cargo (máximo 5). Se houver conteúdo "Vendendo a Empresa", extraia dessa fonte.
- Benefícios: o que a empresa oferece (máximo 5). Se houver conteúdo "Vendendo a Empresa", extraia dessa fonte. Use emojis no início de cada item.
- Perfil DISC ideal: scores de 0 a 100 para cada dimensão (D, I, S, C) baseado nas competências técnicas e comportamentais do cargo, com uma descrição do perfil ideal.

${area ? `Área/departamento: ${area}` : ""}`;

    const response = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Gere o Job Description completo para o cargo: "${jobTitle}"${area ? ` na área de ${area}` : ""}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_job_description",
              description: "Gera um Job Description completo com todos os campos estruturados",
              parameters: {
                type: "object",
                properties: {
                  mission: {
                    type: "string",
                    description: "Missão do cargo (2-3 frases)",
                  },
                  indicators: {
                    type: "array",
                    items: { type: "string" },
                    description: "Indicadores de responsabilidade (máx 5)",
                  },
                  responsibilities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Principais responsabilidades (máx 5)",
                  },
                  required_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Competências técnicas obrigatórias (exatamente 3)",
                  },
                  desired_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Competências técnicas desejáveis (máx 5)",
                  },
                  behavioral_competencies: {
                    type: "array",
                    items: { type: "string" },
                    description: "Competências comportamentais (máx 6)",
                  },
                  development: {
                    type: "array",
                    items: { type: "string" },
                    description: "O que vai desenvolver (máx 5)",
                  },
                  benefits: {
                    type: "array",
                    items: { type: "string" },
                    description: "Benefícios com emoji (máx 5)",
                  },
                  ideal_disc_profile: {
                    type: "object",
                    properties: {
                      d: { type: "number", description: "Score Dominância 0-100" },
                      i: { type: "number", description: "Score Influência 0-100" },
                      s: { type: "number", description: "Score Estabilidade 0-100" },
                      c: { type: "number", description: "Score Conformidade 0-100" },
                      description: {
                        type: "string",
                        description: "Descrição do perfil DISC ideal para o cargo",
                      },
                    },
                    required: ["d", "i", "s", "c", "description"],
                  },
                },
                required: [
                  "mission",
                  "indicators",
                  "responsibilities",
                  "required_skills",
                  "desired_skills",
                  "behavioral_competencies",
                  "development",
                  "benefits",
                  "ideal_disc_profile",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "generate_job_description" },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    // Consume AI credits
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: membership } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', rateLimitResult.userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (membership?.account_id) {
      await consumeAICredits({
        supabase,
        accountId: membership.account_id,
        aiData: aiResponse,
        model,
        referenceId: null,
        referenceType: 'generate_full_job_description',
        description: `JD completo: ${jobTitle}`,
        userId: rateLimitResult.userId,
      });
    }

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta da IA não contém dados estruturados");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(generatedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-full-job-description error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
