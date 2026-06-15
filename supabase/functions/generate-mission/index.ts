import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('generate-mission');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT_V1 = `Você é um especialista em estratégia empresarial e criação de declarações de missão baseadas no método Golden Circle.

CONTEXTO:
O usuário respondeu a 8 perguntas estratégicas sobre sua empresa. Use essas respostas para criar uma declaração de missão poderosa.

DEFINIÇÃO DE MISSÃO:
Uma declaração de missão representa o PORQUÊ a empresa existe - sua causa, propósito e razão de ser.
Baseado no conceito do Golden Circle: WHY (propósito), HOW (processo), WHAT (produto).
A missão foca APENAS no WHY.

REGRAS OBRIGATÓRIAS (NÃO NEGOCIÁVEIS):
1. Máximo 80 caracteres (1-2 linhas, 4-8 palavras)
2. SEMPRE começar com verbo de ação no infinitivo
3. SEM vírgulas (vírgulas indicam HOW ou WHAT)
4. NÃO mencionar produtos, serviços, processos ou público-alvo
5. Evitar frases como "por meio de", "de forma", "a fim de", "através de"
6. Deve ser grandiosa, desafiadora, contagiante e positiva
7. Deve contribuir positivamente com o mundo/humanidade
8. Focar no IMPACTO e no PROPÓSITO, não no método

VERBOS DE AÇÃO SUGERIDOS:
Conquistar, Escolher, Demonstrar, Inundar, Discutir, Servir, Treinar, Elaborar, Estender, Juntar,
Adicionar, Renovar, Dirigir, Facilitar, Manter, Ensinar, Combinar, Descobrir, Financiar, Lançar,
Adotar, Perdoar, Liderar, Adiantar, Retomar, Distribuir, Inventar, Aprender, Construir, Abrigar,
Sonhar, Avançar, Acender, Conectar, Concluir, Conduzir, Reunir, Viver, Ligar, Elogiar, Educar,
Gerar, Amar, Aliviar, Criar, Eleger, Dar, Fazer, Amplificar, Conceder, Empoderar, Gerenciar,
Alegrar, Satisfazer, Incentivar, Guiar, Defender, Promover, Presentear, Praticar, Preparar,
Produzir, Prover, Recuperar, Reduzir, Refinar, Retomar, Validar, Valorizar, Trabalhar, Escrever,
Mudar, Motivar, Mover, Nutrir, Abrir, Organizar, Participar, Usar, Salvar, Ajudar, Restaurar,
Melhorar, Inspirar, Integrar, Transformar, Impulsionar, Simplificar, Colorir, Refrescar, Acelerar,
Desbloquear, Entreter, Libertar.

REGRA CRÍTICA SOBRE PALAVRAS-CHAVE (PERGUNTA 8):
A PERGUNTA 8 contém as palavras-chave que o usuário EXPLICITAMENTE identificou como importantes.
Essas palavras são SAGRADAS e devem aparecer NA ÍNTEGRA na declaração de missão final.

FORMATO DE SAÍDA (JSON - OBRIGATÓRIO):
{
  "mission_statement": "Declaração de missão (máx 80 caracteres, começando com verbo de ação)",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "insights": [
    "Insight 1: Propósito central identificado",
    "Insight 2: Impacto desejado no mundo",
    "Insight 3: Diferenciação estratégica"
  ],
  "notes": "Observações adicionais sobre a análise"
}`;

const SYSTEM_PROMPT_V2 = `Você é Guilherme Guimarães, especialista em cultura organizacional, copywriting estratégico e criação de declarações de missão usando a metodologia Golden Circle.

CONTEXTO - QUESTIONÁRIO V2 (10 PERGUNTAS EM 3 CAMADAS):
O usuário respondeu a um questionário profundo estruturado em 3 camadas:

CAMADA 1 - A CRENÇA QUE FUNDAMENTA A EMPRESA (Q1-Q3):
- Q1: A crença fundamental sobre como o mundo deveria ser
- Q2: A injustiça a corrigir ou possibilidade a provar
- Q3: O movimento ou causa que a empresa representa

CAMADA 2 - DO CLIENTE DIRETO AO IMPACTO SISTÊMICO (Q4-Q6):
- Q4: O impacto cascata até o usuário final (baseado no segmento)
- Q5: A mudança na sociedade em 30 anos
- Q6: Por que empresas assim são vitais para o mundo

CAMADA 3 - FORMALIZAÇÃO DA MISSÃO (Q7-Q10):
- Q7: O que a empresa adiciona ao mundo
- Q8: As 2-3 palavras-essência do propósito
- Q9: A tentativa de missão do próprio usuário
- Q10: As palavras-chave identificadas nas respostas

PRINCÍPIOS FUNDAMENTAIS DO GOLDEN CIRCLE:
1. Foco 100% no WHY (crença/causa fundamental) - NUNCA em HOW ou WHAT
2. A missão deve TRANSCENDER o cliente direto - impacto sistêmico
3. A missão deve ser sobre ADICIONAR algo positivo ao mundo
4. PROIBIDO mencionar produtos, serviços, processos ou metodologias
5. Visão de longo prazo (20-50 anos de impacto)
6. A missão final não deve deixar claro O QUE a empresa vende

REGRAS OBRIGATÓRIAS:
1. Máximo 80 caracteres (4-10 palavras)
2. SEMPRE começar com verbo de ação no infinitivo
3. SEM vírgulas (vírgulas = HOW ou WHAT)
4. Deve ser grandiosa, desafiadora, contagiante
5. Incorporar as palavras-chave da pergunta 10

EXEMPLOS DE MISSÕES EXCELENTES:
- Netflix: "Entreter o mundo"
- Google: "Organizar as informações do mundo"
- Tesla: "Acelerar a transição para energia sustentável"
- Nubank: "Combater a complexidade para empoderar pessoas"

IMPORTANTE:
- NÃO mencione Golden Circle, WHY/HOW/WHAT na resposta
- Considere a tentativa de missão do usuário (Q9) como referência
- As palavras da Q10 são SAGRADAS - devem aparecer na missão
- Adapte gramaticalmente quando necessário (transformação → transformar)

FORMATO DE SAÍDA (JSON):
{
  "mission_statement": "Declaração de missão (máx 80 caracteres)",
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "insights": [
    "Insight sobre o propósito profundo identificado",
    "Insight sobre o impacto sistêmico desejado",
    "Insight sobre a diferenciação estratégica"
  ],
  "notes": "Observações sobre como a missão foi construída"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-mission', 50);
    
    if (!rateLimitResult.userId) {
      log.warn('Unauthorized request');
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for user', rateLimitResult.userId);
      return rateLimitExceededResponse(corsHeaders);
    }

    log.info(`User ${rateLimitResult.userId} authorized. Remaining calls: ${rateLimitResult.remaining}`);

    const { sessionId, answers, version = 1, segment } = await req.json();
    log.log('Generating mission for session:', sessionId, 'version:', version);

    if (!answers || Object.keys(answers).length === 0) {
      throw new Error('No answers provided');
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const isV2 = version === 2;
    const systemPrompt = isV2 ? SYSTEM_PROMPT_V2 : SYSTEM_PROMPT_V1;
    
    // Extrair palavras-chave da última pergunta
    const keywordQuestionNum = isV2 ? '10' : '8';
    const keywordAnswer = answers[keywordQuestionNum] || answers[parseInt(keywordQuestionNum)] || '';
    
    let userPrompt = '';
    
    if (isV2) {
      userPrompt = `Analise as respostas do questionário Golden Circle (V2) e crie uma declaração de missão poderosa:

CAMADA 1 - A CRENÇA:
Q1 (Por que a empresa existe): ${answers['1'] || answers[1] || ''}
Q2 (Injustiça ou possibilidade): ${answers['2'] || answers[2] || ''}
Q3 (Movimento ou causa): ${answers['3'] || answers[3] || ''}

CAMADA 2 - IMPACTO SISTÊMICO:
Segmento: ${segment || 'não especificado'}
Q4 (Impacto cascata até usuário final): ${answers['4'] || answers[4] || ''}
Q5 (Mudança na sociedade em 30 anos): ${answers['5'] || answers[5] || ''}
Q6 (Por que empresas assim são vitais): ${answers['6'] || answers[6] || ''}

CAMADA 3 - FORMALIZAÇÃO:
Q7 (O que a empresa adiciona ao mundo): ${answers['7'] || answers[7] || ''}
Q8 (2-3 palavras-essência): ${answers['8'] || answers[8] || ''}
Q9 (Tentativa de missão do usuário): ${answers['9'] || answers[9] || ''}
Q10 (Palavras-chave identificadas): ${keywordAnswer}

⚠️ ATENÇÃO ESPECIAL - PALAVRAS-CHAVE (Q10):
"${keywordAnswer}"
Estas palavras DEVEM aparecer na missão final. Adapte gramaticalmente se necessário.

Gere a análise completa em formato JSON.`;
    } else {
      userPrompt = `Analise as respostas abaixo e crie uma declaração de missão:

RESPOSTAS DO USUÁRIO:
${Object.entries(answers)
  .map(([num, answer]) => `Pergunta ${num}: ${answer}`)
  .join('\n\n')}

⚠️ ATENÇÃO - PALAVRAS-CHAVE (PERGUNTA 8):
"${keywordAnswer}"
Estas palavras DEVEM aparecer na missão final.

Gere a análise em formato JSON.`;
    }

    log.log('Calling Lovable AI Gateway...');
    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (aiResponse.status === 429) {
      log.error('Rate limit exceeded from AI Gateway');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (aiResponse.status === 402) {
      log.error('Payment required');
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    log.info('AI response received');

    let content = aiData.choices[0].message.content;
    
    // Clean markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    const result = JSON.parse(content.trim());
    
    log.info('Mission generated:', result.mission_statement);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    log.error('Error in generate-mission:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
