import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "zapi";

interface WhatsAppSendRequest {
  provider?: Provider;
  toPhoneE164: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Authenticated function: validate JWT explicitly, then use service role for DB if needed later.
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid token in whatsapp-send", userError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: WhatsAppSendRequest = await req.json();
    const provider: Provider = body.provider || "zapi";
    const toPhoneE164 = (body.toPhoneE164 || "").trim();
    const message = (body.message || "").trim();

    if (!toPhoneE164 || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "toPhoneE164 and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("whatsapp-send", { provider, to: toPhoneE164, by: user.id });

    const startedAt = Date.now();
    let result: unknown;

    if (provider === "zapi") {
      result = await sendWhatsAppViaZApi({ toPhoneE164, message });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Unsupported provider" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const durationMs = Date.now() - startedAt;
    console.log("whatsapp-send success", { provider, durationMs });

    return new Response(
      JSON.stringify({ success: true, provider, durationMs, result }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-send function:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
