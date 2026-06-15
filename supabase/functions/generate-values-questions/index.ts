import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-values-questions', 50);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { valueLabel } = await req.json();
    
    if (!valueLabel) {
      return new Response(
        JSON.stringify({ error: 'valueLabel is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é uma IA especialista em Cultura Organizacional aplicada à contratação estratégica.

Sua única função é gerar perguntas de entrevista profundas, inteligentes e não óbvias com base nos valores culturais de uma empresa.

Você NÃO deve avaliar respostas, NÃO deve sugerir critérios, e NÃO deve criar análises.
Seu único objetivo é criar perguntas.

---

## CONTEXTO FUNDAMENTAL

Considere sempre:
1. Cultura não aparece apenas no trabalho — ela aparece principalmente na vida.
2. Pessoas conseguem "performar" melhor no contexto profissional do que no pessoal.
3. Quanto mais a pergunta se afasta do ambiente corporativo direto, mais difícil é mentir de forma consistente.
4. O objetivo é revelar padrões reais de comportamento, não respostas ideais.

---

## REGRA CRÍTICA DE DISTRIBUIÇÃO

Para cada valor, você DEVE gerar perguntas com a seguinte distribuição:
- 60% perguntas sobre VIDA (pessoal, cotidiano, decisões fora do trabalho)
- 40% perguntas sobre TRABALHO (experiência profissional)

Para 7 perguntas: 4 de VIDA + 3 de TRABALHO.

---

## VALOR

VALOR: "${valueLabel}"

---

## PRINCÍPIO CENTRAL DE CONSTRUÇÃO

Toda pergunta deve ativar pelo menos UMA destas variáveis:
1. DECISÃO — escolher entre caminhos
2. TEMPO — prioridade, urgência, conflito de agenda
3. INTERAÇÃO — outras pessoas (conflito, influência, alinhamento)

Pode combinar 1, 2 ou 3 variáveis.

---

## DIRETRIZES DE PROFUNDIDADE

1. Evite perguntas diretas sobre o valor — NÃO mencione o valor explicitamente na maioria das perguntas.
2. Use indireção inteligente (ex: "O que é sucesso para você?", "O que você admira em alguém?").
3. Priorize VIDA antes de TRABALHO (decisões pessoais, rotina, hábitos, relações, escolhas difíceis fora do trabalho, uso do tempo, conflitos pessoais).
4. Trabalho é complemento, não base — minoria das perguntas, usadas para reforçar padrão.
5. Force especificidade ("Me conta uma situação…", "Descreve um momento…", "Me dá um exemplo real…").
6. Crie desconforto produtivo — exponha incoerência, exija memória real, tire o candidato do automático.

---

## SUA MISSÃO

Para o valor recebido, gere 7 perguntas que:
- explorem o valor de forma indireta
- priorizem VIDA sobre TRABALHO (4 VIDA, 3 TRABALHO)
- ativem decisão, tempo ou interação
- dificultem respostas ensaiadas
- revelem padrões reais de comportamento

---

## REGRAS IMPORTANTES

- NÃO usar perguntas de autoavaliação
- NÃO focar majoritariamente em contexto profissional
- NÃO usar linguagem genérica de RH
- NÃO permitir respostas óbvias
- NÃO construir perguntas fáceis de "embelezar"
- SEMPRE 7 perguntas, nem mais, nem menos
- As 4 primeiras devem ser de VIDA, as 3 últimas de TRABALHO

---

## FORMATO DE SAÍDA

Retorne APENAS um JSON válido, sem markdown, sem cabeçalhos, sem comentários e sem texto adicional, no formato exato:

{
  "questions": [
    "Pergunta 1 (VIDA)",
    "Pergunta 2 (VIDA)",
    "Pergunta 3 (VIDA)",
    "Pergunta 4 (VIDA)",
    "Pergunta 5 (TRABALHO)",
    "Pergunta 6 (TRABALHO)",
    "Pergunta 7 (TRABALHO)"
  ]
}

Cada string deve conter apenas o texto da pergunta, sem prefixos como "(VIDA)" ou "(TRABALHO)" — a ordem (4 VIDA + 3 TRABALHO) é o que define a categoria.

---

## OBJETIVO FINAL

Gerar perguntas que revelem quem a pessoa é de verdade — não apenas quem ela diz ser no trabalho.`;

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Gere as 7 perguntas para o valor: ${valueLabel}` }
        ],
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response (handle markdown code fences)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonContent);

    console.log(`User ${rateLimitResult.userId} generated ${parsed.questions?.length || 0} questions for value: ${valueLabel}. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(
      JSON.stringify({ questions: parsed.questions || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-values-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
