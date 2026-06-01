import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getAppOrigin(req: Request) {
  return req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.tech";
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeEmail(email: unknown) {
  return String(email || "").toLowerCase().trim();
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getNameFromEmail(email: string) {
  const local = email.split("@")[0] || "usuario";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function findUserIdByEmail(supabaseAdmin: any, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profile?.id) return profile.id;

  const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return usersPage?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail)?.id || null;
}

async function provisionEmergencyAccess(supabaseAdmin: any, actorUserId: string, input: any) {
  const email = normalizeEmail(input.email);
  const accountId = String(input.account_id || "");
  const role = String(input.role || "member");
  const allowedRoles = ["admin", "admin_rh", "leader", "member", "viewer"];

  if (!email || !accountId || !allowedRoles.includes(role)) {
    throw new Error("Informe email, empresa e papel válido");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Email inválido: ${email}`);
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("id", accountId)
    .single();
  if (companyError || !company) throw new Error("Empresa não encontrada");

  const temporaryPassword = generateTemporaryPassword();
  let targetUserId = await findUserIdByEmail(supabaseAdmin, email);
  let created = false;

  const firstName = String(input.first_name || input.firstName || "").trim() || getNameFromEmail(email).split(" ")[0] || "Usuário";
  const lastName = String(input.last_name || input.lastName || "").trim();

  if (!targetUserId) {
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        temporary_password_generated_at: new Date().toISOString(),
        temporary_password_generated_by: actorUserId,
        must_change_password: true,
      },
    });
    if (createError) throw createError;
    targetUserId = createdUser.user.id;
    created = true;
  } else {
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: temporaryPassword,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        temporary_password_generated_at: new Date().toISOString(),
        temporary_password_generated_by: actorUserId,
        must_change_password: true,
      },
    });
    if (updateAuthError) throw updateAuthError;
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: targetUserId,
    email,
    first_name: firstName,
    last_name: lastName || null,
    account_id: accountId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { data: existingMember } = await supabaseAdmin
    .from("account_members")
    .select("id, is_active, role")
    .eq("user_id", targetUserId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingMember) {
    const { error: memberUpdateError } = await supabaseAdmin
      .from("account_members")
      .update({ role, is_active: true, deactivated_at: null, deactivated_by: null })
      .eq("id", existingMember.id);
    if (memberUpdateError) throw memberUpdateError;
  } else {
    const { error: memberInsertError } = await supabaseAdmin
      .from("account_members")
      .insert({ user_id: targetUserId, account_id: accountId, role, is_active: true });
    if (memberInsertError) throw memberInsertError;
  }

  return {
    success: true,
    created,
    user_id: targetUserId,
    email,
    first_name: firstName,
    last_name: lastName,
    account_id: accountId,
    company_name: company.name,
    role,
    temporary_password: temporaryPassword,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Check super admin
    const { data: isSA } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userId });
    if (!isSA) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "link_to_company": {
        const { user_id, account_id, role } = body;
        if (!user_id || !account_id || !role) {
          return new Response(JSON.stringify({ error: "Missing user_id, account_id or role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if membership already exists
        const { data: existing } = await supabaseAdmin
          .from("account_members")
          .select("id, is_active, role")
          .eq("user_id", user_id)
          .eq("account_id", account_id)
          .maybeSingle();

        if (existing) {
          // If inactive, reactivate with the new role
          if (!existing.is_active) {
            const { error: reactivateError } = await supabaseAdmin
              .from("account_members")
              .update({ is_active: true, role, deactivated_at: null, deactivated_by: null })
              .eq("id", existing.id);
            if (reactivateError) throw reactivateError;

            await supabaseAdmin
              .from("profiles")
              .update({ account_id })
              .eq("id", user_id)
              .is("account_id", null);

            return new Response(JSON.stringify({ success: true, reactivated: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // If active but role differs, update role
          if (existing.role !== role) {
            const { error: updateError } = await supabaseAdmin
              .from("account_members")
              .update({ role })
              .eq("id", existing.id);
            if (updateError) throw updateError;

            return new Response(JSON.stringify({ success: true, role_updated: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Already active with same role
          return new Response(JSON.stringify({ error: "Usuário já é membro ativo desta empresa com este papel" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert membership
        const { error: insertError } = await supabaseAdmin
          .from("account_members")
          .insert({ user_id, account_id, role, is_active: true });

        if (insertError) throw insertError;

        // Update profile account_id
        await supabaseAdmin
          .from("profiles")
          .update({ account_id })
          .eq("id", user_id)
          .is("account_id", null);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change_role": {
        const { member_id, new_role } = body;
        if (!member_id || !new_role) {
          return new Response(JSON.stringify({ error: "Missing member_id or new_role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabaseAdmin
          .from("account_members")
          .update({ role: new_role })
          .eq("id", member_id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_active": {
        const { member_id, is_active } = body;
        if (!member_id || typeof is_active !== "boolean") {
          return new Response(JSON.stringify({ error: "Missing member_id or is_active" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updateData: Record<string, unknown> = { is_active };
        if (!is_active) {
          updateData.deactivated_at = new Date().toISOString();
          updateData.deactivated_by = userId;
        } else {
          updateData.deactivated_at = null;
          updateData.deactivated_by = null;
        }

        const { error } = await supabaseAdmin
          .from("account_members")
          .update(updateData)
          .eq("id", member_id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { email } = body;
        if (!email) {
          return jsonResponse({ error: "Missing email" }, 400);
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const cooldownSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: recentRecovery } = await supabaseAdmin
          .from("recruitment_communications_log")
          .select("id, created_at, status, provider_message_id")
          .eq("recipient", normalizedEmail)
          .eq("message_type", "auth_recovery")
          .in("status", ["sent", "blocked_by_cooldown"])
          .gte("created_at", cooldownSince)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentRecovery) {
          await supabaseAdmin.from("recruitment_communications_log").insert({
            account_id: "67f66f7a-d9a8-455e-8820-ee836cfe7401",
            message_type: "auth_recovery",
            channel: "email",
            recipient: normalizedEmail,
            subject: "Reset your password",
            status: "blocked_by_cooldown",
            provider: "internal_guard",
            provider_message_id: null,
            error_code: "RECOVERY_COOLDOWN_ACTIVE",
            error_message: "Já existe um link de recuperação recente para este e-mail.",
            metadata: { source: "admin", actor_user_id: userId, recent_recovery_id: recentRecovery.id },
          });

          return jsonResponse({
            success: true,
            blocked_by_cooldown: true,
            message: "Já existe um link de recuperação recente. Use o e-mail mais novo antes de solicitar outro.",
          });
        }

        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${getAppOrigin(req)}/auth/redefinir-senha?recovery_source=admin`,
        });

        if (error) throw error;

        return jsonResponse({ success: true, message: "E-mail de recuperação solicitado. Se o usuário não receber, use Gerar senha temporária." });
      }

      case "generate_temporary_password": {
        const { email } = body;
        if (!email) {
          return new Response(JSON.stringify({ error: "Missing email" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const targetUserId = await findUserIdByEmail(supabaseAdmin, normalizedEmail);
        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "Usuário não encontrado com este e-mail" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const temporaryPassword = generateTemporaryPassword();
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: temporaryPassword,
          user_metadata: {
            temporary_password_generated_at: new Date().toISOString(),
            temporary_password_generated_by: userId,
            must_change_password: true,
          },
        });

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, temporary_password: temporaryPassword }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "emergency_release_access": {
        const result = await provisionEmergencyAccess(supabaseAdmin, userId, body);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "emergency_release_access_bulk": {
        const users = Array.isArray(body.users) ? body.users : [];
        if (!users.length || !body.account_id) {
          return new Response(JSON.stringify({ error: "Informe empresa e ao menos um usuário" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const released = [];
        const failed = [];
        for (const item of users.slice(0, 100)) {
          try {
            released.push(await provisionEmergencyAccess(supabaseAdmin, userId, {
              ...item,
              account_id: body.account_id,
              role: item.role || body.role || "member",
            }));
          } catch (err) {
            failed.push({ email: normalizeEmail(item?.email), error: err.message || "Erro ao liberar usuário" });
          }
        }

        return new Response(JSON.stringify({ success: failed.length === 0, released, failed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "invite_to_company": {
        const { email, account_id, role } = body;
        if (!email || !account_id || !role) {
          return new Response(JSON.stringify({ error: "Missing email, account_id or role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(JSON.stringify({ error: "Email inválido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if there's already a pending invite for this email+account
        const { data: existingInvite } = await supabaseAdmin
          .from("account_invites")
          .select("id, status")
          .eq("email", email.toLowerCase().trim())
          .eq("account_id", account_id)
          .in("status", ["pending", "awaiting_payment", "paid_ready_to_send", "sent"])
          .maybeSingle();

        if (existingInvite) {
          return new Response(JSON.stringify({ error: "Já existe um convite pendente para este email nesta empresa" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if email is already an active member (via profiles)
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();

        if (existingProfile) {
          const { data: existingMember } = await supabaseAdmin
            .from("account_members")
            .select("id, is_active")
            .eq("user_id", existingProfile.id)
            .eq("account_id", account_id)
            .eq("is_active", true)
            .maybeSingle();

          if (existingMember) {
            return new Response(JSON.stringify({ error: "Este email já é membro ativo desta empresa" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Get company name for the invite email
        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("id, name")
          .eq("id", account_id)
          .single();

        if (!company) {
          return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate token
        const token = crypto.randomUUID();

        // Create invite record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data: invite, error: inviteError } = await supabaseAdmin
          .from("account_invites")
          .insert({
            account_id,
            email: email.toLowerCase().trim(),
            role,
            invited_by: userId,
            token,
            status: "pending",
            accepted: false,
            expires_at: expiresAt.toISOString(),
          })
          .select("id")
          .single();

        if (inviteError) throw inviteError;

        // Call send-team-invite to send the email
        try {
          const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-team-invite`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              invite_id: invite.id,
              account_id,
              email: email.toLowerCase().trim(),
              role,
              invited_by_name: "Super Admin",
              company_name: company.name,
            }),
          });

          if (!sendRes.ok) {
            console.warn("send-team-invite returned non-ok:", await sendRes.text());
          }
        } catch (sendErr) {
          console.warn("Failed to call send-team-invite, invite created but email may not have been sent:", sendErr);
        }

        return new Response(JSON.stringify({ success: true, invite_id: invite.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_company_status": {
        const { company_id } = body;
        if (!company_id) {
          return new Response(JSON.stringify({ error: "Missing company_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: company, error: fetchErr } = await supabaseAdmin
          .from("companies")
          .select("id, status")
          .eq("id", company_id)
          .single();

        if (fetchErr || !company) {
          return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const newStatus = company.status === "suspended" ? "active" : "suspended";
        const { error: updateErr } = await supabaseAdmin
          .from("companies")
          .update({ status: newStatus })
          .eq("id", company_id);

        if (updateErr) throw updateErr;

        return new Response(JSON.stringify({ success: true, new_status: newStatus }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "diagnose_consultant": {
        const { consultant_id } = body;
        if (!consultant_id) {
          return new Response(JSON.stringify({ error: "Missing consultant_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 1. Get consultant info
        const { data: consultant, error: cErr } = await supabaseAdmin
          .from("ep_consultants")
          .select("id, user_id, name, email, active")
          .eq("id", consultant_id)
          .single();

        if (cErr || !consultant) {
          return new Response(JSON.stringify({ error: "Consultor não encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Check if user_id exists in profiles
        let profileExists = false;
        if (consultant.user_id) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", consultant.user_id)
            .maybeSingle();
          profileExists = !!profile;
        }

        // 3. Get all assignments with company names
        const { data: assignments } = await supabaseAdmin
          .from("consultant_assignments")
          .select("id, account_id, active, assigned_at, account:companies(id, name)")
          .eq("consultant_id", consultant_id);

        // 4. For each assignment, check real access via can_edit_client_project
        const diagnostics = [];
        for (const assignment of (assignments || [])) {
          let canEdit = false;
          if (consultant.user_id && consultant.active && assignment.active) {
            const { data: editResult } = await supabaseAdmin.rpc("can_edit_client_project", {
              _user_id: consultant.user_id,
              _account_id: assignment.account_id,
            });
            canEdit = editResult === true;
          }

          const issues: string[] = [];
          if (!consultant.active) issues.push("Consultor inativo");
          if (!consultant.user_id) issues.push("user_id não vinculado");
          if (!profileExists) issues.push("Perfil não encontrado");
          if (!assignment.active) issues.push("Atribuição inativa");
          if (consultant.active && assignment.active && consultant.user_id && !canEdit) {
            issues.push("Função can_edit_client_project retornou false");
          }

          diagnostics.push({
            assignment_id: assignment.id,
            account_id: assignment.account_id,
            company_name: (assignment.account as any)?.name || "Desconhecida",
            assignment_active: assignment.active,
            can_edit: canEdit,
            issues,
          });
        }

        return new Response(JSON.stringify({
          consultant: {
            id: consultant.id,
            name: consultant.name,
            email: consultant.email,
            user_id: consultant.user_id,
            active: consultant.active,
            profile_exists: profileExists,
          },
          assignments: diagnostics,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_orphan_user": {
        const { target_user_id } = body;
        if (!target_user_id) {
          return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user has any memberships (active or inactive)
        const { data: memberships } = await supabaseAdmin
          .from("account_members")
          .select("id")
          .eq("user_id", target_user_id);

        if (memberships && memberships.length > 0) {
          return new Response(JSON.stringify({ error: "Usuário possui vínculos com empresas. Remova os vínculos antes de excluir." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete profile
        await supabaseAdmin.from("profiles").delete().eq("id", target_user_id);

        // Delete from auth.users
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
        if (deleteAuthError) throw deleteAuthError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
