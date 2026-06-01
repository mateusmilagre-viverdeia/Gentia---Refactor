import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MISSION_SYSTEM_PROMPT = `Você é um especialista em análise de texto e cultura organizacional.

TAREFA: Analise as respostas do cliente e extraia expressões-chave relevantes para compor a missão da empresa.

CLASSIFICAÇÃO:
1. "frequent" - Expressões ou conceitos que aparecem múltiplas vezes nas respostas ou são recorrentes
2. "impactful" - Expressões com forte significado emocional, estratégico ou que representam o DNA da empresa

REGRAS:
- Extraia 4-6 expressões por categoria (8-12 total)
- Use expressões-chave de 1 a 4 palavras que capturem a ideia ou conceito completo (ex: "empresas com propósito", "transformar vidas", "saúde pública", "líder regional"). NÃO construa frases completas, mas garanta contexto suficiente para que a expressão faça sentido sozinha.
- Priorize substantivos, verbos de ação no infinitivo e conceitos compostos
- Ignore artigos isolados e palavras genéricas sem contexto
- Identifique conceitos que representam a essência e propósito da empresa
- Expressões devem ser relevantes para uma declaração de missão
- Não repita expressões entre as categorias

FORMATO JSON OBRIGATÓRIO:
{
  "frequent": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"],
  "impactful": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"]
}`;

const VISION_SYSTEM_PROMPT = `Você é um especialista em análise de texto, cultura organizacional e planejamento estratégico.

CONTEXTO FUNDAMENTAL:
- Visão é ONDE a empresa quer chegar
- Visão direciona o negócio e posiciona estrategicamente o negócio
- Visão tem o poder de nichar o negócio
- A visão define o destino de longo prazo, não o como ou o quê

TAREFA: Analise as respostas do cliente e extraia expressões-chave relevantes para compor a visão da empresa.

CLASSIFICAÇÃO:
1. "frequent" - Expressões ou conceitos que aparecem múltiplas vezes nas respostas ou são recorrentes
2. "impactful" - Expressões com forte significado emocional, estratégico ou que representam o DNA da empresa
3. "direction" - Expressões que indicam a DIREÇÃO, DESEJO e SONHO de onde a empresa quer chegar (visão de longo prazo). Identifique padrões nas respostas que revelam aspirações, metas futuras, o destino desejado.
4. "niche" - Expressões que identificam o NICHO e SUBNICHO de mercado. Identifique padrões que revelam o segmento específico, público-alvo, área de atuação e especialização.
5. "positioning" - Expressões que revelam o POSICIONAMENTO ESTRATÉGICO e diferenciação da empresa. Identifique padrões que mostram como a empresa quer ser reconhecida, seu diferencial competitivo, sua proposta de valor única.

REGRAS:
- Extraia 4-6 expressões por categoria
- Use expressões-chave de 1 a 4 palavras que capturem a ideia ou conceito completo (ex: "10 mil empresas", "software de saúde pública", "empresas com propósito", "líder em inovação", "mais grandiosa", "comunidade global"). NÃO construa frases completas, mas garanta contexto suficiente para que a expressão faça sentido sozinha.
- Priorize substantivos, verbos de ação no infinitivo e conceitos compostos
- Ignore artigos isolados e palavras genéricas sem contexto
- Identifique conceitos que representam a essência e destino da empresa
- Expressões devem ser relevantes para uma declaração de visão
- Não repita expressões entre as categorias
- Para "direction": foque em expressões que expressam futuro, destino, sonho, ambição (ex: "até 2030", "referência mundial")
- Para "niche": foque em expressões que delimitam mercado, segmento, público (ex: "pequenas empresas", "saúde pública")
- Para "positioning": foque em expressões que diferenciam, posicionam, destacam (ex: "mais inovadora do Brasil", "líder regional")

FORMATO JSON OBRIGATÓRIO:
{
  "frequent": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"],
  "impactful": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"],
  "direction": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"],
  "niche": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"],
  "positioning": ["expressão 1", "expressão 2", "expressão 3", "expressão 4"]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'suggest-keywords', 50);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { answers, pillarType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from answers
    const answersText = Object.entries(answers)
      .filter(([_, value]) => value && typeof value === 'string' && value.trim())
      .map(([num, value]) => `Pergunta ${num}: ${value}`)
      .join('\n\n');

    const systemPrompt = pillarType === 'vision' ? VISION_SYSTEM_PROMPT : MISSION_SYSTEM_PROMPT;

    const userPrompt = `Analise as seguintes respostas de um cliente sobre a ${pillarType === 'mission' ? 'MISSÃO' : 'VISÃO'} da empresa e extraia expressões-chave relevantes.

RESPOSTAS DO CLIENTE:
${answersText}

Extraia as expressões-chave mais relevantes classificadas nas categorias especificadas.

Retorne APENAS o JSON no formato especificado.`;

    console.log("Calling Lovable AI for keyword suggestions...");
    console.log("Pillar type:", pillarType);
    console.log("Number of answers:", Object.keys(answers).length);

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", content);

    // Strip markdown code fences if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // Parse JSON response
    const keywords = JSON.parse(content.trim());
    
    // Validate structure
    if (!keywords.frequent || !keywords.impactful) {
      throw new Error("Invalid keywords structure");
    }

    console.log(`User ${rateLimitResult.userId} suggested keywords. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(JSON.stringify(keywords), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-keywords:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      frequent: [],
      impactful: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
