import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FunctionCostRow {
  function_name: string;
  total_sessions: number;
  total_cost_brl: number;
  avg_cost_brl: number;
  baseline_cost_brl: number | null;
  savings_brl: number;
  savings_pct: number;
  avg_compression_ratio: number | null;
}

export interface DailyCostRow {
  day: string; // YYYY-MM-DD
  function_name: string;
  cost_brl: number;
  sessions: number;
}

export interface AccountCostRow {
  account_id: string;
  account_name: string | null;
  total_sessions: number;
  total_cost_brl: number;
  avg_cost_brl: number;
  tier: "stable" | "optimized" | "experimental";
}

export interface AnomalyRow {
  id: string;
  created_at: string;
  function_name: string;
  account_id: string | null;
  estimated_cost: number | null;
  cost_brl: number | null;
  reason: string;
}

const USD_TO_BRL_FALLBACK = 5.65;

// Lightweight: pricing isn't stored in the log row, but estimated_cost is in USD.
function usdToBrl(v: number | null | undefined, rate = USD_TO_BRL_FALLBACK) {
  return (v ?? 0) * rate;
}

export function useLlmCostMetrics(days = 30) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byFunction, setByFunction] = useState<FunctionCostRow[]>([]);
  const [daily, setDaily] = useState<DailyCostRow[]>([]);
  const [byAccount, setByAccount] = useState<AccountCostRow[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
  const [usdRate, setUsdRate] = useState<number>(USD_TO_BRL_FALLBACK);
  const [qualitySignal, setQualitySignal] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });

  const TARGET_FUNCTIONS = [
    "culture-interview-complete",
    "technical-interview-complete",
    "analyze-cv-job-match",
  ];

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

      // Fetch USD->BRL conversion (uses platform config if present)
      const { data: cfg } = await supabase
        .from("platform_credit_config" as any)
        .select("usd_to_brl")
        .limit(1)
        .maybeSingle();
      const rate = (cfg as any)?.usd_to_brl ?? USD_TO_BRL_FALLBACK;
      setUsdRate(rate);

      // Fetch baselines
      const { data: baselines } = await supabase
        .from("ai_cost_baselines" as any)
        .select("function_name, avg_cost_brl");
      const baselineMap = new Map<string, number>(
        ((baselines as any[]) || []).map((b) => [b.function_name, Number(b.avg_cost_brl)])
      );

      // Fetch logs
      const { data: logs, error: logsErr } = await supabase
        .from("ai_execution_logs" as any)
        .select(
          "id, account_id, function_name, estimated_cost, compression_ratio, quality_score, created_at, status"
        )
        .in("function_name", TARGET_FUNCTIONS)
        .gte("created_at", since)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(10000);

      if (logsErr) throw logsErr;
      const rows = (logs as any[]) || [];

      // Aggregate by function
      const fnAgg = new Map<
        string,
        { sessions: number; costBrl: number; ratios: number[] }
      >();
      for (const r of rows) {
        const c = fnAgg.get(r.function_name) || {
          sessions: 0,
          costBrl: 0,
          ratios: [],
        };
        c.sessions += 1;
        c.costBrl += usdToBrl(r.estimated_cost, rate);
        if (r.compression_ratio != null) c.ratios.push(Number(r.compression_ratio));
        fnAgg.set(r.function_name, c);
      }
      const byFn: FunctionCostRow[] = TARGET_FUNCTIONS.map((fn) => {
        const c = fnAgg.get(fn) || { sessions: 0, costBrl: 0, ratios: [] };
        const avg = c.sessions > 0 ? c.costBrl / c.sessions : 0;
        const baseline = baselineMap.get(fn) ?? null;
        const savings = baseline != null ? Math.max(0, (baseline - avg) * c.sessions) : 0;
        const savingsPct =
          baseline != null && baseline > 0 ? Math.max(0, ((baseline - avg) / baseline) * 100) : 0;
        const ratios = c.ratios;
        return {
          function_name: fn,
          total_sessions: c.sessions,
          total_cost_brl: c.costBrl,
          avg_cost_brl: avg,
          baseline_cost_brl: baseline,
          savings_brl: savings,
          savings_pct: savingsPct,
          avg_compression_ratio:
            ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null,
        };
      });
      setByFunction(byFn);

      // Aggregate daily
      const dailyAgg = new Map<
        string,
        { cost: number; sessions: number }
      >();
      for (const r of rows) {
        const day = String(r.created_at).slice(0, 10);
        const key = `${day}::${r.function_name}`;
        const c = dailyAgg.get(key) || { cost: 0, sessions: 0 };
        c.cost += usdToBrl(r.estimated_cost, rate);
        c.sessions += 1;
        dailyAgg.set(key, c);
      }
      const dailyRows: DailyCostRow[] = Array.from(dailyAgg.entries()).map(([key, v]) => {
        const [day, fn] = key.split("::");
        return { day, function_name: fn, cost_brl: v.cost, sessions: v.sessions };
      });
      dailyRows.sort((a, b) => a.day.localeCompare(b.day));
      setDaily(dailyRows);

      // Aggregate by account
      const acctAgg = new Map<string, { sessions: number; cost: number }>();
      for (const r of rows) {
        if (!r.account_id) continue;
        const c = acctAgg.get(r.account_id) || { sessions: 0, cost: 0 };
        c.sessions += 1;
        c.cost += usdToBrl(r.estimated_cost, rate);
        acctAgg.set(r.account_id, c);
      }
      const acctIds = Array.from(acctAgg.keys());
      let nameMap = new Map<string, string>();
      let tierMap = new Map<string, "stable" | "optimized" | "experimental">();
      if (acctIds.length) {
        const { data: accts } = await supabase
          .from("accounts" as any)
          .select("id, name")
          .in("id", acctIds);
        nameMap = new Map(((accts as any[]) || []).map((a) => [a.id, a.name]));
        const { data: settings } = await supabase
          .from("account_settings" as any)
          .select("account_id, evaluator_optimization_tier")
          .in("account_id", acctIds);
        tierMap = new Map(
          ((settings as any[]) || []).map((s) => [
            s.account_id,
            (s.evaluator_optimization_tier || "optimized") as any,
          ])
        );
      }
      const acctRows: AccountCostRow[] = acctIds
        .map((id) => {
          const a = acctAgg.get(id)!;
          return {
            account_id: id,
            account_name: nameMap.get(id) || null,
            total_sessions: a.sessions,
            total_cost_brl: a.cost,
            avg_cost_brl: a.sessions > 0 ? a.cost / a.sessions : 0,
            tier: tierMap.get(id) || "optimized",
          };
        })
        .sort((a, b) => b.total_cost_brl - a.total_cost_brl);
      setByAccount(acctRows);

      // Anomalies: cost > 2x avg per function (last 7 days only)
      const sevenDays = Date.now() - 7 * 24 * 3600 * 1000;
      const fnAvg = new Map<string, number>();
      for (const fn of TARGET_FUNCTIONS) {
        const a = byFn.find((b) => b.function_name === fn);
        if (a && a.avg_cost_brl > 0) fnAvg.set(fn, a.avg_cost_brl);
      }
      const anom: AnomalyRow[] = [];
      for (const r of rows) {
        if (new Date(r.created_at).getTime() < sevenDays) continue;
        const cost = usdToBrl(r.estimated_cost, rate);
        const avg = fnAvg.get(r.function_name) || 0;
        if (avg > 0 && cost > avg * 2) {
          anom.push({
            id: r.id,
            created_at: r.created_at,
            function_name: r.function_name,
            account_id: r.account_id,
            estimated_cost: r.estimated_cost,
            cost_brl: cost,
            reason: `Custo ${(cost / avg).toFixed(1)}× acima da média`,
          });
        } else if (r.compression_ratio != null && Number(r.compression_ratio) > 0 && Number(r.compression_ratio) < 0.3) {
          anom.push({
            id: r.id,
            created_at: r.created_at,
            function_name: r.function_name,
            account_id: r.account_id,
            estimated_cost: r.estimated_cost,
            cost_brl: cost,
            reason: `Compressão suspeita (${Number(r.compression_ratio).toFixed(2)})`,
          });
        }
      }
      anom.sort((a, b) => (b.cost_brl ?? 0) - (a.cost_brl ?? 0));
      setAnomalies(anom.slice(0, 50));

      // Quality signal: average of non-null quality_score values
      const qScores = rows.map((r) => r.quality_score).filter((q) => q != null).map(Number);
      setQualitySignal({
        avg: qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null,
        count: qScores.length,
      });
    } catch (e: any) {
      console.error("[useLlmCostMetrics] error", e);
      setError(e?.message || "Falha ao carregar métricas");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    error,
    byFunction,
    daily,
    byAccount,
    anomalies,
    qualitySignal,
    usdRate,
    refresh,
  };
}
