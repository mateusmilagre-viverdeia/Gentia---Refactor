import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("enrich-batch-candidates");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { candidateIds, forceRefresh = false } = await req.json();

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "candidateIds deve ser um array não vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 10;
    if (candidateIds.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: "bad_request", 
          message: `Máximo de ${MAX_BATCH_SIZE} candidatos por lote` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for API keys
    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");
    const clearbitApiKey = Deno.env.get("CLEARBIT_API_KEY");

    if (!apolloApiKey && !clearbitApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          configured: false, 
          message: "Configure APOLLO_API_KEY ou CLEARBIT_API_KEY nas configurações."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { candidateId: string; success: boolean; message: string }[] = [];
    const DELAY_BETWEEN_CALLS = 500; // 500ms delay to respect rate limits

    for (const candidateId of candidateIds) {
      try {
        // Call the individual enrich function internally
        const enrichResponse = await fetch(`${supabaseUrl}/functions/v1/enrich-candidate-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({ candidateId, forceRefresh }),
        });

        const enrichResult = await enrichResponse.json();
        
        results.push({
          candidateId,
          success: enrichResult.success === true,
          message: enrichResult.message || (enrichResult.success ? "Enriquecido" : "Falha"),
        });

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));

      } catch (err) {
        logger.error(`Error enriching candidate ${candidateId}:`, err);
        results.push({
          candidateId,
          success: false,
          message: "Erro ao processar",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`Batch enrichment complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          total: candidateIds.length,
          success: successCount,
          failed: failCount,
        },
        message: `${successCount} candidatos enriquecidos, ${failCount} falhas`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    logger.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "server_error", message: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
