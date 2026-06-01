import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  authenticateRequest,
  forbiddenResponse,
  unauthorizedResponse,
  verifyAccountAccess,
} from "../_shared/auth-helpers.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("send-disc-batch");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DiscBatchAction = "invite" | "reminder";
type ReminderDay = 1 | 3 | 5;

type Filters = {
  status?: string;
  search?: string;
  jobId?: string;
};

type SendDiscBatchRequest = {
  accountId: string;
  action: DiscBatchAction;
  reminder_day?: ReminderDay | null;
  force?: boolean;
  dry_run?: boolean;
  filters?: Filters;
};

const MAX_TARGETS = 100;

async function assertCanManageRH(params: {
  supabase: any;
  accountId: string;
  userId: string;
}): Promise<boolean> {
  const { supabase, accountId, userId } = params;
  const { data } = await supabase
    .from("account_members")
    .select("role, is_active")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const role = (data as any)?.role as string | undefined;
  const isActive = (data as any)?.is_active !== false;
  if (!isActive) return false;

  return role === "owner" || role === "admin" || role === "admin_rh";
}

async function runInChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<boolean>) {
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(chunk.map((x) => fn(x)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === true) ok++;
      else fail++;
    }
  }
  return { ok, fail };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) {
      return unauthorizedResponse(corsHeaders);
    }

    const body = (await req.json()) as SendDiscBatchRequest;
    const accountId = String(body?.accountId || "");
    const action = String(body?.action || "") as DiscBatchAction;
    const reminderDay = body?.reminder_day ?? null;
    const force = body?.force === true;
    const dryRun = body?.dry_run === true;
    const filters = (body?.filters || {}) as Filters;

    if (!accountId || !["invite", "reminder"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "reminder" && ![1, 3, 5].includes(Number(reminderDay))) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = auth.context.supabase;
    const userId = auth.context.user.id;

    const hasAccess = await verifyAccountAccess(supabase, userId, accountId);
    if (!hasAccess) return forbiddenResponse(corsHeaders);

    const canManageRH = await assertCanManageRH({ supabase, accountId, userId });
    if (!canManageRH) return forbiddenResponse(corsHeaders, "requires_manage_rh");

    const status = String(filters?.status || "all");
    const search = String(filters?.search || "").trim();
    const jobId = filters?.jobId ? String(filters.jobId) : null;

    let q = supabase
      .from("recruitment_applications")
      .select(
        `id, candidate_id, job_id, session_id, status,
         candidate:recruitment_candidates(first_name, last_name),
         job:recruitment_jobs(title)`
      )
      .eq("account_id", accountId)
      .order("applied_at", { ascending: false })
      .limit(1000);

    if (jobId) q = q.eq("job_id", jobId);
    if (status !== "all") q = q.eq("status", status);
    if (search.length >= 2) {
      const pat = `%${search}%`;
      q = q.or(
        `candidate.first_name.ilike.${pat},candidate.last_name.ilike.${pat},job.title.ilike.${pat}`
      );
    }

    const { data: rows, error: rowsError } = await q;
    if (rowsError) throw rowsError;

    const all = (rows || []) as any[];
    const targets =
      action === "invite"
        ? all.filter((r) => r.candidate_id && r.job_id)
        : all.filter((r) => r.session_id);

    if (dryRun) {
      return new Response(JSON.stringify({ matched: all.length, targets: targets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targets.length > MAX_TARGETS) {
      return new Response(JSON.stringify({ error: "too_many_targets", matched: all.length, targets: targets.length }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const batchId = crypto.randomUUID();

    logger.info("Starting batch", {
      accountId,
      action,
      reminderDay,
      force,
      matched: all.length,
      targets: targets.length,
      batchId,
    });

    const { ok, fail } = await runInChunks(targets, 10, async (t) => {
      try {
        if (action === "invite") {
          const { error } = await supabase.functions.invoke("send-disc-invitation", {
            body: {
              accountId,
              candidateId: (t as any).candidate_id,
              jobId: (t as any).job_id,
              manual: true,
              force,
              batchId,
            },
            headers: { Authorization: authHeader },
          });
          return !error;
        }

        const { error } = await supabase.functions.invoke("send-disc-reminder-manual", {
          body: {
            accountId,
            sessionId: (t as any).session_id,
            reminder_day: reminderDay,
            force,
            batchId,
          },
          headers: { Authorization: authHeader },
        });
        return !error;
      } catch (e: any) {
        logger.error("Batch item failed", { message: e?.message, batchId });
        return false;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        batchId,
        matched: all.length,
        targets: targets.length,
        ok,
        fail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logger.error("Error in send-disc-batch", { message: error?.message });
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
