import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("enrich-company-data");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyEnrichmentResult {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  linkedin_url?: string;
  twitter_url?: string;
  logo_url?: string;
  founded_year?: number;
  technologies?: string[];
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

    const { domain, companyName } = await req.json();

    if (!domain && !companyName) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "domain ou companyName é obrigatório" }),
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

    let companyResult: CompanyEnrichmentResult | null = null;
    let provider: string = "";

    // Try Apollo for company enrichment
    if (apolloApiKey) {
      try {
        logger.info(`Enriching company via Apollo: ${domain || companyName}`);
        
        const searchParams: Record<string, string> = {};
        if (domain) searchParams.organization_domains = domain;
        if (companyName) searchParams.organization_name = companyName;

        const apolloResponse = await fetch("https://api.apollo.io/v1/organizations/enrich", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apolloApiKey,
          },
          body: JSON.stringify(searchParams),
        });

        if (apolloResponse.ok) {
          const apolloData = await apolloResponse.json();
          
          if (apolloData.organization) {
            const org = apolloData.organization;
            companyResult = {
              name: org.name,
              domain: org.primary_domain,
              industry: org.industry,
              size: org.estimated_num_employees?.toString(),
              location: [org.city, org.state, org.country].filter(Boolean).join(", "),
              description: org.short_description,
              linkedin_url: org.linkedin_url,
              twitter_url: org.twitter_url,
              logo_url: org.logo_url,
              founded_year: org.founded_year,
              technologies: org.technologies?.map((t: { name: string }) => t.name),
            };
            provider = "apollo";
            logger.info(`Apollo company enrichment successful`);
          }
        } else {
          logger.warn(`Apollo company API error: ${apolloResponse.status}`);
        }
      } catch (err) {
        logger.error("Apollo company enrichment error:", err);
      }
    }

    // Fallback to Clearbit
    if (!companyResult && clearbitApiKey && domain) {
      try {
        logger.info(`Enriching company via Clearbit: ${domain}`);
        
        const clearbitResponse = await fetch(
          `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
          {
            headers: {
              Authorization: `Bearer ${clearbitApiKey}`,
            },
          }
        );

        if (clearbitResponse.ok) {
          const clearbitData = await clearbitResponse.json();
          
          companyResult = {
            name: clearbitData.name,
            domain: clearbitData.domain,
            industry: clearbitData.category?.industry,
            size: clearbitData.metrics?.employees,
            location: clearbitData.geo?.city,
            description: clearbitData.description,
            linkedin_url: clearbitData.linkedin?.handle ? `https://linkedin.com/company/${clearbitData.linkedin.handle}` : undefined,
            twitter_url: clearbitData.twitter?.handle ? `https://twitter.com/${clearbitData.twitter.handle}` : undefined,
            logo_url: clearbitData.logo,
            founded_year: clearbitData.foundedYear,
            technologies: clearbitData.tech,
          };
          provider = "clearbit";
          logger.info(`Clearbit company enrichment successful`);
        } else {
          logger.warn(`Clearbit company API error: ${clearbitResponse.status}`);
        }
      } catch (err) {
        logger.error("Clearbit company enrichment error:", err);
      }
    }

    if (!companyResult) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Não foi possível enriquecer dados da empresa."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companyResult,
        provider,
        message: `Dados da empresa enriquecidos via ${provider}`
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
