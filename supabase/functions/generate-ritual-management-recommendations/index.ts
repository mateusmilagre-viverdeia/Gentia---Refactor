import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANAGEMENT_RITUALS_MAP: Record<string, { name: string; duration: string; frequency: string }> = {
  'reuniao-diretoria': { name: 'Reunião de Diretoria', duration: '90-120 min', frequency: 'Mensal ou Quinzenal' },
  'reuniao-semanal-resultados': { name: 'Reunião Semanal de Resultados', duration: '60 min', frequency: 'Semanal' },
  'comite-projetos-estrategicos': { name: 'Comitê de Projetos Estratégicos', duration: '60-90 min', frequency: 'Quinzenal ou Mensal' },
  'sop-business-review': { name: 'S&OP / Business Review', duration: '90-120 min', frequency: 'Mensal' },
  'qbr-revisao-trimestral': { name: 'QBR — Revisão Trimestral', duration: '120-180 min', frequency: 'Trimestral' },
  'revisao-planejamento-estrategico': { name: 'Revisão do Planejamento Estratégico', duration: '180+ min', frequency: 'Semestral ou Anual' },
  'reuniao-gestao-lideres': { name: 'Reunião de Gestão com Líderes', duration: '60-90 min', frequency: 'Semanal ou Quinzenal' },
  'all-hands': { name: 'All Hands / Town Hall', duration: '45-60 min', frequency: 'Mensal ou Trimestral' },
  'one-on-one': { name: 'One-on-One', duration: '30-45 min', frequency: 'Semanal ou Quinzenal' },
  'revisao-metas-area': { name: 'Revisão de Metas por Área', duration: '60 min', frequency: 'Mensal' },
  'calibracao-performance': { name: 'Calibração de Performance', duration: '90-120 min', frequency: 'Semestral' },
  'avaliacao-desempenho': { name: 'Avaliação de Desempenho', duration: '45-60 min', frequency: 'Semestral ou Anual' },
  'daily-receita': { name: 'Daily de Receita / Vendas', duration: '15-20 min', frequency: 'Diário' },
  'daily-dds': { name: 'Daily / DDS', duration: '10-15 min', frequency: 'Diário' },
  'reuniao-equipe': { name: 'Reunião de Equipe / Squad', duration: '30-60 min', frequency: 'Semanal' },
  'pdca-troubleshoot': { name: 'PDCA Rápido / Troubleshoot', duration: '30-45 min', frequency: 'Sob demanda' },
  'fechamento-mensal': { name: 'Fechamento Mensal', duration: '60-90 min', frequency: 'Mensal' },
  'retrospectiva-operacional': { name: 'Retrospectiva Operacional', duration: '45-60 min', frequency: 'Quinzenal ou Mensal' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResult = await checkRateLimit(req, 'generate-ritual-management-recommendations', 20);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { managementRitualIds, sessionId } = await req.json();

    // Get culture context from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Get session to find account
    const { data: session } = await sb
      .from('ritual_sessions')
      .select('account_id, user_id')
      .eq('id', sessionId)
      .single();

    let cultureInfo = "";

    if (session) {
      const filter = session.account_id
        ? { key: 'account_id', value: session.account_id }
        : { key: 'user_id', value: session.user_id };

      // Values
      const { data: valuesSession } = await sb
        .from('values_sessions')
        .select('id')
        .eq(filter.key, filter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (valuesSession) {
        const { data: selections } = await sb
          .from('values_selections')
          .select('value_id, values_catalog(label)')
          .eq('session_id', valuesSession.id)
          .eq('phase', 3);

        if (selections?.length) {
          cultureInfo += `Valores da empresa: ${selections.map((s: any) => s.values_catalog?.label).filter(Boolean).join(", ")}\n`;
        }
      }

      // Indicators
      const { data: indicators } = await sb
        .from('strategic_indicators')
        .select('final_selection')
        .eq(filter.key, filter.value)
        .limit(1)
        .single();

      if (indicators?.final_selection) {
        const arr = Array.isArray(indicators.final_selection) ? indicators.final_selection : [];
        cultureInfo += `Indicadores estratégicos: ${arr.map((i: any) => i.indicator || i).join(", ")}\n`;
      }

      // Decisions
      const { data: decisionSession } = await sb
        .from('decision_sessions')
        .select('id')
        .eq(filter.key, filter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (decisionSession) {
        const { data: answers } = await sb
          .from('decision_answers')
          .select('answer_text')
          .eq('session_id', decisionSession.id);

        if (answers?.length) {
          cultureInfo += `Critérios de decisão: ${answers.map((a: any) => a.answer_text).join("; ")}\n`;
        }
      }
    }

    // Build rituals info with exact Portuguese names, parsing "id|frequency" format
    const ritualsInfo = (managementRitualIds || []).map((entry: string) => {
      if (entry.startsWith('custom:')) {
        try {
          const custom = JSON.parse(entry.slice(7));
          return `- ${custom.name} (Duração: ${custom.duration}, Frequência real: ${custom.frequency}, Objetivo: ${custom.objective || 'N/A'})`;
        } catch {
          return `- ${entry} (Ritual customizado)`;
        }
      }
      // Parse "id|frequency" format
      const pipeIdx = entry.indexOf('|');
      const ritualId = pipeIdx === -1 ? entry : entry.substring(0, pipeIdx);
      const userFrequency = pipeIdx === -1 ? '' : entry.substring(pipeIdx + 1);
      const r = MANAGEMENT_RITUALS_MAP[ritualId];
      if (!r) return `- ${ritualId} (Ritual customizado)`;
      const freqDisplay = userFrequency || r.frequency;
      return `- ${r.name} (Duração: ${r.duration}, Frequência real na empresa: ${freqDisplay})`;
    }).join("\n");

    // Build a lookup of ritual names for the prompt
    const ritualNamesList = (managementRitualIds || []).map((entry: string) => {
      if (entry.startsWith('custom:')) {
        try { return JSON.parse(entry.slice(7)).name; } catch { return entry; }
      }
      const pipeIdx = entry.indexOf('|');
      const ritualId = pipeIdx === -1 ? entry : entry.substring(0, pipeIdx);
      return MANAGEMENT_RITUALS_MAP[ritualId]?.name || ritualId;
    }).join(", ");

    const systemPrompt = `Você é um especialista em cultura organizacional.

CONTEXTO CULTURAL DA EMPRESA:
${cultureInfo || "Não há informações adicionais sobre a cultura."}

RITUAIS DE GESTÃO JÁ EXISTENTES NA EMPRESA:
${ritualsInfo || "Nenhum ritual selecionado."}

REGRAS OBRIGATÓRIAS:
1. Use EXATAMENTE os nomes dos rituais conforme fornecidos na lista acima. NUNCA traduza, renomeie ou use nomes em inglês para os rituais. Os nomes corretos são: ${ritualNamesList}.
2. Para TODOS os rituais com duração igual ou superior a 30 minutos, SEMPRE recomende reservar de 10% a 20% do tempo da reunião para falar sobre cultura.
3. SEMPRE foque em apenas 1 pilar de cultura por reunião. NUNCA recomende falar de mais de 1 pilar na mesma reunião.
4. Quando o pilar for VALORES:
   - NÃO cite um valor específico como se fosse o único a ser trabalhado.
   - Recomende que o pilar VALORES seja abordado naquele ritual de forma geral.
   - Sugira critérios para escolha do valor: "rotacione entre os valores da empresa", "escolha o valor menos praticado no momento" ou "selecione um valor por semana/mês".
   - A dinâmica padrão é SEMPRE:
     a) Escolher 1 único valor para aquela reunião (rotacionando)
     b) Perguntar: "Qual exemplo de como vivemos este valor na prática?"
     c) Perguntar: "Qual exemplo de como NÃO vivemos este valor na prática?"
5. Priorize SEMPRE inserir cultura DENTRO dos rituais já existentes. Evite criar novos rituais.
6. Cada sugestão deve ser prática, específica e implementável imediatamente.

FORMATO DE RESPOSTA (JSON):
{
  "recommendations": [
    {
      "ritualId": "id-do-ritual",
      "ritualName": "Nome EXATO do Ritual em Português conforme a lista acima",
      "suggestion": "Descrição detalhada da recomendação",
      "pillarRelated": "Nome do pilar (ex: Valores, Artefatos, Ideias Adicionais e Símbolos, Rituais de Alinhamento com Valores)",
      "durationSuggested": "Ex: 10 minutos"
    }
  ]
}

Gere de 3 a 8 recomendações, priorizando os rituais de maior duração e frequência.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    if (!managementRitualIds || managementRitualIds.length === 0) {
      return new Response(JSON.stringify({ error: "no_rituals", message: "Nenhum ritual de gestão selecionado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere recomendações de como inserir cultura nos rituais de gestão da empresa." },
        ],
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "return_recommendations",
              description: "Retorna as recomendações de rituais de cultura para os rituais de gestão.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ritualId: { type: "string", description: "ID do ritual de gestão" },
                        ritualName: { type: "string", description: "Nome exato do ritual em Português" },
                        suggestion: { type: "string", description: "Descrição detalhada da recomendação" },
                        pillarRelated: { type: "string", description: "Nome do pilar de cultura relacionado" },
                        durationSuggested: { type: "string", description: "Duração sugerida, ex: 10 minutos" },
                      },
                      required: ["ritualId", "ritualName", "suggestion", "pillarRelated", "durationSuggested"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recommendations" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { recommendations: any[] };

    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
        return new Response(JSON.stringify({ error: "parse_error", message: "A IA respondeu em formato inválido." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content;
      console.error("No tool call in response. Raw content:", content);
      try {
        const jsonMatch = content?.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        parsed = JSON.parse((jsonStr || "{}").trim());
      } catch {
        console.error("Failed to parse fallback content:", content);
        return new Response(JSON.stringify({ error: "parse_error", message: "A IA respondeu em formato inválido." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
      console.error("Empty recommendations from AI. Parsed:", JSON.stringify(parsed));
      return new Response(JSON.stringify({ error: "empty_recommendations", message: "Nenhuma recomendação foi gerada. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
