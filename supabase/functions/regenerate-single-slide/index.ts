import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('regenerate-single-slide');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideData {
  id: string;
  sectionId: string;
  slideNumber: number;
  title: string;
  body: string[];
  type: 'regular' | 'value';
  valueData?: {
    mantra?: string;
    dos?: string[];
    donts?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'regenerate-single-slide', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { slide, previousSlide, nextSlide, instruction, cultureData } = await req.json();

    log.log('Regenerating slide:', slide?.id);
    log.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um especialista em copywriting e cultura organizacional da EP Partners.

Sua tarefa é REGENERAR UM ÚNICO SLIDE de um Culture Code, mantendo a coerência com a narrativa.

## REGRAS DE FORMATAÇÃO:
- Slides REGULARES: máximo 2-3 linhas (ideal 2)
- Slides de VALORES: podem ter mais linhas (mantra + dos + donts)
- Tom: inspiracional, emocional, filosófico
- Use linguagem provocativa e memorável

## CONTEXTO:
${previousSlide ? `SLIDE ANTERIOR: "${previousSlide.title}" - ${previousSlide.body?.join(' | ')}` : 'Este é o primeiro slide ou início de seção'}
${nextSlide ? `PRÓXIMO SLIDE: "${nextSlide.title}" - ${nextSlide.body?.join(' | ')}` : 'Este é o último slide ou fim de seção'}

## DADOS DA CULTURA:
- Missão: ${cultureData?.mission || 'Não definida'}
- Visão: ${cultureData?.vision || 'Não definida'}  
- Valores: ${cultureData?.values?.join(', ') || 'Não definidos'}

## RESPOSTA:
Retorne um JSON válido com a estrutura:
${slide.type === 'value' ? `{
  "title": "Título do valor",
  "valueData": {
    "mantra": "Frase curta e marcante",
    "dos": ["Como vivemos 1", "Como vivemos 2", "Como vivemos 3"],
    "donts": ["Como NÃO vivemos 1", "Como NÃO vivemos 2", "Como NÃO vivemos 3"]
  }
}` : `{
  "title": "Título do slide",
  "body": ["Linha 1 do conteúdo", "Linha 2 do conteúdo"]
}`}`;

    const userPrompt = `Regenere este slide:

SEÇÃO: ${slide.sectionId}
TIPO: ${slide.type}
TÍTULO ATUAL: ${slide.title}
${slide.type === 'value' 
  ? `MANTRA ATUAL: ${slide.valueData?.mantra || 'Nenhum'}
DOS ATUAIS: ${slide.valueData?.dos?.join(', ') || 'Nenhum'}
DONTS ATUAIS: ${slide.valueData?.donts?.join(', ') || 'Nenhum'}`
  : `CORPO ATUAL: ${slide.body?.join(' | ')}`
}

${instruction ? `INSTRUÇÃO DO USUÁRIO: ${instruction}` : 'Gere uma nova versão criativa mantendo a essência.'}`;

    log.log('Calling Lovable AI to regenerate slide...');

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Insufficient credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const regeneratedContent = JSON.parse(content);

    const regeneratedSlide: Partial<SlideData> = {
      title: regeneratedContent.title || slide.title,
    };

    if (slide.type === 'value') {
      regeneratedSlide.valueData = {
        mantra: regeneratedContent.valueData?.mantra || '',
        dos: regeneratedContent.valueData?.dos || [],
        donts: regeneratedContent.valueData?.donts || [],
      };
      regeneratedSlide.body = [];
    } else {
      regeneratedSlide.body = regeneratedContent.body || [];
    }

    log.log('Slide regenerated successfully');

    return new Response(JSON.stringify({ regeneratedSlide }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error regenerating slide:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
