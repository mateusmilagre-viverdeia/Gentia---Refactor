import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('generate-vision');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em Cultura Organizacional e Planejamento Estratégico, focado em criar DECLARAÇÕES DE VISÃO EMPRESARIAL.

# CONTEXTO FUNDAMENTAL

## O que é Visão Empresarial?
Visão empresarial deve ser grandiosa, inspiradora e estratégica para:
- Guiar o planejamento estratégico da empresa
- Atrair e reter talentos alinhados com o propósito
- Dar direção, norte, destino e foco
- Posicionar estrategicamente a empresa no mercado

Visão é o que a empresa busca no FUTURO, é um DESTINO, é o "ONDE" a empresa quer chegar.
O poder da visão é que as pessoas ficam dispostas a apoiá-la quando percebem que ela converge com seus objetivos individuais.

## Tipos de Visão

1. **INSPIRACIONAL** (mais comum):
   - Não contém métricas
   - Busca inspirar e motivar as ações da empresa
   - Exemplos:
     * Amazon: "Ser a empresa mais centrada no cliente da terra"
       → Foco: cliente como prioridade absoluta (nichamento comportamental)
     * Harvard: "Ser referência em educação para líderes no mundo, para o benefício da humanidade"
       → Foco: especialização (líderes) + impacto global
     * Virtus: "Ser referência em qualidade e satisfação do cliente no ramo de GALPÕES"
       → Foco: especialista (não generalista) + diferenciação (não preço baixo)
     * Google: "Ser o buscador de maior prestígio e o mais importante do mundo"
     * Netflix: "Continuar sendo uma das empresas líderes da era do entretenimento na internet"
     * Meta: "Construir uma comunidade global e conectar o mundo"
     * Apple: "Fazer os melhores produtos do mundo e deixar o mundo melhor do que encontramos"

2. **MENSURÁVEL**:
   - Possui métrica quantificável
   - Define metas específicas e prazos
   - Exemplos:
     * "Levar saúde e beleza para 1MM de pessoas até 2025"
     * "Estar entre as 100 maiores construtoras do BR até 2026"
     * "Criar a mais grandiosa comunidade de empresas com propósito do Mundo - #Rumoàs10k"

# REGRAS OBRIGATÓRIAS PARA A DECLARAÇÃO DE VISÃO

## ❌ O QUE NÃO FAZER:
- NUNCA descrever "O QUE" a empresa faz (produtos/serviços)
- NUNCA descrever "COMO" a empresa opera (processos/métodos)
- NUNCA ultrapassar 2 linhas ou 14 palavras

## ✅ O QUE FAZER:
- Focar SEMPRE no "ONDE" a empresa quer chegar (destino/direção)
- Máximo de 2 linhas e **8 a 14 palavras NO TOTAL**
- Tom profissional, inspirador e estratégico
- Refletir o impacto que a empresa deseja causar no mundo

# PROCESSO DE ANÁLISE

## 1. Análise de Frequência e Significado:
- Analise TODAS as 10 respostas do cliente
- Identifique palavras que SE REPETEM ao longo das respostas
- Determine quais palavras têm MAIOR SIGNIFICADO estratégico para o cliente
- Essas palavras revelam os valores e direcionamentos mais importantes

## 2. Uso CRÍTICO das Palavras-Chave (Pergunta 10):
- Extraia TODAS as palavras-chave da pergunta 10 (sem limite de quantidade)
- Use o MÁXIMO POSSÍVEL destas palavras nas declarações de visão
- Permita adaptações gramaticais naturais:
  * Singular ↔ Plural (ex: "empresa" → "empresas")
  * Verbo ↔ Substantivo (ex: "criar" → "criação", "transformar" → "transformação")
  * Gênero (ex: "grandioso" → "grandiosa")
  * Tempo verbal (ex: "transformando" → "transformar")
- Priorize incorporação NATURAL e INSPIRADORA das palavras-chave

## 3. Imagem Mental (Pergunta 9):
- Use a imagem mental descrita para adicionar elementos visuais/emocionais à visão
- A imagem deve complementar as palavras-chave de forma coerente

## 4. Posicionamento Estratégico:
- Identifique se a empresa busca ser ESPECIALISTA (nicho específico) ou GENERALISTA
- Determine o diferencial competitivo (qualidade, inovação, cliente, preço, etc.)
- Reflita o nichamento e competitividade na declaração de visão

# FORMATO DE SAÍDA

Retorne um JSON puro (sem markdown) com:
- "vision_inspirational": string (8-14 palavras, sem métricas, inspiradora)
- "vision_measurable": string (8-14 palavras, com métrica ou meta quantificável)
- "keywords": array com TODAS as palavras-chave da pergunta 10
- "insights": array com 2-3 insights curtos sobre o perfil estratégico
- "notes": string com observação concisa sobre o posicionamento estratégico identificado

**LEMBRE-SE**: As declarações devem focar no IMPACTO que a empresa quer causar e no DESTINO que ela busca alcançar, não nas atividades que ela realiza.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-vision', 50);
    
    if (!rateLimitResult.userId) {
      log.warn('Unauthorized request');
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for user', rateLimitResult.userId);
      return rateLimitExceededResponse(corsHeaders);
    }

    log.info(`User ${rateLimitResult.userId} authorized. Remaining calls: ${rateLimitResult.remaining}`);

    const { sessionId, answers } = await req.json();

    log.log('Received request', { sessionId, answersCount: Object.keys(answers || {}).length });

    if (!answers || Object.keys(answers).length === 0) {
      throw new Error('Nenhuma resposta fornecida');
    }

    // Montar user prompt com as respostas
    const userPrompt = `# RESPOSTAS DO CLIENTE:

1. Segmento de negócio: ${answers[1] || 'Não informado'}
2. Principal produto/serviço: ${answers[2] || 'Não informado'}
3. Diferencial competitivo: ${answers[3] || 'Não informado'}
4. Problema que resolve: ${answers[4] || 'Não informado'}
5. Cliente ideal: ${answers[5] || 'Não informado'}
6. Valores fundamentais: ${answers[6] || 'Não informado'}
7. Objetivos de curto prazo: ${answers[7] || 'Não informado'}
8. Objetivos de longo prazo: ${answers[8] || 'Não informado'}
9. Imagem mental do futuro da empresa: ${answers[9] || 'Não informado'}
10. Palavras-chave que representam a essência da empresa: ${answers[10] || 'Não informado'}

# INSTRUÇÕES ADICIONAIS:
- Preste atenção especial às palavras que se repetem nas respostas acima
- As palavras da pergunta 10 devem ser PRIORIZADAS na construção da visão
- A imagem mental da pergunta 9 deve inspirar o tom emocional da visão
- Identifique o posicionamento estratégico (especialista vs generalista)

Agora, com base nessas informações, crie as duas declarações de visão (inspiracional e mensurável).`;

    log.log('Calling Lovable AI Gateway...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log.error('AI error', { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: 'Limite de requisições atingido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'Créditos do Lovable AI esgotados. Por favor, adicione créditos no workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro ao chamar IA: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    log.info('AI response received');

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta da IA vazia');
    }

    log.debug('Raw AI content:', content.substring(0, 200));

    // Remover markdown code blocks se existirem (```json ... ```)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    log.debug('Cleaned content:', cleanedContent.substring(0, 200));

    const parsedResult = JSON.parse(cleanedContent);
    log.info('JSON parsed successfully', { 
      hasInspirational: !!parsedResult.vision_inspirational,
      hasMeasurable: !!parsedResult.vision_measurable,
      keywordsCount: parsedResult.keywords?.length || 0
    });

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'processing_error', 
        message: error instanceof Error ? error.message : 'Erro ao processar análise' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
