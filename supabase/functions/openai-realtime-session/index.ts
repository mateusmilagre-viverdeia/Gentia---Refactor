// BILLING: este endpoint apenas minta o ephemeral token Realtime. A cobrança
// acontece no fechamento da sessão (culture-interview-complete / technical-interview-complete)
// ou via interview-watchdog para sessões abandonadas. NÃO debitar créditos aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolvePrompt } from "../_shared/aiPrompts.ts";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AgentQuestion {
  id: string;
  question_text: string;
  position: number;
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
    if (!OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }
    console.log("✅ OPENAI_API_KEY is configured");

    const body = await req.json();
    const { accountId, jobId, candidateProfileId, candidateName, companyName } = body;

    console.log("📝 Request body received");
    console.log("✅ Candidate Profile ID:", candidateProfileId);
    console.log("✅ Job ID:", jobId);
    console.log("✅ Account ID:", accountId);

    // Validate required parameters
    if (!candidateProfileId || candidateProfileId === 'undefined' || candidateProfileId === 'null') {
      console.error("❌ Invalid candidateProfileId:", candidateProfileId);
      return new Response(
        JSON.stringify({
          error: "INVALID_CANDIDATE_PROFILE",
          message: "Perfil do candidato inválido. Por favor, recarregue a página.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!jobId) {
      console.error("❌ Missing jobId");
      return new Response(
        JSON.stringify({
          error: "MISSING_JOB_ID",
          message: "ID da vaga não fornecido.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!accountId) {
      console.error("❌ Missing accountId");
      return new Response(
        JSON.stringify({
          error: "MISSING_ACCOUNT_ID",
          message: "ID da conta não fornecido.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract first name only
    const firstName = candidateName?.split(" ")[0] || candidateName || "Candidato";

    console.log("✅ Candidate:", candidateName, "-> First name:", firstName);
    console.log("✅ Company:", companyName);

    // Connect to database to get questions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let questions: AgentQuestion[] = [];
    let resolvedAgentId: string | null = null;

    // STEP 1: Try to get agent_id from recruitment_jobs
    console.log("🔍 Looking for agent_id via job...");
    
    const { data: job, error: jobError } = await supabase
      .from("recruitment_jobs")
      .select("agent_id, account_id")
      .eq("id", jobId)
      .single();

    if (jobError) {
      console.error("❌ Error fetching job:", jobError);
    } else {
      resolvedAgentId = job?.agent_id || null;
      console.log("📋 Job agent_id:", resolvedAgentId);
    }

    // STEP 1b: Fallback — try workflow steps
    if (!resolvedAgentId && job?.account_id) {
      console.log("🔍 Fallback: checking workflow steps for cultural agent...");
      const { data: workflowStep } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("agent_id")
        .eq("job_id", jobId)
        .eq("step_type", "cultural")
        .eq("is_active", true)
        .not("agent_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (workflowStep?.agent_id) {
        resolvedAgentId = workflowStep.agent_id;
        console.log("✅ Found agent_id from workflow step:", resolvedAgentId);
      }
    }

    // STEP 1c: Fallback — any active cultural agent for this account
    if (!resolvedAgentId && job?.account_id) {
      console.log("🔍 Fallback: looking for any active cultural agent for account...");
      const { data: defaultAgent } = await supabase
        .from("recruitment_agents")
        .select("id")
        .eq("account_id", job.account_id)
        .eq("type", "structured")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (defaultAgent?.id) {
        resolvedAgentId = defaultAgent.id;
        console.log("✅ Found fallback agent for account:", resolvedAgentId);
      }
    }

    // STEP 2: Fetch questions using resolved agent_id
    if (resolvedAgentId) {
      console.log("🔍 Fetching questions for agent:", resolvedAgentId);
      const { data: agentQuestions, error: questionsError } = await supabase
        .from("recruitment_agent_questions")
        .select("id, question_text, position")
        .eq("agent_id", resolvedAgentId)
        .order("position", { ascending: true });

      if (questionsError) {
        console.error("❌ Error fetching agent questions:", questionsError);
      } else if (agentQuestions && agentQuestions.length > 0) {
        questions = agentQuestions.map((q, idx) => ({
          id: q.id,
          question_text: q.question_text,
          position: q.position ?? idx + 1,
        }));
        console.log("✅ Found", questions.length, "questions");
      } else {
        console.log("⚠️ No questions found for agent:", resolvedAgentId);
      }
    } else {
      console.log("⚠️ No agent_id resolved for job:", jobId);
    }

    // If no questions found, return error - interview cannot proceed without questions
    if (questions.length === 0) {
      console.error("❌ No questions found for this agent. Interview cannot proceed.");
      return new Response(
        JSON.stringify({
          error: "NO_QUESTIONS_CONFIGURED",
          message: "Não há perguntas configuradas para este agente de entrevista. Por favor, entre em contato com o departamento de recrutamento.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📋 Final questions count:", questions.length);
    questions.forEach((q, i) => console.log(`   ${i + 1}. ${q.question_text.substring(0, 50)}...`));

    // Delete any existing sessions for this job/candidate combination (allows retesting)
    console.log("🗑️ Checking for existing sessions to delete...");
    const { data: existingSessions, error: deleteError } = await supabase
      .from("culture_interview_sessions")
      .delete()
      .eq("job_id", jobId)
      .eq("candidate_profile_id", candidateProfileId)
      .select("id");
    
    if (deleteError) {
      console.error("⚠️ Error deleting existing sessions:", deleteError);
    } else if (existingSessions && existingSessions.length > 0) {
      console.log("✅ Deleted", existingSessions.length, "existing session(s)");
    } else {
      console.log("ℹ️ No existing sessions found");
    }

    // Create new interview session in database
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .insert({
        account_id: accountId,
        job_id: jobId,
        candidate_profile_id: candidateProfileId,
        agent_id: resolvedAgentId || null,  // Save resolved agent_id for traceability
        status: "in_progress",
        questions: questions,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),  // Initialize last_activity_at
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("❌ Session creation error:", sessionError);
      throw sessionError;
    }
    console.log("✅ New interview session created:", session.id);

    // Build the instructions for the AI interviewer
    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q.question_text}`)
      .join("\n");

  const defaultInstructions = `Você é uma entrevistadora de matching cultural profissional e acolhedora da empresa ${companyName}.

CONTEXTO:
- Candidato: ${firstName}
- Empresa: ${companyName}
- Você deve conduzir a entrevista em PORTUGUÊS DO BRASIL

SUAS PERGUNTAS:
${questionsText}

SEU ESTILO DE COMUNICAÇÃO:
- Seja cordial e levemente informal - profissional mas não robótica
- Mantenha um tom respeitoso e acolhedor
- Demonstre interesse genuíno nas respostas (com perguntas reais, não com filler)
- Use "você", não "o senhor" ou "a senhora"
- NUNCA mencione "Gêntia" - você representa a empresa ${companyName}

FLUXO DA ENTREVISTA:

1. INÍCIO (cordial):
"Olá ${firstName}, tudo bem? Sou a entrevistadora de ${companyName}, prazer em conhecê-lo! Vamos conversar um pouco para entender melhor seu perfil. Pode ficar à vontade, é uma conversa tranquila. Só uma orientação importante: durante nossa conversa, você verá um botão de encerrar, mas por favor só clique nele quando eu avisar que terminamos, tá bom?"

2. Para CADA pergunta:
   a) Faça a pergunta de forma clara e natural
   b) Ouça a resposta com atenção
   c) Vá DIRETO para a próxima pergunta ou follow-up, SEM filler de transição. Nada de "entendi", "entendo", "certo", "ok", "perfeito", "ótimo", "legal", "bacana", "interessante", "faz sentido", "show". Sem parafrasear nem recapitular o que o candidato acabou de dizer.
   d) SE A RESPOSTA FOI INCOMPLETA OU SUPERFICIAL:
      - Faça NO MÁXIMO 2 perguntas de aprofundamento por tema
      - As perguntas de aprofundamento devem ser CURTAS e OBJETIVAS (máximo 10 palavras)
      - Exemplos curtos: "Me dá um exemplo?", "Como você resolveu?", "E o resultado?"
   e) Só passe para a próxima quando a resposta estiver desenvolvida OU após 2 aprofundamentos

3. FINAL (MUITO IMPORTANTE):
"${firstName}, muito obrigada pela conversa! Foi um prazer conhecê-lo. Desejo boa sorte no processo. Pronto, agora já pode clicar em encerrar!"

REGRAS:
- Seja profissional mas não fria
- MÁXIMO de 2 perguntas de aprofundamento por tema principal
- Perguntas de aprofundamento: curtas, diretas, objetivas (até 10 palavras)
- Faça uma pergunta por vez
- Chame pelo primeiro nome: ${firstName}
- Mantenha suas falas objetivas e claras
- CRÍTICO: Ao final, SEMPRE diga "Pronto, agora já pode clicar em encerrar!" para autorizar o candidato a finalizar
- NUNCA mencione "Gêntia" em nenhum momento

TOM DE VOZ:
- Natural e acolhedora
- Profissional mas não engessada
- Interessada de verdade
- Empática e respeitosa

## ABERTURA OBRIGATÓRIA (faça antes da primeira pergunta de avaliação):

1. Cumprimente ${firstName} pelo primeiro nome, diga que é a entrevistadora de ${companyName}.

2. Faça este alinhamento de expectativas, com tom acolhedor e natural (NÃO leia como script — adapte com suas palavras, mas cubra TODOS os pontos):
   - "Antes de começarmos, deixa eu te explicar rapidinho como funciona pra você ficar à vontade."
   - "Pode pensar com calma antes de responder. Se precisar de uns segundos pra organizar a ideia, sem problema — eu vou esperar."
   - "Quando terminar uma resposta e quiser seguir, pode dizer 'é isso', 'pode ir' ou simplesmente parar de falar — eu vou perceber."
   - "A entrevista termina quando eu disser que terminamos. SÓ depois disso você pode clicar no botão de encerrar na tela."
   - "Tudo certo pra começar?"

3. Aguarde a confirmação verbal do candidato ("sim", "pode ir", "vamos lá") ANTES de fazer a primeira pergunta de avaliação.

## Paciência com o candidato:
- O candidato pode pausar para pensar. Não interrompa enquanto ele estiver formulando.
- Só assuma o turno quando perceber que a resposta foi concluída.
- Não repita uma pergunta já feita, exceto se o candidato pedir explicitamente.
- Ignore transcrições do usuário com 3 palavras ou menos a menos que claramente respondam à pergunta (provavelmente é ruído ambiente, não fala real).
- Se sua resposta for cortada por barulho/ruído, NÃO repita a pergunta; continue de onde parou naturalmente.`;

    const instructions = await resolvePrompt(
      "culture_voice_realtime",
      { firstName, companyName, questionsText },
      defaultInstructions,
    );

    const realtimeModel = await getConfiguredModel("openai-realtime-session", "gpt-realtime-mini");
    console.log("🔑 Creating ephemeral token from OpenAI (model:", realtimeModel, ")");

    // Step 1: Create an ephemeral token for the Realtime API session
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
          instructions: instructions,
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
              voice: "coral",
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
    console.log("✅ Token expires at:", tokenData.expires_at);

    // Return the ephemeral token and session info to the client
    return new Response(
      JSON.stringify({
        ephemeralToken: tokenData.value || tokenData.client_secret?.value || tokenData.client_secret,
        sessionId: session.id,
        questionsCount: questions.length,
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
