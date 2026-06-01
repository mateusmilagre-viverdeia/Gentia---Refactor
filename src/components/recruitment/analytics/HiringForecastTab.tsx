import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccount } from "@/hooks/useAccount";
import { useHiringDemandForecast } from "@/hooks/useHiringDemandForecast";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

function currentYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function HiringForecastTab() {
  const { canManageRH, account } = useAccount();
  const [anchor, setAnchor] = useState(() => currentYM());
  const [horizon, setHorizon] = useState<6 | 12>(12);

  const forecast = useHiringDemandForecast({
    historyMonths: 12,
    horizonMonths: horizon,
    anchorYear: anchor.year,
    anchorMonth: anchor.month,
  });

  const points = forecast.data ?? [];
  const futurePoints = useMemo(() => points.slice(12), [points]);

  const [plannedEdits, setPlannedEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    // Sync editable values with latest computed plannedHires
    const next: Record<string, string> = {};
    futurePoints.forEach((p) => {
      next[`${p.year}-${p.month}`] = String(p.plannedHires ?? 0);
    });
    setPlannedEdits(next);
  }, [futurePoints]);

  const totals = useMemo(() => {
    const gapTotal = futurePoints.reduce((s, p) => s + p.gap, 0);
    const riskyMonths = futurePoints.filter((p) => p.gap > 0).length;
    return { gapTotal, riskyMonths };
  }, [futurePoints]);

  const savePlanned = async (year: number, month: number) => {
    if (!account?.id) {
      toast.error("Conta não encontrada");
      return;
    }
    const key = `${year}-${month}`;
    const raw = plannedEdits[key] ?? "0";
    const planned = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isFinite(planned)) {
      toast.error("Valor inválido");
      return;
    }

    try {
      // Check if row exists for this month
      const { data: existing, error: selError } = await supabase
        .from("recruitment_headcount_plan")
        .select("id")
        .eq("account_id", account.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (selError) throw selError;

      if (existing?.id) {
        const { error: updError } = await supabase
          .from("recruitment_headcount_plan")
          .update({ planned_hires: planned })
          .eq("id", existing.id);
        if (updError) throw updError;
      } else {
        const { error: insError } = await supabase.from("recruitment_headcount_plan").insert({
          account_id: account.id,
          year,
          month,
          planned_hires: planned,
          notes: null,
        });
        if (insError) throw insError;
      }

      toast.success("Plano salvo");
      await forecast.refetch();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar plano");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Previsão de Demanda</CardTitle>
            <p className="text-sm text-muted-foreground">
              Previsão baseada em contratações históricas (status “hired”), média móvel e sazonalidade por mês.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="w-[120px]"
              type="number"
              min={1}
              max={12}
              value={anchor.month}
              onChange={(e) => setAnchor((p) => ({ ...p, month: Number(e.target.value) }))}
              aria-label="Mês âncora"
            />
            <Input
              className="w-[140px]"
              type="number"
              min={2000}
              max={2100}
              value={anchor.year}
              onChange={(e) => setAnchor((p) => ({ ...p, year: Number(e.target.value) }))}
              aria-label="Ano âncora"
            />
            <Button variant="outline" onClick={() => setHorizon(6)} disabled={horizon === 6}>
              6m
            </Button>
            <Button variant="outline" onClick={() => setHorizon(12)} disabled={horizon === 12}>
              12m
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Gap total (plano − previsto)</div>
              <div className="text-xl font-semibold">{totals.gapTotal}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Meses com risco</div>
              <div className="text-xl font-semibold">{totals.riskyMonths}</div>
            </div>
          </div>

          <div className="h-[320px] rounded-lg border bg-card p-3">
            {forecast.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actualHires" name="Real" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecastHires" name="Previsto" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="plannedHires" name="Planejado" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  {canManageRH && <TableHead className="text-right w-[220px]">Editar plano</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {futurePoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageRH ? 5 : 4} className="text-muted-foreground">
                      Sem dados suficientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  futurePoints.map((p) => (
                    <TableRow key={`${p.year}-${p.month}`}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right">{p.forecastHires}</TableCell>
                      <TableCell className="text-right">{p.plannedHires}</TableCell>
                      <TableCell className="text-right">{p.gap}</TableCell>
                      {canManageRH && (
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              className="w-[110px]"
                              type="number"
                              min={0}
                              step={1}
                              value={plannedEdits[`${p.year}-${p.month}`] ?? "0"}
                              onChange={(e) =>
                                setPlannedEdits((prev) => ({
                                  ...prev,
                                  [`${p.year}-${p.month}`]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void savePlanned(p.year, p.month)}
                            >
                              Salvar
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
