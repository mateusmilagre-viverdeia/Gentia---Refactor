import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResult = await checkRateLimit(req, 'generate-ritual-final-analysis', 20);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { managementRitualIds, acceptedRecommendations, pillarItems } = await req.json();

    const mgmtInfo = (managementRitualIds || []).join(", ");
    const recsInfo = (acceptedRecommendations || []).map((r: any) => `- ${r.suggestion}`).join("\n");
    const pillarsInfo = (pillarItems || []).map((i: any) => `Pilar ${i.pillar}: ${i.text}`).join("\n");

    const systemPrompt = `Você é um especialista em cultura organizacional fazendo uma análise final de compilação.

RITUAIS DE GESTÃO SELECIONADOS: ${mgmtInfo || "Nenhum"}

RECOMENDAÇÕES DA IA JÁ ACEITAS:
${recsInfo || "Nenhuma"}

ITENS DEFINIDOS NOS 3 PILARES:
${pillarsInfo || "Nenhum"}

OS 3 PILARES SÃO:
1. Artefatos Culturais
2. Ideias Adicionais e Símbolos
3. Rituais de Alinhamento com Valores

OBJETIVO:
Compile, organize e otimize TUDO que foi definido acima. Elimine duplicidades, agrupe itens semelhantes e sugira como integrar itens de pilares diferentes nos rituais de gestão existentes.

REGRAS CRÍTICAS:
1. Você SÓ pode recomendar ações baseadas nos rituais selecionados, recomendações aceitas e itens dos pilares listados acima
2. NÃO invente novas ações, ferramentas ou frameworks que não foram mencionados acima
3. NÃO sugira coisas que não existem na lista acima — apenas reorganize, combine e otimize o que já foi decidido
4. Elimine redundâncias — se dois itens dizem a mesma coisa, combine em um só
5. Sugira como integrar itens de pilares diferentes nos rituais de gestão já existentes
6. Priorize SIMPLICIDADE — poucas ações compiladas, de alto impacto
7. No campo "pillarRelated", use EXATAMENTE um destes nomes: "Artefatos Culturais", "Ideias Adicionais e Símbolos" ou "Rituais de Alinhamento com Valores"
8. NÃO use formatos como "Pilar 1", "Pilar 2" — use o nome completo do pilar

FORMATO JSON:
{
  "recommendations": [
    {
      "suggestion": "Descrição compilada da iniciativa (baseada nos itens acima)",
      "pillarRelated": "Nome exato do pilar (Artefatos Culturais, Ideias Adicionais e Símbolos ou Rituais de Alinhamento com Valores)",
      "durationSuggested": "Tempo estimado se aplicável"
    }
  ]
}`;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
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
          { role: "user", content: "Compile e organize a análise final baseada APENAS no que foi definido nas etapas anteriores. Não invente nada novo." },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      parsed = { recommendations: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
