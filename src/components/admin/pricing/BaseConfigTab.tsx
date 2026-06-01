import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformCreditConfig, useUpdateCreditConfig } from "@/hooks/usePricingAdmin";
import { Calculator, Save } from "lucide-react";

export function BaseConfigTab() {
  const { data, isLoading } = usePlatformCreditConfig();
  const update = useUpdateCreditConfig();

  const [usd, setUsd] = useState(0);
  const [margin, setMargin] = useState(0);
  const [creditValue, setCreditValue] = useState(0);

  useEffect(() => {
    if (data) {
      setUsd(Number(data.usd_to_brl));
      setMargin(Number(data.margin_percent));
      setCreditValue(Number(data.credit_value_brl));
    }
  }, [data]);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <p className="text-muted-foreground">Sem configuração base.</p>;

  const suggested = (usd * (1 + margin / 100)) / 4; // ex: 1 token ≈ ¼ USD base, ajuste conforme regra
  const fmt = (n: number) => `R$ ${n.toFixed(2)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Conversão Base
        </CardTitle>
        <CardDescription>
          Define o câmbio, a margem e o valor financeiro de 1 crédito. Usado em todos os relatórios e cálculos de ROI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>USD → BRL</Label>
            <Input type="number" step="0.01" value={usd} onChange={(e) => setUsd(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Cotação usada para converter custos em USD.</p>
          </div>
          <div className="space-y-2">
            <Label>Margem (%)</Label>
            <Input type="number" step="0.01" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Markup aplicado sobre o custo bruto.</p>
          </div>
          <div className="space-y-2">
            <Label>Valor R$ por crédito</Label>
            <Input type="number" step="0.01" value={creditValue} onChange={(e) => setCreditValue(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Preço final cobrado por crédito unitário.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-medium">Resumo</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">USD:</span> {fmt(usd)}</div>
            <div><span className="text-muted-foreground">Margem:</span> {margin}%</div>
            <div><span className="text-muted-foreground">Crédito:</span> {fmt(creditValue)}</div>
            <div><span className="text-muted-foreground">Sugestão (¼ USD c/ margem):</span> {fmt(suggested)}</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Atualizado em {new Date(data.updated_at).toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              update.mutate({ id: data.id, usd_to_brl: usd, margin_percent: margin, credit_value_brl: creditValue })
            }
            disabled={update.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {update.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
