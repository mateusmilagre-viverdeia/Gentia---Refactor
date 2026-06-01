import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('accept-invite-with-signup');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  invite_id: string;
  first_name: string;
  last_name: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_id, first_name, last_name, password }: SignupRequest = await req.json();

    log.log("Processing invite signup:", { invite_id, first_name, last_name });

    if (!invite_id || !first_name || !last_name || !password) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password complexity (matches client-side rules)
    const pwdChecks = [
      { ok: password.length >= 8, msg: "A senha deve ter no mínimo 8 caracteres." },
      { ok: /[a-z]/.test(password), msg: "A senha precisa ter ao menos uma letra minúscula." },
      { ok: /[A-Z]/.test(password), msg: "A senha precisa ter ao menos uma letra maiúscula." },
      { ok: /\d/.test(password), msg: "A senha precisa ter ao menos um número." },
      { ok: /[^A-Za-z0-9]/.test(password), msg: "A senha precisa ter ao menos um caractere especial (ex.: !@#$%)." },
    ];
    const pwdFail = pwdChecks.find((c) => !c.ok);
    if (pwdFail) {
      return new Response(
        JSON.stringify({ error: pwdFail.msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch and validate invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("account_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      log.error("Invite not found:", inviteError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.accepted) {
      return new Response(
        JSON.stringify({ error: "Este convite já foi aceito" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Invite validated:", { email: invite.email, role: invite.role, account_id: invite.account_id });

    // 2. Check if user already exists — paginated, scales beyond 50 users
    let existingUser: any = null;
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (listError) {
        log.error("Error listing users:", listError);
        break;
      }
      const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === invite.email.toLowerCase());
      if (found) { existingUser = found; break; }
      if (!usersPage?.users || usersPage.users.length < perPage) break;
      page++;
      if (page > 50) break; // hard safety cap (50k users)
    }

    if (existingUser) {
      // User exists — must login with EXISTING password (the password typed here is ignored)
      log.log("User already exists, returning needs_login signal", { email: invite.email });
      return new Response(
        JSON.stringify({
          needs_login: true,
          account_exists: true,
          email: invite.email,
          invite_id: invite_id,
          message: "Já existe uma conta cadastrada com este email. A senha digitada aqui NÃO foi salva — use sua senha atual para entrar. Se não lembrar, clique em 'Esqueci minha senha'. Após o login, o convite será aceito automaticamente.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create user (auto-confirm so they can login immediately)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (authError || !authData.user) {
      log.error("Error creating user:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta: " + (authError?.message || "Erro desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    log.log("User created:", userId);

    // 4. Upsert profile (don't depend on trigger timing)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: invite.email,
        first_name,
        last_name,
        account_id: invite.account_id,
      }, { onConflict: "id" });

    if (profileError) {
      log.error("Error upserting profile:", profileError);
      // Cleanup: delete auth user so the user can retry
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Add as account member
    const { error: memberError } = await supabaseAdmin
      .from("account_members")
      .insert({
        account_id: invite.account_id,
        user_id: userId,
        role: invite.role,
      });

    if (memberError) {
      log.error("Error adding account member:", memberError);
      // Cleanup
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar membro à equipe: " + memberError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Account member added");

    // 6. Mark invite accepted
    const { error: updateError } = await supabaseAdmin
      .from("account_invites")
      .update({ accepted: true, status: 'accepted' })
      .eq("id", invite_id);

    if (updateError) {
      log.error("Error marking invite as accepted:", updateError);
    }

    // 7. Welcome email (best-effort)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({ user_id: userId, account_id: invite.account_id, role: invite.role })
      });
    } catch (emailError) {
      log.error("Error triggering welcome email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: invite.email,
        message: "Conta criada e convite aceito com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
