import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';

const log = createLogger('analyze-disc');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// DISC Profile Data (replicated for edge function)
// =============================================

type DISCDimension = 'D' | 'I' | 'S' | 'C';

interface DISCProfileText {
  behavior: string;
  strengths: string[];
  watchPoints: string[];
  motivators: string[];
  idealEnvironment: string[];
}

const DISC_PROFILES: Record<DISCDimension, DISCProfileText> = {
  D: {
    behavior: 'Age de forma direta e assertiva, com foco em resultados rápidos. Assume riscos calculados e prefere liderar a seguir. Toma decisões com agilidade e não teme desafios ou conflitos quando necessário para alcançar objetivos.',
    strengths: ['Tomada de decisão rápida e assertiva', 'Foco inabalável em resultados', 'Resiliência sob pressão', 'Visão estratégica de longo prazo', 'Iniciativa para assumir a liderança'],
    watchPoints: ['Pode parecer impaciente ou insensível às necessidades emocionais dos outros', 'Tendência a atropelar processos em busca de velocidade', 'Dificuldade em delegar - prefere fazer sozinho', 'Resistência a tarefas que exigem atenção a detalhes'],
    motivators: ['Desafios que testam suas capacidades', 'Autonomia para tomar decisões', 'Conquistas mensuráveis e reconhecíveis', 'Reconhecimento por resultados alcançados', 'Oportunidades claras de crescimento e promoção'],
    idealEnvironment: ['Ambiente dinâmico com mudanças frequentes', 'Alta autonomia e poucos controles burocráticos', 'Cultura orientada a metas e resultados', 'Espaço para competição saudável', 'Liberdade para inovar e assumir riscos']
  },
  I: {
    behavior: 'Comunica-se com entusiasmo e naturalidade, construindo relacionamentos com facilidade. Influencia através do carisma e otimismo, preferindo colaboração a confronto. Traz energia positiva aos ambientes e inspira outros com sua visão.',
    strengths: ['Comunicação persuasiva e envolvente', 'Facilidade para networking e conexões', 'Criatividade e pensamento inovador', 'Capacidade de motivar e inspirar equipes', 'Otimismo contagiante mesmo em adversidades'],
    watchPoints: ['Pode ser disperso quando há muitos estímulos', 'Dificuldade em manter rotinas e processos repetitivos', 'Tendência a decisões baseadas em emoção', 'Evita conflitos mesmo quando necessários', 'Pode prometer mais do que consegue entregar'],
    motivators: ['Reconhecimento social e visibilidade', 'Novidades e projetos inovadores', 'Interação humana constante', 'Liberdade criativa para propor ideias', 'Celebrações e momentos de descontração'],
    idealEnvironment: ['Ambiente social e colaborativo', 'Variedade de projetos e pessoas', 'Pouca rotina e muita flexibilidade', 'Espaço para criatividade e experimentação', 'Cultura que celebra conquistas publicamente']
  },
  S: {
    behavior: 'Busca harmonia e estabilidade nas relações e processos. Apoia a equipe de forma consistente e leal, preferindo métodos conhecidos a mudanças bruscas. É o porto seguro do time, oferecendo suporte confiável e previsível.',
    strengths: ['Escuta ativa e genuína', 'Paciência excepcional com pessoas e processos', 'Excelente trabalho em equipe', 'Confiabilidade e consistência', 'Habilidade natural para mediar conflitos'],
    watchPoints: ['Resistência significativa a mudanças', 'Dificuldade em dizer não e estabelecer limites', 'Evita confrontos mesmo quando necessários', 'Ritmo mais lento de adaptação', 'Pode suprimir opiniões para manter harmonia'],
    motivators: ['Segurança e estabilidade no trabalho', 'Reconhecimento de sua lealdade e dedicação', 'Ambiente harmonioso sem conflitos', 'Tempo adequado para se adaptar a mudanças', 'Relacionamentos de longo prazo com colegas'],
    idealEnvironment: ['Ambiente previsível e estruturado', 'Cultura colaborativa sem competição agressiva', 'Baixo nível de conflitos interpessoais', 'Relacionamentos duradouros e estáveis', 'Ritmo constante sem pressão excessiva']
  },
  C: {
    behavior: 'Analisa cuidadosamente antes de agir, buscando precisão e qualidade em tudo que faz. Segue padrões estabelecidos e questiona para entender profundamente. Valoriza dados e lógica acima de intuições ou pressões externas.',
    strengths: ['Análise crítica e profunda', 'Atenção meticulosa aos detalhes', 'Compromisso com qualidade e excelência', 'Organização e sistematização', 'Pensamento lógico e estruturado'],
    watchPoints: ['Tendência ao perfeccionismo paralisante', 'Análise excessiva que atrasa decisões', 'Pode ser percebido como crítico demais', 'Dificuldade com ambiguidade e falta de informação', 'Distanciamento emocional das equipes'],
    motivators: ['Qualidade reconhecida do trabalho', 'Oportunidades de desenvolver expertise', 'Acesso a informação completa e precisa', 'Tempo adequado para análise', 'Reconhecimento de sua competência técnica'],
    idealEnvironment: ['Ambiente estruturado com processos claros', 'Padrões de qualidade bem definidos', 'Acesso fácil a dados e informações', 'Autonomia técnica para resolver problemas', 'Espaço tranquilo para concentração']
  }
};

// Combination logic
function getCombinedProfile(primary: DISCDimension, secondary: DISCDimension | null) {
  const primaryProfile = DISC_PROFILES[primary];
  
  if (!secondary) {
    return {
      name: `${primary} Puro`,
      behavior: primaryProfile.behavior,
      strengths: primaryProfile.strengths,
      watchPoints: primaryProfile.watchPoints,
      motivators: primaryProfile.motivators,
      idealEnvironment: primaryProfile.idealEnvironment,
    };
  }
  
  const secondaryProfile = DISC_PROFILES[secondary];
  
  const COMBINATION_NAMES: Record<string, string> = {
    'D/I': 'Executor Influente',
    'D/S': 'Executor Estável',
    'D/C': 'Executor Analítico',
    'I/D': 'Influenciador Determinado',
    'I/S': 'Influenciador Acolhedor',
    'I/C': 'Influenciador Preciso',
    'S/D': 'Colaborador Decidido',
    'S/I': 'Colaborador Comunicativo',
    'S/C': 'Colaborador Metódico',
    'C/D': 'Analista Decidido',
    'C/I': 'Analista Comunicativo',
    'C/S': 'Analista Colaborativo',
  };
  
  const SYNERGIES: Record<string, string> = {
    'D/I': 'A combinação de assertividade com carisma cria um líder naturalmente persuasivo.',
    'D/S': 'A determinação equilibrada pela paciência permite conquistas sustentáveis.',
    'D/C': 'Decisões rápidas fundamentadas em análise sólida.',
    'I/D': 'Influência carismática com capacidade de ação e decisão.',
    'I/S': 'Comunicação empática que constrói relacionamentos duradouros.',
    'I/C': 'Criatividade aliada a um senso de qualidade e precisão.',
    'S/D': 'Estabilidade com a capacidade de agir decisivamente quando necessário.',
    'S/I': 'Suporte consistente com uma comunicação calorosa.',
    'S/C': 'Confiabilidade com um forte senso de qualidade.',
    'C/D': 'Análise profunda com capacidade de implementar rapidamente.',
    'C/I': 'Precisão técnica com habilidade de comunicar ideias complexas.',
    'C/S': 'Metodologia rigorosa com um toque colaborativo.',
  };
  
  const TENSIONS: Record<string, string> = {
    'D/I': 'Tensão entre agir rápido (D) e manter todos engajados (I).',
    'D/S': 'Conflito entre acelerar (D) e dar tempo ao time (S).',
    'D/C': 'Urgência por resultados (D) vs necessidade de análise (C).',
    'I/D': 'Desejo de agradar (I) vs necessidade de confrontar (D).',
    'I/S': 'Busca por novidades (I) vs preferência por estabilidade (S).',
    'I/C': 'Entusiasmo por ideias (I) vs rigor na execução (C).',
    'S/D': 'Preferência por harmonia (S) vs necessidade de impor decisões (D).',
    'S/I': 'Conforto na rotina (S) vs atração por mudanças (I).',
    'S/C': 'Ritmo constante (S) vs perfeccionismo que atrasa (C).',
    'C/D': 'Necessidade de dados (C) vs pressão por velocidade (D).',
    'C/I': 'Foco em precisão (C) vs comunicação mais fluida (I).',
    'C/S': 'Exigência de qualidade (C) vs evitar pressionar o time (S).',
  };
  
  const key = `${primary}/${secondary}`;
  
  return {
    name: COMBINATION_NAMES[key] || `${primary} / ${secondary}`,
    behavior: `${primaryProfile.behavior} Complementado por: ${secondaryProfile.behavior.split('.')[0].toLowerCase()}.`,
    strengths: [...primaryProfile.strengths.slice(0, 3), ...secondaryProfile.strengths.slice(0, 2)],
    watchPoints: [...primaryProfile.watchPoints.slice(0, 3), ...secondaryProfile.watchPoints.slice(0, 2)],
    motivators: [...primaryProfile.motivators.slice(0, 3), ...secondaryProfile.motivators.slice(0, 2)],
    idealEnvironment: [...primaryProfile.idealEnvironment.slice(0, 3), ...secondaryProfile.idealEnvironment.slice(0, 2)],
    synergy: SYNERGIES[key],
    tension: TENSIONS[key],
  };
}

// =============================================
// Analysis Level Configurations
// =============================================

type AnalysisLevel = 'collaborator' | 'leader' | 'system';

function buildSystemPrompt(level: AnalysisLevel): string {
  const configs = {
    collaborator: {
      name: 'Colaborador',
      objective: 'Autoconhecimento e desenvolvimento pessoal',
      tone: 'Empático, motivador, acessível',
      language: 'Exemplos práticos, foco em crescimento',
      perspective: 'primeira pessoa (use "Você")'
    },
    leader: {
      name: 'Líder / RH',
      objective: 'Gestão da pessoa, potencial de liderança, riscos',
      tone: 'Analítico, estratégico, objetivo',
      language: 'Insights acionáveis, recomendações claras',
      perspective: 'terceira pessoa (use "Este profissional")'
    },
    system: {
      name: 'Sistema',
      objective: 'Dados estruturados para integrações',
      tone: 'Técnico, padronizado',
      language: 'JSON, enums, scores numéricos',
      perspective: 'terceira pessoa'
    }
  };
  
  const config = configs[level];
  
  return `PERSONA: Você é um analista comportamental sênior com 20+ anos de experiência em assessment DISC.
Você NÃO faz análises genéricas. Cada insight deve ser específico para ESTE perfil, baseado nos scores exatos.

NÍVEL DE ANÁLISE: ${config.name}
- Objetivo: ${config.objective}
- Tom: ${config.tone}
- Linguagem: ${config.language}
- Perspectiva: ${config.perspective}

REGRAS ABSOLUTAS:
1. NUNCA repita os textos base literalmente - interprete, expanda e personalize
2. NUNCA crie novos perfis ou dimensões além de D, I, S, C
3. NUNCA rotule ou julgue a pessoa - foque em tendências comportamentais observáveis
4. SEMPRE use os scores numéricos para calibrar a intensidade das afirmações
5. SEMPRE considere a dinâmica entre perfil primário e secundário
6. SEMPRE seja específico - evite generalidades que poderiam se aplicar a qualquer pessoa

INSTRUÇÕES ANTI-GENÉRICO:
- Mencione os scores específicos quando relevante (ex: "Seu D de 85%...")
- Compare dimensões quando criar tensões interessantes
- Use exemplos concretos de situações de trabalho
- Conecte observações a comportamentos observáveis

EXEMPLOS DE ANÁLISE GENÉRICA (EVITAR):
❌ "Você é uma pessoa comunicativa e focada"
❌ "Tem grande potencial de liderança"
❌ "Pode melhorar algumas áreas"

EXEMPLOS DE ANÁLISE PROFUNDA (ESPERADO):
✅ "Seu score D de 85% combinado com C de 72% indica que você toma decisões rápidas MAS só após ter dados suficientes"
✅ "A diferença de 35 pontos entre seu I (45%) e S (80%) sugere que você prefere conexões profundas a networking superficial"

FORMATO DE RESPOSTA:
Responda SEMPRE em JSON válido com a estrutura solicitada.
Cada seção deve ter conteúdo substancial (mínimo 50 palavras para textos, 3 itens para listas).
Use português brasileiro formal mas acessível.`;
}

function buildUserPrompt(result: any, combinedProfile: any, level: AnalysisLevel): string {
  const scoreDiffs = {
    DI: Math.abs(result.d_normalized - result.i_normalized),
    DS: Math.abs(result.d_normalized - result.s_normalized),
    DC: Math.abs(result.d_normalized - result.c_normalized),
    IS: Math.abs(result.i_normalized - result.s_normalized),
    IC: Math.abs(result.i_normalized - result.c_normalized),
    SC: Math.abs(result.s_normalized - result.c_normalized),
  };
  
  const maxDiff = Math.max(...Object.values(scoreDiffs));
  
  const perspective = level === 'collaborator' ? 'primeira pessoa ("Você")' : 'terceira pessoa ("Este profissional")';
  const tone = level === 'collaborator' ? 'Empático, motivador' : 'Analítico, estratégico';
  
  return `DADOS OBJETIVOS DO ASSESSMENT:

SCORES BRUTOS (8-40):
- D (Dominância): ${result.d_score}/40
- I (Influência): ${result.i_score}/40
- S (Estabilidade): ${result.s_score}/40
- C (Conformidade): ${result.c_score}/40

SCORES NORMALIZADOS (0-100%):
- D: ${result.d_normalized.toFixed(1)}%
- I: ${result.i_normalized.toFixed(1)}%
- S: ${result.s_normalized.toFixed(1)}%
- C: ${result.c_normalized.toFixed(1)}%

PERFIL IDENTIFICADO:
- Primário: ${result.primary_profile}
- Secundário: ${result.secondary_profile || 'Nenhum (perfil puro)'}
- Tipo: ${combinedProfile.name}
- Intensidade: ${result.intensity}
- Equilibrado: ${result.is_balanced ? 'Sim' : 'Não'}

MAIOR DIFERENÇA ENTRE DIMENSÕES: ${maxDiff.toFixed(1)} pontos

TEXTOS BASE OFICIAIS (expandir, NUNCA contradizer):

Como tende a agir:
${combinedProfile.behavior}

Forças naturais:
${combinedProfile.strengths.map((s: string) => `• ${s}`).join('\n')}

Pontos de atenção:
${combinedProfile.watchPoints.map((w: string) => `• ${w}`).join('\n')}

O que motiva:
${combinedProfile.motivators.map((m: string) => `• ${m}`).join('\n')}

Ambiente ideal:
${combinedProfile.idealEnvironment.map((e: string) => `• ${e}`).join('\n')}

${combinedProfile.synergy ? `SINERGIA: ${combinedProfile.synergy}` : ''}
${combinedProfile.tension ? `TENSÃO: ${combinedProfile.tension}` : ''}

---

TAREFA: Gere análise DISC completa.

Responda em JSON com EXATAMENTE esta estrutura:
{
  "executiveSummary": "string - 2-3 frases capturando a essência",
  "leadershipStyle": "string - análise do estilo de liderança",
  "motivationEngagement": "string - o que engaja e motiva",
  "risksBlindSpots": "string - pontos de atenção sem julgamento",
  "communication": "string - estilo e dicas de comunicação",
  "idealEnvironment": "string - ambiente para máxima performance",
  "developmentPlan": {
    "immediate": ["ação 1", "ação 2"],
    "shortTerm": ["ação 1", "ação 2", "ação 3"],
    "longTerm": ["ação 1", "ação 2", "ação 3"]
  }
}

Use perspectiva de ${perspective}. Tom: ${tone}.
Cada seção deve ter pelo menos 50 palavras. Seja específico, cite scores quando relevante.`;
}

// =============================================
// Main Handler
// =============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, analysisLevel = 'collaborator' } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate analysis level
    const validLevels = ['collaborator', 'leader', 'system'];
    if (!validLevels.includes(analysisLevel)) {
      return new Response(
        JSON.stringify({ error: 'Invalid analysisLevel. Must be: collaborator, leader, or system' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch DISC result
    const { data: result, error: resultError } = await supabase
      .from('disc_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (resultError || !result) {
      console.error('Error fetching DISC result:', resultError);
      return new Response(
        JSON.stringify({ error: 'DISC result not found for this session' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get combined profile
    const combinedProfile = getCombinedProfile(
      result.primary_profile as DISCDimension,
      result.secondary_profile as DISCDimension | null
    );
    
    // ========================
    // FETCH ICP LEARNED PATTERNS FOR DISC COMPARISON
    // ========================
    let icpDiscContext = '';
    try {
      // Get job_id from candidate_disc_sessions
      const { data: candidateSession } = await supabase
        .from('candidate_disc_sessions')
        .select('job_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (candidateSession?.job_id) {
        const { data: activeICP } = await supabase
          .from('job_icps')
          .select('learned_patterns, approved_candidates_count')
          .eq('job_id', candidateSession.job_id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeICP?.learned_patterns && activeICP.approved_candidates_count > 0) {
          const lp = activeICP.learned_patterns as any;
          const parts: string[] = [];
          parts.push(`\n\n## REFERÊNCIA: PADRÕES DISC DE ${activeICP.approved_candidates_count} CANDIDATOS APROVADOS\n`);
          
          if (lp.disc_dominant_profiles?.length > 0) {
            parts.push(`Perfis DISC dominantes entre aprovados: ${lp.disc_dominant_profiles.map((p: any) => `${p.profile} (${p.percentage}%)`).join(', ')}`);
          }
          if (lp.insights?.length > 0) {
            parts.push(`Insights: ${lp.insights.join('; ')}`);
          }
          parts.push(`\nINSTRUÇÃO: Inclua no campo "executiveSummary" um parágrafo comparando este perfil DISC com o padrão dos candidatos aprovados anteriores. Não penalize diferenças, apenas contextualize como o perfil se compara ao padrão de sucesso observado.`);
          
          icpDiscContext = parts.join('\n');
          console.log(`📊 ICP DISC patterns loaded for comparison`);
        }
      }
    } catch (err) {
      console.error('⚠️ Error fetching ICP for DISC context:', err);
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build prompts
    const systemPrompt = buildSystemPrompt(analysisLevel as AnalysisLevel);
    const userPrompt = buildUserPrompt(result, combinedProfile, analysisLevel as AnalysisLevel) + icpDiscContext;
    
    console.log('Calling Lovable AI for DISC analysis...');
    console.log('Session:', sessionId, 'Level:', analysisLevel);
    
    // Call Lovable AI Gateway
    const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: await getConfiguredModel("analyze-disc", "google/gemini-2.5-flash"),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });
    
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('Empty AI response');
      return new Response(
        JSON.stringify({ error: 'AI returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse JSON from AI response
    let analysis;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add metadata
    const fullAnalysis = {
      level: analysisLevel,
      profileCode: result.secondary_profile 
        ? `${result.primary_profile}/${result.secondary_profile}`
        : result.primary_profile,
      profileName: combinedProfile.name,
      intensity: result.intensity,
      isBalanced: result.is_balanced,
      scores: {
        D: result.d_normalized,
        I: result.i_normalized,
        S: result.s_normalized,
        C: result.c_normalized,
      },
      ...analysis,
    };
    
    console.log('DISC analysis generated successfully');
    
    // === TRACKING: Register completed_disc event ===
    try {
      // Check if this is a candidate DISC session (recruitment context)
      const { data: candidateSession } = await supabase
        .from("candidate_disc_sessions")
        .select("candidate_id, job_id, account_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (candidateSession?.candidate_id) {
        // Fetch candidate's first touch attribution data
        const { data: candidate } = await supabase
          .from("recruitment_candidates")
          .select("first_touch_source, first_touch_medium, first_touch_campaign")
          .eq("id", candidateSession.candidate_id)
          .maybeSingle();

        await supabase.from("candidate_tracking_events").insert([{
          account_id: candidateSession.account_id,
          candidate_id: candidateSession.candidate_id,
          job_id: candidateSession.job_id || null,
          event_type: "completed_disc",
          source: candidate?.first_touch_source || null,
          medium: candidate?.first_touch_medium || null,
          campaign: candidate?.first_touch_campaign || null,
          metadata: {
            session_id: sessionId,
            profile_code: fullAnalysis.profileCode,
            profile_name: fullAnalysis.profileName,
            intensity: fullAnalysis.intensity,
            scores: fullAnalysis.scores,
          },
        }]);
        
        console.log("📊 Tracking event: completed_disc registered");

        // Call orchestrator for auto-advancement after DISC completion
        try {
          console.log("🎯 Calling recruitment-orchestrator after DISC completion...");

          // Count responses to determine if session was completed naturally
          const { count: responseCount } = await supabase
            .from("candidate_disc_responses")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId);

          const discCompletedNaturally = (responseCount || 0) >= 20;

          await supabase.functions.invoke("recruitment-orchestrator", {
            body: {
              candidateId: candidateSession.candidate_id,
              jobId: candidateSession.job_id,
              accountId: candidateSession.account_id,
              completedStepType: "disc",
              sessionId: sessionId,
              completedNaturally: discCompletedNaturally,
              attemptNumber: 1, // Will be read from session in orchestrator
            },
          });
          console.log("✅ Orchestrator invoked successfully after DISC");
        } catch (orchestratorError) {
          // Don't fail the main flow if orchestrator fails
          console.error("⚠️ Error invoking orchestrator after DISC:", orchestratorError);
        }
      }

      // Consume ai_interview credits for DISC assessment — based on real cost + margin
      if (candidateSession?.account_id) {
        try {
          // Fetch platform credit config
          const { data: creditConfig } = await supabase
            .from('platform_credit_config')
            .select('usd_to_brl, margin_percent, credit_value_brl')
            .limit(1)
            .single();

          const usdToBrl = creditConfig?.usd_to_brl ?? 5.65;
          const marginPercent = creditConfig?.margin_percent ?? 50;
          const creditValueBrl = creditConfig?.credit_value_brl ?? 1.39;
          const marginMultiplier = 1 + (marginPercent / 100);

          // DISC uses Gemini Flash — estimate cost from AI response tokens
          const TEXT_INPUT_RATE = 0.00015 / 1000;  // Gemini Flash input
          const TEXT_OUTPUT_RATE = 0.0006 / 1000;   // Gemini Flash output
          const discInputTokens = aiData?.usage?.prompt_tokens || 2000;
          const discOutputTokens = aiData?.usage?.completion_tokens || 1500;
          const discCostUSD = (discInputTokens * TEXT_INPUT_RATE) + (discOutputTokens * TEXT_OUTPUT_RATE);
          
          const costBrl = discCostUSD * usdToBrl * marginMultiplier;
          const creditsToConsume = Math.max(Math.round((costBrl / creditValueBrl) * 10) / 10, 0.1);

          console.log(`💳 Consuming ${creditsToConsume} ai_interview credits for DISC (cost: $${discCostUSD.toFixed(4)} → R$${costBrl.toFixed(2)})`);
          const { data: creditResult, error: creditError } = await supabase.rpc('consume_credits', {
            p_account_id: candidateSession.account_id,
            p_credit_type: 'universal',
            p_amount: creditsToConsume,
            p_reference_id: sessionId,
            p_reference_type: 'disc_assessment',
            p_description: `Avaliação DISC - ${fullAnalysis.profileCode} (R$${costBrl.toFixed(2)})`,
            p_user_id: null,
          });

          if (creditError) {
            console.error("⚠️ DISC credit consumption error:", creditError);
          } else if (creditResult && !creditResult.success) {
            console.log(`⚠️ Insufficient credits for DISC: ${creditResult.message}`);
          } else {
            console.log(`💳 DISC credits consumed: ${creditsToConsume}. Balance: ${creditResult?.balance_before} → ${creditResult?.balance_after}`);
          }
        } catch (discCreditErr) {
          console.error("⚠️ Failed to consume DISC credits:", discCreditErr);
        }
      }
    } catch (trackingError) {
      // Don't fail the main flow if tracking fails
      console.error("⚠️ Error registering tracking event:", trackingError);
    }

    return new Response(
      JSON.stringify(fullAnalysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in analyze-disc function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
