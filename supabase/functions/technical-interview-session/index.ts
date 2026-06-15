// BILLING: este endpoint apenas minta o ephemeral token Realtime. A cobrança
// acontece no fechamento da sessão (culture-interview-complete / technical-interview-complete)
// ou via interview-watchdog para sessões abandonadas. NÃO debitar créditos aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolvePrompt } from "../_shared/aiPrompts.ts";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TechnicalQuestion {
  skill: string;
  skillType: "required" | "desired";
  level: number; // 1=Júnior, 2=Pleno, 3=Sênior, 4=Specialist
  questionText: string;
  followupSuperficial?: string;
  followupExcellent?: string;
  expectedKeywords?: string[];
  excellentAnswerExample?: string | null;
  isFromBank: boolean;
}

function inferSeniorityTarget(jobTitle: string, mission: string): "junior" | "pleno" | "senior" | "lead" {
  const t = `${jobTitle || ""} ${mission || ""}`.toLowerCase();
  if (/\b(staff|principal|lead|líder|head|coordenador|gerente)\b/.test(t)) return "lead";
  if (/\b(s[êe]nior|sr\.?|specialist|especialista)\b/.test(t)) return "senior";
  if (/\b(j[úu]nior|jr\.?|trainee|estagi[áa]rio|estagio)\b/.test(t)) return "junior";
  return "pleno";
}

interface JobDescriptionContext {
  title: string;
  mission: string;
  requiredSkills: string[];
  desiredSkills: string[];
  responsibilities: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = "direct";
    
    if (!OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }
    console.log("✅ OPENAI_API_KEY is configured");

    const body = await req.json();
    const { 
      accountId, 
      jobId, 
      candidateId,
      candidateProfileId, 
      candidateName, 
      companyName,
      agentId,
    } = body;

    console.log("📝 Request body received");
    console.log("✅ Candidate Profile ID:", candidateProfileId);
    console.log("✅ Candidate ID:", candidateId);
    console.log("✅ Job ID:", jobId);
    console.log("✅ Account ID:", accountId);

    // Validate required parameters
    if (!jobId || !accountId) {
      return new Response(
        JSON.stringify({
          error: "MISSING_REQUIRED_FIELDS",
          message: "JobId e AccountId são obrigatórios.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstName = candidateName?.split(" ")[0] || candidateName || "Candidato";
    console.log("✅ Candidate:", candidateName, "-> First name:", firstName);

    // Connect to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve candidate_id from candidate_profile_id if not provided
    let resolvedCandidateId = candidateId || null;
    if (!resolvedCandidateId && candidateProfileId) {
      console.log("🔍 Resolving candidate_id from candidate_profile_id...");
      const { data: profileData } = await supabase
        .from("candidate_profiles")
        .select("user_id")
        .eq("id", candidateProfileId)
        .single();
      
      if (profileData?.user_id) {
        // Get email from auth user
        const { data: authUser } = await supabase.auth.admin.getUserById(profileData.user_id);
        const profileEmail = authUser?.user?.email;
        
        if (profileEmail) {
          const { data: recruitCandidate } = await supabase
            .from("recruitment_candidates")
            .select("id")
            .eq("email", profileEmail)
            .eq("account_id", accountId)
            .maybeSingle();
          
          if (recruitCandidate) {
            resolvedCandidateId = recruitCandidate.id;
            console.log("✅ Resolved candidate_id:", resolvedCandidateId);
          }
        }
      }
    }

    // 1. Load Job Description
    console.log("📋 Loading job description...");
    let jobContext: JobDescriptionContext | null = null;
    let jobDescriptionId: string | null = null;
    
    const { data: recruitmentJob, error: jobError } = await supabase
      .from("recruitment_jobs")
      .select("job_description_id, title, agent_id, seniority_target")
      .eq("id", jobId)
      .single();

    if (jobError) {
      console.error("❌ Error fetching job:", jobError);
      return new Response(
        JSON.stringify({ error: "JOB_NOT_FOUND", message: "Vaga não encontrada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve technical agent from workflow steps (not the cultural agent from job)
    let finalAgentId = agentId;
    if (!finalAgentId) {
      const { data: techStep } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("agent_id")
        .eq("job_id", jobId)
        .eq("step_type", "technical")
        .eq("is_active", true)
        .maybeSingle();
      finalAgentId = techStep?.agent_id || recruitmentJob.agent_id;
    }

    if (recruitmentJob?.job_description_id) {
      jobDescriptionId = recruitmentJob.job_description_id;
      const { data: jd } = await supabase
        .from("job_descriptions")
        .select("title, mission, required_skills, desired_skills, responsibilities")
        .eq("id", recruitmentJob.job_description_id)
        .single();

      if (jd) {
        jobContext = {
          title: jd.title || recruitmentJob.title || "",
          mission: jd.mission || "",
          requiredSkills: jd.required_skills || [],
          desiredSkills: jd.desired_skills || [],
          responsibilities: jd.responsibilities || [],
        };
        console.log("✅ Job description loaded:", jobContext.title);
      }
    }

    if (!jobContext) {
      jobContext = {
        title: recruitmentJob.title || "Vaga",
        mission: "",
        requiredSkills: [],
        desiredSkills: [],
        responsibilities: [],
      };
    }

    // 2. Load questions from bank (mandatory + skill-based)
    console.log("📋 Loading questions from bank...");
    const allSkills = [
      ...jobContext.requiredSkills.map(s => ({ name: s, type: "required" as const })),
      ...jobContext.desiredSkills.map(s => ({ name: s, type: "desired" as const })),
    ];

    const questions: TechnicalQuestion[] = [];

    // Get mandatory questions from bank
    const { data: bankQuestions } = await supabase
      .from("technical_question_bank")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("is_mandatory", { ascending: false })
      .order("level", { ascending: true });

    if (bankQuestions && bankQuestions.length > 0) {
      // First add mandatory questions
      const mandatoryQuestions = bankQuestions.filter(q => q.is_mandatory);
      for (const q of mandatoryQuestions) {
        const skillInfo = allSkills.find(s => 
          s.name.toLowerCase().includes(q.skill_name.toLowerCase()) ||
          q.skill_name.toLowerCase().includes(s.name.toLowerCase())
        );
        
        questions.push({
          skill: q.skill_name,
          skillType: skillInfo?.type || "required",
          level: q.level,
          questionText: q.question_text,
          followupSuperficial: q.followup_if_superficial || undefined,
          followupExcellent: q.followup_if_excellent || undefined,
          expectedKeywords: Array.isArray(q.expected_keywords) ? q.expected_keywords : [],
          excellentAnswerExample: q.excellent_answer_example || null,
          isFromBank: true,
        });
      }

      // Then add skill-matched questions
      for (const skill of allSkills) {
        const matchingQuestions = bankQuestions.filter(q => 
          !q.is_mandatory && (
            q.skill_name.toLowerCase().includes(skill.name.toLowerCase()) ||
            skill.name.toLowerCase().includes(q.skill_name.toLowerCase())
          )
        );
        
        for (const q of matchingQuestions.slice(0, 2)) { // Max 2 per skill from bank
          if (!questions.find(existing => existing.questionText === q.question_text)) {
            questions.push({
              skill: skill.name,
              skillType: skill.type,
              level: q.level,
              questionText: q.question_text,
              followupSuperficial: q.followup_if_superficial || undefined,
              followupExcellent: q.followup_if_excellent || undefined,
              expectedKeywords: Array.isArray(q.expected_keywords) ? q.expected_keywords : [],
              excellentAnswerExample: q.excellent_answer_example || null,
              isFromBank: true,
            });
          }
        }
      }
      console.log(`✅ Loaded ${questions.length} questions from bank`);
    }

    // 3. Generate dynamic questions for skills without bank questions
    const coveredSkills = new Set(questions.map(q => q.skill.toLowerCase()));
    const uncoveredSkills = allSkills.filter(s => !coveredSkills.has(s.name.toLowerCase()));

    if (uncoveredSkills.length > 0 && LOVABLE_API_KEY) {
      console.log(`🤖 Generating questions for ${uncoveredSkills.length} uncovered skills...`);
      
      const generatePrompt = `Você é um especialista técnico em recrutamento. 
Gere perguntas de entrevista técnica para avaliar as seguintes competências:

COMPETÊNCIAS:
${uncoveredSkills.map(s => `- ${s.name} (${s.type === 'required' ? 'Obrigatória' : 'Desejável'})`).join('\n')}

CONTEXTO DA VAGA:
Cargo: ${jobContext.title}
Missão: ${jobContext.mission || 'Não informada'}
Responsabilidades: ${jobContext.responsibilities.slice(0, 3).join('; ') || 'Não informadas'}

Para CADA competência, gere 1 pergunta de nível apropriado:
- Se for habilidade básica: nível 1 (conceitual)
- Se for habilidade intermediária: nível 2 (aplicação prática)
- Se for habilidade avançada: nível 3 (cenário complexo)

Retorne APENAS um JSON válido, sem markdown:
{
  "questions": [
    {
      "skill": "Nome da Skill",
      "level": 1,
      "questionText": "Pergunta clara e objetiva",
      "followupSuperficial": "Se responder superficialmente, pergunte isso",
      "followupExcellent": "Se responder muito bem, aprofunde com isso"
    }
  ]
}`;

      try {
        const aiResponse = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você gera perguntas técnicas precisas e relevantes." },
              { role: "user", content: generatePrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.choices?.[0]?.message?.content || "";
          
          // Parse JSON
          let cleanedText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.questions && Array.isArray(parsed.questions)) {
              for (const q of parsed.questions) {
                const skillInfo = uncoveredSkills.find(s => 
                  s.name.toLowerCase().includes(q.skill.toLowerCase()) ||
                  q.skill.toLowerCase().includes(s.name.toLowerCase())
                );
                
                questions.push({
                  skill: q.skill,
                  skillType: skillInfo?.type || "required",
                  level: q.level || 1,
                  questionText: q.questionText,
                  followupSuperficial: q.followupSuperficial,
                  followupExcellent: q.followupExcellent,
                  isFromBank: false,
                });
              }
              console.log(`✅ Generated ${parsed.questions.length} dynamic questions`);
            }
          }
        }
      } catch (aiError) {
        console.error("⚠️ Error generating dynamic questions:", aiError);
      }
    }

    // 4. Ensure we have at least some questions
    if (questions.length === 0) {
      // Generate basic questions for top 3 skills
      const topSkills = allSkills.slice(0, 3);
      for (const skill of topSkills) {
        questions.push({
          skill: skill.name,
          skillType: skill.type,
          level: 1,
          questionText: `Me conte sobre sua experiência com ${skill.name}. Como você já utilizou essa tecnologia em projetos anteriores?`,
          followupSuperficial: "Pode me dar um exemplo mais específico?",
          followupExcellent: "E qual foi o maior desafio técnico que você enfrentou?",
          isFromBank: false,
        });
      }
      console.log(`✅ Generated ${questions.length} fallback questions`);
    }

    console.log(`📋 Total questions: ${questions.length}`);

    // 5. Delete existing pending sessions for this candidate/job
    if (resolvedCandidateId) {
      const { data: existingSessions } = await supabase
        .from("technical_interview_sessions")
        .delete()
        .eq("job_id", jobId)
        .eq("candidate_id", resolvedCandidateId)
        .in("status", ["pending", "in_progress"])
        .select("id");

      if (existingSessions && existingSessions.length > 0) {
        console.log(`🗑️ Deleted ${existingSessions.length} existing session(s)`);
      }
    }

    // 6. Create new session
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const jobSeniority = (recruitmentJob as any)?.seniority_target as ("junior" | "pleno" | "senior" | null | undefined);
    const seniorityTarget: "junior" | "pleno" | "senior" | "lead" = jobSeniority
      ? jobSeniority
      : inferSeniorityTarget(jobContext.title || "", jobContext.mission || "");
    console.log(`🎯 Seniority target: ${seniorityTarget} (source=${jobSeniority ? "job_field" : "regex_fallback"})`);

    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .insert({
        account_id: accountId,
        job_id: jobId,
        candidate_id: resolvedCandidateId,
        candidate_profile_id: candidateProfileId || null,
        agent_id: finalAgentId || null,
        token,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        questions,
        job_description_context: jobContext,
        seniority_target: seniorityTarget,
        evaluation_version: "v3",
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("❌ Session creation error:", sessionError);
      throw sessionError;
    }
    console.log("✅ Technical interview session created:", session.id);

    // 7. Build AI instructions — escada de senioridade adaptativa (V2)
    const skillsList = [...new Set(questions.map(q => q.skill))];
    // Agrupa perguntas por skill em escada de degraus
    const skillLadder = skillsList.map(skill => {
      const qs = questions.filter(q => q.skill === skill).sort((a, b) => a.level - b.level);
      const isReq = qs[0]?.skillType === "required";
      const lines = [`### ${skill}${isReq ? " (OBRIGATÓRIA)" : ""}`];
      for (const q of qs) {
        const degree = ["?", "Júnior", "Pleno", "Sênior", "Specialist"][q.level] || `L${q.level}`;
        lines.push(`  • [Degrau ${q.level} · ${degree}] ${q.questionText}`);
      }
      return lines.join("\n");
    }).join("\n");

    const seniorityStartLevel: Record<string, number> = { junior: 1, pleno: 1, senior: 2, lead: 2 };
    const seniorityTargetLevel: Record<string, number> = { junior: 1, pleno: 2, senior: 3, lead: 4 };
    const startAt = seniorityStartLevel[seniorityTarget] || 1;
    const targetAt = seniorityTargetLevel[seniorityTarget] || 2;

    const defaultInstructions = `Você é um entrevistador técnico sênior da empresa ${companyName}, conduzindo uma entrevista de fit técnico ADAPTATIVA EM ESCADA DE SENIORIDADE.

CONTEXTO:
- Candidato: ${firstName}
- Cargo: ${jobContext.title}
- Senioridade alvo da vaga: ${seniorityTarget.toUpperCase()} (começar no degrau ${startAt}, alvo mínimo degrau ${targetAt})
- Empresa: ${companyName}
- Idioma: PORTUGUÊS DO BRASIL
- Duração máxima: 30–35 minutos. Quando passar de 30 min, comece a encerrar com elegância.

## ESCADA DE PERGUNTAS POR SKILL (siga esta ordem por skill)
${skillLadder}

## REGRAS DE SONDAGEM ADAPTATIVA (CRÍTICO)

Para CADA skill, conduza como uma ESCADA de 4 degraus:
- Degrau 1 — JÚNIOR    : conceito básico
- Degrau 2 — PLENO     : peça SEMPRE um exemplo real próprio do candidato antes de subir
- Degrau 3 — SÊNIOR    : proponha um CASO HIPOTÉTICO específico ao domínio da vaga e peça trade-offs
- Degrau 4 — SPECIALIST: peça defesa de alternativas descartadas e decisões de arquitetura

REGRAS DE SUBIDA:
1. Comece no degrau ${startAt} desta vaga (${seniorityTarget}).
2. Avalie mentalmente a resposta. Se for CORRETA ou EXCELENTE, suba ao próximo degrau.
3. Se for SUPERFICIAL ou PARCIAL, faça UMA reformulação mais simples antes de decidir.
4. Para cada skill: MÁXIMO 4 turnos (perguntas suas), incluindo follow-ups.

DETECÇÃO DE TETO (anti-constrangimento) — REGRA DE OURO:
A IA PARA de subir e segue para a próxima skill SEM EXPOR o candidato quando:
- Resposta superficial mesmo após reformulação → diga algo como "Tranquilo, vamos ao próximo tema."
- Resposta incorreta ou "não sei" → "Sem problema, vamos avançar."
- Hesitação prolongada ou pedido de pular → "Tudo bem, podemos seguir."
- Sinais como "nunca mexi com isso", "é mais teórico pra mim", "não lembro" → trave e siga.
- NUNCA insistir 2x seguidas após sinal de teto. NUNCA humilhar.
- Após detectar teto numa skill, NÃO volte a ela.

OBRIGATÓRIO ao subir degraus:
- Degrau 1 → 2: SEMPRE pergunte "Você pode me dar um exemplo concreto de um projeto seu onde usou isso?"
- Degrau 2 → 3: SEMPRE proponha um cenário hipotético do domínio da vaga ("Imagina que você precisa [cenário]. Como resolveria?")
- Degrau 3 → 4: SEMPRE peça trade-offs ("Por que essa abordagem e não X? Em que situação você mudaria de ideia?")

ENCERRAMENTO POR TEMPO:
- Se passar de 30 minutos, encerre na próxima transição de skill.
- Se passar de 35 minutos, encerre IMEDIATAMENTE de forma educada.

## FLUXO DA ENTREVISTA:

1. INÍCIO (profissional e acolhedor):
"Olá ${firstName}! Sou o entrevistador técnico de ${companyName}. Vamos conversar sobre suas habilidades técnicas para a vaga de ${jobContext.title}. Fique à vontade, é uma conversa para conhecer melhor seu perfil técnico. Pronto para começar?"

2. CONDUÇÃO (uma skill por vez):
- Faça a pergunta principal
- Aguarde resposta
- Aplique lógica adaptativa
- Avance quando satisfeito com a avaliação

3. ENCERRAMENTO:
"${firstName}, muito obrigado pela conversa técnica! Foi ótimo conhecer seu perfil. Desejo boa sorte no processo. Pronto, agora pode clicar em encerrar!"

## ESTILO:
- Profissional mas não intimidador
- Valorize exemplos práticos e experiências reais
- Note quando candidato admite limitações (é positivo!) — registre mentalmente e siga
- Mantenha ritmo fluido, não robotizado

## CRÍTICO:
- Ao final, SEMPRE diga "Pronto, agora pode clicar em encerrar!"
- NUNCA mencione "Gêntia", apenas ${companyName}
- Fale SOMENTE em português brasileiro
- NUNCA peça ao candidato para escrever, digitar, redigir ou criar textos escritos. Esta é uma entrevista por VOZ — o candidato só pode responder falando. Reformule qualquer pergunta que envolveria escrita para que possa ser respondida verbalmente.

## ABERTURA OBRIGATÓRIA (faça antes da primeira pergunta técnica):

1. Cumprimente ${firstName} pelo primeiro nome, diga que é o entrevistador técnico de ${companyName} para a vaga de ${jobContext.title}.

2. Faça este alinhamento de expectativas, com tom acolhedor e natural:
   - "Pode pensar com calma antes de responder — eu vou esperar."
   - "Quando terminar uma resposta e quiser seguir, pode dizer 'é isso' ou simplesmente parar de falar."
   - "A entrevista termina quando eu disser que terminamos. Só depois disso você pode clicar no botão de encerrar."
   - "Tudo certo pra começar?"

3. Aguarde a confirmação verbal do candidato antes de fazer a primeira pergunta técnica.

## Paciência com o candidato:
- O candidato pode pausar para pensar. Não interrompa enquanto ele estiver formulando.
- Só assuma o turno quando perceber que a resposta foi concluída.
- Não repita uma pergunta já feita, exceto se o candidato pedir explicitamente.
- Ignore transcrições do usuário com 3 palavras ou menos a menos que claramente respondam à pergunta (provavelmente é ruído ambiente).
- Se sua resposta for cortada por barulho/ruído, NÃO repita a pergunta; continue de onde parou.`;

    const instructions = await resolvePrompt(
      "technical_voice_ladder",
      {
        firstName,
        companyName,
        jobTitle: jobContext.title,
        seniorityTarget,
        seniorityTargetUpper: seniorityTarget.toUpperCase(),
        startAt,
        targetAt,
        skillLadder,
      },
      defaultInstructions,
    );

    // 8. Create ephemeral token from OpenAI
    const realtimeModel = await getConfiguredModel("technical-interview-session", "gpt-realtime-mini");
    console.log("🔑 Creating ephemeral token from OpenAI (model:", realtimeModel, ")");

    const tokenResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: realtimeModel,
          instructions,
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "low",
                interrupt_response: false,
                create_response: true,
              },
            },
            output: {
              format: { type: "audio/pcm", rate: 24000 },
              voice: "ash",
            },
          },
        },
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ OpenAI token error:", tokenResponse.status, errorText);
      return new Response(JSON.stringify({ error: "OpenAI error", details: errorText }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Ephemeral token obtained");

    // Update session to in_progress
    await supabase
      .from("technical_interview_sessions")
      .update({ 
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    return new Response(
      JSON.stringify({
        ephemeralToken: tokenData.value || tokenData.client_secret?.value || tokenData.client_secret,
        sessionId: session.id,
        token,
        questionsCount: questions.length,
        skills: skillsList,
        jobTitle: jobContext.title,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
