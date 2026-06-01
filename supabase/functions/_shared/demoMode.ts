/**
 * Demo Mode interception helper.
 *
 * When an account has `account_demo_config.demo_mode_active = true`, all outgoing
 * communications (WhatsApp / Email) should be SKIPPED — never delivered to real
 * recipients. The original payload is logged so the consultant can audit what
 * "would have been sent" during a demo presentation.
 */

const cache = new Map<string, { value: boolean; expiresAt: number }>();
const TTL_MS = 30_000; // 30s — demo flips are infrequent

export async function isDemoAccount(supabase: any, accountId?: string | null): Promise<boolean> {
  if (!accountId) return false;
  const cached = cache.get(accountId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const { data } = await supabase
      .from("account_demo_config")
      .select("demo_mode_active")
      .eq("account_id", accountId)
      .maybeSingle();
    const value = !!data?.demo_mode_active;
    cache.set(accountId, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch (err) {
    console.warn("[demoMode] failed to read account_demo_config:", err);
    return false;
  }
}

/**
 * Logs a demo-skipped communication into recruitment_communications_log so the
 * consultant can show "what would have been sent" inside the demo dashboard.
 * Best-effort: never throws.
 */
export async function logDemoSkippedCommunication(
  supabase: any,
  params: {
    accountId: string;
    channel: "whatsapp" | "email";
    recipient: string;
    messageType?: string;
    subject?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    candidateId?: string | null;
    jobId?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("recruitment_communications_log").insert({
      account_id: params.accountId,
      channel: params.channel,
      recipient: params.recipient,
      message_type: params.messageType ?? "demo_intercept",
      subject: params.subject ?? null,
      body: params.body ?? null,
      status: "demo_skipped",
      provider: "demo_mode",
      metadata: { ...(params.metadata ?? {}), demo_skipped: true },
      candidate_id: params.candidateId ?? null,
      job_id: params.jobId ?? null,
    });
  } catch (err) {
    console.warn("[demoMode] failed to log demo_skipped communication:", err);
  }
}
