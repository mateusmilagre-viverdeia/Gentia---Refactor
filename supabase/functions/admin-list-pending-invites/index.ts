import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth-helpers.ts";

const log = createLogger("admin-list-pending-invites");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteStatus = "awaiting_payment" | "pending" | "paid_ready_to_send" | "sent";

interface Body {
  org_id?: string;
  search_email?: string;
  statuses?: InviteStatus[];
  limit?: number;
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

function buildSeatSummary(totalSeats: number, usedSeats: number, pendingInvites: number) {
  const available = Math.max(0, totalSeats - usedSeats - pendingInvites);
  return { totalSeats, usedSeats, pendingInvites, availableSeats: available };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) return unauthorizedResponse(corsHeaders);

    const { supabase, user } = auth.context;
    await assertInternalAdmin(supabase, user.id);

    const body: Body = await req.json();
    const limit = Math.min(Math.max(1, body.limit || 100), 500);
    const statuses = body.statuses && body.statuses.length > 0
      ? body.statuses
      : ["awaiting_payment", "pending", "paid_ready_to_send", "sent"];

    let query = supabase
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
      .eq("accepted", false)
      .in("status", statuses)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (body.org_id) query = query.eq("account_id", body.org_id);
    if (body.search_email) query = query.ilike("email", `%${body.search_email.toLowerCase()}%`);

    const { data: invites, error } = await query;
    if (error) {
      log.error("Error listing invites", error);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgIds = Array.from(new Set((invites || []).map((i: any) => i.account_id).filter(Boolean)));

    const orgSeatSummaries: Record<string, any> = {};
    const withinSeatsByInviteId: Record<string, boolean> = {};

    for (const orgId of orgIds) {
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

      const { data: allPendingInvites } = await supabase
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
      const pendingInvitesCount = (allPendingInvites || []).length;

      orgSeatSummaries[orgId] = {
        ...buildSeatSummary(totalSeats, usedSeats, pendingInvitesCount),
        grantedSeats: granted,
        grantedSeatsValidUntil: seatGrant?.valid_until || null,
      };

      const allowedInvites = Math.max(0, totalSeats - usedSeats);
      const allowedInviteIds = new Set((allPendingInvites || []).slice(0, allowedInvites).map((x: any) => x.id));
      for (const inv of allPendingInvites || []) {
        withinSeatsByInviteId[inv.id] = allowedInviteIds.has(inv.id);
      }
    }

    const result = (invites || []).map((inv: any) => ({
      id: inv.id,
      org_id: inv.account_id,
      org_name: inv.companies?.name || null,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      created_at: inv.created_at,
      invited_by: inv.invited_by,
      is_within_seats: withinSeatsByInviteId[inv.id] ?? true,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        invites: result,
        seatSummaries: orgSeatSummaries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    log.error("Unhandled error", err);
    return new Response(JSON.stringify({ error: err?.message || "internal_error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
