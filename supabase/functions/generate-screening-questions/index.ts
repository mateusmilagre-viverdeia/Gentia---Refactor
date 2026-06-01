import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      sellingBlock5,
      sellingBlock6,
      requiredSkills,
      workModality,
      location,
      accountId,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const systemPrompt = `Você é um especialista em recrutamento e seleção. Sua tarefa é gerar perguntas de triagem (screening) eliminatórias para candidatos.

REGRAS:
- Todas as perguntas devem ser de SIM/NÃO
- O candidato que responder "Não" a uma pergunta obrigatória será eliminado automaticamente
- As perguntas devem ser diretas, claras e sem ambiguidade
- Use linguagem profissional mas acessível
- Gere entre 5 e 10 perguntas no total
- Cada pergunta deve ter uma category: "modality" (trabalho), "skill" (técnica), "selling" (cultura/comportamento)

FORMATO DE RESPOSTA (use tool calling):
Retorne as perguntas usando a função fornecida.`;

    const contextParts: string[] = [];

    if (workModality && workModality !== "remoto") {
      const label = workModality === "presencial" ? "presencial" : "híbrido (presencial e remoto)";
      const loc = location ? ` em ${location}` : "";
      contextParts.push(`MODALIDADE DE TRABALHO: A vaga é ${label}${loc}. Gere 1 pergunta de modalidade.`);
    }

    if (requiredSkills && requiredSkills.length > 0) {
      contextParts.push(
        `COMPETÊNCIAS TÉCNICAS OBRIGATÓRIAS:\n${requiredSkills.map((s: string) => `- ${s}`).join("\n")}\nGere 1 pergunta para cada competência técnica obrigatória.`
      );
    }

    if (sellingBlock5) {
      contextParts.push(
        `PERFIL CULTURAL — "NOSSO SANTO VAI BATER SE VOCÊ...":\n${sellingBlock5}\n\nA partir desse bloco, gere 2-3 perguntas de cultura que verifiquem se o candidato se identifica com os comportamentos descritos. Use trechos reais do texto para dar contexto na pergunta.`
      );
    }

    if (sellingBlock6) {
      contextParts.push(
        `TRANSPARÊNCIA — "O LADO DIFÍCIL":\n${sellingBlock6}\n\nA partir desse bloco, gere 1-2 perguntas que verifiquem se o candidato aceita os desafios e dificuldades descritos. Seja direto sobre o que a empresa NÃO é, para que o candidato "peça para sair" se não combinar.`
      );
    }

    if (contextParts.length === 0) {
      return new Response(
        JSON.stringify({ questions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = contextParts.join("\n\n---\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_screening_questions",
              description: "Gera perguntas de triagem eliminatórias para candidatos",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["modality", "skill", "selling"],
                          description: "Categoria da pergunta",
                        },
                        text: {
                          type: "string",
                          description: "Texto da pergunta de SIM/NÃO",
                        },
                        required: {
                          type: "boolean",
                          description: "Se a pergunta é eliminatória",
                        },
                      },
                      required: ["category", "text", "required"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_screening_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ questions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume credits
    if (accountId) {
      await consumeAICredits({
        supabase,
        accountId,
        aiData,
        model: "google/gemini-2.5-flash",
        referenceType: "screening_questions",
        description: "Geração de perguntas de triagem",
        userId: user.id,
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const questions = (parsed.questions || []).map((q: any) => ({
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: q.category || "custom",
      text: q.text || "",
      required: q.required !== false,
    }));

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-screening-questions error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
