import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentIds } = await req.json();

    if (!assessmentIds || assessmentIds.length < 2) {
      return new Response(
        JSON.stringify({ error: 'É necessário pelo menos 2 avaliações para análise evolutiva' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch assessments with results
    const { data: assessments, error: fetchError } = await supabase
      .from('roip_assessments')
      .select(`
        id,
        overall_score,
        period_month,
        period_year,
        created_at,
        roip_results (pillar_scores, ai_analysis)
      `)
      .in('id', assessmentIds)
      .order('period_year', { ascending: true })
      .order('period_month', { ascending: true });

    if (fetchError) throw fetchError;

    // Prepare evolution data for AI analysis
    const evolutionData = assessments?.map((a: any) => {
      const results = Array.isArray(a.roip_results) ? a.roip_results[0] : a.roip_results;
      return {
        periodo: `${a.period_month}/${a.period_year}`,
        score_geral: a.overall_score,
        pilares: results?.pillar_scores || {},
      };
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um consultor especialista em gestão de pessoas e ROIP (Retorno sobre Investimento em Pessoas).
Analise a evolução dos diagnósticos ROIP fornecidos e gere insights acionáveis.

IMPORTANTE: Responda APENAS em JSON válido no formato especificado. Não inclua markdown, código ou texto adicional.`;

    const userPrompt = `Analise a evolução dos diagnósticos ROIP desta empresa:

${JSON.stringify(evolutionData, null, 2)}

Os 4 pilares do ROIP são:
- Retenção: Capacidade de manter talentos
- Cultura: Força e alinhamento cultural
- Atração: Capacidade de atrair talentos
- Resultados: Performance e produtividade

Forneça sua análise no seguinte formato JSON:
{
  "tendencia": "Descrição da tendência geral observada nos dados (1-2 frases)",
  "pontos_positivos": ["Ponto 1 sobre o que está melhorando", "Ponto 2", "Ponto 3"],
  "alertas": ["Alerta 1 sobre quedas ou áreas críticas", "Alerta 2"],
  "plano_acao": ["Ação prioritária 1 para o próximo mês", "Ação 2", "Ação 3"],
  "previsao": "Previsão de como estarão os indicadores se mantiver a tendência atual (1-2 frases)"
}`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erro ao gerar análise com IA');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, content);
      // Return a default structure if parsing fails
      analysis = {
        tendencia: "Não foi possível analisar a tendência automaticamente.",
        pontos_positivos: [],
        alertas: ["Erro ao processar análise. Tente novamente."],
        plano_acao: [],
        previsao: "Análise indisponível."
      };
    }

    console.log('Evolution analysis generated successfully');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-roip-evolution-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
