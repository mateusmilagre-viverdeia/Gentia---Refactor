import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnswerInput {
  question_id: string;
  value_numeric?: number | null;
  value_text?: string | null;
  value_options?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { token, answers, respondent_name, respondent_email } = body ?? {};
    if (!token || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing token or answers" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invite, error: invErr } = await supabaseAdmin
      .from("consultant_satisfaction_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invite.status !== "pending") {
      return new Response(JSON.stringify({ error: "Invite already used" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = (answers as AnswerInput[]).map((a) => ({
      invite_id: invite.id,
      question_id: a.question_id,
      value_numeric: a.value_numeric ?? null,
      value_text: a.value_text ?? null,
      value_options: a.value_options ?? null,
      respondent_name: respondent_name ?? null,
      respondent_email: respondent_email ?? null,
    }));

    const { error: insErr } = await supabaseAdmin
      .from("consultant_satisfaction_responses")
      .insert(rows);

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("consultant_satisfaction_invites")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
