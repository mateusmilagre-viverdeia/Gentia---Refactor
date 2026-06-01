import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("enrich-candidate-profile");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  current_company?: string;
  current_title?: string;
  seniority?: string;
  linkedin_url?: string;
  company_size?: string;
  company_industry?: string;
  company_location?: string;
  twitter_url?: string;
  github_url?: string;
  work_email?: string;
  personal_email?: string;
  phone_numbers?: string[];
}

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

    const { candidateId, forceRefresh = false } = await req.json();

    if (!candidateId) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "candidateId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing non-expired enrichment
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from("recruitment_enriched_profiles")
        .select("*")
        .eq("candidate_id", candidateId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existing) {
        logger.info(`Using cached enrichment for candidate ${candidateId}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: existing, 
            cached: true,
            message: "Dados enriquecidos do cache"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get candidate info
    const { data: candidate, error: candidateError } = await supabase
      .from("recruitment_candidates")
      .select("id, name, email, phone, account_id")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      return new Response(
        JSON.stringify({ error: "not_found", message: "Candidato não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for API keys
    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");
    const clearbitApiKey = Deno.env.get("CLEARBIT_API_KEY");

    if (!apolloApiKey && !clearbitApiKey) {
      logger.warn("No enrichment API keys configured");
      return new Response(
        JSON.stringify({ 
          success: false,
          configured: false, 
          message: "Configure APOLLO_API_KEY ou CLEARBIT_API_KEY nas configurações para ativar enriquecimento."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let enrichmentResult: EnrichmentResult | null = null;
    let provider: string = "";
    let rawResponse: unknown = null;

    // Try Apollo first
    if (apolloApiKey && candidate.email) {
      try {
        logger.info(`Enriching via Apollo for ${candidate.email}`);
        const apolloResponse = await fetch("https://api.apollo.io/v1/people/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": apolloApiKey,
          },
          body: JSON.stringify({
            email: candidate.email,
            reveal_personal_emails: true,
            reveal_phone_number: true,
          }),
        });

        if (apolloResponse.ok) {
          const apolloData = await apolloResponse.json();
          rawResponse = apolloData;
          
          if (apolloData.person) {
            const person = apolloData.person;
            enrichmentResult = {
              current_company: person.organization?.name,
              current_title: person.title,
              seniority: person.seniority,
              linkedin_url: person.linkedin_url,
              company_size: person.organization?.estimated_num_employees?.toString(),
              company_industry: person.organization?.industry,
              company_location: person.organization?.primary_domain,
              twitter_url: person.twitter_url,
              github_url: person.github_url,
              work_email: person.email,
              personal_email: person.personal_emails?.[0],
              phone_numbers: person.phone_numbers?.map((p: { sanitized_number: string }) => p.sanitized_number),
            };
            provider = "apollo";
            logger.info(`Apollo enrichment successful for ${candidate.email}`);
          }
        } else {
          logger.warn(`Apollo API error: ${apolloResponse.status}`);
        }
      } catch (err) {
        logger.error("Apollo enrichment error:", err);
      }
    }

    // Fallback to Clearbit
    if (!enrichmentResult && clearbitApiKey && candidate.email) {
      try {
        logger.info(`Enriching via Clearbit for ${candidate.email}`);
        const clearbitResponse = await fetch(
          `https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(candidate.email)}`,
          {
            headers: {
              Authorization: `Bearer ${clearbitApiKey}`,
            },
          }
        );

        if (clearbitResponse.ok) {
          const clearbitData = await clearbitResponse.json();
          rawResponse = clearbitData;
          
          enrichmentResult = {
            current_company: clearbitData.employment?.name,
            current_title: clearbitData.employment?.title,
            seniority: clearbitData.employment?.seniority,
            linkedin_url: clearbitData.linkedin?.handle ? `https://linkedin.com/in/${clearbitData.linkedin.handle}` : undefined,
            twitter_url: clearbitData.twitter?.handle ? `https://twitter.com/${clearbitData.twitter.handle}` : undefined,
            github_url: clearbitData.github?.handle ? `https://github.com/${clearbitData.github.handle}` : undefined,
            work_email: candidate.email,
          };
          provider = "clearbit";
          logger.info(`Clearbit enrichment successful for ${candidate.email}`);
        } else {
          logger.warn(`Clearbit API error: ${clearbitResponse.status}`);
        }
      } catch (err) {
        logger.error("Clearbit enrichment error:", err);
      }
    }

    if (!enrichmentResult) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Não foi possível enriquecer dados do candidato. Verifique se o email está correto."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert enriched profile
    const { data: enrichedProfile, error: upsertError } = await supabase
      .from("recruitment_enriched_profiles")
      .upsert({
        candidate_id: candidateId,
        provider,
        ...enrichmentResult,
        raw_response: rawResponse,
        enriched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: "candidate_id,provider",
      })
      .select()
      .single();

    if (upsertError) {
      logger.error("Error saving enriched profile:", upsertError);
      return new Response(
        JSON.stringify({ error: "db_error", message: "Erro ao salvar dados enriquecidos" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: enrichedProfile,
        cached: false,
        message: `Dados enriquecidos via ${provider}`
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
