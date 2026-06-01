import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CultureData {
  mission?: string;
  vision?: string;
  values?: Array<{ id: string; name: string; description?: string }>;
  decision?: { goldenRule?: string; decisions?: Array<{ title: string }> };
  indicators?: Array<{ name: string }>;
  projects?: Array<{ name: string }>;
  energyItems?: Array<{ label: string }>;
  developmentItems?: Array<{ label: string }>;
}

interface GeneratedQuestion {
  pillar_type: string;
  reference_id: string | null;
  reference_text: string;
  question_text: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [GENERATE-CULTURE-QUESTIONS] ${step}${detailsStr}`);
};

function generateMissionQuestions(mission: string): GeneratedQuestion[] {
  if (!mission) return [];
  return [
    {
      pillar_type: 'mission',
      reference_id: null,
      reference_text: mission,
      question_text: `O quanto você acredita que a missão "${mission}" é vivida todos os dias nas ações da empresa?`,
    },
    {
      pillar_type: 'mission',
      reference_id: null,
      reference_text: mission,
      question_text: `O quanto você sente que suas atividades diárias contribuem para a missão "${mission}"?`,
    },
  ];
}

function generateVisionQuestions(vision: string): GeneratedQuestion[] {
  if (!vision) return [];
  return [
    {
      pillar_type: 'vision',
      reference_id: null,
      reference_text: vision,
      question_text: `O quanto você sente que a visão "${vision}" guia as decisões e estratégias da empresa?`,
    },
    {
      pillar_type: 'vision',
      reference_id: null,
      reference_text: vision,
      question_text: `O quanto você acredita que a empresa está no caminho certo para alcançar a visão "${vision}"?`,
    },
  ];
}

function generateValueQuestions(values: Array<{ id: string; name: string; description?: string }>): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  for (const value of values) {
    questions.push({
      pillar_type: 'value',
      reference_id: value.id,
      reference_text: value.name,
      question_text: `O quanto você sente que a empresa vive o valor de "${value.name}" todos os dias?`,
    });
    
    questions.push({
      pillar_type: 'value',
      reference_id: value.id,
      reference_text: value.name,
      question_text: `Você observou comportamentos que representam o valor "${value.name}" esta semana?`,
    });
    
    questions.push({
      pillar_type: 'value',
      reference_id: value.id,
      reference_text: value.name,
      question_text: `O quanto o valor "${value.name}" está presente nas entregas da sua equipe?`,
    });
  }
  
  return questions;
}

function generateDecisionQuestions(decision: { goldenRule?: string; decisions?: Array<{ title: string }> }): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  if (decision.goldenRule) {
    questions.push({
      pillar_type: 'decision',
      reference_id: null,
      reference_text: decision.goldenRule,
      question_text: `O quanto você sente que a regra de ouro "${decision.goldenRule}" é respeitada nas decisões da empresa?`,
    });
  }
  
  if (decision.decisions) {
    for (const d of decision.decisions) {
      questions.push({
        pillar_type: 'decision',
        reference_id: null,
        reference_text: d.title,
        question_text: `O quanto a diretriz "${d.title}" está sendo aplicada nas decisões do dia a dia?`,
      });
    }
  }
  
  return questions;
}

function generateIndicatorQuestions(indicators: Array<{ name: string }>): GeneratedQuestion[] {
  return indicators.map(ind => ({
    pillar_type: 'indicator',
    reference_id: null,
    reference_text: ind.name,
    question_text: `O quanto você acredita que o indicador "${ind.name}" é acompanhado e utilizado nas decisões?`,
  }));
}

function generateProjectQuestions(projects: Array<{ name: string }>): GeneratedQuestion[] {
  return projects.map(proj => ({
    pillar_type: 'project',
    reference_id: null,
    reference_text: proj.name,
    question_text: `O quanto você percebe que o projeto "${proj.name}" está contribuindo para a estratégia e metas da empresa?`,
  }));
}

function generateEnergyQuestions(items: Array<{ label: string }>): GeneratedQuestion[] {
  return items.slice(0, 3).map(item => ({
    pillar_type: 'energy',
    reference_id: null,
    reference_text: item.label,
    question_text: `O quanto você sente que o ritual de energia "${item.label}" é praticado na empresa?`,
  }));
}

function generateDevelopmentQuestions(items: Array<{ label: string }>): GeneratedQuestion[] {
  return items.slice(0, 3).map(item => ({
    pillar_type: 'development',
    reference_id: null,
    reference_text: item.label,
    question_text: `O quanto você sente que a prática de desenvolvimento "${item.label}" está presente na cultura?`,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
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

    const { account_id } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Generating culture questions', { accountId: account_id });

    // Fetch culture data from various sources
    const cultureData: CultureData = {};

    // Get mission - Fixed: mission is in analysis->missionStatement JSONB
    const { data: missionSession } = await supabase
      .from('mission_sessions')
      .select('analysis')
      .eq('account_id', account_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (missionSession?.analysis) {
      const analysis = missionSession.analysis as Record<string, unknown>;
      if (analysis.missionStatement) {
        cultureData.mission = analysis.missionStatement as string;
        logStep('Mission loaded from analysis.missionStatement', { mission: cultureData.mission });
      }
    }

    // Get vision
    const { data: visionSession } = await supabase
      .from('vision_sessions')
      .select('final_vision')
      .eq('account_id', account_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (visionSession?.final_vision) {
      cultureData.vision = visionSession.final_vision;
    }

    // Get values from values_final_check
    const { data: valuesFinal } = await supabase
      .from('values_final_check')
      .select('id, value_name, description')
      .eq('account_id', account_id)
      .eq('is_approved', true);

    if (valuesFinal && valuesFinal.length > 0) {
      cultureData.values = valuesFinal.map(v => ({
        id: v.id,
        name: v.value_name,
        description: v.description,
      }));
      logStep('Values loaded from values_final_check', { count: valuesFinal.length });
    } else {
      // Fallback to pulse_company_values - use correct column names
      const { data: companyValues } = await supabase
        .from('pulse_company_values')
        .select('id, name, description, dos, donts')
        .eq('account_id', account_id)
        .eq('is_active', true);
      
      if (companyValues && companyValues.length > 0) {
        cultureData.values = companyValues.map(v => ({
          id: v.id,
          name: v.name, // Fixed: was 'value_name', correct column is 'name'
          description: v.description,
        }));
        logStep('Values loaded from pulse_company_values', { 
          count: companyValues.length,
          names: companyValues.map((v: any) => v.name)
        });
      } else {
        logStep('No values found in either values_final_check or pulse_company_values', { account_id });
      }
    }

    // Get decision - Fixed: use 'summary' and 'guidelines[]' instead of 'goldenRule'
    const { data: decisionSession } = await supabase
      .from('decision_sessions')
      .select('compiled_decision')
      .eq('account_id', account_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (decisionSession?.compiled_decision) {
      const compiled = decisionSession.compiled_decision as Record<string, unknown>;
      cultureData.decision = {
        goldenRule: compiled.summary as string | undefined, // Fixed: was 'goldenRule', correct field is 'summary'
        decisions: Array.isArray(compiled.guidelines) 
          ? (compiled.guidelines as string[]).map((g: string) => ({ title: g }))
          : [],
      };
      logStep('Decision loaded', { 
        hasSummary: !!compiled.summary, 
        guidelinesCount: Array.isArray(compiled.guidelines) ? compiled.guidelines.length : 0 
      });
    }

    // Get strategic indicators - Fixed: use 'final_selection' JSONB array, not 'name' column
    const { data: indicatorSession } = await supabase
      .from('strategic_indicators')
      .select('final_selection')
      .eq('account_id', account_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (indicatorSession?.final_selection && Array.isArray(indicatorSession.final_selection)) {
      cultureData.indicators = indicatorSession.final_selection.map((name: string) => ({ name }));
      logStep('Indicators loaded from final_selection', { count: cultureData.indicators.length, names: indicatorSession.final_selection });
    }

    // Get strategic projects - Fixed: column is 'project_name', not 'name'. No 'is_active' column.
    const { data: projects } = await supabase
      .from('strategic_projects')
      .select('id, project_name')
      .eq('account_id', account_id)
      .limit(5);
    
    if (projects && projects.length > 0) {
      cultureData.projects = projects.map(p => ({ name: p.project_name }));
      logStep('Projects loaded', { count: projects.length, names: projects.map(p => p.project_name) });
    }

    // Get energy selections - Fixed: use item_id with proper FK reference
    const { data: energySession } = await supabase
      .from('energy_sessions')
      .select('id')
      .eq('account_id', account_id)
      .eq('stage', 5)  // Only completed sessions
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (energySession) {
      // Step 1: fetch item_ids from phase 3 selections
      const { data: energySelections } = await supabase
        .from('energy_selections')
        .select('item_id')
        .eq('session_id', energySession.id)
        .eq('phase', 3);
      
      logStep('Energy selections raw', { count: energySelections?.length || 0, ids: energySelections?.map((s: any) => s.item_id) });

      // Step 2: fetch labels from catalog (two-step approach, no FK dependency)
      if (energySelections && energySelections.length > 0) {
        const itemIds = energySelections.map((s: any) => s.item_id);
        const { data: catalogItems } = await supabase
          .from('energy_catalog')
          .select('id, label')
          .in('id', itemIds);
        
        if (catalogItems && catalogItems.length > 0) {
          cultureData.energyItems = catalogItems.map((c: any) => ({ label: c.label }));
          logStep('Energy items loaded', { count: cultureData.energyItems.length, labels: cultureData.energyItems.map(e => e.label) });
        }
      }
    }

    // Get development selections
    const { data: devSession } = await supabase
      .from('development_sessions')
      .select('id')
      .eq('account_id', account_id)
      .eq('stage', 5)  // Only completed sessions
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (devSession) {
      const { data: devSelections } = await supabase
        .from('development_selections')
        .select('development_catalog(label)')
        .eq('session_id', devSession.id)
        .eq('phase', 3);
      
      if (devSelections && devSelections.length > 0) {
        cultureData.developmentItems = devSelections
          .filter((s: any) => s.development_catalog?.label)
          .map((s: any) => ({ label: s.development_catalog.label }));
      }
    }

    logStep('Culture data collected', {
      hasMission: !!cultureData.mission,
      hasVision: !!cultureData.vision,
      valuesCount: cultureData.values?.length || 0,
      hasDecision: !!cultureData.decision,
      indicatorsCount: cultureData.indicators?.length || 0,
      projectsCount: cultureData.projects?.length || 0,
      energyCount: cultureData.energyItems?.length || 0,
      developmentCount: cultureData.developmentItems?.length || 0,
    });

    // Generate all questions
    const allQuestions: GeneratedQuestion[] = [
      ...generateMissionQuestions(cultureData.mission || ''),
      ...generateVisionQuestions(cultureData.vision || ''),
      ...generateValueQuestions(cultureData.values || []),
      ...generateDecisionQuestions(cultureData.decision || {}),
      ...generateIndicatorQuestions(cultureData.indicators || []),
      ...generateProjectQuestions(cultureData.projects || []),
      ...generateEnergyQuestions(cultureData.energyItems || []),
      ...generateDevelopmentQuestions(cultureData.developmentItems || []),
    ];

    logStep('Questions generated', { count: allQuestions.length });

    if (allQuestions.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nenhum dado de cultura encontrado. Complete os pilares em /cultura/criacao primeiro.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch existing questions for this account to deduplicate
    const { data: existingQuestions } = await supabase
      .from('pulse_culture_questions')
      .select('question_text')
      .eq('account_id', account_id);

    const existingTexts = new Set(
      (existingQuestions || []).map((q: any) => q.question_text)
    );

    // 2. Filter out duplicates
    const newQuestions = allQuestions.filter(
      q => !existingTexts.has(q.question_text)
    );

    const skippedCount = allQuestions.length - newQuestions.length;

    logStep('Deduplication', { 
      total: allQuestions.length, 
      existing: existingTexts.size, 
      new: newQuestions.length,
      skipped: skippedCount,
    });

    let insertedCount = 0;

    // 3. Insert only new questions as INACTIVE
    if (newQuestions.length > 0) {
      const questionsToInsert = newQuestions.map(q => ({
        account_id,
        pillar_type: q.pillar_type,
        reference_text: q.reference_text,
        question_text: q.question_text,
        is_active: false,
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('pulse_culture_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) {
        logStep('Error inserting questions', { error: insertError.message });
        return new Response(JSON.stringify({ 
          success: false,
          error: `Erro ao salvar perguntas: ${insertError.message}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      insertedCount = insertedQuestions?.length || 0;
    }

    logStep('Questions saved successfully', { 
      inserted: insertedCount, 
      skipped: skippedCount,
    });

    // Group by pillar for summary (only new questions)
    const byPillar: Record<string, number> = {};
    newQuestions.forEach(q => {
      byPillar[q.pillar_type] = (byPillar[q.pillar_type] || 0) + 1;
    });

    return new Response(JSON.stringify({
      success: true,
      questions_count: insertedCount,
      new_count: insertedCount,
      skipped_count: skippedCount,
      by_pillar: byPillar,
      culture_data_found: {
        mission: !!cultureData.mission,
        vision: !!cultureData.vision,
        values: cultureData.values?.length || 0,
        decision: !!cultureData.decision?.goldenRule,
        indicators: cultureData.indicators?.length || 0,
        projects: cultureData.projects?.length || 0,
        energy: cultureData.energyItems?.length || 0,
        development: cultureData.developmentItems?.length || 0,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Error generating culture questions', { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
