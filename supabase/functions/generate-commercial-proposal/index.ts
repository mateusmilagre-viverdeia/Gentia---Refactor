import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  account_id: string;
  cliente_id: string;
  title: string;
  scope_brief: string;
  pricing_hint?: string;
  payment_terms?: string;
  validity_days?: number;
}

serve(async (req: Request) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as GenerateRequest;
    if (!body.account_id || !body.cliente_id || !body.title || !body.scope_brief) {
      return new Response(
        JSON.stringify({
          error: "missing_fields",
          required: ["account_id", "cliente_id", "title", "scope_brief"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify membership
    const { data: isMember } = await supabase.rpc("is_account_member", {
      _account_id: body.account_id,
      _user_id: userId,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load client data
    const { data: cliente, error: clienteErr } = await supabase
      .from("clientes_consultoria")
      .select("razao_social, nome_fantasia, setor, porte, fee_percentual, fee_fixo, modelo_fee")
      .eq("id", body.cliente_id)
      .eq("account_id", body.account_id)
      .single();

    if (clienteErr || !cliente) {
      return new Response(JSON.stringify({ error: "client_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "ai_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um consultor sênior da EP Partners especializado em propostas comerciais B2B para serviços de gestão de pessoas, recrutamento executivo e consultoria estratégica.

Gere propostas em português do Brasil, formato Markdown, profissionais e persuasivas. Use as seções:
1. Apresentação e contexto
2. Escopo do trabalho
3. Entregáveis
4. Investimento e condições comerciais
5. Prazos e validade
6. Próximos passos

Seja específico, evite jargões vazios, e demonstre entendimento do negócio do cliente.`;

    const userPrompt = `Cliente: ${cliente.nome_fantasia || cliente.razao_social}
Razão Social: ${cliente.razao_social}
Setor: ${cliente.setor || "não informado"}
Porte: ${cliente.porte || "não informado"}

Modelo de fee atual: ${cliente.modelo_fee || "não definido"}
Fee percentual histórico: ${cliente.fee_percentual ?? "n/a"}%
Fee fixo histórico: R$ ${cliente.fee_fixo ?? "n/a"}

Título da proposta: ${body.title}

Escopo (briefing do consultor):
${body.scope_brief}

Sugestão de precificação: ${body.pricing_hint || "use o histórico do cliente como referência"}
Condições de pagamento: ${body.payment_terms || "definir"}
Validade da proposta: ${body.validity_days || 15} dias

Gere a proposta comercial completa em Markdown.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const generated = aiData?.choices?.[0]?.message?.content as string | undefined;
    if (!generated) {
      return new Response(JSON.stringify({ error: "empty_ai_response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validityDate = body.validity_days
      ? new Date(Date.now() + body.validity_days * 86400000).toISOString().slice(0, 10)
      : null;

    // Detect demo mode for the account → flag the proposal accordingly
    const { data: demoCfg } = await supabase
      .from("account_demo_config")
      .select("demo_mode_active")
      .eq("account_id", body.account_id)
      .maybeSingle();
    const isDemo = !!demoCfg?.demo_mode_active;

    const { data: inserted, error: insertErr } = await supabase
      .from("commercial_proposals")
      .insert({
        account_id: body.account_id,
        cliente_id: body.cliente_id,
        created_by: userId,
        title: body.title,
        scope_text: body.scope_brief,
        payment_terms: body.payment_terms ?? null,
        validity_date: validityDate,
        ai_prompt_input: { scope_brief: body.scope_brief, pricing_hint: body.pricing_hint ?? null },
        ai_generated_content: generated,
        ai_model_used: "google/gemini-3-flash-preview",
        generated_at: new Date().toISOString(),
        status: "draft",
        is_demo: isDemo,
      })
      .select("id, public_token")
      .single();

    if (insertErr || !inserted) {
      console.error("insert error:", insertErr);
      return new Response(JSON.stringify({ error: "insert_failed", detail: insertErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: inserted.id,
        public_token: inserted.public_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-commercial-proposal error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
