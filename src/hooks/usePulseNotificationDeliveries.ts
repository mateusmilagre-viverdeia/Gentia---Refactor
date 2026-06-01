import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PulseNotificationDeliveryStatus = "success" | "failed";

export interface PulseNotificationDelivery {
  id: string;
  account_id: string;
  channel_id: string | null;
  channel_type: string;
  channel_name: string | null;
  event: string;
  status: PulseNotificationDeliveryStatus;
  http_status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  response_body: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export type DeliveriesPeriod = "7d" | "30d";

export function usePulseNotificationDeliveries(accountId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<PulseNotificationDelivery[]>([]);

  const sinceForPeriod = useCallback((period: DeliveriesPeriod) => {
    const d = new Date();
    d.setDate(d.getDate() - (period === "7d" ? 7 : 30));
    return d.toISOString();
  }, []);

  const fetchDeliveries = useCallback(
    async (opts?: {
      period?: DeliveriesPeriod;
      status?: PulseNotificationDeliveryStatus | "all";
      channelId?: string | "all";
      limit?: number;
    }) => {
      if (!accountId) return;
      const period = opts?.period ?? "30d";
      const status = opts?.status ?? "all";
      const channelId = opts?.channelId ?? "all";
      const limit = opts?.limit ?? 50;

      setLoading(true);
      try {
        // Obs: os tipos gerados do client podem demorar para refletir tabelas novas.
        // Usamos "any" para evitar erro de overload / type instantiation (schema grande).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb: any = supabase;
        let query = sb
          .from("pulse_notification_deliveries")
          .select("*")
          .eq("account_id", accountId)
          .gte("created_at", sinceForPeriod(period))
          .order("created_at", { ascending: false })
          .limit(limit);

        if (status !== "all") query = query.eq("status", status);
        if (channelId !== "all") query = query.eq("channel_id", channelId);

        const { data, error } = await query;
        if (error) throw error;

        setDeliveries((data || []) as PulseNotificationDelivery[]);
      } catch (error) {
        // RLS pode bloquear usuários sem permissão
        console.error("Error fetching pulse_notification_deliveries:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os logs de notificação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [accountId, sinceForPeriod, toast]
  );

  const metrics = useMemo(() => {
    const total = deliveries.length;
    const failed = deliveries.filter((d) => d.status === "failed").length;
    const success = total - failed;
    const deliveryRate = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;

    const byChannelType = deliveries.reduce<Record<string, { total: number; failed: number }>>(
      (acc, d) => {
        const key = d.channel_type || "unknown";
        acc[key] ??= { total: 0, failed: 0 };
        acc[key].total += 1;
        if (d.status === "failed") acc[key].failed += 1;
        return acc;
      },
      {}
    );

    const recentErrors = deliveries
      .filter((d) => d.status === "failed")
      .slice(0, 5);

    return { total, success, failed, deliveryRate, byChannelType, recentErrors };
  }, [deliveries]);

  return {
    deliveries,
    loading,
    metrics,
    fetchDeliveries,
  };
}
