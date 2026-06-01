import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RITUAL_PILLARS = [
  { number: 1, title: "Artefatos", description: "Símbolos, sistemas e elementos que reforçam a cultura" },
  { number: 2, title: "Ideias Adicionais e Símbolos", description: "Ideias criativas, símbolos e elementos inovadores que reforçam a cultura" },
  { number: 3, title: "Rituais de Alinhamento com Valores", description: "Rituais que reforçam os valores da empresa" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-ritual-suggestions', 50);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { pillarNumber, pillarTitle, pillarQuestion, cultureContext, workModel } = await req.json();

    const pillar = RITUAL_PILLARS.find((p) => p.number === pillarNumber);
    if (!pillar) {
      return new Response(JSON.stringify({ error: "Pilar inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build culture context string
    let cultureInfo = "";
    if (cultureContext.mission) {
      cultureInfo += `Missão: ${cultureContext.mission}\n`;
    }
    if (cultureContext.vision) {
      cultureInfo += `Visão: ${cultureContext.vision}\n`;
    }
    if (cultureContext.values && cultureContext.values.length > 0) {
      cultureInfo += `Valores: ${cultureContext.values.join(", ")}\n`;
    }
    if (cultureContext.indicators && Array.isArray(cultureContext.indicators)) {
      cultureInfo += `Indicadores estratégicos: ${cultureContext.indicators.map((i: any) => i.indicator || i).join(", ")}\n`;
    }
    if (cultureContext.projects && cultureContext.projects.length > 0) {
      cultureInfo += `Projetos estratégicos: ${cultureContext.projects.map((p: any) => p.project_name).join(", ")}\n`;
    }
    if (cultureContext.decisions && cultureContext.decisions.length > 0) {
      cultureInfo += `Critérios de decisão: ${cultureContext.decisions.map((d: any) => d.answer_text).join("; ")}\n`;
    }

    // Work model context
    let workModelInstruction = "";
    if (workModel) {
      const modelLabels: Record<string, string> = {
        presencial: "100% Presencial",
        hibrido: "Híbrido (presencial + remoto)",
        remoto: "100% Home Office / Remoto",
      };
      const modelLabel = modelLabels[workModel] || workModel;
      
      if (workModel === 'remoto') {
        workModelInstruction = `\n\nMODELO DE TRABALHO: ${modelLabel}
IMPORTANTE: A empresa é 100% remota. Priorize artefatos DIGITAIS como:
- Canais temáticos em Slack/Discord (ex: #cultura, #wins, #valores)
- Bots de reconhecimento cultural em ferramentas de chat
- Emojis e stickers personalizados dos valores
- Wallpapers virtuais com missão/visão para videochamadas
- Playlists colaborativas que reflitam a cultura
- Newsletters digitais de cultura
- Onboarding kits digitais
- Rituais assíncronos (posts, votações, challenges)
NÃO sugira artefatos físicos como murais, totens, quadros ou decoração de escritório.`;
      } else if (workModel === 'hibrido') {
        workModelInstruction = `\n\nMODELO DE TRABALHO: ${modelLabel}
A empresa trabalha em modelo híbrido. Sugira uma combinação de:
- Artefatos FÍSICOS para o escritório (murais, quadros, decoração)
- Artefatos DIGITAIS para os dias remotos (canais Slack/Discord, emojis, wallpapers virtuais, bots de cultura)
Equilibre sugestões presenciais e digitais para garantir que a cultura seja vivida em ambos os ambientes.`;
      } else {
        workModelInstruction = `\n\nMODELO DE TRABALHO: ${modelLabel}
A empresa é 100% presencial. Priorize artefatos FÍSICOS e presenciais como:
- Murais, quadros e painéis com valores e missão
- Decoração e ambientação do escritório
- Uniformes, dress code e identidade visual
- Sinalização e comunicação visual nos espaços
- Rituais presenciais e dinâmicas em grupo`;
      }
    }

    const systemPrompt = `Você é um especialista em cultura organizacional e gestão empresarial.

Sua tarefa é gerar sugestões práticas e personalizadas para rituais de cultura organizacional.

CONTEXTO DA EMPRESA:
${cultureInfo || "Não há informações específicas sobre a cultura da empresa."}
${workModelInstruction}

PILAR ATUAL: ${pillar.title}
DESCRIÇÃO: ${pillar.description}
PERGUNTA GUIA: ${pillarQuestion}

INSTRUÇÕES:
1. Gere 3-5 sugestões específicas e práticas para este pilar
2. As sugestões devem ser personalizadas com base no contexto cultural da empresa
3. Cada sugestão deve ser acionável e implementável
4. Use linguagem clara e objetiva em português brasileiro
5. Considere diferentes formatos (presencial, remoto, híbrido)
6. Sugira rituais que podem ser implementados imediatamente

FORMATO DE RESPOSTA:
Retorne um JSON com a seguinte estrutura:
{
  "suggestions": [
    "Sugestão 1 - descrição clara e acionável",
    "Sugestão 2 - descrição clara e acionável",
    "Sugestão 3 - descrição clara e acionável"
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Gere sugestões personalizadas para o pilar "${pillar.title}": ${pillarQuestion}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON response (handle markdown wrapping)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: try to extract suggestions from text
      const lines = content.split("\n").filter((l: string) => l.trim().startsWith("-") || l.trim().match(/^\d+\./));
      parsed = {
        suggestions: lines.map((l: string) => l.replace(/^[-\d.)\s]+/, "").trim()).filter(Boolean),
      };
    }

    console.log(`User ${rateLimitResult.userId} generated ritual suggestions. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-ritual-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
