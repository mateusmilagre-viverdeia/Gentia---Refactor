import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = createLogger("ai-generate-questions");

interface Driver {
  id: string;
  key: string;
  name: string;
  description: string;
  is_anonymous: boolean;
  default_emoji_set_id: string;
}

interface CompanyValue {
  key: string;
  name: string;
}

interface GeneratedQuestion {
  driver_id: string;
  driver_key: string;
  question_text: string;
  answer_type: 'emoji_scale' | 'multi_select';
  emoji_set_id: string | null;
  multi_select_source: string | null;
  is_anonymous: boolean;
  max_repeat_per_month: number;
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = "direct";
    
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      account_id, 
      driver_keys, 
      questions_per_driver = 3,
      include_culture_questions = true,
      language = 'pt-BR'
    } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log(`Generating questions for account ${account_id}`);
    log.log(`Driver keys: ${driver_keys?.join(', ') || 'all'}`);

    // Get drivers (default or filtered)
    let driversQuery = supabase
      .from('pulse_drivers')
      .select('*')
      .eq('is_active', true);

    // Include both default (account_id IS NULL) and custom drivers
    if (driver_keys && driver_keys.length > 0) {
      driversQuery = driversQuery.in('key', driver_keys);
    }

    const { data: drivers, error: driversError } = await driversQuery
      .or(`account_id.is.null,account_id.eq.${account_id}`);

    if (driversError || !drivers || drivers.length === 0) {
      log.error('Error fetching drivers:', driversError);
      return new Response(JSON.stringify({ error: 'Nenhum driver encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log(`Found ${drivers.length} drivers`);

    // Get company values if needed
    let companyValues: CompanyValue[] = [];
    if (include_culture_questions) {
      const { data: values } = await supabase
        .from('pulse_company_values')
        .select('key, name')
        .eq('account_id', account_id)
        .eq('is_active', true);
      
      companyValues = values || [];
    }

    // Build prompt for AI
    const driversInfo = drivers.map((d: Driver) => 
      `- ${d.key}: ${d.name} - ${d.description || 'Sem descrição'}`
    ).join('\n');

    const valuesInfo = companyValues.length > 0 
      ? `\nValores da empresa:\n${companyValues.map(v => `- ${v.name}`).join('\n')}`
      : '';

    const systemPrompt = `Você é um especialista em RH e engajamento organizacional. Sua tarefa é gerar perguntas para uma pesquisa de pulso diária.

REGRAS CRÍTICAS:
1. TODAS as perguntas devem ser FECHADAS (respondidas com escala de emoji ou múltipla escolha)
2. Perguntas devem ser CURTAS (máximo 15 palavras)
3. Perguntas devem ser respondíveis em até 20 segundos
4. Perguntas devem gerar insights ACIONÁVEIS para liderança
5. Use linguagem informal e amigável (você, sua)
6. Foque em sentimentos e percepções do DIA ATUAL
7. Evite perguntas genéricas ou muito abstratas
8. Cada pergunta deve ter um propósito claro de diagnóstico

TIPOS DE RESPOSTA:
- emoji_scale: Escala de 5 emojis (0-10), use para sentimentos e percepções
- multi_select: Seleção múltipla de valores da empresa, use APENAS para perguntas sobre cultura/valores

DRIVERS DISPONÍVEIS:
${driversInfo}
${valuesInfo}

FORMATO DE SAÍDA (JSON):
{
  "questions": [
    {
      "driver_key": "string",
      "question_text": "string",
      "answer_type": "emoji_scale" | "multi_select",
      "max_repeat_per_month": number (1-4),
      "tags": ["string"]
    }
  ]
}`;

    const userPrompt = `Gere ${questions_per_driver} perguntas para CADA um destes drivers: ${drivers.map((d: Driver) => d.key).join(', ')}.

Total esperado: ${drivers.length * questions_per_driver} perguntas.

Para o driver "culture_values", se houver valores da empresa cadastrados, inclua pelo menos 1 pergunta do tipo multi_select onde o colaborador seleciona quais valores viu sendo praticados.

Lembre-se:
- Perguntas sobre mood_energy, workload e work_environment são ANÔNIMAS
- Demais drivers são identificados (o colaborador é identificado)
- Foque no dia atual: "Hoje...", "Neste momento...", "Agora..."
- Varie o formato das perguntas (não comece todas igual)`;

    log.log('Calling AI to generate questions...');

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
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
        return new Response(JSON.stringify({ 
          error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes. Adicione créditos à sua conta.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao gerar perguntas com IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      log.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'Resposta da IA vazia' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log('AI response received, parsing...');

    // Parse JSON from AI response
    let parsed;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      log.error('Error parsing AI response:', parseError);
      log.error('Content:', content);
      return new Response(JSON.stringify({ 
        error: 'Erro ao processar resposta da IA',
        raw_response: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return new Response(JSON.stringify({ 
        error: 'Formato de resposta inválido',
        raw_response: parsed 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log(`Parsed ${parsed.questions.length} questions`);

    // Map driver keys to IDs and prepare questions for insertion
    const driverMap = new Map(drivers.map((d: Driver) => [d.key, d]));
    const questionsToInsert: any[] = [];

    for (const q of parsed.questions) {
      const driver = driverMap.get(q.driver_key) as Driver | undefined;
      if (!driver) {
        log.warn(`Driver not found: ${q.driver_key}`);
        continue;
      }

      questionsToInsert.push({
        account_id,
        driver_id: driver.id,
        question_text: q.question_text,
        answer_type: q.answer_type || 'emoji_scale',
        emoji_set_id: q.answer_type === 'emoji_scale' ? driver.default_emoji_set_id : null,
        multi_select_source: q.answer_type === 'multi_select' ? 'company_values' : null,
        is_anonymous: driver.is_anonymous,
        max_repeat_per_month: q.max_repeat_per_month || 2,
        is_active: false, // Start inactive for RH approval
        ai_generated: true,
        tags: q.tags || [],
        created_by_user_id: user.id,
      });
    }

    if (questionsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Nenhuma pergunta válida gerada',
        parsed_count: parsed.questions.length 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert questions
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('pulse_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      log.error('Error inserting questions:', insertError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar perguntas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log(`Successfully inserted ${insertedQuestions.length} questions`);

    return new Response(JSON.stringify({
      success: true,
      questions_generated: insertedQuestions.length,
      questions: insertedQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        driver_id: q.driver_id,
        answer_type: q.answer_type,
        is_anonymous: q.is_anonymous,
        is_active: q.is_active,
        ai_generated: q.ai_generated,
      })),
      message: 'Perguntas geradas com sucesso. Ative-as na página de administração.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error in ai-generate-questions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
