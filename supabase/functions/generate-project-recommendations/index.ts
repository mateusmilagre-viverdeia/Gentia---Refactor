import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectContext {
  company: { name: string; sector: string | null };
  healthScore: {
    health_score: number;
    health_status: string;
    progress_score: number;
    engagement_score: number;
    velocity_score: number;
    action_score: number;
  } | null;
  pillarsProgress: {
    mission_stage: number | null;
    vision_stage: number | null;
    values_stage: number | null;
  };
  pendingActions: Array<{ title: string; due_date: string | null; status: string }>;
  recentCheckpoints: Array<{ checkpoint_date: string; status: string; notes: string | null }>;
  activeAlerts: Array<{ alert_type: string; severity: string; message: string }>;
  timeInvested: { total_hours: number; last_30_days_hours: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const rateLimitResult = await checkRateLimit(req, 'generate-project-recommendations', 20);
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { account_id, context = 'dashboard', max_recommendations = 5 } = await req.json();

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: "account_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit for this specific account (24h)
    const { data: canGenerate } = await supabase.rpc('check_recommendation_rate_limit', {
      p_account_id: account_id,
      p_hours_limit: 24
    });

    if (canGenerate === false) {
      return new Response(
        JSON.stringify({ 
          error: "rate_limit", 
          message: "Recomendações já foram geradas nas últimas 24 horas para este projeto." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gather project context
    const projectContext = await gatherProjectContext(supabase, account_id);

    // Generate recommendations using AI
    const recommendations = await generateAIRecommendations(projectContext, context, max_recommendations);

    // Save recommendations to database
    const savedRecommendations = [];
    for (const rec of recommendations.recommendations) {
      const { data, error } = await supabase
        .from('project_recommendations')
        .insert({
          account_id,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          rationale: rec.rationale,
          suggested_tools: rec.suggested_tools,
          expected_impact: rec.expected_impact,
          created_by: 'ai_system',
          metadata: { context, generated_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (!error && data) {
        savedRecommendations.push(data);
      }
    }

    // Log generation
    await supabase.from('recommendation_generation_log').insert({
      account_id,
      recommendations_count: savedRecommendations.length,
      context,
      success: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: savedRecommendations,
        analysis_summary: recommendations.analysis_summary,
        remaining_calls: rateLimitResult.remaining
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error generating recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate recommendations";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function gatherProjectContext(supabase: any, accountId: string): Promise<ProjectContext> {
  // Fetch company info
  const { data: company } = await supabase
    .from('companies')
    .select('name, sector')
    .eq('id', accountId)
    .single();

  // Fetch health score
  const { data: healthScore } = await supabase
    .from('project_health_scores')
    .select('health_score, health_status, progress_score, engagement_score, velocity_score, action_score')
    .eq('account_id', accountId)
    .single();

  // Fetch pillar progress
  const { data: missionSession } = await supabase
    .from('mission_sessions')
    .select('stage')
    .eq('account_id', accountId)
    .single();

  const { data: visionSession } = await supabase
    .from('vision_sessions')
    .select('stage')
    .eq('account_id', accountId)
    .single();

  const { data: valuesSession } = await supabase
    .from('values_sessions')
    .select('stage')
    .eq('account_id', accountId)
    .single();

  // Fetch pending actions
  const { data: pendingActions } = await supabase
    .from('checkpoint_actions')
    .select('title, due_date, status')
    .eq('account_id', accountId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(10);

  // Fetch recent checkpoints
  const { data: recentCheckpoints } = await supabase
    .from('project_checkpoints')
    .select('checkpoint_date, status, notes')
    .eq('account_id', accountId)
    .order('checkpoint_date', { descending: true })
    .limit(5);

  // Fetch active alerts
  const { data: activeAlerts } = await supabase
    .from('project_alerts')
    .select('alert_type, severity, message')
    .eq('account_id', accountId)
    .eq('status', 'active')
    .limit(5);

  // Fetch time invested
  const { data: timeEntries } = await supabase
    .from('consultant_time_entries')
    .select('duration_minutes, entry_date')
    .eq('account_id', accountId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalMinutes = (timeEntries || []).reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0);
  const last30DaysMinutes = (timeEntries || [])
    .filter((e: any) => new Date(e.entry_date) >= thirtyDaysAgo)
    .reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0);

  return {
    company: company || { name: 'Unknown', sector: null },
    healthScore,
    pillarsProgress: {
      mission_stage: missionSession?.stage || null,
      vision_stage: visionSession?.stage || null,
      values_stage: valuesSession?.stage || null,
    },
    pendingActions: pendingActions || [],
    recentCheckpoints: recentCheckpoints || [],
    activeAlerts: activeAlerts || [],
    timeInvested: {
      total_hours: Math.round(totalMinutes / 60 * 10) / 10,
      last_30_days_hours: Math.round(last30DaysMinutes / 60 * 10) / 10,
    }
  };
}

async function generateAIRecommendations(
  context: ProjectContext, 
  requestContext: string, 
  maxRecommendations: number
) {
  const lovableAIUrl = Deno.env.get("LOVABLE_AI_GATEWAY_URL");
  const lovableAIKey = Deno.env.get("LOVABLE_AI_GATEWAY_KEY");

  const systemPrompt = `Você é um especialista em consultoria de cultura organizacional usando a metodologia ROIP (Relevance, Ownership, Involvement, Pride).

Analise o contexto do projeto e gere recomendações acionáveis para o consultor. Cada recomendação deve:
1. Ser específica e acionável
2. Ter prioridade clara baseada no impacto e urgência
3. Sugerir ferramentas GENTIA relevantes quando aplicável
4. Explicar o racional da sugestão
5. Descrever o impacto esperado

Categorias de recomendação:
- health_improvement: Melhorias para aumentar o health score
- next_action: Próximos passos recomendados
- risk_mitigation: Ações para mitigar riscos identificados
- quick_win: Ações rápidas com alto impacto
- best_practice: Boas práticas baseadas em padrões de sucesso

Ferramentas GENTIA disponíveis:
- mission: Construtor de Missão (/ferramentas/missao)
- vision: Construtor de Visão (/ferramentas/visao)
- values: Construtor de Valores (/ferramentas/valores)
- decision: Critério de Decisão (/ferramentas/decisao)
- indicators: Indicadores Estratégicos (/ferramentas/indicadores)
- energy: Mapa de Energia (/ferramentas/energia)
- development: Portfólio de Desenvolvimento (/ferramentas/desenvolvimento)
- events: Eventos Culturais (/ferramentas/eventos)
- rituals: Rituais (/ferramentas/rituais)
- culture-code: Culture Code (/ferramentas/culture-code)
- pulse: Pulse de Clima (/pulse)`;

  const userPrompt = `Contexto do Projeto de Consultoria:

Empresa: ${context.company.name}
Setor: ${context.company.sector || 'Não informado'}

Health Score:
${context.healthScore ? `
- Score Geral: ${context.healthScore.health_score}/100 (${context.healthScore.health_status})
- Progresso: ${context.healthScore.progress_score}/100
- Engajamento: ${context.healthScore.engagement_score}/100
- Velocidade: ${context.healthScore.velocity_score}/100
- Ações: ${context.healthScore.action_score}/100
` : 'Health score não calculado ainda'}

Progresso dos Pilares:
- Missão: ${context.pillarsProgress.mission_stage ? `Etapa ${context.pillarsProgress.mission_stage}/13` : 'Não iniciado'}
- Visão: ${context.pillarsProgress.vision_stage ? `Etapa ${context.pillarsProgress.vision_stage}/13` : 'Não iniciado'}
- Valores: ${context.pillarsProgress.values_stage ? `Etapa ${context.pillarsProgress.values_stage}/9` : 'Não iniciado'}

Ações Pendentes (${context.pendingActions.length}):
${context.pendingActions.slice(0, 5).map(a => `- ${a.title} (${a.status}${a.due_date ? `, vence: ${a.due_date}` : ''})`).join('\n') || 'Nenhuma'}

Alertas Ativos (${context.activeAlerts.length}):
${context.activeAlerts.map(a => `- [${a.severity}] ${a.message}`).join('\n') || 'Nenhum'}

Tempo Investido:
- Total: ${context.timeInvested.total_hours}h
- Últimos 30 dias: ${context.timeInvested.last_30_days_hours}h

Contexto da solicitação: ${requestContext}

Gere até ${maxRecommendations} recomendações priorizadas no seguinte formato JSON:
{
  "recommendations": [
    {
      "category": "health_improvement | next_action | risk_mitigation | quick_win | best_practice",
      "priority": "high | medium | low",
      "title": "Título curto e claro",
      "description": "Descrição detalhada da ação recomendada",
      "rationale": "Por que esta recomendação é importante agora",
      "suggested_tools": [{"id": "tool_id", "name": "Nome da Ferramenta", "route": "/rota"}],
      "expected_impact": "Impacto esperado ao implementar"
    }
  ],
  "analysis_summary": "Resumo da análise geral do projeto"
}`;

  try {
    const response = await fetch(`${lovableAIUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("AI generation error:", error);
    
    // Fallback to rule-based recommendations
    return generateFallbackRecommendations(context, maxRecommendations);
  }
}

function generateFallbackRecommendations(context: ProjectContext, maxRecommendations: number) {
  const recommendations: any[] = [];

  // Check for unstarted pillars
  if (!context.pillarsProgress.mission_stage || context.pillarsProgress.mission_stage === 0) {
    recommendations.push({
      category: 'next_action',
      priority: 'high',
      title: 'Iniciar construção da Missão',
      description: 'O pilar de Missão ainda não foi iniciado. A missão é fundamental para definir o propósito da empresa.',
      rationale: 'A missão é o ponto de partida da metodologia ROIP e deve ser definida antes dos demais pilares.',
      suggested_tools: [{ id: 'mission', name: 'Construtor de Missão', route: '/ferramentas/missao' }],
      expected_impact: 'Definição clara do propósito organizacional, orientando todas as decisões estratégicas.'
    });
  }

  // Check for overdue actions
  const overdueActions = context.pendingActions.filter(a => 
    a.due_date && new Date(a.due_date) < new Date()
  );
  
  if (overdueActions.length > 0) {
    recommendations.push({
      category: 'risk_mitigation',
      priority: 'high',
      title: `Resolver ${overdueActions.length} ações atrasadas`,
      description: `Existem ${overdueActions.length} ações com prazo vencido que precisam de atenção imediata.`,
      rationale: 'Ações atrasadas impactam negativamente o health score e podem comprometer o cronograma do projeto.',
      suggested_tools: [],
      expected_impact: 'Melhoria no score de ações e maior controle sobre o projeto.'
    });
  }

  // Check for low engagement (no time logged recently)
  if (context.timeInvested.last_30_days_hours < 5) {
    recommendations.push({
      category: 'health_improvement',
      priority: 'medium',
      title: 'Aumentar frequência de interações',
      description: 'Poucas horas foram registradas nos últimos 30 dias. Considere agendar checkpoints mais frequentes.',
      rationale: 'Projetos com interações regulares têm maior taxa de sucesso.',
      suggested_tools: [],
      expected_impact: 'Aumento no score de engajamento e velocidade do projeto.'
    });
  }

  // Check health score
  if (context.healthScore && context.healthScore.health_score < 50) {
    recommendations.push({
      category: 'health_improvement',
      priority: 'high',
      title: 'Projeto em situação crítica',
      description: 'O health score está abaixo de 50. É necessário um plano de ação urgente.',
      rationale: 'Scores abaixo de 50 indicam alto risco de abandono ou insatisfação do cliente.',
      suggested_tools: [],
      expected_impact: 'Recuperação do projeto e satisfação do cliente.'
    });
  }

  return {
    recommendations: recommendations.slice(0, maxRecommendations),
    analysis_summary: `Análise baseada em regras: ${recommendations.length} recomendações identificadas.`
  };
}
