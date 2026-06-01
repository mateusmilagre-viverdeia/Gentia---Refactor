import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-bulk-invites');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkInviteRequest {
  account_id: string;
  emails: string[];
  role: "owner" | "admin" | "member";
}

interface InviteResult {
  email: string;
  success: boolean;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get user info
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      log.error("Auth error", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("User authenticated", { userId: user.id });

    // Parse request body
    const { account_id, emails, role }: BulkInviteRequest = await req.json();

    if (!account_id || !emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "account_id and emails array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.log("Request parsed", { account_id, emailCount: emails.length, role });

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user's role in the account (owner/admin or EP consultant)
    const { data: userMembership } = await supabaseAdmin
      .from("account_members")
      .select("role")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .single();

    const isAccountAdmin = userMembership && ["owner", "admin"].includes(userMembership.role);

    if (!isAccountAdmin) {
      // Fallback: check if user is an EP consultant assigned to this account
      const { data: isConsultant } = await supabaseAdmin.rpc(
        'can_edit_client_project',
        { _user_id: user.id, _account_id: account_id }
      );

      if (!isConsultant) {
        log.error("Permission denied - not admin nor consultant");
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para convidar membros" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Normalize emails
    const normalizedEmails = emails.map(e => e.toLowerCase().trim()).filter(e => e);
    const uniqueEmails = [...new Set(normalizedEmails)];

    log.log("Emails normalized", { uniqueCount: uniqueEmails.length });

    // Fetch existing members' emails
    const { data: members } = await supabaseAdmin
      .from("account_members")
      .select("user_id")
      .eq("account_id", account_id);

    const memberUserIds = (members || []).map(m => m.user_id);

    // Get emails for existing members
    const { data: memberProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("id", memberUserIds);

    const existingMemberEmails = new Set((memberProfiles || []).map(p => p.email?.toLowerCase()));

    // Fetch existing pending invites
    const { data: existingInvites } = await supabaseAdmin
      .from("account_invites")
      .select("email")
      .eq("account_id", account_id)
      .eq("accepted", false);

    const pendingInviteEmails = new Set((existingInvites || []).map(i => i.email?.toLowerCase()));

    // Filter emails - categorize them
    const results: InviteResult[] = [];
    const emailsToInvite: string[] = [];

    for (const email of uniqueEmails) {
      if (existingMemberEmails.has(email)) {
        results.push({ email, success: false, reason: "already_member" });
      } else if (pendingInviteEmails.has(email)) {
        results.push({ email, success: false, reason: "already_invited" });
      } else {
        emailsToInvite.push(email);
      }
    }

    log.log("Emails filtered", { toInvite: emailsToInvite.length, skipped: results.length });

    if (emailsToInvite.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: [],
          failed: results,
          message: "Nenhum novo convite para enviar",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check seats availability
    const { data: orgSeats } = await supabaseAdmin
      .from("org_seats")
      .select("*")
      .eq("org_id", account_id)
      .maybeSingle();

    // Seat grants (temporary) for this org
    const { data: seatGrant } = await supabaseAdmin
      .from("org_seat_grants")
      .select("free_seats, valid_until")
      .eq("org_id", account_id)
      .gte("valid_until", new Date().toISOString())
      .order("valid_until", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: billing } = await supabaseAdmin
      .from("org_billing")
      .select("status")
      .eq("org_id", account_id)
      .maybeSingle();

    // Check for admin grant (grace period)
    const { data: adminGrant } = await supabaseAdmin
      .from("admin_grants")
      .select("id, expires_at")
      .eq("org_id", account_id)
      .is("revoked_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    let availableSeats = Infinity; // Unlimited if no billing
    let needsPayment = false;
    let emailsWithinSeats: string[] = emailsToInvite;
    let emailsNeedPayment: string[] = [];

    if (!adminGrant && billing?.status) {
      const { count: memberCount } = await supabaseAdmin
        .from("account_members")
        .select("*", { count: "exact", head: true })
        .eq("account_id", account_id);

      const { count: inviteCount } = await supabaseAdmin
        .from("account_invites")
        .select("*", { count: "exact", head: true })
        .eq("account_id", account_id)
        .eq("accepted", false);

      const includedSeats = orgSeats?.included_seats || 1;
      const currentExtraSeats = orgSeats?.current_seat_count || 0;
      const grantedSeats = seatGrant?.free_seats || 0;
      const totalSeats = includedSeats + currentExtraSeats + grantedSeats;
      const usedSeats = (memberCount || 0) + (inviteCount || 0);
      availableSeats = Math.max(0, totalSeats - usedSeats);

      log.log("Seats check", { totalSeats, usedSeats, availableSeats, toInvite: emailsToInvite.length });

      if (emailsToInvite.length > availableSeats) {
        needsPayment = true;
        emailsWithinSeats = emailsToInvite.slice(0, availableSeats);
        emailsNeedPayment = emailsToInvite.slice(availableSeats);
      }
    }

    // Insert all invites that fit within seats at once
    const invitesToInsert = emailsWithinSeats.map(email => ({
      account_id,
      email,
      role,
      invited_by: user.id,
      status: "pending",
    }));

    if (invitesToInsert.length > 0) {
      const { data: insertedInvites, error: insertError } = await supabaseAdmin
        .from("account_invites")
        .insert(invitesToInsert)
        .select();

      if (insertError) {
        log.error("Insert error", { error: insertError.message });
        throw new Error("Erro ao criar convites: " + insertError.message);
      }

      log.log("Invites inserted", { count: insertedInvites?.length });

      // Send all emails in parallel
      const emailPromises = (insertedInvites || []).map(async (invite) => {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-team-invite`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: invite.email,
              role: invite.role,
              account_id: invite.account_id,
              invite_id: invite.id,
            }),
          });

          if (!response.ok) {
            log.error(`Failed to send email to ${invite.email}:`, await response.text());
            return { email: invite.email, success: true, emailSent: false };
          }

          return { email: invite.email, success: true, emailSent: true };
        } catch (error) {
          log.error(`Error sending email to ${invite.email}:`, error);
          return { email: invite.email, success: true, emailSent: false };
        }
      });

      const emailResults = await Promise.all(emailPromises);
      log.log("Emails sent", { results: emailResults });

      // Add successful invites to results
      for (const result of emailResults) {
        results.push({ email: result.email, success: true });
      }
    }

    // Sync seats with Stripe once after all invites
    try {
      await fetch(`${supabaseUrl}/functions/v1/update-subscription-seats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({ account_id, action: "sync" }),
      });
      log.log("Seats synced");
    } catch (syncError) {
      log.error("Error syncing seats:", syncError);
    }

    // Mark emails that need payment as failed
    for (const email of emailsNeedPayment) {
      results.push({ email, success: false, reason: "needs_payment" });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    log.log("Bulk invite complete", { successCount, failedCount, needsPayment });

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter(r => r.success).map(r => r.email),
        failed: results.filter(r => !r.success),
        needsPayment,
        emailsNeedPayment,
        message: `${successCount} convite(s) enviado(s)${failedCount > 0 ? `, ${failedCount} não enviado(s)` : ""}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("Error in send-bulk-invites:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
