import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
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

    const { title, industry, language = 'pt-br', account_id } = await req.json();

    if (!title || title.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Título do cargo é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em recrutamento e mercado de trabalho brasileiro e internacional. 
Sua tarefa é gerar variações de títulos de cargo equivalentes que um candidato ideal pode ter no perfil do LinkedIn, currículo ou GitHub.

Regras:
- Gere entre 5 e 8 variações
- Inclua variações em português E inglês
- Considere abreviações comuns (ex: "Dev" para "Desenvolvedor")
- Considere hierarquias próximas (ex: "Coordenador" pode ser "Supervisor" em algumas empresas)
- NÃO inclua o título original na lista
- NÃO invente cargos que não existem no mercado
- Retorne APENAS os títulos, um por linha, sem numeração ou marcadores`;

    const userPrompt = `Cargo: "${title}"${industry ? `\nSetor: ${industry}` : ''}
\nGere variações equivalentes deste cargo no mercado de trabalho:`;

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              name: 'return_title_variations',
              description: 'Return equivalent job title variations',
              parameters: {
                type: 'object',
                properties: {
                  variations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of equivalent job titles',
                  },
                },
                required: ['variations'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_title_variations' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em instantes.' }),
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
      console.error('[title-variations] AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar variações' }),
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
        referenceType: 'hunting_generate_title_variations',
      }).catch((e) => console.error('[billing] title-variations error', e));
    }
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let variations: string[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        variations = (parsed.variations || [])
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 1 && v.toLowerCase() !== title.toLowerCase());
      } catch {
        console.error('[title-variations] Failed to parse tool response');
      }
    }

    // Fallback: parse from text content
    if (variations.length === 0) {
      const content = data.choices?.[0]?.message?.content || '';
      variations = content
        .split('\n')
        .map((line: string) => line.replace(/^[-\*\d.)\s]+/, '').trim())
        .filter((v: string) => v.length > 1 && v.toLowerCase() !== title.toLowerCase());
    }

    console.log(`[title-variations] Generated ${variations.length} variations for "${title}"`);

    return new Response(
      JSON.stringify({ success: true, variations: variations.slice(0, 8) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[title-variations] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
