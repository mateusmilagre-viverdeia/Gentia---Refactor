import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';
import { resolveCulturalAgentId } from "../_shared/resolveCulturalAgent.ts";

const log = createLogger('culture-interview-chat');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface InterviewQuestion {
  value_label: string | null;
  question_text: string;
  stage_number: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { 
      sessionId, 
      messages, 
      action,
      accountId,
      jobId,
      candidateProfileId,
      candidateName,
      companyName,
      responses,
      durationSeconds
    } = body;

    // Action: initialize - Create session and get questions
    if (action === "initialize") {
      
      // Fetch questions from values_questions_items for the account
      const { data: questionsSession } = await supabase
        .from("values_questions_sessions")
        .select("id")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let questions: InterviewQuestion[] = [];
      
      if (questionsSession) {
        const { data: items } = await supabase
          .from("values_questions_items")
          .select("value_label, question_text, stage_number")
          .eq("session_id", questionsSession.id)
          .order("stage_number", { ascending: true })
          .order("position", { ascending: true });
        
        if (items) {
          questions = items;
        }
      }

      // If no configured questions, use catalog as fallback
      if (questions.length === 0) {
        const { data: catalogItems } = await supabase
          .from("values_questions_catalog")
          .select("value_label, question_text, stage_number")
          .eq("active", true)
          .order("stage_number", { ascending: true });
        
        if (catalogItems) {
          questions = catalogItems;
        }
      }

      // Resolve agent_id (Fase 2: persist on create)
      const resolved = await resolveCulturalAgentId(supabase, {
        jobId,
        accountId,
      });
      if (!resolved.agentId) {
        console.warn("[culture-interview-chat] No cultural agent resolved", { jobId, accountId });
      }

      // Create interview session
      const { data: session, error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .insert({
          account_id: accountId,
          job_id: jobId,
          candidate_profile_id: candidateProfileId,
          agent_id: resolved.agentId,
          status: "pending",
          questions: questions,
        })
        .select("id")
        .single();

      if (sessionError) {
        throw sessionError;
      }

      return new Response(JSON.stringify({ 
        sessionId: session.id, 
        questions,
        candidateName,
        companyName
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: chat - Process conversation
    if (action === "chat") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Fetch session data
      const { data: session, error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const questions = session.questions as InterviewQuestion[];
      const candidateName = messages.find((m: Message) => m.role === "system")?.content.match(/CANDIDATO: (.+)/)?.[1] || "Candidato";
      const companyName = messages.find((m: Message) => m.role === "system")?.content.match(/EMPRESA: (.+)/)?.[1] || "Empresa";

      // Build system prompt
      const systemPrompt = `Você está conduzindo uma ENTREVISTA DE MATCHING CULTURAL com UM CANDIDATO (pessoa física), em PORTUGUÊS DO BRASIL.

CANDIDATO: ${candidateName}
EMPRESA: ${companyName}

PERSPECTIVA:
- Fale SEMPRE diretamente com o candidato: "você", "seu", "sua".
- Nunca fale como se entrevistasse a empresa ("vocês", "a empresa de vocês").
- Se a pergunta falar de "empresa", deixe claro que é a opinião do candidato.

PERGUNTAS:
- Use EXATAMENTE as perguntas abaixo, sem criar novas.
- Leia cada pergunta literalmente, na ordem indicada:

${questions.map((q, i) => `${i + 1}. ${q.question_text}${q.value_label ? ` [Valor: ${q.value_label}]` : ''}`).join('\n')}

FLUXO:
1. Cumprimente: "Olá ${candidateName}! Sou o assistente de entrevistas culturais. Vou fazer ${questions.length} perguntas sobre cultura organizacional para conhecer melhor VOCÊ."
2. Avise: "Quando terminarmos todas as perguntas, você verá um botão para finalizar a entrevista."
3. Faça UMA pergunta por vez, exatamente como está escrita.
4. Aguarde a resposta do candidato.
5. Dê um feedback curto ("Ótimo", "Ok", "Excelente", "Boa!", "Perfeito, entendi.").
6. Faça a próxima pergunta.
7. Após a última pergunta, diga claramente:
   "Pronto, terminamos a entrevista! Obrigado pelas suas respostas. Agora você pode clicar no botão 'Finalizar' para concluir."
8. Nunca fale sobre outros assuntos fora do escopo da entrevista.

TOM:
- Natural, empático e descontraído.
- Não julgue as respostas; apenas siga o fluxo.

IMPORTANTE: Suas respostas devem ser curtas e diretas. Não faça múltiplas perguntas de uma vez.`;

      const chatMessages: Message[] = [
        { role: "system", content: systemPrompt },
        ...messages.filter((m: Message) => m.role !== "system")
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: await getConfiguredModel("culture-interview-chat", "google/gemini-3-flash-preview"),
          messages: chatMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const assistantMessage = aiResponse.choices?.[0]?.message?.content || "";

      if (session.account_id) {
        try {
          await consumeAICredits({
            supabase,
            accountId: session.account_id,
            aiData: aiResponse,
            model: 'google/gemini-3-flash-preview',
            referenceType: 'culture_interview_chat',
            referenceId: sessionId,
            description: 'Mensagem de entrevista cultural (chat)',
            userId: user.id,
          });
        } catch (e) { console.error('[culture-interview-chat] billing chat error', e); }
      }


      // Update session with new messages
      const updatedMessages = [...(session.ai_messages || []), ...messages, { role: "assistant", content: assistantMessage }];
      
      await supabase
        .from("culture_interview_sessions")
        .update({ 
          ai_messages: updatedMessages,
          status: session.status === "pending" ? "in_progress" : session.status,
          started_at: session.started_at || new Date().toISOString()
        })
        .eq("id", sessionId);

      return new Response(JSON.stringify({ message: assistantMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: complete - Analyze responses and generate score
    if (action === "complete") {

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Fetch session
      const { data: session, error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const questions = session.questions as InterviewQuestion[];

      // Build analysis prompt
      const analysisPrompt = `Analise as respostas desta entrevista de matching cultural e forneça:
1. Uma pontuação de 0 a 100 representando o fit cultural do candidato
2. Uma análise breve (máximo 3 parágrafos) sobre os pontos fortes e áreas de atenção

PERGUNTAS E RESPOSTAS:
${responses.map((r: { question: string; answer: string; value?: string }, i: number) => 
  `${i + 1}. Pergunta${r.value ? ` [${r.value}]` : ''}: ${r.question}
   Resposta: ${r.answer}`
).join('\n\n')}

Responda APENAS no formato JSON:
{
  "score": <número de 0 a 100>,
  "analysis": "<análise em português>"
}`;

      const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: await getConfiguredModel("culture-interview-chat", "google/gemini-3-flash-preview"),
          messages: [
            { role: "system", content: "Você é um especialista em RH e cultura organizacional. Analise entrevistas de matching cultural de forma objetiva e construtiva." },
            { role: "user", content: analysisPrompt }
          ],
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Failed to analyze interview");
      }

      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.choices?.[0]?.message?.content || "";

      if (session.account_id) {
        try {
          await consumeAICredits({
            supabase,
            accountId: session.account_id,
            aiData: analysisData,
            model: 'google/gemini-3-flash-preview',
            referenceType: 'culture_interview_analysis',
            referenceId: sessionId,
            description: 'Análise final de entrevista cultural',
            userId: user.id,
          });
        } catch (e) { console.error('[culture-interview-chat] billing analysis error', e); }
      }

      
      // Parse JSON from response
      let score = 0;
      let analysis = "";
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          score = parsed.score || 0;
          analysis = parsed.analysis || "";
        }
      } catch (e) {
        log.error("Failed to parse analysis:", e);
        analysis = analysisText;
      }

      // Update session
      await supabase
        .from("culture_interview_sessions")
        .update({
          status: "completed",
          responses: responses,
          matching_score: score,
          matching_analysis: analysis,
          duration_seconds: durationSeconds,
          completed_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      return new Response(JSON.stringify({ score, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
