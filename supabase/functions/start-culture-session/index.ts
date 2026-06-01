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

    console.log("🚀 Starting culture interview session for token:", token);

    // Fetch and validate session
    // NOTE: `recruitment_agents` does NOT have `instructions` or `questions` columns.
    // The canonical list of questions for each interview lives on
    // `culture_interview_sessions.questions` (jsonb), populated at invite time
    // from `values_questions_items` (módulo Valores). That is the SAME source
    // used by `culture-interview-save-response` to compute coverage, so reading
    // from there here keeps the AI prompt and the coverage engine in sync.
    const { data: sessionRow, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      console.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "SESSION_NOT_FOUND", message: "Sessão não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual joins (no FK relationships in schema cache)
    const [candidateRes, jobRes, agentRes] = await Promise.all([
      sessionRow.candidate_id
        ? supabase.from("recruitment_candidates").select("name, first_name, last_name, email").eq("id", sessionRow.candidate_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      sessionRow.job_id
        ? supabase.from("recruitment_jobs").select("title").eq("id", sessionRow.job_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      sessionRow.agent_id
        ? supabase.from("recruitment_agents").select("name, settings").eq("id", sessionRow.agent_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    const session: any = {
      ...sessionRow,
      candidate: candidateRes?.data ?? null,
      job: jobRes?.data ?? null,
      agent: agentRes?.data ?? null,
    };

    // Validate session state
    const now = new Date();
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;

    if (expiresAt && expiresAt < now) {
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

    // Handle in_progress sessions OR abandoned-but-resumable: allow resumption
    const RESUME_WINDOW_MIN = 60;
    const MAX_RESUMES = 3;

    // Sessão foi abandonada pelo watchdog mas ainda está dentro da janela de 48h?
    const canResumeAbandoned =
      session.status === "abandoned" &&
      (session as any).can_resume === true &&
      (session as any).resume_expires_at &&
      new Date((session as any).resume_expires_at) > now;

    if (canResumeAbandoned) {
      console.log("🔁 Reopening abandoned session within resume window:", session.id);
      // Reabre como in_progress; status final será recalculado conforme a entrevista avança.
      await supabase
        .from("culture_interview_sessions")
        .update({
          status: "in_progress",
          last_activity_at: new Date().toISOString(),
          can_resume: false, // consome a janela
        })
        .eq("id", session.id);
      (session as any).status = "in_progress";
    }

    const isResuming = session.status === "in_progress" || canResumeAbandoned;
    if (isResuming && !canResumeAbandoned) {
      const startedAt = session.started_at ? new Date(session.started_at) : null;
      const lastActivityAt = session.last_activity_at ? new Date(session.last_activity_at) : startedAt;
      const cutoff = new Date(now.getTime() - RESUME_WINDOW_MIN * 60 * 1000);

      if (!lastActivityAt || lastActivityAt < cutoff) {
        console.log(`⏰ In-progress session inactive > ${RESUME_WINDOW_MIN} min, marking as completed`);
        await supabase
          .from("culture_interview_sessions")
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
      console.log("🔄 Resuming in_progress session:", session.id, "resume_count:", currentResumeCount);
    }

    if (isResuming) {
      // Incrementa contador de retomadas (tanto para in_progress quanto para abandoned reaberta)
      await supabase
        .from("culture_interview_sessions")
        .update({ resume_count: ((session as any).resume_count ?? 0) + 1 })
        .eq("id", session.id);
    }

    // Get company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.account_id)
      .single();

    const companyName = company?.name || "Empresa";
    const candidateData = session.candidate as any;
    const candidateName = candidateData?.name || 
      `${candidateData?.first_name || ""} ${candidateData?.last_name || ""}`.trim() || 
      "Candidato";
    const firstName = candidateName.split(" ")[0];
    const jobData = session.job as any;
    const jobTitle = jobData?.title || "Vaga";
    const agentData = session.agent as any;

    // Get agent instructions from settings (questions live on the session, not the agent)
    const agentSettings = (agentData?.settings as any) || {};
    const agentInstructions = typeof agentSettings.instructions === "string" ? agentSettings.instructions : "";

    // ════════ CANONICAL QUESTIONS — single source of truth ════════
    // Read from session.questions (jsonb) — same source used by save-response
    // for coverage tracking. Shape: [{ id, position, question_text, value_label? }, ...]
    const sessionQuestions = Array.isArray((session as any).questions) ? (session as any).questions : [];

    const defaultQuestions = [
      "Me conte sobre sua trajetória profissional.",
      "O que te motivou a se candidatar para esta vaga?",
      "Como você lida com situações de pressão e prazos apertados?",
      "Descreva uma situação em que você trabalhou em equipe para resolver um problema.",
      "Quais são seus objetivos profissionais para os próximos anos?",
    ];

    let effectiveQuestions: Array<{ id?: string | null; text: string; value_label?: string | null; requires_thinking_time?: boolean }>;
    if (sessionQuestions.length > 0) {
      effectiveQuestions = sessionQuestions.map((q: any) => ({
        id: typeof q === "object" ? (q.id || null) : null,
        text: typeof q === "string" ? q : (q.question_text || q.text || ""),
        value_label: typeof q === "object" ? (q.value_label || null) : null,
        requires_thinking_time: typeof q === "object" ? !!q.requires_thinking_time : false,
      })).filter((q: { text: string }) => q.text && q.text.trim().length > 0);
      // Safety net: drop biographical/factual questions even if they slipped through old sessions
      const { kept, removed } = filterFactualQuestions(effectiveQuestions, (q) => q.text);
      if (removed.length > 0) {
        console.log("[factualFilter] start-culture-session removed", {
          session_id: session.id,
          removedCount: removed.length,
          removedTexts: removed.map((r) => r.text),
        });
      }
      effectiveQuestions = kept;
      console.log(`📊 Loaded ${effectiveQuestions.length} canonical questions from session ${session.id}`);
    } else {
      console.warn(`⚠️ Session ${session.id} has no questions array — falling back to 5 default questions. This should NEVER happen for invites created by send-interview-invite.`);
      effectiveQuestions = defaultQuestions.map((t) => ({ id: null, text: t, value_label: null, requires_thinking_time: false }));
    }

    // Hydrate requires_thinking_time from values_questions_items when not present in snapshot
    const idsToHydrate = effectiveQuestions
      .filter((q) => q.id && q.requires_thinking_time !== true)
      .map((q) => q.id as string);
    if (idsToHydrate.length > 0) {
      const { data: flags } = await supabase
        .from("values_questions_items")
        .select("id, requires_thinking_time")
        .in("id", idsToHydrate);
      const flagMap = new Map((flags || []).map((f: any) => [f.id, !!f.requires_thinking_time]));
      effectiveQuestions = effectiveQuestions.map((q) =>
        q.id && flagMap.has(q.id) ? { ...q, requires_thinking_time: flagMap.get(q.id) } : q,
      );
    }

    const totalQuestions = effectiveQuestions.length;
    const questionsText = effectiveQuestions
      .map((q, i) => {
        const prefix = q.requires_thinking_time ? "[reflexão profunda] " : "";
        const tail = q.value_label ? ` [Valor avaliado: ${q.value_label}]` : "";
        return `${i + 1}. ${prefix}${q.text}${tail}`;
      })
      .join("\n");

    // ════════ Resume context: which questions are already covered? ════════
    let resumeBlock = "";
    if (isResuming) {
      const { data: prevResponses } = await supabase
        .from("culture_interview_responses")
        .select("question_index, question_text")
        .eq("session_id", session.id)
        .order("question_index", { ascending: true });

      const coveredIdx = new Set((prevResponses || []).map((r: any) => r.question_index));
      const covered = effectiveQuestions
        .map((q, i) => ({ i, q }))
        .filter(({ i }) => coveredIdx.has(i));
      const pending = effectiveQuestions
        .map((q, i) => ({ i, q }))
        .filter(({ i }) => !coveredIdx.has(i));

      console.log(`📊 Resume coverage: ${covered.length}/${totalQuestions} covered, ${pending.length} pending`);

      if (pending.length === 0) {
        await supabase
          .from("culture_interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return new Response(
          JSON.stringify({ error: "SESSION_COMPLETED", message: "Todas as perguntas já foram respondidas. A entrevista será avaliada." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const coveredList = covered.map(({ i, q }) => `${i + 1}. ${q.text}`).join("\n") || "(nenhuma — todas estão pendentes)";
      const pendingList = pending.map(({ i, q }) => `${i + 1}. ${q.text}`).join("\n");
      const nextQuestion = pending[0].q.text;

      resumeBlock = `

## RETOMADA DE ENTREVISTA (CRÍTICO — SOBRESCREVE A ABERTURA PADRÃO)
Esta é uma CONTINUAÇÃO de uma entrevista anterior interrompida. NÃO faça a abertura completa, NÃO reapresente a empresa, NÃO refaça o alinhamento de expectativas, NÃO repita as perguntas já respondidas abaixo.

PERGUNTAS JÁ RESPONDIDAS (NÃO REPITA):
${coveredList}

PERGUNTAS PENDENTES (faça SOMENTE estas, na ordem em que aparecem):
${pendingList}

ABERTURA DE RETOMADA (use EXATAMENTE este tom, em 1 frase curta, depois vá direto pra próxima pergunta):
"Oi ${firstName}, que bom que voltou! Vamos continuar de onde paramos. Próxima pergunta: ${nextQuestion}"

NÃO diga "vamos começar do zero", "recapitulando", "vamos reiniciar" ou "primeira pergunta". A entrevista CONTINUA — não recomeça.
`;
    }

    // Build AI instructions
    const defaultInstructions = `Você é um entrevistador de fit cultural da empresa ${companyName}, conduzindo uma entrevista por voz.

CONTEXTO:
- Candidato: ${firstName}
- Cargo: ${jobTitle}
- Empresa: ${companyName}
- Idioma: PORTUGUÊS DO BRASIL

${agentInstructions ? `INSTRUÇÕES ESPECÍFICAS DO AGENTE:\n${agentInstructions}\n` : ""}

SUAS PERGUNTAS:
${questionsText}

## DADOS BIOGRÁFICOS — NÃO PERGUNTE
Você JÁ TEM os dados biográficos do candidato (nome, sobrenome, email, telefone, idade/data de nascimento, cidade, estado). Eles foram coletados na biografia obrigatória. NUNCA pergunte esses dados. Vá direto às perguntas culturais acima. Se uma das perguntas listadas acidentalmente pedir um desses dados, IGNORE essa pergunta e siga para a próxima.
${resumeBlock}

## FLUXO DA ENTREVISTA:

1. INÍCIO (acolhedor e profissional):
"Olá ${firstName}! Sou o entrevistador de ${companyName}. Vamos conversar um pouco sobre você e suas experiências para conhecer melhor seu perfil. Fique à vontade, é uma conversa descontraída. Pronto para começar?"

## AGUARDAR CONFIRMAÇÃO
Após a abertura, faça UMA pergunta de confirmação clara: "Tudo certo pra começar?". Não avance para a 1ª pergunta de avaliação sem uma resposta verbal afirmativa do candidato (ex.: "sim", "pode começar", "tudo certo", "vamos lá"). Se vier silêncio ou ruído, repita a pergunta UMA vez. Se vier "não" ou pedido de pausa, ofereça pausar.

2. CONDUÇÃO:
- Faça uma pergunta por vez
- Aguarde a resposta completa
- Faça comentários positivos e naturais
- Aprofunde quando necessário com perguntas de follow-up
- Mantenha um tom amigável e acolhedor

## OBRIGAÇÃO DE COBERTURA COMPLETA (CRÍTICO — não pode ser violada):
- Você DEVE fazer TODAS as ${totalQuestions} perguntas listadas em "SUAS PERGUNTAS" antes de qualquer encerramento. São ${totalQuestions} perguntas no total — esse número é FIXO e não pode ser reduzido.
- Antes de fazer cada pergunta, anuncie mentalmente "estou indo para a pergunta X de ${totalQuestions}" para não perder a conta. Não pule números. Não agrupe duas perguntas em uma só.
- A ordem pode ser flexível (siga o que fizer mais sentido na conversa), mas a COBERTURA é mandatória — nenhuma das ${totalQuestions} perguntas pode ser pulada, fundida com outra, ou substituída por uma versão "parecida".
- DESPEDIDAS PROIBIDAS antes de cobrir TODAS as ${totalQuestions} perguntas: NUNCA diga, em hipótese alguma, qualquer variação de "para finalizar", "última pergunta", "muito obrigado pela conversa", "foi ótimo te conhecer", "foi um prazer", "desejo boa sorte", "agora pode clicar em encerrar", "terminamos por aqui", "vamos encerrar", "estamos chegando ao fim", "para fechar". Essas frases são GATILHO DE ENCERRAMENTO e o sistema interpreta como fim da entrevista — usá-las antes da última pergunta corta a entrevista do candidato e o reprova injustamente.
- Se você sentir vontade de "encerrar logo" porque a conversa está longa ou porque o candidato já falou bastante: IGNORE essa vontade. Sua única obrigação é cobrir as ${totalQuestions} perguntas. Tempo de conversa é IRRELEVANTE.
- Se o candidato responder com 2 palavras ou menos, com som inaudível, com "ok", "yeah", "bye", "thank you" isolados, ou qualquer coisa que claramente NÃO responde à pergunta feita: NÃO conte como resposta válida, NÃO avance para a próxima pergunta. Reformule a mesma pergunta uma vez de forma mais simples e aguarde uma resposta real.
- VERIFICAÇÃO DE PRESENÇA OBRIGATÓRIA (silêncio prolongado): Se o candidato ficar mudo, ou se você só ouvir ruído/respiração/áudio cortado por mais de alguns segundos, NUNCA se despeça. Faça primeiro UMA verificação curta: "${firstName}, você ainda está aí? Posso repetir a pergunta?" — e aguarde de verdade a resposta. Se continuar mudo após isso, REPITA a pergunta atual mais devagar uma única vez. Você só pode interpretar como abandono real se NADA voltar após essas duas tentativas — e mesmo assim NÃO se despeça com "obrigado", "foi um prazer" nem peça para "clicar em encerrar"; apenas diga "Vou pausar aqui, você pode retomar este link mais tarde de onde paramos" e silencie.
- Progresso atual no início desta sessão: ${(session as any).questions_covered ?? 0} de ${totalQuestions} perguntas já cobertas. ${isResuming ? "Esta é uma RETOMADA — continue a partir das pendentes, NUNCA reinicie." : "Comece pela pergunta 1."} Lembre-se: você só pode encerrar quando esse contador atingir ${totalQuestions}.
- Só passe ao bloco de ENCERRAMENTO quando TODAS as ${totalQuestions} perguntas tiverem sido feitas E respondidas com pelo menos uma frase substantiva. Antes disso, qualquer despedida é PROIBIDA.

3. ENCERRAMENTO (somente após cobrir TODAS as ${totalQuestions} perguntas):
"${firstName}, muito obrigado pela conversa! Foi ótimo conhecer você. Desejo boa sorte no processo. Pronto, agora pode clicar em encerrar!"

## ESTILO:
- Acolhedor e profissional
- Reaja naturalmente às respostas
- Demonstre interesse genuíno
- Valorize as experiências do candidato
- Mantenha ritmo fluido e natural

## PAPEL ESTRITO (CRÍTICO — não pode ser violado):
- Você é APENAS entrevistador. NUNCA conte histórias próprias, experiências pessoais, anedotas, exemplos hipotéticos ou opiniões em primeira pessoa.
- NUNCA use construções como "eu já passei por isso", "lembro de uma vez", "na minha experiência", "conheci alguém que", "deixa eu te contar".
- NUNCA invente cenários, analogias pessoais ou exemplos narrativos para ilustrar um ponto. Sua função é ouvir e entrevistar, não ensinar nem conversar socialmente.
- Reagir naturalmente = validar com 1 frase curta ("entendi", "faz sentido", "interessante essa parte de X") e seguir para a próxima pergunta ou follow-up. Reagir NÃO é compartilhar nada de si.
- Em qualquer pausa do candidato, o único comportamento permitido é a frase scriptada de check-in (ex.: "Quer mais um momento para pensar, ou pode seguir?"). NUNCA preencha o silêncio improvisando relato, exemplo ou explicação própria.

## CRÍTICO:
- Ao final, SEMPRE diga "Pronto, agora pode clicar em encerrar!"
- NUNCA mencione "Gêntia" ou qualquer outra empresa, apenas ${companyName}
- Fale SOMENTE em português brasileiro

## ABERTURA OBRIGATÓRIA (faça antes da primeira pergunta de avaliação):

1. Cumprimente ${firstName} pelo primeiro nome, diga que é o entrevistador de fit cultural de ${companyName}.

2. Faça este alinhamento de expectativas, com tom acolhedor e natural (NÃO leia como script — adapte com suas palavras, mas cubra TODOS os pontos):
   - "Antes de começarmos, deixa eu te explicar rapidinho como funciona pra você ficar à vontade."
   - "Pode pensar com calma antes de responder. Se precisar de uns segundos pra organizar a ideia, sem problema — eu vou esperar."
   - "Se em algum momento eu te interromper antes de você terminar, é só me avisar dizendo algo como 'espera, ainda não acabei' ou 'deixa eu completar'. Eu vou pedir desculpa, voltar pra pergunta e te dar espaço pra concluir. Sua resposta complementar vai contar normalmente."
   - "Quando terminar uma resposta e quiser seguir, pode dizer 'é isso', 'pode ir' ou simplesmente parar de falar — eu vou perceber."
   - "A entrevista termina quando eu disser que terminamos. SÓ depois disso você pode clicar no botão de encerrar na tela. Se clicar antes, a entrevista é cortada e você pode perder a vaga."
   - "Tudo certo pra começar?"

3. Aguarde a confirmação verbal do candidato ("sim", "pode ir", "vamos lá") ANTES de fazer a primeira pergunta de avaliação. Se ele tiver dúvida, esclareça.

Esta abertura é parte da experiência — não pule, não resuma demais, não corra.

## INSTRUÇÕES CRÍTICAS — Paciência e respeito ao turno do candidato:
- O candidato pode pausar para pensar, organizar ideias ou respirar. Isso é normal e esperado.
- NUNCA interrompa enquanto ele estiver pensando ou ainda formulando.
- Só assuma o turno quando perceber claramente que a resposta foi concluída: frase com entonação de fechamento, ou ele dizer algo como "é isso", "acho que respondi", "pode ir", "próxima".
- Se houver QUALQUER dúvida se ele terminou, em vez de avançar, pergunte gentilmente: "Você gostaria de complementar ou podemos seguir?". Só avance após confirmação.
- Se o candidato te interromper dizendo VERBALMENTE que ainda não terminou (ex: "espera, não acabei", "deixa eu completar"), peça desculpas brevemente e dê espaço para ele concluir. Registre como parte da MESMA pergunta original.
- Se o candidato ficar genuinamente em silêncio por 4+ segundos, pergunte: "Posso te ajudar com algo na pergunta?" antes de avançar.
- Perguntas marcadas com [reflexão profunda] exigem mais tempo de pensamento. Nessas perguntas: aguarde pelo menos 4 segundos de silêncio antes de assumir que o candidato terminou. Se ele pausar por mais de 5 segundos sem ter dito nada substantivo ainda, pergunte UMA vez: "Quer mais um momento para pensar, ou pode seguir?" e aguarde. Nunca avance sozinho.

Repetição: não repita uma pergunta já feita, exceto se o candidato pedir explicitamente.

## Robustez a ruído ambiente (CRÍTICO):
- Ignore transcrições do usuário com 3 palavras ou menos a menos que claramente respondam à pergunta. Texto curto como "ok", "thank you", "uhum" ou palavras isoladas geralmente são ruído/alucinação do transcritor, não fala real.
- Se sua resposta for cortada por barulho/ruído ambiente, NÃO repita a pergunta nem reinicie a frase; continue de onde parou de forma natural.
- Só dê barge-in real (parar de falar) quando ouvir fala humana clara e contínua, não sons curtos.
- Ignore completamente transcrições que não estejam em português brasileiro (ex.: palavras soltas em inglês, espanhol ou idiomas que pareçam fruto de ruído mal transcrito). Não responda a elas e não as trate como turno.
- Ignore palavras curtas do usuário (≤3 palavras) capturadas enquanto você ainda está falando. Só considere barge-in se houver fala contínua e clara em português por mais de 1 segundo.`;

    let instructions = await resolvePrompt(
      "culture_voice_session",
      { firstName, companyName, jobTitle, questionsText, totalQuestions },
      defaultInstructions,
    );

    // Conductor v2: if this session is conductor-enabled, IGNORE the heavy
    // question/coverage/closing prompt. The backend will dictate every phrase
    // turn by turn via interview-conductor + response.create.instructions.
    // The model only needs persona, language, VAD/patience, and the rule
    // "only speak when given an explicit instruction".
    // Protected by mem://architecture/voice-interview-resilience-principles
    // (VAD semantic_vad, patience prompt, PT-BR filter — all preserved).
    const conductorEnabled = (session as any).conductor_enabled === true;
    if (conductorEnabled) {
      instructions = `Você é um entrevistador de fit cultural da empresa ${companyName}, conduzindo uma entrevista por voz com ${firstName} para a vaga de ${jobTitle}.

Fale sempre em português brasileiro.

Sua função é apenas conduzir a conversa de forma natural, acolhedora e profissional.

REGRAS PRINCIPAIS:
- Faça somente a pergunta atual enviada pelo sistema.
- Não escolha a próxima pergunta.
- Não pule etapas.
- Não antecipe encerramento.
- Não avalie o candidato em voz alta.
- Não mencione notas, pareceres ou critérios internos.
- Não conte histórias, exemplos próprios, opiniões pessoais ou experiências fictícias.
- Depois da resposta, reaja brevemente e aguarde a próxima instrução do sistema.

COMPORTAMENTO:
- Seja humano, breve e objetivo.
- Não interrompa o candidato.
- Se houver pausa, dê tempo para ele pensar.
- Se parecer que ele ainda está pensando, pergunte apenas: "Quer mais um momento para pensar, ou pode seguir?"
- Não preencha silêncio com explicações, histórias ou comentários longos.
- Ignore transcrições com 3 palavras ou menos que pareçam ruído.
- Ignore transcrições que não estejam em português brasileiro.
- Sem mencionar "Gêntia" — você representa ${companyName}.

ENCERRAMENTO:
Só encerre quando o sistema enviar explicitamente a instrução de encerramento. Ao receber a instrução, diga exatamente a frase enviada pelo servidor — sem improvisar.`;
    }

    // Create ephemeral token from OpenAI
    const realtimeModel = await getConfiguredModel("start-culture-session", "gpt-realtime-mini");
    console.log("🔑 Creating ephemeral token from OpenAI (model:", realtimeModel, ")");

    const realtimeSessionConfig = {
      type: "realtime" as const,
      model: realtimeModel,
      instructions,
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24000 },
          transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
            // Conductor v2: backend drives every response.create. Disable
            // auto-response so VAD only signals speech boundaries and never
            // triggers the model to extrapolate the AI turn (which was causing
            // the AI to keep talking after the question, narrating examples).
            create_response: conductorEnabled ? false : true,
            interrupt_response: false,
          },
        },
        output: {
          format: { type: "audio/pcm", rate: 24000 },
          voice: "ash",
        },
      },
    };

    // P0 diagnostic: log the exact audio config so we can verify VAD/transcription
    // settings in postmortems without needing the client to be alive.
    console.log("🎛️ Realtime session config:", JSON.stringify({
      sessionId: session.id,
      model: realtimeModel,
      audio: realtimeSessionConfig.audio,
      instructionsChars: instructions.length,
    }));

    const tokenResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: realtimeSessionConfig }),
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
        .from("culture_interview_sessions")
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
        .from("culture_interview_sessions")
        .update({
          resume_count: newResumeCount,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", session.id);
      if (resumeErr) console.error("⚠️ Error incrementing resume_count:", resumeErr);
      else console.log("🔁 resume_count =", newResumeCount);
    }

    console.log("✅ Culture interview session started:", session.id);

    return new Response(
      JSON.stringify({
        ephemeralToken: tokenData.value || tokenData.client_secret?.value || tokenData.client_secret,
        sessionId: session.id,
        jobTitle,
        candidateName: firstName,
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
