import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_PILLARS = [
  { number: 1, title: "História", description: "Quais são os marcos mais importantes da história da empresa que poderíamos contar?" },
  { number: 2, title: "Convidados", description: "Quem poderíamos convidar para o evento?" },
  { number: 3, title: "Brindes e Sorteios", description: "O que podemos dar de brinde ou sortear durante o evento?" },
  { number: 4, title: "Artefatos", description: "Representações visíveis que simbolizam a cultura da empresa. Incluem símbolos visuais, políticas, rituais, dresscode, espaços físicos, linguagem, ferramentas e materiais." },
  { number: 5, title: "Experiência", description: "O que vamos fazer para aumentar a experiência durante e após o evento? (Vídeos, welcome Coffee, happy hour)" },
  { number: 6, title: "Dinâmicas de Energia", description: "Como promovemos energia antes, durante e depois do evento?" },
  { number: 7, title: "Local do Evento", description: "Quais locais poderíamos executar o evento?" },
  { number: 8, title: "Multiplicadores", description: "Quem seriam nossos embaixadores da nossa cultura?" },
  { number: 9, title: "Final Emocional", description: "Como podemos terminar nosso momento o mais emocional possível?" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-event-suggestions', 50);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { pillarNumber, eventFormat, cultureContext } = await req.json();

    const pillar = EVENT_PILLARS.find(p => p.number === pillarNumber);
    if (!pillar) {
      throw new Error('Pilar inválido');
    }

    // Build culture context string
    let cultureInfo = '';
    
    if (cultureContext.mission?.statement) {
      cultureInfo += `\n\nMISSÃO DA EMPRESA:\n${cultureContext.mission.statement}`;
    }
    
    if (cultureContext.vision?.inspirational) {
      cultureInfo += `\n\nVISÃO DA EMPRESA:\n${cultureContext.vision.inspirational}`;
      if (cultureContext.vision.measurable) {
        cultureInfo += `\nVisão Mensurável: ${cultureContext.vision.measurable}`;
      }
    }
    
    if (cultureContext.values && cultureContext.values.length > 0) {
      cultureInfo += `\n\nVALORES DA EMPRESA:`;
      cultureContext.values.forEach((v: any) => {
        cultureInfo += `\n- ${v.label}`;
        if (v.dos?.length > 0) cultureInfo += ` (O que fazemos: ${v.dos.slice(0, 2).join(', ')})`;
      });
    }
    
    if (cultureContext.indicators && cultureContext.indicators.length > 0) {
      cultureInfo += `\n\nINDICADORES ESTRATÉGICOS:\n${cultureContext.indicators.join(', ')}`;
    }
    
    if (cultureContext.projects && cultureContext.projects.length > 0) {
      cultureInfo += `\n\nPROJETOS ESTRATÉGICOS:`;
      cultureContext.projects.forEach((p: any) => {
        cultureInfo += `\n- ${p.name} (${p.perspective})`;
      });
    }
    
    if (cultureContext.energyRituals && cultureContext.energyRituals.length > 0) {
      cultureInfo += `\n\nRITUAIS DE ENERGIA:\n${cultureContext.energyRituals.join(', ')}`;
    }
    
    if (cultureContext.developmentRituals && cultureContext.developmentRituals.length > 0) {
      cultureInfo += `\n\nRITUAIS DE DESENVOLVIMENTO:\n${cultureContext.developmentRituals.join(', ')}`;
    }
    
    if (cultureContext.decisionCriteria && cultureContext.decisionCriteria.length > 0) {
      cultureInfo += `\n\nCRITÉRIOS DE DECISÃO:`;
      cultureContext.decisionCriteria.forEach((d: any) => {
        if (d.answers?.length > 0) {
          cultureInfo += `\n- ${d.question}: ${d.answers.join('; ')}`;
        }
      });
    }

    const systemPrompt = `Você é um especialista em eventos de comunicação de cultura organizacional.
Sua função é sugerir ideias para cada pilar do evento de cultura, sempre baseado no contexto da cultura que a empresa construiu.

REGRAS IMPORTANTES:
- Suas sugestões DEVEM ser personalizadas com base na cultura da empresa (missão, visão, valores, etc.)
- Adapte as sugestões ao formato do evento (${eventFormat === 'presencial' ? 'PRESENCIAL - evento físico' : eventFormat === 'online' ? 'ONLINE - evento virtual' : 'HÍBRIDO - combinação presencial e virtual'})
- Seja criativo, mas prático e executável
- Nunca imponha, apenas sugira
- Use a linguagem e os valores da empresa nas sugestões
- Gere entre 3 e 5 sugestões específicas e únicas

CONTEXTO DA CULTURA DA EMPRESA:${cultureInfo || '\n(Nenhum contexto de cultura disponível ainda - gere sugestões genéricas de alta qualidade)'}

FORMATO DO EVENTO: ${eventFormat === 'presencial' ? 'Presencial' : eventFormat === 'online' ? 'Online' : 'Híbrido'}

PILAR ATUAL: ${pillar.title}
DESCRIÇÃO: ${pillar.description}

Retorne as sugestões em formato JSON:
{
  "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3", ...]
}

Gere sugestões específicas e personalizadas para este pilar.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
          { role: 'user', content: `Gere ${eventFormat === 'online' ? '3-4' : '4-5'} sugestões criativas e personalizadas para o pilar "${pillar.title}" do evento de cultura.` }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';

    // Handle markdown-wrapped JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const parsed = JSON.parse(content);

    console.log(`User ${rateLimitResult.userId} generated event suggestions. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-event-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
