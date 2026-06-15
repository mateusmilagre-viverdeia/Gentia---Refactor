import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const log = createLogger('refine-selling-company');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check authentication and rate limit
  const rateLimitResult = await checkRateLimit(req, 'refine-selling-company', 50);
  
  if (!rateLimitResult.userId) {
    log.warn('Unauthorized request');
    return unauthorizedResponse(corsHeaders);
  }
  
  if (!rateLimitResult.allowed) {
    log.warn('Rate limit exceeded for user', rateLimitResult.userId);
    return rateLimitExceededResponse(corsHeaders);
  }

  try {
    const { currentContent, userMessage, context, blockId, blockContent } = await req.json();

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    log.log("Refining selling company content...");
    log.log("Block ID:", blockId || "full content");
    log.log("User message:", userMessage);
    log.info("User ID:", rateLimitResult.userId, "Remaining calls:", rateLimitResult.remaining);

    let systemPrompt: string;

    if (blockId && blockContent) {
      systemPrompt = `Você é a "IA Vendedora da Empresa". Você está refinando APENAS o bloco "${blockId}" do anúncio de vagas.

CONTEXTO DA EMPRESA:
${JSON.stringify(context, null, 2)}

BLOCO ATUAL A SER REFINADO:
${blockContent}

---

INSTRUÇÕES CRÍTICAS:
1. Retorne APENAS o bloco revisado, começando com o título "## [emoji] [número]. [título]"
2. Mantenha o mesmo formato e estrutura do bloco original
3. Aplique EXATAMENTE as alterações solicitadas pelo usuário
4. Mantenha o tom emocional e autêntico
5. Use Markdown: negrito para ênfase, listas quando apropriado
6. NÃO adicione outros blocos ou conteúdo extra

IMPORTANTE: Retorne SOMENTE o bloco revisado, nada mais.`;
    } else {
      systemPrompt = `Você é a "IA Vendedora da Empresa". Você está ajudando o usuário a refinar o texto de venda da empresa para atrair talentos.

CONTEXTO DA EMPRESA:
${JSON.stringify(context, null, 2)}

TEXTO ATUAL:
${currentContent}

---

O usuário vai pedir ajustes no texto. Você deve:
1. Manter o tom emocional e autêntico
2. Preservar a estrutura geral se não for pedido mudança
3. Aplicar as alterações solicitadas
4. Retornar o texto COMPLETO revisado (não apenas a parte alterada)

IMPORTANTE: Retorne APENAS o texto revisado, sem comentários adicionais.`;
    }

    const response = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Consume AI credits
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: membership } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', rateLimitResult.userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (membership?.account_id) {
      await consumeAICredits({
        supabase,
        accountId: membership.account_id,
        aiData: data,
        model: 'google/gemini-2.5-flash',
        referenceId: blockId || null,
        referenceType: 'refine_selling_company',
        description: `Refinamento selling company${blockId ? ` (bloco: ${blockId})` : ''}`,
        userId: rateLimitResult.userId,
      });
    }

    if (!content) {
      throw new Error("No content in AI response");
    }

    log.info("Content refined successfully");

    return new Response(
      JSON.stringify({ content, blockId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Error refining content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
