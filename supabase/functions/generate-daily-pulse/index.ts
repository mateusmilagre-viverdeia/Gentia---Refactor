import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = createLogger("generate-daily-pulse");

interface ScheduleRules {
  daily_questions_count: number;
  must_include_driver_keys: string[];
  prefer_driver_keys: string[];
  rotation_pool_driver_keys: string[];
  max_repeat_block_days: number;
  anonymous_driver_keys: string[];
}

interface Question {
  id: string;
  driver_id: string;
  question_text: string;
  driver_key: string;
  max_repeat_per_month: number;
  is_anonymous: boolean;
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

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { account_id, date, force_regenerate = false } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    log.log(`Generating pulse for account ${account_id} on ${targetDate}`);

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('pulse_daily_assignments')
      .select('id')
      .eq('account_id', account_id)
      .eq('date', targetDate)
      .single();

    if (existingAssignment && !force_regenerate) {
      return new Response(JSON.stringify({ 
        message: 'Pulse já gerado para esta data',
        assignment_id: existingAssignment.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If force regenerate, delete existing
    if (existingAssignment && force_regenerate) {
      await supabase
        .from('pulse_daily_assignments')
        .delete()
        .eq('id', existingAssignment.id);
      log.log('Deleted existing assignment for regeneration');
    }

    // Get schedule rules
    let rules: ScheduleRules = {
      daily_questions_count: 3,
      must_include_driver_keys: ['mood_energy'],
      prefer_driver_keys: ['culture_values', 'purpose'],
      rotation_pool_driver_keys: [],
      max_repeat_block_days: 7,
      anonymous_driver_keys: ['mood_energy', 'workload', 'work_environment'],
    };

    const { data: customRules } = await supabase
      .from('pulse_schedule_rules')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single();

    if (customRules) {
      rules = {
        daily_questions_count: customRules.daily_questions_count || 3,
        must_include_driver_keys: customRules.must_include_driver_keys || ['mood_energy'],
        prefer_driver_keys: customRules.prefer_driver_keys || ['culture_values', 'purpose'],
        rotation_pool_driver_keys: customRules.rotation_pool_driver_keys || [],
        max_repeat_block_days: customRules.max_repeat_block_days || 7,
        anonymous_driver_keys: customRules.anonymous_driver_keys || ['mood_energy', 'workload'],
      };
    }

    log.log('Using rules:', JSON.stringify(rules));

    // Get all active questions with driver info
    const { data: allQuestions, error: questionsError } = await supabase
      .from('pulse_questions')
      .select(`
        id,
        driver_id,
        question_text,
        max_repeat_per_month,
        is_anonymous,
        pulse_drivers!inner(key)
      `)
      .eq('account_id', account_id)
      .eq('is_active', true);

    if (questionsError) {
      log.error('Error fetching questions:', questionsError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar perguntas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no custom questions, seed default questions automatically
    let questions: Question[] = [];
    
    if (!allQuestions || allQuestions.length === 0) {
      log.log('No questions found for account, seeding default questions');
      
      // Get default drivers (account_id IS NULL)
      const { data: defaultDrivers } = await supabase
        .from('pulse_drivers')
        .select('id, key, name, is_anonymous, default_emoji_set_id')
        .is('account_id', null)
        .eq('is_active', true);

      if (!defaultDrivers || defaultDrivers.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Nenhum driver padrão encontrado. Configure drivers primeiro.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default questions per driver (simple but effective)
      const defaultQuestionTemplates: Record<string, string[]> = {
        mood_energy: [
          'Como você está se sentindo hoje?',
          'Qual seu nível de energia neste momento?',
          'Como está sua disposição para trabalhar hoje?',
        ],
        culture_values: [
          'Você viu algum valor da empresa sendo praticado hoje?',
          'Os comportamentos do time refletem nossa cultura?',
        ],
        purpose: [
          'Você sente que seu trabalho faz diferença?',
          'Quanto seu trabalho está alinhado com seus objetivos?',
        ],
        workload: [
          'Como está sua carga de trabalho hoje?',
          'Você conseguiu realizar suas tarefas com qualidade?',
        ],
        work_environment: [
          'O ambiente está favorável para seu trabalho hoje?',
          'Você se sente confortável no seu espaço de trabalho?',
        ],
        leader_relationship: [
          'Você recebeu suporte adequado do seu líder?',
          'A comunicação com seu líder está fluindo bem?',
        ],
        team_relationship: [
          'Como está a colaboração com seu time hoje?',
          'Você se sente apoiado pelos colegas?',
        ],
        recognition: [
          'Você se sente valorizado pelo seu trabalho?',
          'Recebeu algum feedback positivo recentemente?',
        ],
        professional_growth: [
          'Você está aprendendo algo novo no trabalho?',
          'Sente que está evoluindo profissionalmente?',
        ],
        autonomy: [
          'Você tem liberdade para tomar decisões no seu trabalho?',
          'Consegue organizar suas tarefas da forma que prefere?',
        ],
        clarity_expectations: [
          'As expectativas sobre seu trabalho estão claras?',
          'Você sabe exatamente o que precisa entregar?',
        ],
        company_direction: [
          'Você entende para onde a empresa está indo?',
          'Os objetivos da empresa estão claros para você?',
        ],
      };

      const questionsToSeed: any[] = [];
      
      for (const driver of defaultDrivers) {
        const templates = defaultQuestionTemplates[driver.key] || [
          `Como você avalia ${driver.name.toLowerCase()} hoje?`,
        ];
        
        for (const text of templates) {
          questionsToSeed.push({
            account_id,
            driver_id: driver.id,
            question_text: text,
            answer_type: 'emoji_scale',
            emoji_set_id: driver.default_emoji_set_id,
            is_anonymous: driver.is_anonymous || false,
            max_repeat_per_month: 4,
            is_active: true, // Activate by default when seeding
            ai_generated: false,
            tags: ['default', 'seeded'],
          });
        }
      }

      if (questionsToSeed.length > 0) {
        const { data: seededQuestions, error: seedError } = await supabase
          .from('pulse_questions')
          .insert(questionsToSeed)
          .select(`
            id,
            driver_id,
            question_text,
            max_repeat_per_month,
            is_anonymous,
            pulse_drivers!inner(key)
          `);

        if (seedError) {
          log.error('Error seeding questions:', seedError);
          return new Response(JSON.stringify({ 
            error: 'Erro ao criar perguntas padrão. Tente novamente.' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log.log(`Seeded ${seededQuestions?.length || 0} default questions`);
        
        // Use the seeded questions
        questions = (seededQuestions || []).map(q => ({
          id: q.id,
          driver_id: q.driver_id,
          question_text: q.question_text,
          driver_key: (q.pulse_drivers as any).key,
          max_repeat_per_month: q.max_repeat_per_month,
          is_anonymous: q.is_anonymous,
        }));
      }

      if (questions.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Não foi possível criar perguntas padrão. Configure manualmente.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      questions = allQuestions.map(q => ({
        id: q.id,
        driver_id: q.driver_id,
        question_text: q.question_text,
        driver_key: (q.pulse_drivers as any).key,
        max_repeat_per_month: q.max_repeat_per_month,
        is_anonymous: q.is_anonymous,
      }));
    }

    log.log(`Found ${questions.length} active questions`);

    // Get question usage history for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: historyThisMonth } = await supabase
      .from('pulse_question_history')
      .select('question_id')
      .eq('account_id', account_id)
      .gte('used_date', startOfMonth.toISOString().split('T')[0]);

    const questionUsageCount: Record<string, number> = {};
    historyThisMonth?.forEach(h => {
      questionUsageCount[h.question_id] = (questionUsageCount[h.question_id] || 0) + 1;
    });

    // Get recent questions to avoid (within max_repeat_block_days)
    const blockDate = new Date();
    blockDate.setDate(blockDate.getDate() - rules.max_repeat_block_days);

    const { data: recentHistory } = await supabase
      .from('pulse_question_history')
      .select('question_id')
      .eq('account_id', account_id)
      .gte('used_date', blockDate.toISOString().split('T')[0]);

    const recentQuestionIds = new Set(recentHistory?.map(h => h.question_id) || []);

    // Filter questions that can be used
    const availableQuestions = questions.filter(q => {
      // Check monthly limit
      const usedThisMonth = questionUsageCount[q.id] || 0;
      if (usedThisMonth >= q.max_repeat_per_month) {
        return false;
      }
      // Check recent usage
      if (recentQuestionIds.has(q.id)) {
        return false;
      }
      return true;
    });

    log.log(`${availableQuestions.length} questions available after filtering`);

    // Select questions based on rules
    const selectedQuestions: Question[] = [];
    const usedDriverKeys = new Set<string>();

    // 1. Must include (e.g., mood_energy)
    for (const driverKey of rules.must_include_driver_keys) {
      if (selectedQuestions.length >= rules.daily_questions_count) break;
      
      const driverQuestions = availableQuestions.filter(
        q => q.driver_key === driverKey && !selectedQuestions.includes(q)
      );
      
      if (driverQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * driverQuestions.length);
        selectedQuestions.push(driverQuestions[randomIndex]);
        usedDriverKeys.add(driverKey);
        log.log(`Selected must-include question for driver: ${driverKey}`);
      }
    }

    // 2. Prefer drivers (e.g., culture_values, purpose)
    for (const driverKey of rules.prefer_driver_keys) {
      if (selectedQuestions.length >= rules.daily_questions_count) break;
      if (usedDriverKeys.has(driverKey)) continue;
      
      const driverQuestions = availableQuestions.filter(
        q => q.driver_key === driverKey && !selectedQuestions.includes(q)
      );
      
      if (driverQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * driverQuestions.length);
        selectedQuestions.push(driverQuestions[randomIndex]);
        usedDriverKeys.add(driverKey);
        log.log(`Selected preferred question for driver: ${driverKey}`);
      }
    }

    // 3. Fill remaining with rotation pool or any available
    const rotationPool = rules.rotation_pool_driver_keys.length > 0 
      ? rules.rotation_pool_driver_keys 
      : [...new Set(availableQuestions.map(q => q.driver_key))];

    while (selectedQuestions.length < rules.daily_questions_count) {
      const availableForRotation = availableQuestions.filter(
        q => !selectedQuestions.includes(q) && 
             (rotationPool.includes(q.driver_key) || rules.rotation_pool_driver_keys.length === 0)
      );
      
      if (availableForRotation.length === 0) {
        log.log('No more questions available for rotation');
        break;
      }
      
      // Prefer drivers not yet used
      const unusedDriverQuestions = availableForRotation.filter(
        q => !usedDriverKeys.has(q.driver_key)
      );
      
      const poolToUse = unusedDriverQuestions.length > 0 ? unusedDriverQuestions : availableForRotation;
      const randomIndex = Math.floor(Math.random() * poolToUse.length);
      const selected = poolToUse[randomIndex];
      
      selectedQuestions.push(selected);
      usedDriverKeys.add(selected.driver_key);
      log.log(`Selected rotation question for driver: ${selected.driver_key}`);
    }

    if (selectedQuestions.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Não foi possível selecionar perguntas. Verifique as configurações.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.log(`Selected ${selectedQuestions.length} questions for today`);

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('pulse_daily_assignments')
      .insert({
        account_id,
        date: targetDate,
        generated_by: 'system',
        notes: `Generated with ${selectedQuestions.length} questions`
      })
      .select()
      .single();

    if (assignmentError) {
      log.error('Error creating assignment:', assignmentError);
      return new Response(JSON.stringify({ error: 'Erro ao criar agenda' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create assignment items
    const items = selectedQuestions.map((q, index) => ({
      assignment_id: assignment.id,
      order_index: index + 1,
      question_id: q.id,
    }));

    const { error: itemsError } = await supabase
      .from('pulse_daily_assignment_items')
      .insert(items);

    if (itemsError) {
      log.error('Error creating assignment items:', itemsError);
      // Rollback assignment
      await supabase.from('pulse_daily_assignments').delete().eq('id', assignment.id);
      return new Response(JSON.stringify({ error: 'Erro ao criar itens da agenda' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record question history
    const historyRecords = selectedQuestions.map(q => ({
      account_id,
      question_id: q.id,
      used_date: targetDate,
    }));

    await supabase.from('pulse_question_history').insert(historyRecords);

    log.log('Daily pulse generated successfully');

    return new Response(JSON.stringify({
      success: true,
      assignment_id: assignment.id,
      date: targetDate,
      questions_count: selectedQuestions.length,
      questions: selectedQuestions.map(q => ({
        id: q.id,
        driver_key: q.driver_key,
        question_text: q.question_text,
        is_anonymous: q.is_anonymous,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error in generate-daily-pulse:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
