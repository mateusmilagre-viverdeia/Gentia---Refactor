import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createLogger } from "../_shared/logger.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth-helpers.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const log = createLogger("admin-release-invites-bulk");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteStatus = "awaiting_payment" | "pending" | "paid_ready_to_send" | "sent";

interface Body {
  invite_ids: string[];
}

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  admin_rh: "Admin RH",
  leader: "Líder",
  member: "Membro",
  viewer: "Visualizador",
};

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function assertInternalAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data || []).map((r: any) => r?.role).filter(Boolean);
  const roleSet = new Set(roles);
  if (!roleSet.has("super_admin") && !roleSet.has("head_cs")) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

async function computeAllowedInviteIdsForOrg(
  supabase: any,
  orgId: string
): Promise<{
  allowedInviteIds: Set<string>;
  totalSeats: number;
  usedSeats: number;
  granted: number;
  grantedValidUntil: string | null;
}> {
  const { data: orgSeats } = await supabase
    .from("org_seats")
    .select("included_seats, current_seat_count")
    .eq("org_id", orgId)
    .maybeSingle();

  const { data: seatGrant } = await supabase
    .from("org_seat_grants")
    .select("free_seats, valid_until")
    .eq("org_id", orgId)
    .gte("valid_until", new Date().toISOString())
    .order("valid_until", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: memberCount } = await supabase
    .from("account_members")
    .select("*", { count: "exact", head: true })
    .eq("account_id", orgId)
    .eq("is_active", true);

  const { data: pendingInvites } = await supabase
    .from("account_invites")
    .select("id, created_at")
    .eq("account_id", orgId)
    .eq("accepted", false)
    .order("created_at", { ascending: true });

  const included = orgSeats?.included_seats || 1;
  const extra = orgSeats?.current_seat_count || 0;
  const granted = seatGrant?.free_seats || 0;
  const totalSeats = included + extra + granted;
  const usedSeats = memberCount || 0;

  const allowed = Math.max(0, totalSeats - usedSeats);
  const allowedInviteIds = new Set<string>(
    (pendingInvites || []).slice(0, allowed).map((i: any) => String(i.id))
  );

  return { allowedInviteIds, totalSeats, usedSeats, granted, grantedValidUntil: seatGrant?.valid_until || null };
}

function buildInviteEmailHtml(orgName: string, inviterName: string, role: string, inviteLink: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
        .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Convite para ${escapeHtml(orgName)}</h1>
        </div>
        <div class="content">
          <p>Olá!</p>
          <p><strong>${escapeHtml(inviterName)}</strong> está convidando você para fazer parte da equipe <strong>${escapeHtml(orgName)}</strong> como <strong>${escapeHtml(roleLabels[role] || role)}</strong>.</p>
          <p>Clique no botão abaixo para aceitar o convite:</p>
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Aceitar Convite</a>
          </p>
          <p style="font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:<br>${inviteLink}</p>
        </div>
        <div class="footer">
          <p>Este convite expira em 7 dias.</p>
          <p>Se você não esperava este convite, pode ignorar este email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) return unauthorizedResponse(corsHeaders);

    const { supabase, user } = auth.context;
    await assertInternalAdmin(supabase, user.id);

    const body: Body = await req.json();
    const inviteIds = Array.isArray(body.invite_ids) ? body.invite_ids.filter(Boolean) : [];

    if (inviteIds.length === 0) {
      return new Response(JSON.stringify({ error: "invite_ids_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invites + org names
    const { data: invites, error: invitesError } = await supabase
      .from("account_invites")
      .select(
        `
          id,
          account_id,
          email,
          role,
          status,
          accepted,
          created_at,
          invited_by,
          companies:account_id (name)
        `
      )
      .in("id", inviteIds);

    if (invitesError) {
      log.error("Error fetching invites", invitesError);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgIds = Array.from(new Set((invites || []).map((i: any) => i.account_id).filter(Boolean)));

    const allowedByOrg: Record<string, Set<string>> = {};
    for (const orgId of orgIds) {
      const { allowedInviteIds } = await computeAllowedInviteIdsForOrg(supabase, orgId);
      allowedByOrg[orgId] = allowedInviteIds;
    }

    // Create a separate client for auth.getUser() to ensure origin link uses real host when called from browser
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userInfo } = await supabaseUser.auth.getUser();
    const requesterId = userInfo?.user?.id || user.id;

    const origin = req.headers.get("origin") || "";
    const baseUrl = origin || "https://gentia.lovable.app";

    const sent: string[] = [];
    const skipped: { id: string; email: string; reason: string }[] = [];

    for (const inv of invites || []) {
      const invite = inv as any;
      const status = invite.status as InviteStatus;
      const orgId = invite.account_id;
      const email = invite.email;

      if (!orgId || !email) {
        skipped.push({ id: invite.id, email: email || "-", reason: "invalid_invite" });
        continue;
      }

      if (invite.accepted) {
        skipped.push({ id: invite.id, email, reason: "already_accepted" });
        continue;
      }

      const allowedSet = allowedByOrg[orgId] || new Set<string>();
      const isWithinSeats = allowedSet.has(invite.id);

      // If it's outside seats limit, we don't release (send) it.
      if (!isWithinSeats) {
        skipped.push({ id: invite.id, email, reason: "over_seat_limit" });
        continue;
      }

      if (!["awaiting_payment", "pending", "paid_ready_to_send", "sent"].includes(status)) {
        skipped.push({ id: invite.id, email, reason: "unsupported_status" });
        continue;
      }

      // Resolve inviter name
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", invite.invited_by)
        .maybeSingle();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() || inviterProfile.email || "Equipe EP"
        : "Equipe EP";

      const orgName = invite.companies?.name || "sua empresa";
      const inviteLink = `${baseUrl}/app/accept-invite?invite_id=${invite.id}`;

      const html = buildInviteEmailHtml(orgName, inviterName, invite.role, inviteLink);

      try {
        await resend.emails.send({
          from: `EP Partners <${RESEND_DEFAULT_FROM_EMAIL}>`,
          to: [email],
          subject: `Convite para participar de ${orgName}`,
          html,
        });

        // Update invite status: awaiting_payment -> pending -> sent; pending -> sent; sent stays sent
        const nextStatus = status === "sent" ? "sent" : "sent";
        const update: any = { status: nextStatus };
        if (status === "awaiting_payment") update.status = "sent";

        await supabase
          .from("account_invites")
          .update(update)
          .eq("id", invite.id);

        await supabase.from("billing_events").insert({
          org_id: orgId,
          event_type: "admin_invite_released",
          payload: {
            invite_id: invite.id,
            email,
            previous_status: status,
            released_by: requesterId,
          },
        });

        sent.push(invite.id);
      } catch (e: any) {
        log.error("Failed sending invite email", { inviteId: invite.id, error: e?.message || e });
        skipped.push({ id: invite.id, email, reason: "email_send_failed" });
      }
    }

    return new Response(JSON.stringify({ success: true, sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err?.status || 500;
    log.error("Unhandled error", err);
    return new Response(JSON.stringify({ error: err?.message || "internal_error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
