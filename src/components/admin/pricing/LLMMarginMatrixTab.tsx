import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Cpu, Info } from "lucide-react";
import { useCreditCosts, usePlatformCreditConfig, useCreditPackages } from "@/hooks/usePricingAdmin";
import { useFeatureLLMMapping } from "@/hooks/useFeatureLLMMapping";
import { ALL_MODELS, findModel, type ModelPricing } from "@/lib/pricingCalculator";
import { simulateFeatureCost, buildSimulatorFeature } from "@/lib/pricingSimulator";

const PRO_NAMES = ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5", "Pro 6"];

interface FeatureRowItem {
  feature_key: string;
  description: string;
  credits_per_use: number;
  usage_unit: string;
  avg_tokens_input: number | null;
  avg_tokens_output: number | null;
}

interface PerPlanCell {
  planName: string;
  brlCharged: number;
  realCostBrl: number;
  marginPct: number | null;
  marginBrl: number;
}

interface ModelGroup {
  model: ModelPricing;
  features: FeatureRowItem[];
  cells: PerPlanCell[]; // weighted-avg across features
  avgMarginPct: number | null;
}

function marginBadgeVariant(pct: number | null, target: number): "default" | "secondary" | "destructive" | "outline" {
  if (pct === null) return "outline";
  if (pct >= target) return "default";
  if (pct >= target * 0.5) return "secondary";
  return "destructive";
}

function MarginCell({ cell, target }: { cell: PerPlanCell; target: number }) {
  if (cell.marginPct === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs tabular-nums text-muted-foreground">R$ {cell.brlCharged.toFixed(3)}</span>
      <Badge variant={marginBadgeVariant(cell.marginPct, target)} className="tabular-nums">
        {cell.marginPct >= 0 ? "+" : ""}{cell.marginPct.toFixed(0)}%
      </Badge>
    </div>
  );
}

export function LLMMarginMatrixTab() {
  const { data: costs, isLoading: l1 } = useCreditCosts();
  const { data: mapping, isLoading: l2 } = useFeatureLLMMapping();
  const { data: config } = usePlatformCreditConfig();
  const { data: pkgs } = useCreditPackages();

  const usdToBrl = Number(config?.usd_to_brl ?? 5.10);
  const marginTarget = Number(config?.margin_percent ?? 220);

  const plans = useMemo(() => {
    return PRO_NAMES.map(name => {
      const p = (pkgs ?? []).find(x => x.name === name);
      const cv = p?.price_per_credit_cents ? p.price_per_credit_cents / 100 : Number(config?.credit_value_brl ?? 1.39);
      return { id: p?.id ?? name, name, creditValueBrl: cv };
    });
  }, [pkgs, config]);

  const { groups, unused } = useMemo(() => {
    const mapByKey = new Map<string, any>();
    (mapping ?? []).forEach(m => mapByKey.set(m.feature_key, m));

    // Group active features by model_id
    const byModel = new Map<string, FeatureRowItem[]>();
    for (const c of costs ?? []) {
      if (!c.is_active) continue;
      const m = mapByKey.get(c.feature_key);
      if (!m || !m.model_id || m.model_id === "no_llm") continue;
      const list = byModel.get(m.model_id) ?? [];
      list.push({
        feature_key: c.feature_key,
        description: c.description || c.feature_key,
        credits_per_use: Number(c.credits_per_use),
        usage_unit: c.usage_unit,
        avg_tokens_input: m.avg_tokens_input ?? null,
        avg_tokens_output: m.avg_tokens_output ?? null,
      });
      byModel.set(m.model_id, list);
    }

    const groups: ModelGroup[] = [];
    for (const [modelId, features] of byModel.entries()) {
      const model = findModel(modelId);
      if (!model) continue;

      const cells: PerPlanCell[] = plans.map(plan => {
        // Average across features for that plan (simple mean, 1 unit each)
        let sumCharged = 0, sumCost = 0, sumMargin = 0, n = 0;
        for (const f of features) {
          const sim = simulateFeatureCost({
            plan,
            feature: buildSimulatorFeature({
              feature_key: f.feature_key,
              description: f.description,
              credits_per_use: f.credits_per_use,
              usage_unit: f.usage_unit,
              mapping: {
                model_id: modelId,
                avg_tokens_input: f.avg_tokens_input,
                avg_tokens_output: f.avg_tokens_output,
              },
            }),
            quantity: 1,
            usdToBrl,
            marginPercent: marginTarget,
          });
          sumCharged += sim.brlCharged;
          sumCost += sim.realCostBrl;
          sumMargin += sim.marginBrl;
          n++;
        }
        const brlCharged = n > 0 ? sumCharged / n : 0;
        const realCostBrl = n > 0 ? sumCost / n : 0;
        const marginBrl = n > 0 ? sumMargin / n : 0;
        const marginPct = realCostBrl > 0 ? (marginBrl / realCostBrl) * 100 : null;
        return { planName: plan.name, brlCharged, realCostBrl, marginPct, marginBrl };
      });

      const validPcts = cells.map(c => c.marginPct).filter((x): x is number => x !== null);
      const avgMarginPct = validPcts.length > 0 ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length : null;

      groups.push({ model, features, cells, avgMarginPct });
    }

    groups.sort((a, b) => (b.avgMarginPct ?? -Infinity) - (a.avgMarginPct ?? -Infinity));

    const usedIds = new Set(groups.map(g => g.model.model));
    const unused = ALL_MODELS.filter(m => m.category !== "duration" && !usedIds.has(m.model));

    return { groups, unused };
  }, [costs, mapping, plans, usdToBrl, marginTarget]);

  if (l1 || l2) return <Skeleton className="h-96" />;

  const mostProfitable = groups[0];
  const leastProfitable = groups[groups.length - 1];
  const belowTarget = groups.filter(g => g.avgMarginPct !== null && g.avgMarginPct < marginTarget);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />Mais rentável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm truncate">{mostProfitable?.model.model ?? "—"}</div>
            <div className="text-2xl font-semibold text-green-600 tabular-nums">
              {mostProfitable?.avgMarginPct !== null && mostProfitable !== undefined
                ? `+${mostProfitable.avgMarginPct!.toFixed(0)}%`
                : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground">média entre os 6 planos Pro</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />Menos rentável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm truncate">{leastProfitable?.model.model ?? "—"}</div>
            <div className={`text-2xl font-semibold tabular-nums ${
              leastProfitable?.avgMarginPct !== null && leastProfitable !== undefined && leastProfitable.avgMarginPct! < marginTarget
                ? "text-destructive" : "text-foreground"
            }`}>
              {leastProfitable?.avgMarginPct !== null && leastProfitable !== undefined
                ? `${leastProfitable.avgMarginPct! >= 0 ? "+" : ""}${leastProfitable.avgMarginPct!.toFixed(0)}%`
                : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground">média entre os 6 planos Pro</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Abaixo da meta ({marginTarget}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {belowTarget.length}<span className="text-sm text-muted-foreground"> / {groups.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">modelos com margem média abaixo do alvo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" />Margem por LLM × Plano</CardTitle>
          <CardDescription>
            Para cada modelo LLM em uso, mostra o R$ cobrado e a margem % em cada plano Pro (uso unitário, média entre as features que usam o modelo).
            Margem = (R$ cobrado − custo LLM real em R$) / custo. Alvo configurado: <strong>{marginTarget}%</strong> · Câmbio: <strong>R$ {usdToBrl.toFixed(2)}/USD</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Quando um LLM é usado por <strong>múltiplas features</strong>, cada coluna mostra a <strong>média simples</strong> da margem entre elas.
              Para ver feature-a-feature, use a aba <strong>Tabela de Preços</strong>.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Modelo</TableHead>
                  <TableHead className="text-xs">Features</TableHead>
                  {plans.map(p => (
                    <TableHead key={p.name} className="text-right min-w-[110px]">
                      <div className="flex flex-col items-end">
                        <span>{p.name}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">R$ {p.creditValueBrl.toFixed(3)}/cr</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={plans.length + 3} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum modelo LLM mapeado a feature ativa.
                    </TableCell>
                  </TableRow>
                )}
                {groups.map(g => (
                  <TableRow key={g.model.model}>
                    <TableCell>
                      <div className="font-mono text-xs">{g.model.model}</div>
                      <div className="text-[10px] text-muted-foreground">{g.model.category}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{g.features.length}</Badge>
                      <div className="text-[10px] text-muted-foreground mt-1 max-w-[180px] truncate" title={g.features.map(f => f.feature_key).join(", ")}>
                        {g.features.map(f => f.feature_key).join(", ")}
                      </div>
                    </TableCell>
                    {g.cells.map(c => (
                      <TableCell key={c.planName} className="text-right">
                        <MarginCell cell={c} target={marginTarget} />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {g.avgMarginPct !== null ? (
                        <Badge variant={marginBadgeVariant(g.avgMarginPct, marginTarget)} className="tabular-nums">
                          {g.avgMarginPct >= 0 ? "+" : ""}{g.avgMarginPct.toFixed(0)}%
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {unused.length > 0 && (
            <details className="rounded-lg border bg-muted/30 p-3">
              <summary className="text-xs font-medium cursor-pointer text-muted-foreground">
                {unused.length} modelo(s) disponíveis sem feature mapeada
              </summary>
              <div className="mt-2 flex flex-wrap gap-1">
                {unused.map(m => (
                  <Badge key={m.model} variant="outline" className="text-[10px] font-mono">{m.model}</Badge>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
