import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('accept-ep-invite');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  invite_id: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  log.log("Request received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { invite_id, password }: AcceptInviteRequest = await req.json();
    log.log("Processing invite", invite_id);

    // Validate inputs
    if (!invite_id || !password) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("ep_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      log.error("Invite not found", inviteError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (invite.accepted) {
      return new Response(
        JSON.stringify({ error: "Este convite já foi aceito" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === invite.email);

    let userId: string;

    if (existingUser) {
      // User already exists, just use their ID
      log.log("User already exists", existingUser.id);
      userId = existingUser.id;
    } else {
      // Create new user
      log.log("Creating new user");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: invite.name,
          first_name: invite.name.split(' ')[0],
          last_name: invite.name.split(' ').slice(1).join(' '),
        },
      });

      if (createError || !newUser.user) {
        log.error("Error creating user", createError);
        throw createError || new Error("Erro ao criar usuário");
      }

      userId = newUser.user.id;
      log.log("User created", userId);

      // Create profile entry
      const nameParts = invite.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: invite.email,
          first_name: firstName,
          last_name: lastName || null,
        });

      if (profileError) {
        log.error("Error creating profile", profileError);
        // Don't throw, profile might be auto-created by trigger
      }
    }

    // Create EP consultant record
    const { error: consultantError } = await supabaseAdmin
      .from("ep_consultants")
      .upsert({
        user_id: userId,
        name: invite.name,
        email: invite.email,
        active: true,
        created_by: invite.invited_by,
      }, {
        onConflict: 'user_id',
      });

    if (consultantError) {
      log.error("Error creating consultant record", consultantError);
      // Don't throw, might already exist
    }

    // Assign user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: invite.role,
      }, {
        onConflict: 'user_id,role',
      });

    if (roleError) {
      log.error("Error assigning role", roleError);
      // Don't throw, role might already exist
    }

    // Mark invite as accepted
    const { error: updateError } = await supabaseAdmin
      .from("ep_invites")
      .update({ accepted: true })
      .eq("id", invite_id);

    if (updateError) {
      log.error("Error updating invite", updateError);
    }

    log.log("Successfully processed invite for", invite.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite aceito com sucesso",
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Error", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar convite" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
