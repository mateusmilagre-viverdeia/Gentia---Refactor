import { createClient } from 'npm:@supabase/supabase-js@2';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, industry, location, companySize, account_id } = await req.json();

    if (!title || title.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Título do cargo é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em inteligência de mercado e recrutamento no Brasil.
Sua tarefa é sugerir empresas onde um profissional com o cargo informado provavelmente trabalha ou trabalhou.

Regras:
- Sugira entre 10 e 20 empresas REAIS que existem no mercado brasileiro
- Priorize empresas relevantes para o setor informado
- Inclua um mix de: grandes empresas, scale-ups, e empresas de referência no setor
- Para cada empresa, explique brevemente por que ela é relevante (1 frase)
- Considere a localização quando informada
- NÃO invente empresas fictícias`;

    const userPrompt = `Cargo: "${title}"${industry ? `\nSetor: ${industry}` : ''}${location ? `\nLocalização: ${location}` : ''}${companySize ? `\nPorte desejado: ${companySize}` : ''}

Sugira empresas onde esse profissional provavelmente trabalha:`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_company_suggestions',
              description: 'Return suggested target companies for hunting',
              parameters: {
                type: 'object',
                properties: {
                  companies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Company name' },
                        reason: { type: 'string', description: 'Why this company is relevant' },
                      },
                      required: ['name', 'reason'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['companies'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_company_suggestions' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos de IA insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[suggest-companies] AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao sugerir empresas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    if (account_id) {
      await consumeAICredits({
        supabase,
        accountId: account_id,
        model: 'google/gemini-3-flash-preview',
        aiData: data,
        referenceType: 'hunting_suggest_companies',
      }).catch((e) => console.error('[billing] suggest-companies error', e));
    }
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let companies: Array<{ name: string; reason: string }> = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        companies = (parsed.companies || []).filter(
          (c: any) => c.name && c.name.trim().length > 0
        );
      } catch {
        console.error('[suggest-companies] Failed to parse tool response');
      }
    }

    console.log(`[suggest-companies] Suggested ${companies.length} companies for "${title}"`);

    return new Response(
      JSON.stringify({ success: true, companies: companies.slice(0, 20) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[suggest-companies] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
