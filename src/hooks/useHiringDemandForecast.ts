import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export type MonthlyPoint = {
  year: number;
  month: number; // 1-12
  label: string;
  actualHires: number;
  forecastHires: number;
  plannedHires: number;
  gap: number;
};

function ymLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function addMonths(base: { year: number; month: number }, offset: number) {
  const d = new Date(Date.UTC(base.year, base.month - 1 + offset, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function isoFromYM(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
}

export function useHiringDemandForecast(params: {
  historyMonths: number;
  horizonMonths: number;
  anchorYear: number;
  anchorMonth: number;
}) {
  const { account } = useAccount();
  const accountId = account?.id;

  const key = useMemo(() => ["hiring_demand_forecast", { accountId, ...params }], [accountId, params]);

  return useQuery({
    queryKey: key,
    enabled: Boolean(accountId),
    queryFn: async (): Promise<MonthlyPoint[]> => {
      if (!accountId) return [];

      const historyStart = addMonths(
        { year: params.anchorYear, month: params.anchorMonth },
        -params.historyMonths + 1
      );
      const historyStartIso = isoFromYM(historyStart.year, historyStart.month);

      const { data: hiredApps, error: hiredError } = await supabase
        .from("recruitment_applications")
        .select("updated_at")
        .eq("account_id", accountId)
        .eq("status", "hired")
        .gte("updated_at", historyStartIso);
      if (hiredError) throw hiredError;

      const actualByYM = new Map<string, number>();
      (hiredApps ?? []).forEach((r) => {
        if (!r.updated_at) return;
        const d = new Date(r.updated_at as string);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const k = `${y}-${m}`;
        actualByYM.set(k, (actualByYM.get(k) ?? 0) + 1);
      });

      const end = addMonths({ year: params.anchorYear, month: params.anchorMonth }, params.horizonMonths);

      const { data: planRows, error: planError } = await supabase
        .from("recruitment_headcount_plan")
        .select("year, month, planned_hires")
        .eq("account_id", accountId)
        .gte("year", historyStart.year)
        .lte("year", end.year);
      if (planError) throw planError;

      const plannedByYM = new Map<string, number>();
      (planRows ?? []).forEach((r) => {
        const y = Number(r.year);
        const m = Number(r.month);
        plannedByYM.set(`${y}-${m}`, Number(r.planned_hires ?? 0));
      });

      const points: MonthlyPoint[] = [];
      const totalMonths = params.historyMonths + params.horizonMonths;
      for (let i = 0; i < totalMonths; i++) {
        const { year, month } = addMonths(historyStart, i);
        const k = `${year}-${month}`;
        points.push({
          year,
          month,
          label: ymLabel(year, month),
          actualHires: actualByYM.get(k) ?? 0,
          forecastHires: 0,
          plannedHires: plannedByYM.get(k) ?? 0,
          gap: 0,
        });
      }

      const historyPoints = points.slice(0, params.historyMonths);
      const overallAvg =
        historyPoints.reduce((sum, p) => sum + p.actualHires, 0) / Math.max(1, historyPoints.length);
      const monthBuckets = new Map<number, { sum: number; count: number }>();
      historyPoints.forEach((p) => {
        const b = monthBuckets.get(p.month) ?? { sum: 0, count: 0 };
        b.sum += p.actualHires;
        b.count += 1;
        monthBuckets.set(p.month, b);
      });
      const seasonalIndex = new Map<number, number>();
      for (let m = 1; m <= 12; m++) {
        const b = monthBuckets.get(m);
        const avg = b && b.count > 0 ? b.sum / b.count : overallAvg;
        const idx = overallAvg > 0 ? avg / overallAvg : 1;
        seasonalIndex.set(m, Number.isFinite(idx) ? idx : 1);
      }

      const last3 = historyPoints.slice(-3);
      const baseline = last3.reduce((s, p) => s + p.actualHires, 0) / Math.max(1, last3.length);

      for (let i = params.historyMonths; i < points.length; i++) {
        const p = points[i];
        const idx = seasonalIndex.get(p.month) ?? 1;
        p.forecastHires = Math.max(0, Math.round(baseline * idx));
      }

      points.forEach((p, i) => {
        const expected = i < params.historyMonths ? p.actualHires : p.forecastHires;
        p.gap = p.plannedHires - expected;
      });

      return points;
    },
  });
}
