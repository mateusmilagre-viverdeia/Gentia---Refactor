import { createClient } from "npm:@supabase/supabase-js@2";
import { aiFetch } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const lovableApiKey = "direct";

    // --- REFINE ACTION ---
    if (body.action === 'refine') {
      const { currentPlan, userMessage } = body;

      const refinePrompt = `Você é um consultor especialista em gestão de pessoas e cultura organizacional usando a metodologia ROIP.

O consultor/cliente solicitou o seguinte ajuste no plano de implementação:

"${userMessage}"

## Plano Atual:
${JSON.stringify(currentPlan, null, 2)}

## Instruções:
1. Aplique EXATAMENTE o ajuste solicitado
2. Mantenha todos os outros campos inalterados
3. Recalcule totalDurationMin/Med/Max se prazos mudaram
4. Mantenha a mesma estrutura JSON

Responda APENAS em JSON válido com a mesma estrutura do plano atual.`;

      const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um consultor de gestão de pessoas. Responda APENAS em JSON válido, sem markdown.' },
            { role: 'user', content: refinePrompt },
          ],
          temperature: 0.5,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', errorText);
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const refinedPlan = JSON.parse(content);

      return new Response(JSON.stringify(refinedPlan), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- GENERATE ACTION ---
    const { selectedSolutions, assessmentData, calculatorData, additionalInfo, projectDuration } = body;

    const solutionsText = selectedSolutions.map((s: any) => {
      const isRevision = s.mode === 'revision';
      const duration = s.baseDurationMonths 
        ? `${Math.max(1, Math.round(s.baseDurationMonths * (isRevision ? 1/3 : 1)))} meses`
        : s.durationLabel;
      const modeLabel = isRevision ? 'REVISÃO (prazo reduzido 3x)' : 'DO ZERO (prazo padrão)';
      return `- ${s.name} (${s.pillar}) — ${duration} — ${modeLabel}`;
    }).join('\n');

    const assessmentText = assessmentData 
      ? `Scores do Assessment ROIP: ${JSON.stringify(assessmentData.scores || {})}\nClassificação: ${assessmentData.classification || 'N/A'}`
      : 'Sem dados de Assessment ROIP disponíveis.';

    const calculatorText = calculatorData
      ? `Dados da Calculadora ROIP: ${JSON.stringify(calculatorData.results || calculatorData.input_data || {})}`
      : 'Sem dados da Calculadora ROIP disponíveis.';

    const additionalInfoText = additionalInfo
      ? `## Informações Adicionais do Consultor:\n${additionalInfo}`
      : '';

    const projectDurationText = projectDuration
      ? `## Duração Total do Projeto: ${projectDuration} meses
IMPORTANTE: A duração total do projeto é de ${projectDuration} meses. Após calcular o tempo necessário para todas as etapas de implementação das soluções selecionadas, o tempo restante DEVE ser preenchido com uma etapa final chamada "Fase de Acompanhamento". Esta fase deve incluir:
- Monitoramento de métricas e KPIs definidos nas etapas anteriores
- Checkpoints quinzenais ou mensais de acompanhamento
- Ajustes e refinamentos baseados nos resultados
- Consolidação das mudanças implementadas
Por exemplo: se as soluções somam 2 meses e o projeto total é de 4 meses, a Fase de Acompanhamento deve ter 2 meses.
SEMPRE inclua a "Fase de Acompanhamento" como última etapa do plano, com solutionId "acompanhamento" e pillar "acompanhamento".`
      : '';

    const prompt = `Você é um consultor especialista em gestão de pessoas e cultura organizacional usando a metodologia ROIP (Retorno sobre Investimento em Pessoas).

Com base nos dados abaixo, gere um plano de implementação personalizado.

## Modo: Cada solução tem seu modo individual (DO ZERO ou REVISÃO) — veja a lista acima.

## Soluções Selecionadas:
${solutionsText}

## Dados do Diagnóstico:
${assessmentText}

## Dados da Calculadora:
${calculatorText}

${additionalInfoText}

${projectDurationText}

## REGRA IMPORTANTE — Fase 1 (Onboarding Inicial):
A Fase 1 do projeto já está definida e NÃO deve ser incluída no plano. Ela acontece no primeiro encontro e inclui:
- Preenchimento do Assessment ROIP
- Configuração da Calculadora ROIP
- Definição de prioridades e KPIs iniciais
- Alinhamento de expectativas

NÃO inclua etapas sobre assessment, calculadora ROIP, definição de KPIs iniciais, ou qualquer atividade de diagnóstico/onboarding.
Comece a numeração dos steps a partir de "step_2". O "step_1" será injetado automaticamente pelo sistema.

## Instruções:
1. Priorize as soluções considerando dependências lógicas (ex: Cultura antes de Atração)
2. Use os scores do Assessment para definir prioridades (pilares com scores mais baixos primeiro)
3. Para cada etapa, defina prazo mínimo, médio e máximo
4. Sugira métricas de acompanhamento baseadas nos dados da calculadora
5. Crie marcos de check-in a cada 30 dias
6. O primeiro step gerado DEVE ter id "step_2" e order 2

Responda APENAS em JSON válido com esta estrutura (note que o primeiro step começa com id "step_2" e order 2):
{
  "summary": "Resumo executivo do plano em 2-3 frases",
  "priorityReason": "Por que esta ordem de prioridades",
  "steps": [
    {
      "id": "step_2",
      "solutionId": "id da solução",
      "name": "Nome da etapa",
      "pillar": "pilar (cultura|atracao|retencao|resultado)",
      "order": 2,
      "durationMin": "X meses",
      "durationMed": "Y meses",
      "durationMax": "Z meses",
      "metrics": ["métrica 1", "métrica 2"],
      "dependencies": [],
      "status": "pending",
      "checkpoints": ["Check-in 30d: ...", "Check-in 60d: ..."]
    }
  ],
  "totalDurationMin": "X meses",
  "totalDurationMed": "Y meses",
  "totalDurationMax": "Z meses",
  "metrics": [
    {
      "name": "Nome da métrica",
      "current": "Valor atual estimado",
      "target": "Meta sugerida",
      "impact": "Impacto financeiro estimado"
    }
  ]
}`;

    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um consultor de gestão de pessoas. Responda APENAS em JSON válido, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const plan = JSON.parse(content);

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-implementation-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
