// LLM Batch Dispatcher — submete e processa batches assíncronos via OpenAI Batch API
// Modos:
//  POST { action: "submit", account_id, job_kind, items: [{custom_id, body}] }
//    → cria registro em llm_batch_jobs, faz upload do JSONL, cria batch
//  POST { action: "poll" } (cron, requer x-cron-secret)
//    → checa todos os batches em andamento e grava resultados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const OPENAI_API = "https://api.openai.com/v1";

async function openai(path: string, init?: RequestInit): Promise<Response> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return fetch(`${OPENAI_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers || {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "submit";

    // ============== POLL (cron) ==============
    if (action === "poll") {
      if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pending } = await supabase
        .from("llm_batch_jobs")
        .select("id, provider_batch_id, status")
        .in("status", ["submitted", "in_progress"])
        .not("provider_batch_id", "is", null)
        .limit(50);

      let updated = 0;
      for (const job of pending || []) {
        const r = await openai(`/batches/${job.provider_batch_id}`);
        if (!r.ok) continue;
        const batch = await r.json();
        const statusMap: Record<string, string> = {
          validating: "submitted", in_progress: "in_progress", finalizing: "in_progress",
          completed: "completed", expired: "expired", failed: "failed", cancelled: "cancelled",
        };
        const newStatus = statusMap[batch.status] || "in_progress";
        const update: any = { status: newStatus };
        if (newStatus === "completed" && batch.output_file_id) {
          // Download output file
          const fr = await openai(`/files/${batch.output_file_id}/content`);
          if (fr.ok) {
            const text = await fr.text();
            const lines = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
            update.output_payload = { results: lines };
            update.completed_items = lines.length;
            update.completed_at = new Date().toISOString();
          }
        }
        if (batch.request_counts) {
          update.completed_items = batch.request_counts.completed || 0;
          update.failed_items = batch.request_counts.failed || 0;
        }
        await supabase.from("llm_batch_jobs").update(update).eq("id", job.id);
        updated++;
      }

      return new Response(JSON.stringify({ ok: true, polled: pending?.length || 0, updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============== SUBMIT (authenticated) ==============
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { account_id, job_kind, items } = body;
    if (!account_id || !job_kind || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "account_id, job_kind, items[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Membership check
    const { data: isMember } = await supabase.rpc("is_account_member", {
      _user_id: userData.user.id, _account_id: account_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build JSONL for OpenAI Batch API
    const jsonl = items.map((it: any) => JSON.stringify({
      custom_id: it.custom_id,
      method: "POST",
      url: "/v1/chat/completions",
      body: it.body,
    })).join("\n");

    // Upload file
    const fd = new FormData();
    fd.append("purpose", "batch");
    fd.append("file", new Blob([jsonl], { type: "application/jsonl" }), "batch.jsonl");
    const upRes = await openai("/files", { method: "POST", body: fd });
    if (!upRes.ok) {
      const err = await upRes.text();
      throw new Error(`File upload failed: ${err}`);
    }
    const uploaded = await upRes.json();

    // Create batch
    const batchRes = await openai("/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_file_id: uploaded.id,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
      }),
    });
    if (!batchRes.ok) {
      const err = await batchRes.text();
      throw new Error(`Batch creation failed: ${err}`);
    }
    const batch = await batchRes.json();

    const { data: row, error: insErr } = await supabase
      .from("llm_batch_jobs")
      .insert({
        account_id,
        job_kind,
        provider: "openai",
        provider_batch_id: batch.id,
        status: "submitted",
        input_payload: { input_file_id: uploaded.id, item_count: items.length },
        total_items: items.length,
        created_by: userData.user.id,
        submitted_at: new Date().toISOString(),
      })
      .select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, batch_id: row.id, provider_batch_id: batch.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[llm-batch-dispatcher] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
