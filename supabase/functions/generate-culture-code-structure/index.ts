import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('generate-culture-code-structure');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'generate-culture-code-structure', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { companyHistory, cultureData } = await req.json();
    
    log.log('Generating culture code structure...');
    log.log('Company name:', cultureData?.companyName);
    log.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é o Guilherme Guimarães da EP+, especialista em:
- Copywriting e storytelling emocional
- Apresentações impactantes e narrativas visuais
- Cultura Organizacional e transformação empresarial
- Criação de Culture Codes que inspiram e engajam

Seu objetivo é PLANEJAR a estrutura de uma apresentação de Culture Code (30-70 slides) baseada nos 8 pilares culturais fornecidos.

REGRAS DE ESTRUTURA:
1. A apresentação deve ter entre 30 e 70 slides
2. Deve seguir uma narrativa fluida usando Golden Circle (Why → How → What) + Jornada do Herói
3. Cada seção tem um propósito claro

SEÇÕES OBRIGATÓRIAS:
- ABERTURA (5-8 slides): Gancho emocional, provocação, por que esta empresa existe
- HISTÓRIA (8-15 slides): Jornada da empresa, chamado à aventura, desafios enfrentados
- MISSÃO (5-8 slides): Build-up + revelação da missão
- VISÃO (3-5 slides): Destino e meta
- VALORES (1 slide por valor): Cada valor com mantra + Como Vivemos/NÃO Vivemos
- 5 PILARES OPERACIONAIS (5 slides total): Energia, Desenvolvimento, Projetos, Indicadores, Decisão
- FECHAMENTO (5-8 slides): Reflexão, call-to-action, quem pertence aqui

Retorne APENAS um JSON válido com esta estrutura:
{
  "sections": [
    {
      "id": "abertura",
      "name": "Abertura",
      "description": "Descrição breve do que será abordado",
      "estimatedSlides": 6
    }
  ],
  "totalSlides": 45,
  "notes": "Observações sobre a estrutura proposta"
}`;

    const userPrompt = `HISTÓRIA DA EMPRESA:
${companyHistory || 'Não fornecida'}

DADOS CULTURAIS:
- Empresa: ${cultureData?.companyName || 'Não informado'}
- Missão: ${cultureData?.mission || 'Não definida'}
- Visão: ${cultureData?.vision || 'Não definida'}
- Valores: ${cultureData?.values?.map((v: any) => v.label).join(', ') || 'Não definidos'}
- Indicadores: ${Object.values(cultureData?.indicatorsByPerspective || {}).flat().length || 0} indicadores
- Projetos: ${cultureData?.projects?.length || 0} projetos
- Rituais de Energia: ${cultureData?.energyRituals?.length || 0} rituais
- Rituais de Desenvolvimento: ${cultureData?.developmentRituals?.length || 0} rituais
- Decisões: ${Object.keys(cultureData?.decisionAnswers || {}).length || 0} perguntas respondidas

Analise os dados e proponha a estrutura da apresentação em JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Insufficient credits. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
    log.log('Raw AI response:', content);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const structure = JSON.parse(content);
    
    log.log('Parsed structure:', structure);

    return new Response(JSON.stringify(structure), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error generating structure:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
