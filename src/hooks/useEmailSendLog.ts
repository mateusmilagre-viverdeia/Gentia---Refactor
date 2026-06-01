import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmailSendLogRow = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export interface UseEmailSendLogParams {
  startDate: Date;
  endDate?: Date;
}

/**
 * Fetches email_send_log rows within a date range and deduplicates
 * by message_id (keeps the latest status per email).
 *
 * PostgREST has no native DISTINCT ON, so we fetch ordered DESC by
 * created_at and dedup client-side keeping the first occurrence.
 */
export function useEmailSendLog({ startDate, endDate }: UseEmailSendLogParams) {
  return useQuery({
    queryKey: ["email-send-log", startDate.toISOString(), endDate?.toISOString() ?? null],
    queryFn: async (): Promise<EmailSendLogRow[]> => {
      let q = (supabase as any)
        .from("email_send_log")
        .select("id, message_id, template_name, recipient_email, status, error_message, metadata, created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);

      if (endDate) q = q.lte("created_at", endDate.toISOString());

      const { data, error } = await q;
      if (error) throw error;

      // Dedup by message_id keeping latest (first since DESC).
      // Rows with no message_id are kept as-is (each is unique).
      const seen = new Set<string>();
      const deduped: EmailSendLogRow[] = [];
      for (const row of (data || []) as EmailSendLogRow[]) {
        if (!row.message_id) {
          deduped.push(row);
          continue;
        }
        if (seen.has(row.message_id)) continue;
        seen.add(row.message_id);
        deduped.push(row);
      }
      return deduped;
    },
    staleTime: 30_000,
  });
}
