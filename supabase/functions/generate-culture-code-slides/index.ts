import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('generate-culture-code-slides');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'generate-culture-code-slides', 50);
  
  if (!rateLimitResult.userId) {
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { companyHistory, cultureData, structure } = await req.json();
    
    log.log('Generating culture code slides...');
    log.log('Structure sections:', structure?.sections?.length);
    log.log('User ID:', rateLimitResult.userId, 'Remaining calls:', rateLimitResult.remaining);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é o Guilherme Guimarães da EP+, especialista em:
- Copywriting e storytelling emocional
- Apresentações impactantes e narrativas visuais
- Cultura Organizacional e transformação empresarial

TOM DE VOZ FIXO:
- INSPIRACIONAL: Frases que motivam e elevam
- EMOCIONAL: Conecta com sentimentos e valores humanos
- FILOSÓFICO: Reflexões profundas sobre propósito e existência

REGRAS DE FORMATAÇÃO INEGOCIÁVEIS:

**SLIDES REGULARES (maioria):**
- Ideal: 2 linhas por slide
- Máximo absoluto: 3 linhas
- Frases curtas, poderosas, impactantes
- Um pensamento/conceito por slide
- Evite bullet points - use frases completas

**EXCEÇÕES (podem ter mais linhas):**
- Slides de VALORES: Nome + Mantra + Como Vivemos (3-5 itens) + Como NÃO Vivemos (3-5 itens)
- 5 Pilares Operacionais: Conteúdo completo em 1 slide cada

TÉCNICAS DE STORYTELLING:
- Perguntas retóricas que provocam reflexão
- Contrastes filosóficos (antes/depois, mundo comum/nosso mundo)
- Metáforas e analogias poderosas
- Vulnerabilidade autêntica
- Repetição estratégica

Retorne APENAS um JSON válido com array de slides:
{
  "slides": [
    {
      "id": "slide-1",
      "sectionId": "abertura",
      "slideNumber": 1,
      "title": "TODO FILME TEM UM CÓDIGO",
      "body": ["Matrix tinha a pílula azul e a vermelha.", "E você? Qual é o SEU código?"],
      "type": "regular"
    },
    {
      "id": "slide-valor-1",
      "sectionId": "valores",
      "slideNumber": 25,
      "title": "RESULTADO",
      "body": [],
      "type": "value",
      "valueData": {
        "mantra": "Fazemos acontecer",
        "dos": ["Entregamos o que prometemos", "Medimos nosso sucesso"],
        "donts": ["Evitamos desculpas", "Não aceitamos mediocridade"]
      }
    }
  ]
}`;

    const valuesText = cultureData?.values?.map((v: any, i: number) => 
      `Valor ${i + 1}: ${v.label}
   - Como Vivemos: ${v.dos?.join('; ') || 'Não definido'}
   - Como NÃO Vivemos: ${v.donts?.join('; ') || 'Não definido'}`
    ).join('\n') || 'Não definidos';

    const indicatorsText = Object.entries(cultureData?.indicatorsByPerspective || {})
      .map(([perspective, indicators]: [string, any]) => 
        `${perspective}: ${Array.isArray(indicators) ? indicators.join(', ') : 'Nenhum'}`
      ).join('\n') || 'Não definidos';

    const projectsText = cultureData?.projects?.map((p: any) => 
      `- ${p.name} (${p.perspective})${p.responsible ? ` - Resp: ${p.responsible}` : ''}`
    ).join('\n') || 'Não definidos';

    const decisionText = Object.entries(cultureData?.decisionAnswers || {})
      .map(([q, answers]: [string, any]) => 
        `Pergunta ${q}: ${Array.isArray(answers) ? answers.join('; ') : answers}`
      ).join('\n') || 'Não definidas';

    const userPrompt = `ESTRUTURA APROVADA:
${JSON.stringify(structure?.sections, null, 2)}

HISTÓRIA DA EMPRESA:
${companyHistory || 'Não fornecida - crie uma narrativa baseada nos dados culturais'}

DADOS CULTURAIS COMPLETOS:

EMPRESA: ${cultureData?.companyName || 'Não informado'}

MISSÃO: ${cultureData?.mission || 'Não definida'}

VISÃO: ${cultureData?.vision || 'Não definida'}

VALORES:
${valuesText}

INDICADORES ESTRATÉGICOS:
${indicatorsText}

PROJETOS ESTRATÉGICOS:
${projectsText}

RITUAIS DE ENERGIA:
${cultureData?.energyRituals?.join(', ') || 'Não definidos'}

RITUAIS DE DESENVOLVIMENTO:
${cultureData?.developmentRituals?.join(', ') || 'Não definidos'}

TOMADA DE DECISÃO:
${decisionText}

Gere TODOS os slides seguindo a estrutura aprovada. Cada slide deve ter:
- id único (ex: "slide-1", "slide-2")
- sectionId correspondente à seção
- slideNumber sequencial
- title (título do slide)
- body (array de linhas - máx 3 para regulares)
- type ("regular", "value", ou "pillar")
- valueData (apenas para type "value")`;

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
    
    log.log('Raw AI response length:', content?.length);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const result = JSON.parse(content);
    
    log.log('Generated slides count:', result?.slides?.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error generating slides:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
