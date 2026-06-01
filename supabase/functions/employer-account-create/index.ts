import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function resolveRedirect(req: Request) {
  const rawOrigin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
  try {
    const origin = new URL(rawOrigin).origin;
    return `${origin}/employer/jobs`;
  } catch {
    return "https://gentia.lovable.app/employer/jobs";
  }
}

async function sendAccessLink(email: string, redirectTo: string) {
  if (ANON_KEY) {
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (!error) return true;
    console.error("signInWithOtp error:", error.message);
  }
  return false;
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data?.users?.find((u: any) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (!data?.users || data.users.length < 1000) break;
  }
  return null;
}

async function ensureMembership(admin: ReturnType<typeof createClient>, accountId: string, userId: string) {
  const { data: existingMember } = await admin
    .from("account_members")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingMember?.id) {
    const { error } = await admin
      .from("account_members")
      .update({ role: "admin", is_active: true, deactivated_at: null, deactivated_by: null })
      .eq("id", existingMember.id);
    if (error) throw error;
    return;
  }

  const { error } = await admin.from("account_members").insert({
    account_id: accountId,
    user_id: userId,
    role: "admin",
    is_active: true,
  });
  if (error) throw error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    }

    const body = await req.json();
    const agency_account_id = typeof body?.agency_account_id === "string" ? body.agency_account_id.trim() : "";
    const client_id = typeof body?.client_id === "string" ? body.client_id.trim() : "";
    const contact_id = typeof body?.contact_id === "string" && body.contact_id.trim() ? body.contact_id.trim() : null;
    const contact_email = normalizeEmail(body?.contact_email);
    const contact_name = typeof body?.contact_name === "string" ? body.contact_name.trim().slice(0, 160) : "";
    const redirectTo = resolveRedirect(req);

    if (!UUID_RE.test(agency_account_id) || !UUID_RE.test(client_id) || (contact_id && !UUID_RE.test(contact_id))) {
      return json({ error: "Dados inválidos para criar a conta Employer." }, 400);
    }

    if (!EMAIL_RE.test(contact_email) || contact_email.length > 254) {
      return json({ error: "Informe um e-mail de contato válido." }, 400);
    }

    // Verify caller is member of the agency account
    const { data: membership } = await admin
      .from("account_members")
      .select("role")
      .eq("account_id", agency_account_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) {
      return json({ error: "Você não tem permissão para criar conta Employer nesta conta." }, 403);
    }

    const { data: client, error: clientErr } = await admin
      .from("clientes_consultoria")
      .select("id, account_id, razao_social, nome_fantasia")
      .eq("id", client_id)
      .eq("account_id", agency_account_id)
      .maybeSingle();

    if (clientErr) throw clientErr;
    if (!client) return json({ error: "Cliente não encontrado nesta consultoria." }, 404);

    if (contact_id) {
      const { data: contact, error: contactErr } = await admin
        .from("clientes_contatos")
        .select("id, cliente_id, email")
        .eq("id", contact_id)
        .eq("cliente_id", client_id)
        .maybeSingle();
      if (contactErr) throw contactErr;
      if (!contact) return json({ error: "Contato não pertence a este cliente." }, 400);
      if (contact.email && normalizeEmail(contact.email) !== contact_email) {
        return json({ error: "E-mail informado não corresponde ao contato selecionado." }, 400);
      }
    }

    const employerName = client.nome_fantasia || client.razao_social || "Empresa";

    let employerUserId: string | null = null;
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: contact_email,
      email_confirm: true,
      user_metadata: {
        full_name: contact_name || employerName,
        employer_company_name: employerName,
        origin: "employer_portal",
      },
    });

    if (newUser?.user?.id) {
      employerUserId = newUser.user.id;
    } else if (createErr?.message?.toLowerCase().includes("already")) {
      const existingUser = await findUserByEmail(admin, contact_email);
      employerUserId = existingUser?.id || null;
    } else if (createErr) {
      throw createErr;
    }

    if (!employerUserId) return json({ error: "Não foi possível localizar ou criar o usuário convidado." }, 500);

    // Check if employer account already exists
    const { data: existing } = await admin
      .from("companies")
      .select("id, name, created_at, employer_linked_agency_id")
      .eq("account_type", "employer")
      .eq("employer_linked_client_id", client_id)
      .eq("employer_linked_agency_id", agency_account_id)
      .maybeSingle();

    if (existing) {
      await ensureMembership(admin, existing.id, employerUserId);
      const magicLinkSent = await sendAccessLink(contact_email, redirectTo);
      return json({ exists: true, account_id: existing.id, magic_link_sent: magicLinkSent, invited_email: contact_email });
    }

    // Create employer company
    const { data: newCompany, error: companyErr } = await admin
      .from("companies")
      .insert({
        name: employerName,
        user_id: employerUserId,
        account_type: "employer",
        employer_linked_agency_id: agency_account_id,
        employer_linked_client_id: client_id,
        status: "active",
      })
      .select()
      .single();

    if (companyErr) throw companyErr;

    await ensureMembership(admin, newCompany.id, employerUserId);

    const magicLinkSent = await sendAccessLink(contact_email, redirectTo);

    return json({ created: true, account_id: newCompany.id, magic_link_sent: magicLinkSent, invited_email: contact_email });
  } catch (e: any) {
    console.error("employer-account-create error:", e);
    return json({ error: "Falha ao criar ou reenviar o convite Employer. Tente novamente." }, 500);
  }
});
