import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, Download } from "lucide-react";
import { useCreditCosts, useCreditPackages, usePlatformCreditConfig } from "@/hooks/usePricingAdmin";
import { useFeatureLLMMapping } from "@/hooks/useFeatureLLMMapping";
import { buildSimulatorFeature, simulateFeatureCost, type SimulatorPlan } from "@/lib/pricingSimulator";

const PRO_NAMES = ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5", "Pro 6"];

type Line = { id: string; feature_key: string; quantity: number };

export function PricingSimulatorTab() {
  const { data: costs, isLoading: l1 } = useCreditCosts();
  const { data: mapping, isLoading: l2 } = useFeatureLLMMapping();
  const { data: pkgs, isLoading: l3 } = useCreditPackages();
  const { data: config, isLoading: l4 } = usePlatformCreditConfig();

  const [planName, setPlanName] = useState("Pro 1");
  const [comparePlans, setComparePlans] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ id: crypto.randomUUID(), feature_key: "", quantity: 30 }]);

  const proPkgs = useMemo(() => (pkgs ?? []).filter(p => PRO_NAMES.includes(p.name)), [pkgs]);
  const activeCosts = useMemo(() => (costs ?? []).filter(c => c.is_active), [costs]);
  const mappingByKey = useMemo(() => {
    const m = new Map<string, any>();
    (mapping ?? []).forEach(x => m.set(x.feature_key, x));
    return m;
  }, [mapping]);

  const usdToBrl = Number(config?.usd_to_brl ?? 5.10);
  const marginPercent = Number(config?.margin_percent ?? 220);
  const globalCredit = Number(config?.credit_value_brl ?? 1.39);

  const planFor = (name: string): SimulatorPlan => {
    const pkg = proPkgs.find(p => p.name === name);
    return {
      id: pkg?.id || name,
      name,
      creditValueBrl: pkg?.price_per_credit_cents ? pkg.price_per_credit_cents / 100 : globalCredit,
      monthlyCredits: pkg?.credits,
      monthlyPriceBrl: pkg ? pkg.price_cents / 100 : undefined,
    };
  };

  const simulateForPlan = (plan: SimulatorPlan) => {
    let totalCredits = 0, brlCharged = 0, realCostBrl = 0;
    const breakdown: { line: Line; sim: ReturnType<typeof simulateFeatureCost> | null }[] = [];
    for (const line of lines) {
      const cost = activeCosts.find(c => c.feature_key === line.feature_key);
      if (!cost || line.quantity <= 0) {
        breakdown.push({ line, sim: null });
        continue;
      }
      const sim = simulateFeatureCost({
        plan,
        feature: buildSimulatorFeature({
          feature_key: cost.feature_key,
          description: cost.description,
          credits_per_use: cost.credits_per_use,
          usage_unit: cost.usage_unit,
          mapping: mappingByKey.get(cost.feature_key) ?? null,
        }),
        quantity: line.quantity,
        usdToBrl,
        marginPercent,
      });
      totalCredits += sim.credits;
      brlCharged += sim.brlCharged;
      realCostBrl += sim.realCostBrl;
      breakdown.push({ line, sim });
    }
    const marginBrl = brlCharged - realCostBrl;
    const marginPct = realCostBrl > 0 ? (marginBrl / realCostBrl) * 100 : null;
    return { plan, totalCredits, brlCharged, realCostBrl, marginBrl, marginPct, breakdown };
  };

  const plansToShow = comparePlans ? PRO_NAMES.map(planFor) : [planFor(planName)];
  const results = plansToShow.map(simulateForPlan);

  const exportCsv = () => {
    const main = results[0];
    const rows = ["plan,feature,quantity,unit,credits,brl_charged,real_cost_brl,margin_brl,margin_pct"];
    for (const r of results) {
      for (const b of r.breakdown) {
        if (!b.sim) continue;
        const c = activeCosts.find(x => x.feature_key === b.line.feature_key);
        rows.push([
          r.plan.name, b.line.feature_key, b.line.quantity, c?.usage_unit || "",
          b.sim.credits, b.sim.brlCharged.toFixed(2), b.sim.realCostBrl.toFixed(2),
          b.sim.marginBrl.toFixed(2), b.sim.marginPct?.toFixed(1) ?? "",
        ].join(","));
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pricing-simulation-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (l1 || l2 || l3 || l4) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Simulador de cobrança</CardTitle>
          <CardDescription>
            Monte cenários reais: escolha plano e features, veja créditos consumidos, R$ cobrado, custo LLM real e margem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select value={planName} onValueChange={setPlanName} disabled={comparePlans}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{PRO_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant={comparePlans ? "default" : "outline"} size="sm"
              onClick={() => setComparePlans(v => !v)}>
              {comparePlans ? "Plano único" : "Comparar Pro 1–6"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3 w-3 mr-1" />CSV
            </Button>
          </div>

          {/* Linhas */}
          <div className="space-y-2 border rounded-md p-3">
            <Label className="text-xs text-muted-foreground">Features do cenário</Label>
            {lines.map(line => (
              <div key={line.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Select
                    value={line.feature_key}
                    onValueChange={v => setLines(ls => ls.map(l => l.id === line.id ? { ...l, feature_key: v } : l))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Escolher feature…" /></SelectTrigger>
                    <SelectContent>
                      {activeCosts.map(c => (
                        <SelectItem key={c.feature_key} value={c.feature_key}>
                          {c.description || c.feature_key} ({c.credits_per_use} cr/{c.usage_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-28">
                  <Input type="number" min={0} className="h-9"
                    value={line.quantity}
                    onChange={e => setLines(ls => ls.map(l => l.id === line.id ? { ...l, quantity: Number(e.target.value) } : l))} />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setLines(ls => ls.filter(l => l.id !== line.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline"
              onClick={() => setLines(ls => [...ls, { id: crypto.randomUUID(), feature_key: "", quantity: 1 }])}>
              <Plus className="h-3 w-3 mr-1" />Adicionar feature
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className={`grid gap-3 ${comparePlans ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-1"}`}>
        {results.map(r => (
          <Card key={r.plan.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {r.plan.name}
                <Badge variant="outline" className="text-xs">R$ {r.plan.creditValueBrl.toFixed(3)}/cr</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Stat label="Créditos" value={`${r.totalCredits.toFixed(1)} cr`} />
              <Stat label="Cliente paga" value={`R$ ${r.brlCharged.toFixed(2)}`} highlight />
              <Stat label="Custo LLM real" value={`R$ ${r.realCostBrl.toFixed(2)}`} muted />
              <Stat label="Margem"
                value={`R$ ${r.marginBrl.toFixed(2)} ${r.marginPct !== null ? `(${r.marginPct.toFixed(0)}%)` : ""}`}
                color={r.marginPct === null ? undefined : r.marginPct > 200 ? "green" : r.marginPct > 100 ? "amber" : "red"} />
              {!comparePlans && (
                <details className="text-xs text-muted-foreground mt-2">
                  <summary className="cursor-pointer">Memória de cálculo</summary>
                  <pre className="whitespace-pre-wrap mt-1 text-[10px]">
                    {r.breakdown.filter(b => b.sim).map(b => b.sim!.breakdown).join("\n\n")}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight, muted, color }: { label: string; value: string; highlight?: boolean; muted?: boolean; color?: "green"|"amber"|"red" }) {
  const cls = color === "green" ? "text-green-600" : color === "amber" ? "text-amber-600" : color === "red" ? "text-destructive" : "";
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-xs ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-base" : ""} ${cls}`}>{value}</span>
    </div>
  );
}
