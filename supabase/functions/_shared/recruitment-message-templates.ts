// Shared helper to resolve recruitment communication templates.
// Used by multiple backend functions (DISC invite/reminders).

export type RecruitmentMessageChannel = "email" | "whatsapp";
export type RecruitmentMessageType = "disc_invite" | "disc_reminder" | "talent_pool_entry" | "workflow_advance" | "workflow_complete";

export interface RecruitmentMessageTemplateRow {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  reminder_day: number | null;
  is_default: boolean;
  is_active: boolean;
}

export async function getActiveRecruitmentTemplate(params: {
  supabase: any;
  accountId: string;
  channel: RecruitmentMessageChannel;
  messageType: RecruitmentMessageType;
  reminderDay: number | null;
}): Promise<RecruitmentMessageTemplateRow | null> {
  const { supabase, accountId, channel, messageType, reminderDay } = params;

  let q = supabase
    .from("recruitment_message_templates")
    .select("id, name, subject, body, reminder_day, is_default, is_active")
    .eq("account_id", accountId)
    .eq("channel", channel)
    .eq("message_type", messageType)
    .eq("is_active", true);

  if (reminderDay === null) {
    q = q.is("reminder_day", null);
  } else {
    q = q.eq("reminder_day", reminderDay);
  }

  // Prefer a default template if present, otherwise the most recently updated.
  const { data, error } = await q
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Template fetch error:", error);
    return null;
  }

  return (data as RecruitmentMessageTemplateRow) ?? null;
}

export function renderTemplateVariables(
  template: string,
  variables: Record<string, string | undefined | null>
): string {
  let result = template;
  for (const [k, raw] of Object.entries(variables)) {
    const v = raw ?? "";
    result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return result;
}

export function templateMetadata(t: RecruitmentMessageTemplateRow | null): Record<string, unknown> {
  if (!t) return {};
  return {
    template_id: t.id,
    template_name: t.name,
    template_is_default: t.is_default,
  };
}
