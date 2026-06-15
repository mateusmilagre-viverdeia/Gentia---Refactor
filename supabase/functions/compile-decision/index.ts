import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é especialista em cultura organizacional e frameworks de tomada de decisão.

TAREFA: Consolidar as respostas das 7 perguntas sobre tomada de decisão em uma ÚNICA LISTA de diretrizes concisas.

CONTEXTO DAS PERGUNTAS:
1. Comportamentos intoleráveis na empresa
2. Regras fundamentais da empresa
3. Considerações para tomar decisões
4. Critérios de contratação
5. Critérios de demissão
6. Critérios de promoção
7. Processo geral de decisão

REGRAS IMPORTANTES:
- Gere de 5 a 10 diretrizes finais (nunca mais que 10)
- ELIMINE redundâncias - muitas respostas serão similares ou repetidas
- AGRUPE conceitos relacionados (ex: "valores", "cultura", "visão" = 1 único item)
- Comece cada diretriz com verbo ou frase de ação
- Frases CURTAS e diretas (máximo 12 palavras cada)
- PRIORIZE os conceitos mais citados nas respostas
- A lista deve representar "Como a empresa toma decisão" de forma completa

FORMATO DE RESPOSTA (JSON):
{
  "guidelines": [
    "Alinhados com nossa visão e valores",
    "Priorizando impacto positivo na cultura",
    "Contratando quem demonstra fit cultural",
    "Promovendo quem entrega resultados consistentes",
    "Demitindo quem viola comportamentos essenciais"
  ],
  "summary": "Frase resumo de 1 linha (máx 15 palavras) sobre como a empresa decide"
}

Responda APENAS com o JSON, sem texto adicional.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'compile-decision', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { answers, account_id } = await req.json();

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Respostas são obrigatórias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Compiling decision framework...');
    console.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    const questionTitles: Record<number, string> = {
      1: "Comportamentos Intoleráveis",
      2: "Regras da Empresa",
      3: "Considerações para Decisões",
      4: "Critérios de Contratação",
      5: "Critérios de Demissão",
      6: "Critérios de Promoção",
      7: "Processo de Decisão"
    };

    const groupedAnswers: Record<number, string[]> = {};
    for (const answer of answers) {
      const qNum = answer.question_number;
      if (!groupedAnswers[qNum]) {
        groupedAnswers[qNum] = [];
      }
      groupedAnswers[qNum].push(answer.answer_text);
    }

    let userPrompt = "Aqui estão as respostas das 7 perguntas sobre tomada de decisão:\n\n";
    for (let i = 1; i <= 7; i++) {
      const title = questionTitles[i];
      const qAnswers = groupedAnswers[i] || [];
      userPrompt += `**${i}. ${title}:**\n`;
      if (qAnswers.length > 0) {
        qAnswers.forEach(a => {
          userPrompt += `- ${a}\n`;
        });
      } else {
        userPrompt += `- (sem resposta)\n`;
      }
      userPrompt += "\n";
    }

    userPrompt += "\nConsolide essas respostas em uma lista única de diretrizes de tomada de decisão.";

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos à sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    if (account_id) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        await consumeAICredits({
          supabase,
          accountId: account_id,
          aiData: data,
          model: 'google/gemini-2.5-flash',
          referenceType: 'compile_decision',
          description: 'Consolidação de framework de decisão',
          userId: rateLimitResult.userId,
        });
      } catch (e) {
        console.error('[compile-decision] billing error', e);
      }
    }

    console.log('AI response:', content);

    let parsed;
    try {
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    if (!parsed.guidelines || !Array.isArray(parsed.guidelines)) {
      throw new Error('Formato de resposta inválido');
    }

    return new Response(
      JSON.stringify({
        guidelines: parsed.guidelines,
        summary: parsed.summary || 'Framework de tomada de decisão consolidado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compile-decision:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
