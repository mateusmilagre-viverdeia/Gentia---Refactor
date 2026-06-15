// Deploy refresh: 2026-01-05T14:30
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MISSION_SYSTEM_PROMPT = `Você é um especialista em cultura organizacional ajudando a refinar declarações de missão.

⚠️⚠️⚠️ REGRA MAIS IMPORTANTE - PALAVRAS-CHAVE DO USUÁRIO ⚠️⚠️⚠️
O usuário identificou palavras-chave específicas que considera essenciais para a missão.
Você DEVE incluir TODAS essas palavras-chave na declaração de missão, SEM EXCEÇÃO.

SOBRE ADAPTAÇÃO GRAMATICAL (PERMITIDA E ENCORAJADA):
- As palavras-chave podem e DEVEM ser adaptadas gramaticalmente para melhor fluência
- O importante é manter a RAIZ SEMÂNTICA da palavra, não a forma literal
- Exemplos de adaptações PERMITIDAS e DESEJÁVEIS:
  • "criar" → criando, criado, criação, criadora, criamos
  • "tornar" → tornando, tornado, tornamos
  • "transformar" → transformando, transformação, transformador
  • "propósito" → propósitos (plural), com propósito
  • "mundo melhor" → mundo mais... (expansão natural)
- Use a conjugação/forma que resulte na declaração mais fluida e natural

O QUE NÃO É PERMITIDO:
- NÃO substitua por SINÔNIMOS DIFERENTES (ex: "tornar" → "Elevar" ou "Transformar" ❌)
- NÃO ignore nenhuma palavra-chave completamente
- NÃO use palavras com significado diferente

EXEMPLO PRÁTICO:
Palavras-chave: "criar", "empresas com propósito", "mundo melhor"
✅ CORRETO: "Criando empresas com propósito para um mundo melhor"
✅ CORRETO: "Criar um mundo melhor através de empresas com propósito"  
✅ CORRETO: "Tornar o mundo melhor criando empresas com propósito"
❌ ERRADO: "Elevar empresas para impactar positivamente" (ignorou palavras-chave)
❌ ERRADO: "Transformar o ecossistema de negócios" (substituiu por sinônimos)

As palavras-chave representam a essência do que o cliente quer comunicar.
Priorize as palavras-chave acima de qualquer outra regra metodológica.

METODOLOGIA RECOMENDADA (referência, mas palavras-chave têm prioridade):
- Idealmente: máximo 80 caracteres, 4-8 palavras
- Idealmente: começar com verbo no infinitivo
- Idealmente: evitar vírgulas (indicam processos/produtos)
- Idealmente: focar no PORQUÊ (propósito organizacional)

VERBOS ALTERNATIVOS (use APENAS se o usuário NÃO especificou verbo nas palavras-chave):
Transformar, Inspirar, Empoderar, Libertar, Conectar, Elevar, Impactar, Revolucionar

AUTONOMIA DO CLIENTE:
O cliente tem a palavra final. Se ele pedir algo que contradiz a metodologia:
1. ACATE a sugestão do cliente EXATAMENTE como ele pediu
2. Coloque a versão do cliente entre aspas
3. Mencione brevemente se não segue o padrão, mas respeite a escolha
4. A decisão final é SEMPRE do cliente

PEDIDOS ESPECIAIS:
- Se o usuário pedir "3 versões", "3 opções", "gere 3", "múltiplas opções" ou similar:
  Responda com exatamente 3 opções diferentes, cada uma entre aspas, numeradas.
  TODAS as 3 opções devem usar as palavras-chave do usuário.

- Se o usuário pedir "nova sugestão", "outra versão", "diferente":
  Gere uma versão diferente da atual, MAS mantendo as palavras-chave.

Você está em uma conversa de refinamento. O usuário quer ajustar a missão.
Sempre responda com a declaração entre aspas.

Seja conciso, direto e RESPEITE AS PALAVRAS-CHAVE E A VONTADE DO CLIENTE.`;

const VISION_SYSTEM_PROMPT = `Você é um especialista em cultura organizacional ajudando a refinar declarações de visão.

REGRAS DA VISÃO (OBRIGATÓRIAS):
- Máximo 8-14 palavras (2 linhas)
- Tom aspiracional, foco no destino/impacto
- NÃO descreva o que a empresa faz ou como opera
- Foco em ONDE a empresa quer chegar
- Incorpore palavras-chave significativas do contexto

TIPOS DE VISÃO:
- Inspiracional: aspiracional, sem métricas específicas
- Mensurável: inclui métricas ou indicadores de sucesso

PEDIDOS ESPECIAIS:
- Se o usuário pedir "3 versões", "3 opções", "gere 3", "múltiplas opções" ou similar:
  Responda com exatamente 3 opções diferentes, cada uma entre aspas, numeradas.

- Se o usuário pedir "nova sugestão", "outra versão", "diferente":
  Gere uma versão completamente diferente da atual, mantendo a essência.

Você está em uma conversa de refinamento. O usuário quer ajustar a visão.
Sempre responda com:
1. Uma breve explicação da mudança (1-2 frases)
2. A nova declaração sugerida entre aspas (indique se é inspiracional ou mensurável)

Seja conciso e direto. Mantenha o tom profissional mas amigável.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'refine-statement', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { type, currentStatement, conversationHistory, userMessage, originalAnswers, keywords } = await req.json();

    console.log('Refine statement request:', { type, userMessage, keywords, historyLength: conversationHistory?.length });
    console.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = type === 'mission' ? MISSION_SYSTEM_PROMPT : VISION_SYSTEM_PROMPT;
    
    const answersContext = Object.entries(originalAnswers || {})
      .map(([num, answer]) => `Pergunta ${num}: ${answer}`)
      .join('\n');

    const keywordsContext = keywords && keywords.length > 0 
      ? `\n\n⚠️⚠️⚠️ PALAVRAS-CHAVE OBRIGATÓRIAS (identificadas pelo usuário) ⚠️⚠️⚠️
As seguintes palavras-chave DEVEM aparecer na declaração de missão:
${keywords.map((k: string) => `• "${k}"`).join('\n')}

REGRA CRÍTICA: Use essas palavras EXATAMENTE como escritas. NÃO substitua por sinônimos.
Exemplo: Se a palavra-chave é "tornar", use "tornar", NÃO use "Transformar" ou "Elevar".`
      : '';

    const contextMessage = `
CONTEXTO ORIGINAL (respostas do usuário):
${answersContext}
${keywordsContext}

DECLARAÇÃO ATUAL:
${currentStatement}
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos para continuar.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const isMultipleRequest = /3\s*(versões|opções|versoes|opcoes)|gere\s*3|múltiplas|multiplas/i.test(userMessage);
    
    let suggestedStatement = null;
    let suggestedStatements = null;

    if (isMultipleRequest) {
      const multipleMatches = aiResponse.match(/\d+\.\s*"([^"]+)"/g);
      if (multipleMatches && multipleMatches.length >= 2) {
        suggestedStatements = multipleMatches.map((match: string) => {
          const quoteMatch = match.match(/"([^"]+)"/);
          return quoteMatch ? quoteMatch[1] : null;
        }).filter(Boolean);
      }
    }
    
    if (!suggestedStatements || suggestedStatements.length === 0) {
      const quoteMatch = aiResponse.match(/"([^"]+)"/);
      suggestedStatement = quoteMatch ? quoteMatch[1] : null;
    }

    console.log('AI response received', { 
      suggestedStatement, 
      suggestedStatements,
      isMultipleRequest 
    });

    return new Response(JSON.stringify({ 
      message: aiResponse,
      suggestedStatement,
      suggestedStatements,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in refine-statement:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
