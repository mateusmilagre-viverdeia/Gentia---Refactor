import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('analyze-mission');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYZER_PROMPT = `Você é um analista especializado em declarações de missão empresarial, usando critérios rigorosos baseados na metodologia Golden Circle.

CRITÉRIOS DE AVALIAÇÃO:

1. PROPÓSITO E CRENÇA (Peso 40%):
- A missão expressa uma crença profunda sobre o mundo?
- Há um propósito transformador além do lucro?
- A causa é grandiosa e inspiradora?

2. CLAREZA E FOCO (Peso 30%):
- A missão é clara e memorável?
- Evita menções a produtos, serviços ou processos?
- Começa com verbo de ação no infinitivo?
- Tem tamanho adequado (até 80 caracteres)?

3. IMPACTO TRANSCENDENTE (Peso 30%):
- A missão transcende o cliente direto?
- Indica contribuição positiva para o mundo/sociedade?
- Tem visão de longo prazo (20-50 anos)?

PENALIDADES:
- Menções a produtos/serviços: -15 pontos
- Menções a processos/metodologias: -10 pontos
- Uso de vírgulas (indica HOW/WHAT): -5 pontos
- Tamanho:
  * Até 80 caracteres: sem penalidade
  * 81-120 caracteres: -10 pontos
  * 121-160 caracteres: -20 pontos
  * Acima de 160: -30 pontos

FORMATO DE SAÍDA (JSON OBRIGATÓRIO):
{
  "score": 85,
  "diagnosis": "Análise detalhada da missão em 2-3 frases, explicando pontos fortes e fracos.",
  "pillars": {
    "purpose": { 
      "rating": "Forte", 
      "explanation": "Explicação de 1 frase sobre o propósito" 
    },
    "clarity": { 
      "rating": "Médio", 
      "explanation": "Explicação de 1 frase sobre a clareza" 
    },
    "impact": { 
      "rating": "Forte", 
      "explanation": "Explicação de 1 frase sobre o impacto" 
    }
  },
  "lengthFeedback": "Feedback específico sobre o tamanho da missão",
  "recommendations": [
    "Sugestão específica de melhoria 1",
    "Sugestão específica de melhoria 2"
  ],
  "benchmarks": "Comparação breve com missões de empresas conhecidas (Netflix, Tesla, Google)"
}

IMPORTANTE:
- Ratings possíveis: "Forte", "Médio", "Fraco"
- Score de 0 a 100
- Seja específico e construtivo nas recomendações
- Considere o contexto das respostas do usuário na análise`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'analyze-mission', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { missionStatement, answers, segment } = await req.json();
    console.log('📊 Analyzing mission:', missionStatement);
    console.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    if (!missionStatement) {
      throw new Error('No mission statement provided');
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const answersContext = answers ? Object.entries(answers)
      .map(([num, answer]) => `Q${num}: ${answer}`)
      .join('\n') : '';

    const userPrompt = `Analise a seguinte declaração de missão:

MISSÃO: "${missionStatement}"

TAMANHO: ${missionStatement.length} caracteres

${answersContext ? `CONTEXTO DAS RESPOSTAS DO QUESTIONÁRIO:
${answersContext}` : ''}

${segment ? `SEGMENTO DO NEGÓCIO: ${segment}` : ''}

Avalie rigorosamente usando os critérios estabelecidos e retorne a análise em formato JSON.`;

    console.log('🤖 Calling Lovable AI Gateway for analysis...');
    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ANALYZER_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (aiResponse.status === 429) {
      console.error('❌ Rate limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (aiResponse.status === 402) {
      console.error('❌ Payment required');
      return new Response(
        JSON.stringify({ error: 'Payment required' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ Analysis response received');

    let content = aiData.choices[0].message.content;
    
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    const result = JSON.parse(content.trim());
    
    console.log('📊 Analysis complete, score:', result.score);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in analyze-mission:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
