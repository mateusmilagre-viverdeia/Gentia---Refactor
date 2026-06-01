import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateTokenRequest {
  candidate_email: string;
  source?: string; // 'pool_entry' | 'manual_request'
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-PREFERENCES-TOKEN] ${step}${detailsStr}`);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_email, source = 'manual_request' }: GenerateTokenRequest = await req.json();

    if (!candidate_email) {
      return new Response(
        JSON.stringify({ error: "candidate_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Generating token for candidate", { email: candidate_email, source });

    // Generate secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');

    // Token expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert preferences record with new token
    const { data: preferences, error: upsertError } = await supabase
      .from('candidate_marketplace_preferences')
      .upsert({
        candidate_email,
        preferences_token: token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'candidate_email',
      })
      .select()
      .single();

    if (upsertError) {
      logStep("Error upserting preferences", { error: upsertError.message });
      throw upsertError;
    }

    logStep("Token generated successfully", { 
      preferencesId: preferences.id,
      expiresAt: expiresAt.toISOString()
    });

    // Build the preferences URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://app.gentia.com.br";
    const preferencesUrl = `${siteUrl}/candidato/preferencias?token=${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        preferences_url: preferencesUrl,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error generating token", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
