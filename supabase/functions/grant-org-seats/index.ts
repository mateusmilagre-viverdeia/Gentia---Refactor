import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth-helpers.ts";

const log = createLogger("grant-org-seats");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GrantAction = "grant" | "revoke" | "update";

interface GrantOrgSeatsBody {
  action?: GrantAction;
  org_id: string;
  quantity?: number;
  valid_until?: string;
  reason?: string;
}

async function assertInternalAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    log.error("Error reading user roles", error);
    throw new Error("role_check_failed");
  }

  const roles = (data || []).map((r: any) => r?.role).filter(Boolean);
  const roleSet = new Set(roles);

  if (!roleSet.has("super_admin") && !roleSet.has("head_cs")) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) {
      return unauthorizedResponse(corsHeaders);
    }

    const { supabase, user } = auth.context;
    await assertInternalAdmin(supabase, user.id);

    const body: GrantOrgSeatsBody = await req.json();
    const action: GrantAction = body.action || "grant";
    const orgId = body.org_id;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    if (action === "grant") {
      const quantity = Number(body.quantity || 0);
      const validUntil = body.valid_until;

      if (!Number.isFinite(quantity) || quantity < 1) {
        return new Response(JSON.stringify({ error: "invalid_quantity" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validUntil) {
        return new Response(JSON.stringify({ error: "valid_until_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validUntilIso = new Date(validUntil).toISOString();
      if (validUntilIso < nowIso) {
        return new Response(JSON.stringify({ error: "valid_until_in_past" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing, error: existingError } = await supabase
        .from("org_seat_grants")
        .select("id, free_seats, valid_until")
        .eq("org_id", orgId)
        .maybeSingle();

      if (existingError) {
        log.error("Error reading existing seat grant", existingError);
        return new Response(JSON.stringify({ error: "db_error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prevSeats = existing?.free_seats || 0;
      const newSeats = prevSeats + quantity;
      const prevValidUntil = existing?.valid_until ? new Date(existing.valid_until).toISOString() : null;
      const newValidUntil = prevValidUntil && prevValidUntil > validUntilIso ? prevValidUntil : validUntilIso;

      const { data: saved, error: upsertError } = await supabase
        .from("org_seat_grants")
        .upsert(
          {
            org_id: orgId,
            free_seats: newSeats,
            valid_until: newValidUntil,
            source: "admin_manual",
            created_by: user.id,
          },
          { onConflict: "org_id" }
        )
        .select("id, org_id, free_seats, valid_until")
        .single();

      if (upsertError) {
        log.error("Error upserting seat grant", upsertError);
        return new Response(JSON.stringify({ error: "db_error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("billing_events").insert({
        org_id: orgId,
        event_type: "org_seat_grant_created",
        payload: {
          action: "grant",
          quantity,
          reason: body.reason || null,
          valid_until: newValidUntil,
          created_by: user.id,
          previous_free_seats: prevSeats,
          new_free_seats: newSeats,
        },
      });

      return new Response(JSON.stringify({ success: true, grant: saved }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const quantity = Number(body.quantity || 0);
      const validUntil = body.valid_until;

      if (!Number.isFinite(quantity) || quantity < 1) {
        return new Response(JSON.stringify({ error: "invalid_quantity" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validUntil) {
        return new Response(JSON.stringify({ error: "valid_until_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validUntilIso = new Date(validUntil).toISOString();

      const { data: existing } = await supabase
        .from("org_seat_grants")
        .select("id, free_seats, valid_until")
        .eq("org_id", orgId)
        .maybeSingle();

      const prevSeats = existing?.free_seats || 0;
      const prevValidUntil = existing?.valid_until || null;

      const { data: saved, error: updateError } = await supabase
        .from("org_seat_grants")
        .update({
          free_seats: quantity,
          valid_until: validUntilIso,
          created_by: user.id,
        })
        .eq("org_id", orgId)
        .select("id, org_id, free_seats, valid_until")
        .single();

      if (updateError) {
        log.error("Error updating seat grant", updateError);
        return new Response(JSON.stringify({ error: "db_error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("billing_events").insert({
        org_id: orgId,
        event_type: "org_seat_grant_updated",
        payload: {
          action: "update",
          reason: body.reason || null,
          updated_by: user.id,
          previous_free_seats: prevSeats,
          new_free_seats: quantity,
          previous_valid_until: prevValidUntil,
          new_valid_until: validUntilIso,
        },
      });

      return new Response(JSON.stringify({ success: true, grant: saved }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // revoke
    const { data: saved, error: revokeError } = await supabase
      .from("org_seat_grants")
      .upsert(
        {
          org_id: orgId,
          free_seats: 0,
          valid_until: nowIso,
          source: "admin_manual",
          created_by: user.id,
        },
        { onConflict: "org_id" }
      )
      .select("id, org_id, free_seats, valid_until")
      .single();

    if (revokeError) {
      log.error("Error revoking seat grant", revokeError);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("billing_events").insert({
      org_id: orgId,
      event_type: "org_seat_grant_revoked",
      payload: {
        action: "revoke",
        revoked_by: user.id,
      },
    });

    return new Response(JSON.stringify({ success: true, grant: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err?.status || (err?.message === "forbidden" ? 403 : 500);
    log.error("Unhandled error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "internal_error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
