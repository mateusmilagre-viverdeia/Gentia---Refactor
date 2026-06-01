import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('analyze-unique-ability');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  name: string;
  skill_score: number | null;
  value_score: number | null;
  total: number;
  trafficLight: 'red' | 'yellow' | 'green';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'analyze-unique-ability', 50);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { activities, analysisName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate statistics
    const scoredActivities = activities.filter((a: Activity) => 
      a.skill_score !== null && a.value_score !== null
    );
    
    const redActivities = scoredActivities.filter((a: Activity) => a.total <= 4);
    const yellowActivities = scoredActivities.filter((a: Activity) => a.total > 4 && a.total <= 6);
    const greenActivities = scoredActivities.filter((a: Activity) => a.total >= 7);

    const systemPrompt = `Você é um consultor especializado em gestão de tempo e produtividade executiva.
Seu objetivo é analisar as atividades de um líder/profissional e ajudá-lo a:
1. Identificar os "vilões do tempo" - atividades que roubam tempo sem gerar valor
2. Identificar as atividades de "habilidade única" - onde deve focar
3. Criar planos de ação práticos para liberar tempo

SISTEMA DE PONTUAÇÃO:
- Habilidade (1-4): 1=Incompetente, 2=Competente, 3=Excelente, 4=Habilidade Única
- Valor (1-4): 1=Sem retorno, 2=Baixo retorno, 3=Alto retorno financeiro, 4=Alto valor agregado
- Total = Habilidade + Valor (2-8 pontos)

SEMÁFORO:
- 🔴 PARE (≤4): Não é bom fazendo E não gera valor → DELEGAR/ELIMINAR urgente
- 🟡 ATENÇÃO (5-6): Faça rápido ou pare → OTIMIZAR ou DELEGAR
- 🟢 FOCO (≥7): Excelente E gera alto valor → PRIORIZAR (ideal ~20% das atividades)

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "summary": "Resumo executivo de 2-3 frases sobre a situação atual",
  "timeVillains": [
    {
      "activity": "nome da atividade",
      "recommendation": "ação específica (delegar para X, eliminar, terceirizar para Y)",
      "urgency": "alta|média|baixa"
    }
  ],
  "focusAreas": [
    {
      "activity": "nome da atividade",
      "reason": "por que deve focar aqui"
    }
  ],
  "actionPlan": {
    "immediate": ["ação 1 para essa semana", "ação 2"],
    "shortTerm": ["ação para esse mês"],
    "delegation": ["o que delegar e para quem/como"]
  },
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

    const activitiesDetails = scoredActivities.map((a: Activity) => 
      `- ${a.name}: Habilidade=${a.skill_score}, Valor=${a.value_score}, Total=${a.total} (${a.trafficLight === 'red' ? '🔴 PARE' : a.trafficLight === 'yellow' ? '🟡 ATENÇÃO' : '🟢 FOCO'})`
    ).join('\n');

    const userPrompt = `Analise as atividades da análise "${analysisName}":

ESTATÍSTICAS:
- Total de atividades: ${scoredActivities.length}
- 🔴 Atividades PARE (≤4): ${redActivities.length}
- 🟡 Atividades ATENÇÃO (5-6): ${yellowActivities.length}  
- 🟢 Atividades FOCO (≥7): ${greenActivities.length}
- % de atividades verdes: ${((greenActivities.length / scoredActivities.length) * 100).toFixed(0)}%

ATIVIDADES DETALHADAS:
${activitiesDetails}

Forneça uma análise completa com recomendações práticas e específicas.`;

    console.log("Calling Lovable AI for unique ability analysis...");

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }), {
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

    // Strip markdown code fences if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const analysis = JSON.parse(content);

    // Add statistics to the response
    const totalCount = scoredActivities.length;
    const result = {
      ...analysis,
      statistics: {
        totalActivities: totalCount,
        redCount: redActivities.length,
        yellowCount: yellowActivities.length,
        greenCount: greenActivities.length,
        redPercentage: Math.round((redActivities.length / totalCount) * 100),
        yellowPercentage: Math.round((yellowActivities.length / totalCount) * 100),
        greenPercentage: Math.round((greenActivities.length / totalCount) * 100),
        estimatedTimeFreed: redActivities.length >= 3 ? "10-15 horas/semana" : 
                           redActivities.length >= 1 ? "5-10 horas/semana" : "2-5 horas/semana"
      }
    };

    console.log(`User ${rateLimitResult.userId} analyzed unique ability. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-unique-ability:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao analisar atividades" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
