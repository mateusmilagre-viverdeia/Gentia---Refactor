import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { authenticateRequest } from "../_shared/auth-helpers.ts";

const log = createLogger("claim-pregrant");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimPregrantRequest {
  token: string;
  signup?: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  };
}

type LicensedAccessLevel = "full" | "view_only" | "disabled";

function onlyDigits(input: string) {
  return (input || "").replace(/\D/g, "");
}

function toAccessLevel(p: { can_edit: boolean | null; can_view: boolean | null }) {
  if (p.can_edit) return "full";
  if (p.can_view) return "view_only";
  return "disabled";
}

async function ensureUserFromSignup(
  supabaseAdmin: any,
  signup: ClaimPregrantRequest["signup"],
) {
  const { email, password, first_name, last_name } = signup!;
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password || !first_name || !last_name) {
    return { error: "Dados de cadastro incompletos" } as const;
  }

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name,
    },
  });

  if (error) {
    const msg = error.message || "Erro ao criar conta";
    // Common Supabase message: "User already registered"
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return { error: "Já existe uma conta com este email. Faça login para continuar." } as const;
    }
    return { error: msg } as const;
  }

  if (!created.user?.id) {
    return { error: "Erro ao criar conta" } as const;
  }

  // Allow profile trigger to run
  await new Promise((r) => setTimeout(r, 400));
  return { userId: created.user.id, email: cleanEmail } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, signup }: ClaimPregrantRequest = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token não fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    ) as any;

    // Auth is optional (hybrid UX)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const auth = await authenticateRequest(req);
      if (auth.success && auth.context?.user?.id) {
        userId = auth.context.user.id;
      }
    }

    let signupEmail: string | undefined;
    if (!userId && signup) {
      const res = await ensureUserFromSignup(supabaseAdmin, signup);
      if ("error" in res) {
        return new Response(JSON.stringify({ error: res.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = res.userId;
      signupEmail = res.email;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load pregrant
    const { data: pregrant, error: pregrantError } = await supabaseAdmin
      .from("pre_client_grants")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (pregrantError || !pregrant) {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pregrant.revoked_at) {
      return new Response(JSON.stringify({ error: "Link revogado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pregrant.claimed_at) {
      return new Response(JSON.stringify({ error: "Este link já foi utilizado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(pregrant.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Este link expirou" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cnpjDigits = onlyDigits(pregrant.cnpj_digits);

    // Decide org: link if exists, else create
    let orgId: string;
    let orgName: string | null = null;
    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("cnpj_digits", cnpjDigits)
      .maybeSingle();

    if (existingCompany?.id) {
      orgId = existingCompany.id;
      orgName = existingCompany.name;
    } else {
      // Create org with minimal data; user can refine later
      orgName = signup ? `Empresa (${cnpjDigits.slice(0, 4)}...)` : "Nova Empresa";
      const { data: createdCompany, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({
          name: orgName,
          cnpj: cnpjDigits,
          sector: null,
          user_id: userId,
          status: "active",
        })
        .select("id, name")
        .single();

      if (companyError || !createdCompany) {
        log.error("Company create error", companyError);
        return new Response(JSON.stringify({ error: "Erro ao criar organização" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orgId = createdCompany.id;
      orgName = createdCompany.name;

      // Create billing trial (use pregrant expiry as trial_end)
      try {
        await supabaseAdmin.from("org_billing").insert({
          org_id: orgId,
          status: "trialing",
          trial_start: new Date().toISOString(),
          trial_end: new Date(pregrant.expires_at).toISOString(),
        });
      } catch (e) {
        log.warn("Billing create failed (non-blocking)", e);
      }
    }

    // Apply membership (if not exists)
    const { data: tpl } = pregrant.permission_template_id
      ? await supabaseAdmin
          .from("permission_templates")
          .select("base_role")
          .eq("id", pregrant.permission_template_id)
          .maybeSingle()
      : { data: null };

    const role = (tpl?.base_role as string | null) || "owner";

    const { data: existingMember } = await supabaseAdmin
      .from("account_members")
      .select("id")
      .eq("account_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember?.id) {
      const { error: memberError } = await supabaseAdmin.from("account_members").insert({
        account_id: orgId,
        user_id: userId,
        role,
      });
      if (memberError) {
        log.error("Member insert error", memberError);
        return new Response(JSON.stringify({ error: "Erro ao adicionar acesso à organização" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update profile account_id to this org (best-effort)
    try {
      await supabaseAdmin.from("profiles").update({ account_id: orgId }).eq("id", userId);
    } catch (e) {
      log.warn("Profile update failed (non-blocking)", e);
    }

    // Seat entitlement
    try {
      await supabaseAdmin.from("org_seat_grants").upsert(
        {
          org_id: orgId,
          free_seats: Number(pregrant.free_seats ?? 0),
          valid_until: new Date(pregrant.expires_at).toISOString(),
          source: pregrant.grant_source || "pregrant",
          pregrant_id: pregrant.id,
          created_by: pregrant.created_by,
        },
        { onConflict: "org_id" },
      );
    } catch (e) {
      log.warn("Seat grant upsert failed (non-blocking)", e);
    }

    // Partner grant (if applicable)
    if (pregrant.partner_id) {
      try {
        await supabaseAdmin.from("partner_client_grants").insert({
          partner_id: pregrant.partner_id,
          org_id: orgId,
          granted_by: pregrant.created_by,
          expires_at: new Date(pregrant.expires_at).toISOString(),
          notes: pregrant.notes,
          user_id: userId,
        });
      } catch (e) {
        // Might already exist; don't block.
        log.warn("Partner grant insert failed (non-blocking)", e);
      }
    }

    // Apply template permissions -> account_licensed_modules
    if (pregrant.permission_template_id) {
      try {
        const { data: perms } = await supabaseAdmin
          .from("template_permissions")
          .select("module_slug, can_edit, can_view")
          .eq("template_id", pregrant.permission_template_id);

        if (Array.isArray(perms) && perms.length > 0) {
          const upserts = perms.map((p: any) => ({
            account_id: orgId,
            module_slug: p.module_slug,
            access_level: toAccessLevel(p as any) as LicensedAccessLevel,
            configured_by: userId,
            updated_at: new Date().toISOString(),
          }));

          // Using service role: upsert is allowed; table has unique constraint (account_id,module_slug)
          await (supabaseAdmin as any).from("account_licensed_modules").upsert(upserts, {
            onConflict: "account_id,module_slug",
          });
        }
      } catch (e) {
        log.warn("Template apply failed (non-blocking)", e);
      }
    }

    // Mark pregrant as claimed
    const { error: markError } = await supabaseAdmin
      .from("pre_client_grants")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by: userId,
        claimed_org_id: orgId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pregrant.id);

    if (markError) {
      log.error("Mark claimed error", markError);
      // Not ideal, but don't break the UX once access is applied.
    }

    return new Response(
      JSON.stringify({
        success: true,
        org_id: orgId,
        org_name: orgName,
        email: signupEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log.error("Unexpected error", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
