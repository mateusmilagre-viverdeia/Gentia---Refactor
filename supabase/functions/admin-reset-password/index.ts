import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("admin-reset-password");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with caller's token to check permissions
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await callerClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Check if caller is super_admin
    const { data: isSuperAdmin } = await callerClient.rpc("is_super_admin", {
      _user_id: callerId,
    });

    if (!isSuperAdmin) {
      log.warn(`Unauthorized reset attempt by user ${callerId}`);
      return new Response(
        JSON.stringify({ error: "Apenas Super Admin pode resetar senhas" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { targetEmail, newPassword } = await req.json();

    if (!targetEmail || !newPassword) {
      return new Response(
        JSON.stringify({ error: "E-mail e nova senha são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role client to find user and update password
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the user by email via profiles table
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", targetEmail.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado com este e-mail" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const targetUserId = profile.id;

    // Update the user's password
    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

    if (updateError) {
      log.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar a senha" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log.info(`Password reset for ${targetEmail} by super admin ${callerId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Senha resetada com sucesso para ${targetEmail}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
