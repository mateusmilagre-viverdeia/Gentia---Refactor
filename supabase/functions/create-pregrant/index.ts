import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { authenticateRequest } from "../_shared/auth-helpers.ts";

const log = createLogger("create-pregrant");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GrantSource = "admin" | "partner";

interface CreatePregrantRequest {
  cnpj: string;
  free_seats?: number;
  expires_at?: string; // ISO
  permission_template_id?: string | null;
  notes?: string | null;
}

function onlyDigits(input: string) {
  return (input || "").replace(/\D/g, "");
}

function generateTokenHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getUserContext(supabaseAdmin: any, userId: string) {
  const { data: rolesData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (rolesData || []).map((r: any) => r?.role).filter(Boolean);
  const roleSet = new Set<string>(roles);

  if (roleSet.has("super_admin") || roleSet.has("head_cs")) {
    return { source: "admin" as GrantSource, partnerId: null };
  }

  // New model: ep_partner_users
  const { data: partnerUser } = await supabaseAdmin
    .from("ep_partner_users")
    .select("partner_id, partner:ep_partners!ep_partner_users_partner_id_fkey(id, active)")
    .eq("user_id", userId)
    .maybeSingle();

  const pu: any = partnerUser;
  if (pu?.partner_id && pu?.partner?.active) {
    return { source: "partner" as GrantSource, partnerId: pu.partner_id as string };
  }

  // Legacy model: ep_partners.user_id
  const { data: directPartner } = await supabaseAdmin
    .from("ep_partners")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  const dp: any = directPartner;
  if (dp?.id) {
    return { source: "partner" as GrantSource, partnerId: dp.id as string };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) {
      return new Response(JSON.stringify({ error: auth.error || "unauthorized" }), {
        status: auth.status || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cnpj, free_seats, expires_at, permission_template_id, notes }: CreatePregrantRequest =
      await req.json();

    const cnpjDigits = onlyDigits(cnpj);
    if (!cnpjDigits || (cnpjDigits.length !== 14 && cnpjDigits.length !== 11)) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    ) as any;

    const ctx = await getUserContext(supabaseAdmin, auth.context.user.id);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateTokenHex(32);
    const now = new Date();
    const defaultExpiry = new Date(now);
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    const expiry = expires_at ? new Date(expires_at) : defaultExpiry;

    if (Number.isNaN(expiry.getTime()) || expiry <= now) {
      return new Response(JSON.stringify({ error: "expires_at inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const freeSeats = Math.max(0, Math.min(1000, Number(free_seats ?? 0)));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("pre_client_grants")
      .insert({
        token,
        cnpj_digits: cnpjDigits,
        free_seats: freeSeats,
        expires_at: expiry.toISOString(),
        created_by: auth.context.user.id,
        grant_source: ctx.source,
        partner_id: ctx.partnerId,
        permission_template_id: permission_template_id ?? null,
        notes: notes ?? null,
      })
      .select("id, expires_at, free_seats")
      .single();

    if (insertError || !inserted) {
      log.error("Insert error", insertError);
      return new Response(JSON.stringify({ error: "Erro ao criar pré-grant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "";
    const claimUrl = origin ? `${origin}/app/claim-grant?token=${token}` : `/app/claim-grant?token=${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        claim_url: claimUrl,
        pregrant_id: inserted.id,
        expires_at: inserted.expires_at,
        free_seats: inserted.free_seats,
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
