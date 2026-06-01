import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || cronSecret !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get active templates with recurrence
  const { data: templates } = await supabaseAdmin
    .from("consultant_satisfaction_templates")
    .select("id, recurrence_days")
    .eq("is_active", true)
    .not("recurrence_days", "is", null);

  if (!templates || templates.length === 0) {
    return new Response(JSON.stringify({ created: 0, reason: "no templates" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get all active consultant<->account assignments
  const { data: assignments } = await supabaseAdmin
    .from("consultant_assignments")
    .select("consultant_id, account_id, ep_consultants:consultant_id(user_id)")
    .eq("active", true);

  let created = 0;
  for (const tpl of templates) {
    const days = tpl.recurrence_days as number;
    if (!days || days <= 0) continue;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    for (const a of assignments ?? []) {
      const consultantUserId = (a as any).ep_consultants?.user_id;
      if (!consultantUserId) continue;

      // Skip if there is a pending or recent invite
      const { data: existing } = await supabaseAdmin
        .from("consultant_satisfaction_invites")
        .select("id, status, created_at")
        .eq("template_id", tpl.id)
        .eq("consultant_user_id", consultantUserId)
        .eq("client_account_id", a.account_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const last = existing?.[0];
      if (last) {
        if (last.status === "pending") continue;
        if (last.created_at > cutoff) continue;
      }

      const { error } = await supabaseAdmin
        .from("consultant_satisfaction_invites")
        .insert({
          consultant_user_id: consultantUserId,
          client_account_id: a.account_id,
          template_id: tpl.id,
          source: "auto",
        });
      if (!error) created++;
    }
  }

  return new Response(JSON.stringify({ created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
