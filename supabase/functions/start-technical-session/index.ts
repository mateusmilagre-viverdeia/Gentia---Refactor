// BILLING: este endpoint apenas minta o ephemeral token Realtime. A cobrança
// acontece no fechamento da sessão (culture-interview-complete / technical-interview-complete)
// ou via interview-watchdog para sessões abandonadas. NÃO debitar créditos aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolvePrompt } from "../_shared/aiPrompts.ts";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";
import { filterFactualQuestions } from "../_shared/factualQuestionFilter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    
    if (!OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "TOKEN_REQUIRED", message: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🚀 Starting technical interview session for token:", token);

    // Fetch and validate session
    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .select(`
        *,
        candidate:recruitment_candidates(first_name, last_name, email),
        job:recruitment_jobs(title)
      `)
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "SESSION_NOT_FOUND", message: "Sessão não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate session state
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: "SESSION_EXPIRED", message: "Sessão expirada" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status === "completed") {
      return new Response(
        JSON.stringify({ error: "SESSION_COMPLETED", message: "Entrevista já foi realizada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status === "cancelled" || session.status === "expired") {
      return new Response(
        JSON.stringify({ error: "SESSION_CANCELLED", message: "Sessão cancelada ou expirada" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle in_progress sessions: allow resumption within 60 minutes, up to 3 retomadas
    const RESUME_WINDOW_MIN = 60;
    const MAX_RESUMES = 3;
    const isResuming = session.status === "in_progress";
    if (isResuming) {
      const startedAt = session.started_at ? new Date(session.started_at) : null;
      const lastActivityAt = (session as any).last_activity_at
        ? new Date((session as any).last_activity_at)
        : startedAt;
      const cutoff = new Date(now.getTime() - RESUME_WINDOW_MIN * 60 * 1000);

      if (!lastActivityAt || lastActivityAt < cutoff) {
        console.log(`⏰ In-progress technical session inactive > ${RESUME_WINDOW_MIN} min, marking as completed`);
        await supabase
          .from("technical_interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return new Response(
          JSON.stringify({ error: "SESSION_COMPLETED", message: "O tempo da entrevista expirou. Ela foi encerrada automaticamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentResumeCount = (session as any).resume_count ?? 0;
      if (currentResumeCount >= MAX_RESUMES) {
        return new Response(
          JSON.stringify({
            error: "RESUME_LIMIT_REACHED",
            message: `Esta entrevista já foi retomada ${MAX_RESUMES} vezes. Peça ao recrutador para liberar uma nova tentativa.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("🔄 Resuming in_progress technical session:", session.id, "resume_count:", currentResumeCount);
    }

    // Get company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.account_id)
      .single();

    const companyName = company?.name || "Empresa";
    const candidateData = session.candidate as any;
    const fullName = [candidateData?.first_name, candidateData?.last_name].filter(Boolean).join(" ").trim();
    const candidateName = fullName.split(" ")[0] || "Candidato";
    const jobContext = session.job_description_context as any;
    const rawTechQuestions = session.questions as any[];
    const { kept: techKept, removed: techRemoved } = filterFactualQuestions(
      rawTechQuestions || [],
      (q: any) => q?.questionText || q?.question_text || "",
    );
    if (techRemoved.length > 0) {
      console.log("[factualFilter] start-technical-session removed", {
        session_id: session.id,
        removedCount: techRemoved.length,
      });
    }
    const questions = techKept;

    // Build skills list
    const skillsList = [...new Set(questions.map((q: any) => q.skill))];
    const questionsText = questions
      .map((q: any, i: number) => `${i + 1}. [${q.skill}|Nível ${q.level}] ${q.questionText}`)
      .join("\n");

    // ════════ Resume context: which skills/questions are already covered? ════════
    let resumeBlock = "";
    if (isResuming) {
      const { data: prevResponses } = await supabase
        .from("technical_interview_responses")
        .select("skill_name, question_index, question_text, is_followup")
        .eq("session_id", session.id)
        .eq("is_followup", false)
        .order("created_at", { ascending: true });

      const coveredSkills = new Set((prevResponses || []).map((r: any) => r.skill_name));
      const pendingQuestions = questions.filter((q: any) => !coveredSkills.has(q.skill));
      const coveredList = Array.from(coveredSkills).map((s, i) => `${i + 1}. ${s}`).join("\n") || "(nenhuma — todas estão pendentes)";

      console.log(`📊 Tech resume coverage: ${coveredSkills.size}/${skillsList.length} skills covered, ${pendingQuestions.length} questions pending`);

      if (pendingQuestions.length === 0) {
        await supabase
          .from("technical_interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return new Response(
          JSON.stringify({ error: "SESSION_COMPLETED", message: "Todas as competências já foram avaliadas. A entrevista será processada." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pendingList = pendingQuestions
        .map((q: any, i: number) => `${i + 1}. [${q.skill}|Nível ${q.level}] ${q.questionText}`)
        .join("\n");
      const nextQuestion = pendingQuestions[0];

      resumeBlock = `

## RETOMADA DE ENTREVISTA (CRÍTICO — SOBRESCREVE A ABERTURA PADRÃO)
Esta é uma CONTINUAÇÃO de uma entrevista técnica anterior interrompida. NÃO faça a abertura completa, NÃO reapresente a empresa, NÃO refaça o alinhamento de expectativas, NÃO repita as competências já avaliadas abaixo.

COMPETÊNCIAS JÁ AVALIADAS (NÃO REPITA):
${coveredList}

COMPETÊNCIAS/PERGUNTAS PENDENTES (faça SOMENTE estas, na ordem):
${pendingList}

ABERTURA DE RETOMADA (use EXATAMENTE este tom, em 1 frase curta, depois vá direto pra próxima pergunta):
"Oi ${candidateName}, que bom que voltou! Vamos continuar de onde paramos. Próxima pergunta sobre ${nextQuestion.skill}: ${nextQuestion.questionText}"

NÃO diga "vamos começar do zero", "recapitulando", "vamos reiniciar" ou "primeira pergunta". A entrevista CONTINUA — não recomeça.
`;
    }

    // ═══════════════════════════════════════════════════════════
    // RESUME INTELLIGENCE — Non-blocking enrichment (try/catch)
    // Must run BEFORE building `defaultInstructions`, since the template
    // literal references `candidateContext`. TDZ otherwise.
    // Does NOT block interview start. Does NOT affect qualification.
    // ═══════════════════════════════════════════════════════════
    let candidateContext = "";
    let cvIntelUsed = false;
    try {
      console.log("🧠 RESUME INTELLIGENCE: Starting enrichment for candidate:", session.candidate_id);

      // 0. Tentar usar CV Intelligence (parsing + match já cacheados) se a flag estiver ativa
      try {
        const { data: acctSettings } = await supabase
          .from("account_settings")
          .select("use_cv_intelligence_in_interviews")
          .eq("account_id", session.account_id)
          .maybeSingle();
        const flagOn = acctSettings?.use_cv_intelligence_in_interviews ?? true;
        if (flagOn) {
          const { data: cvIntel } = await supabase
            .from("candidate_cv_intelligence")
            .select("professional_summary, skills, total_years_experience, current_position, current_company, work_history")
            .eq("candidate_id", session.candidate_id)
            .maybeSingle();
          const { data: cvMatch } = await supabase
            .from("candidate_cv_job_match")
            .select("match_score, summary, skills_matched, skills_missing, interview_focus_points, expires_at")
            .eq("candidate_id", session.candidate_id)
            .eq("job_id", session.job_id)
            .maybeSingle();
          if (cvIntel && cvMatch && new Date(cvMatch.expires_at).getTime() > Date.now()) {
            const focus = Array.isArray(cvMatch.interview_focus_points) ? cvMatch.interview_focus_points : [];
            const skillsFound = Array.isArray(cvIntel.skills) ? cvIntel.skills : [];
            candidateContext = `

## CONTEXTO DO CANDIDATO (CV Intelligence)
- Resumo: ${cvIntel.professional_summary || "—"}
- Cargo atual: ${cvIntel.current_position || "—"}${cvIntel.current_company ? " @ " + cvIntel.current_company : ""}
- Anos de experiência: ${cvIntel.total_years_experience ?? "—"}
- Skills no CV: ${(skillsFound as string[]).slice(0, 25).join(", ")}
- Match com a vaga: ${cvMatch.match_score ?? "—"}%
- Análise: ${cvMatch.summary || "—"}
- Pontos para explorar:
  ${(focus as string[]).map((p, i) => `${i + 1}. ${p}`).join("\n  ")}

USE esses dados para personalizar suas perguntas. Se o candidato tem experiência
comprovada em alguma skill, faça perguntas mais avançadas. Se há gaps, investigue
com perguntas básicas primeiro.`;
            cvIntelUsed = true;
            console.log("✅ Using cached CV Intelligence + match (no extra LLM cost)");
          }
        }
      } catch (cvErr) {
        console.warn("⚠️ CV Intelligence lookup failed (non-blocking):", cvErr instanceof Error ? cvErr.message : cvErr);
      }

      // 1. Check existing enriched profile data (legacy fallback if no CV intel)
      const { data: enrichedProfile } = cvIntelUsed
        ? { data: null as any }
        : await supabase
            .from("recruitment_enriched_profiles")
            .select("*")
            .eq("candidate_id", session.candidate_id)
            .maybeSingle();

      let profileData: any = null;
      let source = "none";

      // 2. Try LinkedIn via Apify if we have a URL (skipped if CV Intel já injetado)
      const linkedinUrl = cvIntelUsed ? null : (enrichedProfile?.linkedin_url || enrichedProfile?.linkedin || null);

      if (linkedinUrl) {
        console.log("🔗 Found LinkedIn URL, attempting Apify scrape:", linkedinUrl);
        try {
          const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
          if (APIFY_API_KEY) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const apifyResponse = await fetch(`${supabaseUrl}/functions/v1/apify-linkedin`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url: linkedinUrl, includePosts: false }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (apifyResponse.ok) {
              const apifyData = await apifyResponse.json();
              if (apifyData.success && apifyData.data) {
                profileData = apifyData.data;
                source = "linkedin";
                console.log("✅ LinkedIn data retrieved:", profileData.fullName);
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ LinkedIn scrape failed (non-blocking):", e instanceof Error ? e.message : e);
        }
      }

      // 3. Fallback: Firecrawl search if no LinkedIn data (skip if CV Intel já injetado)
      if (!profileData && !cvIntelUsed) {
        const candidateFullName = candidateData?.name || "";
        const jobTitleForSearch = jobContext?.title || "";
        if (candidateFullName) {
          console.log("🔍 Fallback: Firecrawl search for:", candidateFullName);
          try {
            const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
            if (FIRECRAWL_API_KEY) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const searchResponse = await fetch(`${supabaseUrl}/functions/v1/firecrawl-search`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: `${candidateFullName} ${jobTitleForSearch} currículo site:linkedin.com`,
                  options: { limit: 3, lang: "pt-BR", country: "BR" },
                }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.success && searchData.data?.length > 0) {
                  profileData = {
                    searchResults: searchData.data.slice(0, 3),
                    candidateName: candidateFullName,
                  };
                  source = "firecrawl";
                  console.log("✅ Firecrawl results found:", searchData.data.length);
                }
              }
            }
          } catch (e) {
            console.warn("⚠️ Firecrawl search failed (non-blocking):", e instanceof Error ? e.message : e);
          }
        }
      }

      // 4. Use enriched profile data as fallback
      if (!profileData && enrichedProfile) {
        profileData = {
          title: enrichedProfile.current_title,
          company: enrichedProfile.current_company,
          seniority: enrichedProfile.seniority,
          skills: enrichedProfile.technologies || [],
        };
        source = "apollo";
        console.log("📋 Using Apollo/Clearbit enrichment data");
      }

      // 5. Send to Gemini for analysis if we have data
      if (profileData) {
        console.log("🤖 Sending profile data to AI for analysis...");
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

        if (LOVABLE_API_KEY) {
          const jobDescription = jobContext?.description || jobContext?.title || "";
          const requiredSkills = questions.map((q: any) => q.skill).filter(Boolean);

          const analysisPrompt = `Analise o perfil profissional do candidato e compare com a vaga.

DADOS DO CANDIDATO:
${JSON.stringify(profileData, null, 2)}

VAGA: ${jobContext?.title || "Não especificada"}
DESCRIÇÃO DA VAGA: ${jobDescription}
SKILLS REQUERIDAS: ${requiredSkills.join(", ")}

Retorne usando a função extract_resume_intelligence.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Você é um analista de recrutamento. Extraia insights do perfil do candidato comparando com a vaga. Responda em português." },
                { role: "user", content: analysisPrompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "extract_resume_intelligence",
                  description: "Extrai insights estruturados do currículo do candidato",
                  parameters: {
                    type: "object",
                    properties: {
                      professional_summary: { type: "string", description: "Resumo profissional em 2-3 frases" },
                      experience_years: { type: "number", description: "Anos estimados de experiência" },
                      skills_found: { type: "array", items: { type: "string" }, description: "Skills detectadas no perfil" },
                      skills_match: {
                        type: "object",
                        properties: {
                          matched: { type: "array", items: { type: "string" }, description: "Skills que o candidato possui e são requeridas" },
                          missing: { type: "array", items: { type: "string" }, description: "Skills requeridas que não foram encontradas" },
                          extra: { type: "array", items: { type: "string" }, description: "Skills extras do candidato não listadas na vaga" },
                        },
                      },
                      predictive_score: { type: "number", description: "Score de aderência 0-100 baseado no cruzamento perfil vs vaga" },
                      exploration_points: { type: "array", items: { type: "string" }, description: "3-5 pontos que o entrevistador deve explorar" },
                    },
                    required: ["professional_summary", "experience_years", "skills_found", "skills_match", "predictive_score", "exploration_points"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "extract_resume_intelligence" } },
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

            if (toolCall?.function?.arguments) {
              const insights = JSON.parse(toolCall.function.arguments);
              console.log("✅ AI analysis complete. Predictive score:", insights.predictive_score);

              // Save to database
              await supabase
                .from("technical_interview_resume_intelligence")
                .upsert({
                  session_id: session.id,
                  candidate_id: session.candidate_id,
                  source,
                  professional_summary: insights.professional_summary,
                  experience_years: insights.experience_years,
                  skills_found: insights.skills_found || [],
                  skills_match: insights.skills_match || {},
                  predictive_score: insights.predictive_score,
                  exploration_points: insights.exploration_points || [],
                  raw_profile_data: profileData,
                }, { onConflict: "session_id" });

              // Build context for the interviewer prompt
              candidateContext = `

## CONTEXTO DO CANDIDATO (dados públicos)
- Experiência: ${insights.professional_summary}
- Skills detectadas: ${(insights.skills_found || []).join(", ")}
- Aderência estimada: ${insights.predictive_score}%
- Pontos para explorar: ${(insights.exploration_points || []).map((p: string, i: number) => `${i + 1}. ${p}`).join("\n  ")}

USE esses dados para personalizar suas perguntas. Se o candidato tem experiência
comprovada em alguma skill, faça perguntas mais avançadas. Se há gaps, investigue
com perguntas básicas primeiro.`;

              console.log("✅ Resume Intelligence saved and context injected");
            }
          } else {
            console.warn("⚠️ AI analysis returned non-OK:", aiResponse.status);
          }
        }
      } else {
        console.log("ℹ️ No profile data found, skipping Resume Intelligence");
      }
    } catch (resumeError) {
      console.error("⚠️ RESUME INTELLIGENCE failed (non-blocking):", resumeError instanceof Error ? resumeError.message : resumeError);
      // Non-blocking: interview continues without enrichment
    }

    // Build AI instructions (candidateContext injected from Resume Intelligence if available)

    const defaultInstructions = `Você é um entrevistador técnico sênior da empresa ${companyName}, conduzindo uma entrevista de fit técnico.

CONTEXTO:
- Candidato: ${candidateName}
- Cargo: ${jobContext?.title || "Vaga técnica"}
- Empresa: ${companyName}
- Idioma: PORTUGUÊS DO BRASIL

COMPETÊNCIAS TÉCNICAS A AVALIAR:
${skillsList.map((s: string) => `- ${s}`).join('\n')}

SUAS PERGUNTAS BASE:
${questionsText}

## DADOS BIOGRÁFICOS — NÃO PERGUNTE
Você JÁ TEM os dados biográficos do candidato (nome, sobrenome, email, telefone, idade/data de nascimento, cidade, estado). Eles foram coletados na biografia obrigatória. NUNCA pergunte esses dados — vá direto às perguntas técnicas acima.
${candidateContext}
${resumeBlock}
## REGRAS DE ADAPTATIVIDADE (MUITO IMPORTANTE!)

Para CADA pergunta técnica:
1. Faça a pergunta de forma clara e objetiva
2. Ouça a resposta com atenção
3. AVALIE mentalmente a qualidade da resposta:

   SUPERFICIAL (pouca profundidade):
   → Faça follow-up de aprofundamento: "Pode me dar um exemplo concreto?" ou "Como você implementaria isso na prática?"
   
   INCORRETA (demonstra desconhecimento):
   → Faça uma pergunta mais básica para verificar fundamentos: "Vamos por outro ângulo: o que você entende por [conceito básico]?"
   
   CORRETA (boa resposta):
   → Vá DIRETO para a próxima skill, sem filler ("entendi", "ok", "legal") e sem parafrasear a resposta
   
   EXCELENTE (demonstra domínio avançado):
   → Desafie com cenário complexo SEM prefácio elogioso. Ex: "E se você tivesse que [cenário avançado]?"

4. MÁXIMO 3 perguntas por skill (1 principal + 2 follow-ups)
5. Após avaliar todas as skills principais, encerre

## FLUXO DA ENTREVISTA:

1. INÍCIO (profissional e acolhedor):
"Olá ${candidateName}! Sou o entrevistador técnico de ${companyName}. Vamos conversar sobre suas habilidades técnicas para a vaga de ${jobContext?.title || 'esta posição'}. Fique à vontade, é uma conversa para conhecer melhor seu perfil técnico. Pronto para começar?"

2. CONDUÇÃO (uma skill por vez):
- Faça a pergunta principal
- Aguarde resposta
- Aplique lógica adaptativa
- Avance quando satisfeito com a avaliação

3. ENCERRAMENTO:
"${candidateName}, muito obrigado pela conversa técnica! Foi ótimo conhecer seu perfil. Desejo boa sorte no processo. Pronto, agora pode clicar em encerrar!"

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

1. Cumprimente ${candidateName} pelo primeiro nome, diga que é o entrevistador técnico de ${companyName} para a vaga de ${jobContext?.title || 'esta posição'}.

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
      "technical_voice_session",
      {
        candidateName,
        companyName,
        jobTitle: jobContext?.title || "Vaga técnica",
        skillsList: skillsList.map((s: string) => `- ${s}`).join("\n"),
        questionsText,
      },
      defaultInstructions,
    );



    // Create ephemeral token from OpenAI
    const realtimeModel = await getConfiguredModel("start-technical-session", "gpt-realtime-mini");
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
              transcription: { model: "whisper-1", language: "pt" },
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
      return new Response(
        JSON.stringify({ error: "OPENAI_ERROR", message: "Erro ao conectar com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Ephemeral token obtained");

    // Update session: first start vs resume
    if (!isResuming) {
      const { error: updateError } = await supabase
        .from("technical_interview_sessions")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("⚠️ Error updating session status:", updateError);
      }
    } else {
      const newResumeCount = ((session as any).resume_count ?? 0) + 1;
      const { error: resumeErr } = await supabase
        .from("technical_interview_sessions")
        .update({
          resume_count: newResumeCount,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", session.id);
      if (resumeErr) console.error("⚠️ Error incrementing resume_count:", resumeErr);
      else console.log("🔁 tech resume_count =", newResumeCount);
    }

    console.log("✅ Technical interview session started:", session.id);

    return new Response(
      JSON.stringify({
        ephemeralToken: tokenData.value || tokenData.client_secret?.value || tokenData.client_secret,
        sessionId: session.id,
        skills: skillsList,
        questionsCount: questions.length,
        jobTitle: jobContext?.title || "Vaga",
        candidateName,
        companyName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error starting session:", error);
    return new Response(
      JSON.stringify({
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
