import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('generate-behaviors');

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
    const rateLimitResult = await checkRateLimit(req, 'generate-behaviors', 50);
    
    if (!rateLimitResult.userId) {
      log.warn('Unauthorized request');
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for user', rateLimitResult.userId);
      return rateLimitExceededResponse(corsHeaders);
    }

    const { values, locale = 'pt-BR' } = await req.json();

    if (!values || !Array.isArray(values) || values.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Values array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch reference behaviors for the requested values
    const { data: references, error: dbError } = await supabase
      .from('behaviors_reference')
      .select('*')
      .eq('active', true);

    if (dbError) {
      log.error('Error fetching behavior references:', dbError);
    }

    // Build context with reference examples for each value
    let contextExamples = '';
    
    for (const value of values) {
      // Find matching reference (exact match or in aliases)
      const reference = references?.find(ref => 
        ref.value_label.toLowerCase() === value.toLowerCase() ||
        ref.value_aliases?.some((alias: string) => alias.toLowerCase() === value.toLowerCase())
      );

      if (reference) {
        contextExamples += `\n\n📚 EXEMPLOS DE REFERÊNCIA para "${value}":\n`;
        contextExamples += `\nCOMO VIVEMOS (exemplos):\n`;
        reference.dos.slice(0, 8).forEach((behavior: string, idx: number) => {
          contextExamples += `${idx + 1}. ${behavior}\n`;
        });
        contextExamples += `\nCOMO NÃO VIVEMOS (exemplos):\n`;
        reference.donts.slice(0, 8).forEach((behavior: string, idx: number) => {
          contextExamples += `${idx + 1}. ${behavior}\n`;
        });
      }
    }

    const systemPrompt = `Você é um especialista em cultura organizacional. Sua tarefa é gerar comportamentos práticos e específicos para valores organizacionais.

🎯 REGRA CRÍTICA: Os comportamentos devem ser EXCLUSIVAMENTE alinhados com o valor solicitado.

⚠️ NÃO misture conceitos de valores diferentes:
- Se o valor é RESULTADO: NÃO use comportamentos de comprometimento, senso de dono ou resiliência
- Se o valor é SENSO DE DONO: NÃO use comportamentos de resultado ou iniciativa  
- Se o valor é SATISFAÇÃO DO CLIENTE: NÃO use comportamentos de resultado ou senso de dono
- Se o valor é MELHORIA CONTÍNUA: NÃO use comportamentos de resultado ou inovação

Para cada valor fornecido, você deve criar:
- 10 comportamentos FAÇA (DOs): ações concretas que demonstram ESPECIFICAMENTE esse valor
- 10 comportamentos NÃO FAÇA (DON'Ts): ações que contradizem ESPECIFICAMENTE esse valor

Os comportamentos devem ser:
1. Específicos e observáveis
2. Práticos e aplicáveis no dia a dia
3. Claros e diretos
4. DIRETAMENTE relacionados ao valor em questão (não tangenciais)
5. Em linguagem ${locale === 'pt-BR' ? 'português brasileiro' : 'inglês'}

${contextExamples ? '📖 Use os exemplos de referência abaixo como INSPIRAÇÃO para manter a especificidade e evitar contaminação entre valores:' + contextExamples : ''}

Retorne APENAS um JSON válido no seguinte formato:
{
  "items": [
    {
      "value": "Nome do Valor",
      "dos": ["Comportamento 1", "Comportamento 2", ...],
      "donts": ["Comportamento 1", "Comportamento 2", ...]
    }
  ]
}`;

    const userPrompt = `Gere comportamentos ESPECÍFICOS para os seguintes valores organizacionais:\n${values.join(', ')}\n\nLembre-se: cada comportamento deve ser EXCLUSIVO para o valor indicado, sem misturar com outros valores.`;

    log.log('Calling AI for values:', values.join(', '));

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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
      log.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate behaviors');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.error('Failed to parse JSON from response:', content);
      throw new Error('Invalid AI response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    log.info(`User ${rateLimitResult.userId} generated behaviors. Remaining calls: ${rateLimitResult.remaining}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error in generate-behaviors function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
