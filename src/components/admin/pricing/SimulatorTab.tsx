import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCreditCosts, useCreditPackages, usePlatformCreditConfig } from "@/hooks/usePricingAdmin";
import { Sparkles } from "lucide-react";

export function SimulatorTab() {
  const { data: costs, isLoading: l1 } = useCreditCosts();
  const { data: packages, isLoading: l2 } = useCreditPackages();
  const { data: config } = usePlatformCreditConfig();

  const [usage, setUsage] = useState<Record<string, number>>({});

  const creditValueBRL = Number(config?.credit_value_brl || 0);

  const totals = useMemo(() => {
    const totalCredits = (costs || []).reduce((acc, c) => acc + (usage[c.id] || 0) * c.credits_per_use, 0);
    const totalBRL = totalCredits * creditValueBRL;
    return { totalCredits, totalBRL };
  }, [usage, costs, creditValueBRL]);

  const recommendations = useMemo(() => {
    if (!packages) return [];
    return packages
      .filter((p) => p.is_active)
      .map((p) => ({
        pkg: p,
        coverage: p.credits / Math.max(1, totals.totalCredits),
        pricePerCredit: p.price_cents / 100 / p.credits,
      }))
      .sort((a, b) => Math.abs(1 - a.coverage) - Math.abs(1 - b.coverage))
      .slice(0, 4);
  }, [packages, totals.totalCredits]);

  if (l1 || l2) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Simulador de Consumo</CardTitle>
          <CardDescription>
            Estime quantos créditos uma conta consumiria por mês e qual pacote faz mais sentido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {costs?.filter(c => c.is_active).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.description || c.feature_key}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.credits_per_use} cred / {c.usage_unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">qtd/mês</Label>
                  <Input type="number" className="h-8 w-24" min={0}
                    value={usage[c.id] || 0}
                    onChange={(e) => setUsage({ ...usage, [c.id]: Number(e.target.value) })} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Créditos / mês" value={totals.totalCredits.toLocaleString("pt-BR")} />
          <Metric label="R$ / mês" value={`R$ ${totals.totalBRL.toFixed(2)}`} />
          <Metric label="R$ / crédito base" value={`R$ ${creditValueBRL.toFixed(2)}`} />
          <Metric label="R$ / ano" value={`R$ ${(totals.totalBRL * 12).toFixed(2)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pacotes recomendados</CardTitle>
          <CardDescription>Comparativo dos pacotes ativos contra o consumo simulado.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.map(({ pkg, coverage, pricePerCredit }) => (
            <div key={pkg.id} className="border rounded-md p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">{pkg.name}</p>
                <Badge variant="outline">{pkg.billing_interval}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {pkg.credits} créditos · R$ {(pkg.price_cents / 100).toFixed(2)}
              </p>
              <p className="text-xs">
                R$/crédito: <strong>R$ {pricePerCredit.toFixed(3)}</strong> · Cobre{" "}
                <strong>{(coverage * 100).toFixed(0)}%</strong> do consumo
              </p>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pacote ativo para comparar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
