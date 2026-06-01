import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Zap, AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import {
  useCreditCosts, useUpsertCreditCost, usePlatformCreditConfig, useCreditPackages, CreditCost,
} from "@/hooks/usePricingAdmin";
import { useFeatureLLMMapping, useUpsertFeatureLLMMapping } from "@/hooks/useFeatureLLMMapping";
import { SELECTABLE_MODELS, buildSimulatorFeature, simulateFeatureCost } from "@/lib/pricingSimulator";

const PRO_NAMES = ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5", "Pro 6"];

export function PricingTableTab() {
  const { data: costs, isLoading: l1 } = useCreditCosts();
  const { data: mapping, isLoading: l2 } = useFeatureLLMMapping();
  const { data: config } = usePlatformCreditConfig();
  const { data: pkgs } = useCreditPackages();

  const [planName, setPlanName] = useState("Pro 1");
  const proPkgs = useMemo(() => (pkgs ?? []).filter(p => PRO_NAMES.includes(p.name)), [pkgs]);
  const selectedPkg = proPkgs.find(p => p.name === planName);
  const creditValueBrl = selectedPkg?.price_per_credit_cents
    ? selectedPkg.price_per_credit_cents / 100
    : Number(config?.credit_value_brl ?? 1.39);

  const mappingByKey = useMemo(() => {
    const m = new Map<string, any>();
    (mapping ?? []).forEach(x => m.set(x.feature_key, x));
    return m;
  }, [mapping]);

  const audit = useMemo(() => {
    const active = (costs ?? []).filter(c => c.is_active);
    let mapped = 0, operational = 0, missing: string[] = [];
    for (const c of active) {
      const m = mappingByKey.get(c.feature_key);
      if (!m) missing.push(c.feature_key);
      else if (m.model_id === "no_llm") operational++;
      else mapped++;
    }
    return { total: active.length, mapped, operational, missing };
  }, [costs, mappingByKey]);

  if (l1 || l2) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" />Tabela de preços por feature</CardTitle>
          <CardDescription>
            Cada feature tem um <strong>preço-de-tabela em créditos</strong> (plan-agnóstico). O que o cliente paga em R$ depende do plano selecionado abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.missing.length > 0 ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{audit.missing.length} feature(s) sem mapeamento:</strong> {audit.missing.join(", ")}.
                Defina o modelo LLM ou marque como "Sem LLM — operacional".
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-4 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>{audit.mapped} feature(s) de IA mapeadas</strong> · {audit.operational} operacional(is) sem LLM · {audit.total} total.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">Simular com plano:</label>
            <Select value={planName} onValueChange={setPlanName}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRO_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              R$/crédito: <strong>R$ {creditValueBrl.toFixed(3)}</strong>
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Modelo LLM</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">cr/uso</TableHead>
                <TableHead className="text-right">Cliente paga</TableHead>
                <TableHead className="text-right">Custo LLM real</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(costs ?? []).map(c => (
                <FeatureRow
                  key={c.id}
                  cost={c}
                  mapping={mappingByKey.get(c.feature_key)}
                  creditValueBrl={creditValueBrl}
                  planName={planName}
                  usdToBrl={Number(config?.usd_to_brl ?? 5.10)}
                  marginPercent={Number(config?.margin_percent ?? 220)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureRow({
  cost, mapping, creditValueBrl, planName, usdToBrl, marginPercent,
}: {
  cost: CreditCost;
  mapping: any;
  creditValueBrl: number;
  planName: string;
  usdToBrl: number;
  marginPercent: number;
}) {
  const upsertCost = useUpsertCreditCost();
  const upsertMap = useUpsertFeatureLLMMapping();
  const [local, setLocal] = useState(cost);
  const dirty = local.credits_per_use !== cost.credits_per_use || local.is_active !== cost.is_active;
  const modelId = mapping?.model_id ?? "";

  // simulação 1 unidade
  const sim = simulateFeatureCost({
    plan: { id: "pro", name: planName, creditValueBrl },
    feature: buildSimulatorFeature({
      feature_key: cost.feature_key,
      description: cost.description,
      credits_per_use: local.credits_per_use,
      usage_unit: cost.usage_unit,
      mapping: mapping ? { model_id: mapping.model_id, avg_tokens_input: mapping.avg_tokens_input, avg_tokens_output: mapping.avg_tokens_output } : null,
    }),
    quantity: 1,
    usdToBrl,
    marginPercent,
  });

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{cost.description || cost.feature_key}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{cost.feature_key}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {modelId === "no_llm" && (
            <Badge variant="outline" className="text-[10px] gap-1"><Minus className="h-3 w-3" />Sem LLM</Badge>
          )}
          {!modelId && (
            <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />Sem mapeamento</Badge>
          )}
          <Select
            value={modelId || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") return;
              if (!confirm(`Trocar modelo de "${cost.feature_key}" para ${v}? Vai afetar todas as cobranças futuras desta feature.`)) return;
              upsertMap.mutate({
                feature_key: cost.feature_key,
                model_id: v,
                avg_tokens_input: mapping?.avg_tokens_input ?? null,
                avg_tokens_output: mapping?.avg_tokens_output ?? null,
                notes: mapping?.notes ?? null,
              });
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Sem mapeamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>— escolher —</SelectItem>
              <SelectItem value="no_llm" className="text-xs italic">Sem LLM — operacional</SelectItem>
              {SELECTABLE_MODELS.map(m => (
                <SelectItem key={m.model} value={m.model} className="text-xs">{m.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell><Badge variant="outline" className="text-xs">{cost.usage_unit}</Badge></TableCell>
      <TableCell className="text-right">
        <Input type="number" step="0.05" className="h-8 w-20 text-right"
          value={local.credits_per_use}
          onChange={e => setLocal({ ...local, credits_per_use: Number(e.target.value) })} />
      </TableCell>
      <TableCell className="text-right tabular-nums">R$ {sim.brlCharged.toFixed(2)}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {modelId === "no_llm" ? <span className="text-xs">N/A</span> : sim.realCostBrl > 0 ? `R$ ${sim.realCostBrl.toFixed(3)}` : "—"}
      </TableCell>
      <TableCell className="text-right">
        {modelId === "no_llm" ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : sim.marginPct !== null ? (
          <Badge variant={sim.marginPct > 200 ? "default" : sim.marginPct > 100 ? "secondary" : "destructive"}>
            {sim.marginPct.toFixed(0)}%
          </Badge>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={!!local.is_active} onCheckedChange={v => setLocal({ ...local, is_active: v })} />
          {dirty && (
            <Button size="sm" variant="default" disabled={upsertCost.isPending}
              onClick={() => upsertCost.mutate(local)}>
              <Save className="h-3 w-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
