// Edge function para testar agentes (Cultural / Técnico) sem criar candidatura.
// Não persiste sessão no banco — apenas valida acesso, monta instructions e
// retorna um ephemeral token da OpenAI Realtime para o front estabelecer WebRTC.
//
// BILLING: este endpoint é restrito a Super Admin (não é cobrado). Qualquer
// usuário sem Super Admin recebe 403 — para testes reais, usar o fluxo normal
// de entrevista que passa por culture-interview-complete/technical-interview-complete.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ───── Auth ─────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    // ───── Super Admin only (agente-test não é cobrado) ─────
    const { data: isSuperAdminData } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userId });
    if (!isSuperAdminData) {
      return new Response(JSON.stringify({
        error: "FORBIDDEN",
        message: "Modo teste de agente é restrito a Super Admin. Para testar com cobrança, use o fluxo normal de entrevista.",
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { agentId, testerName } = body;
    if (!agentId) {
      return new Response(JSON.stringify({ error: "AGENT_ID_REQUIRED" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── Load agent ─────
    const { data: agent, error: agentErr } = await supabaseAdmin
      .from("recruitment_agents")
      .select("id, name, type, account_id, language")
      .eq("id", agentId)
      .single();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "AGENT_NOT_FOUND" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── Authorize: user must be member of the agent's account ─────
    const { data: memberRow } = await supabaseAdmin
      .from("account_members")
      .select("user_id")
      .eq("account_id", agent.account_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!memberRow) {
      return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── Load company name ─────
    const { data: company } = await supabaseAdmin
      .from("companies").select("name").eq("id", agent.account_id).single();
    const companyName = company?.name || "sua empresa";

    // ───── Tester name ─────
    const firstName = (testerName?.toString().trim().split(" ")[0]) || "Teste";

    // ───── Build prompt by agent type ─────
    let instructions = "";
    // Taxonomia atual: agente técnico tem type 'adaptive' (mantém 'technical'/'tecnico' legados).
    if (agent.type === "adaptive" || agent.type === "technical" || agent.type === "tecnico") {
      instructions = buildTechnicalDemoPrompt(companyName, firstName);
    } else {
      // default to cultural-style demo for any other agent
      // Try to load configured questions for cultural/structured agents
      const { data: qs } = await supabaseAdmin
        .from("recruitment_agent_questions")
        .select("question_text, position")
        .eq("agent_id", agent.id)
        .order("position", { ascending: true });
      const questionsText = (qs && qs.length > 0)
        ? qs.map((q, i) => `${i + 1}. ${q.question_text}`).join("\n")
        : `1. Me conte sobre sua trajetória profissional.\n2. O que te motiva no trabalho?\n3. Como você lida com pressão e prazos?`;
      instructions = buildCulturalDemoPrompt(companyName, firstName, questionsText);
    }

    // ───── Get ephemeral token from OpenAI Realtime ─────
    const tokenResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-mini",
          instructions,
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: { type: "semantic_vad", eagerness: "low" },
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
      console.error("OpenAI token error:", tokenResponse.status, errorText);
      return new Response(JSON.stringify({ error: "OPENAI_ERROR", message: "Falha ao conectar com a IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();

    return new Response(JSON.stringify({
      success: true,
      ephemeralToken: tokenData.value || tokenData.client_secret?.value,
      agentName: agent.name,
      agentType: agent.type,
      companyName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-test-realtime error:", e);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", message: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildCulturalDemoPrompt(companyName: string, firstName: string, questionsText: string) {
  return `Você é um entrevistador de fit cultural da empresa ${companyName}, conduzindo uma entrevista de DEMONSTRAÇÃO por voz.

CONTEXTO:
- Esta é uma SESSÃO DE TESTE feita por um gestor da empresa para ouvir como você conduz a entrevista.
- "Candidato" no teste: ${firstName}
- Idioma: PORTUGUÊS DO BRASIL

SUAS PERGUNTAS:
${questionsText}

ABERTURA:
"Olá ${firstName}! Esta é uma demonstração do agente de fit cultural de ${companyName}. Vou conduzir uma entrevista normal — pode responder à vontade, ou apenas dizer 'pode pular' para eu ir para a próxima pergunta. Pronto para começar?"

CONDUÇÃO:
- Faça uma pergunta por vez, com tom acolhedor e profissional.
- Aguarde a resposta. Se a pessoa disser "pode pular" ou "próxima", avance imediatamente sem julgar.
- Faça follow-ups naturais quando houver resposta de verdade.
- Mantenha ritmo fluido.

ENCERRAMENTO:
"${firstName}, era isso! Esta foi a demonstração do agente. Pode encerrar quando quiser."

REGRAS:
- Fale SOMENTE em português brasileiro.
- NUNCA mencione "Gêntia" — apenas ${companyName}.
- Esta é uma demonstração; seja natural e mostre o seu melhor.`;
}

function buildTechnicalDemoPrompt(companyName: string, firstName: string) {
  return `Você é um entrevistador técnico sênior da empresa ${companyName}, conduzindo uma entrevista de DEMONSTRAÇÃO por voz.

CONTEXTO:
- Esta é uma SESSÃO DE TESTE feita por um gestor da empresa para ouvir como você conduz uma entrevista técnica.
- "Candidato" no teste: ${firstName}
- Idioma: PORTUGUÊS DO BRASIL
- Como esta é uma demonstração genérica (sem vaga real), use uma vaga-exemplo: "Desenvolvedor(a) Full-Stack Pleno (React + Node.js)".

SKILLS A AVALIAR (exemplo):
- JavaScript / TypeScript
- React
- Node.js / APIs REST
- Banco de dados (SQL)
- Boas práticas e arquitetura

ABERTURA:
"Olá ${firstName}! Esta é uma demonstração do agente técnico de ${companyName}, simulando uma vaga de Desenvolvedor Full-Stack Pleno. Vou conduzir como uma entrevista real — você pode responder, ou dizer 'pode pular' para eu ir para a próxima pergunta. Pronto?"

CONDUÇÃO:
- Pergunte UMA skill por vez, começando pela principal.
- Lógica adaptativa: se a resposta for superficial, faça follow-up; se for excelente, desafie com cenário avançado; se for incorreta, tente uma pergunta mais básica.
- Máximo 3 perguntas por skill.
- Se a pessoa disser "pode pular" ou "próxima", avance imediatamente.

ENCERRAMENTO:
"${firstName}, era isso! Esta foi a demonstração do agente técnico. Pode encerrar quando quiser."

REGRAS:
- Fale SOMENTE em português brasileiro.
- NUNCA mencione "Gêntia" — apenas ${companyName}.
- Esta é uma demonstração; seja natural, profissional e mostre o seu melhor.
- NUNCA peça para o candidato escrever, digitar ou redigir — entrevista é por VOZ.`;
}
