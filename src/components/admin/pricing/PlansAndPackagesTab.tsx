import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Save, Building2, Package as PackageIcon, Plus, RefreshCw } from "lucide-react";
import {
  usePlatformCreditConfig, useUpdateCreditConfig,
  useCreditPackages, useUpsertCreditPackage, useDeleteCreditPackage, CreditPackage,
} from "@/hooks/usePricingAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRO_NAMES = ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5", "Pro 6"];

export function PlansAndPackagesTab() {
  const { data: config, isLoading: l1 } = usePlatformCreditConfig();
  const { data: pkgs, isLoading: l2 } = useCreditPackages();
  const updateConfig = useUpdateCreditConfig();
  const upsertPkg = useUpsertCreditPackage();
  const delPkg = useDeleteCreditPackage();

  // Local edição do header
  const [usd, setUsd] = useState<number | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [floor, setFloor] = useState<number | null>(null);

  const currentUsd = usd ?? Number(config?.usd_to_brl ?? 0);
  const currentMargin = margin ?? Number(config?.margin_percent ?? 0);
  const currentFloor = floor ?? Number(config?.credit_value_brl ?? 0);

  const proPkgs = useMemo(
    () => (pkgs ?? []).filter(p => p.billing_interval === "monthly" && PRO_NAMES.includes(p.name)),
    [pkgs],
  );
  const otherPkgs = useMemo(
    () => (pkgs ?? []).filter(p => !(p.billing_interval === "monthly" && PRO_NAMES.includes(p.name))),
    [pkgs],
  );

  if (l1 || l2) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      {/* Header global editável */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração global</CardTitle>
          <CardDescription>
            Câmbio, margem e piso de crédito usados em <strong>todos os cálculos</strong> de cobrança da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label>USD → BRL</Label>
            <Input type="number" step="0.01" value={currentUsd}
              onChange={e => setUsd(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Margem-alvo (%)</Label>
            <Input type="number" step="1" value={currentMargin}
              onChange={e => setMargin(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Piso R$/crédito (fallback)</Label>
            <Input type="number" step="0.01" value={currentFloor}
              onChange={e => setFloor(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Usado quando conta não tem plano ativo.</p>
          </div>
          <Button
            onClick={() => config && updateConfig.mutate({
              id: config.id,
              usd_to_brl: currentUsd,
              margin_percent: currentMargin,
              credit_value_brl: currentFloor,
            })}
            disabled={updateConfig.isPending}>
            <Save className="h-4 w-4 mr-2" />Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Planos Pro 1-6 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Planos Pro 1–6</CardTitle>
            <CardDescription>
              Editar <strong>R$/crédito</strong> aqui afeta o débito real de cobranças plan-aware (ex: entrevistas de voz).
              Metadata do Stripe (price + product) é sincronizada automaticamente ao salvar.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const t = toast.loading("Sincronizando metadata no Stripe...");
              const { data, error } = await supabase.functions.invoke("sync-stripe-metadata", { body: {} });
              toast.dismiss(t);
              if (error) toast.error(`Erro: ${error.message}`);
              else toast.success(`Sincronizado: ${(data?.results ?? []).length} pacote(s)`);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-2" />Sincronizar Stripe
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>R$/mês</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>R$/crédito</TableHead>
                <TableHead>Margem efetiva</TableHead>
                <TableHead>Stripe ID</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proPkgs.map(p => <ProRow key={p.id} pkg={p} floorBrl={currentFloor} />)}
              {proPkgs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center py-6">Sem planos Pro cadastrados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Outros pacotes (avulsos + legados) */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-base"><PackageIcon className="h-4 w-4" />Outros pacotes ({otherPkgs.length})</CardTitle>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>R$/cred</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherPkgs.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.billing_interval}</Badge></TableCell>
                      <TableCell>{p.credits.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>R$ {(p.price_cents / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">R$ {(p.price_cents / 100 / p.credits).toFixed(3)}</TableCell>
                      <TableCell>{p.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function ProRow({ pkg, floorBrl }: { pkg: CreditPackage; floorBrl: number }) {
  const upsert = useUpsertCreditPackage();
  const [local, setLocal] = useState(pkg);
  const dirty = JSON.stringify(local) !== JSON.stringify(pkg);

  const brlPerCredit = local.price_per_credit_cents
    ? local.price_per_credit_cents / 100
    : (local.price_cents / 100) / Math.max(local.credits, 1);
  const marginPct = floorBrl > 0 ? ((brlPerCredit / floorBrl) - 1) * 100 : 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{local.name}</TableCell>
      <TableCell>
        <Input type="number" step="0.01" className="h-8 w-24"
          value={local.price_cents / 100}
          onChange={e => setLocal({ ...local, price_cents: Math.round(Number(e.target.value) * 100) })} />
      </TableCell>
      <TableCell>
        <Input type="number" className="h-8 w-20"
          value={local.credits}
          onChange={e => setLocal({ ...local, credits: Number(e.target.value) })} />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" className="h-8 w-24"
          value={local.price_per_credit_cents ? local.price_per_credit_cents / 100 : 0}
          onChange={e => setLocal({ ...local, price_per_credit_cents: Math.round(Number(e.target.value) * 100) })} />
      </TableCell>
      <TableCell>
        <Badge variant={marginPct > 200 ? "default" : marginPct > 100 ? "secondary" : "destructive"}>
          {marginPct.toFixed(0)}%
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{local.stripe_price_id || "—"}</TableCell>
      <TableCell>
        <Button size="sm" disabled={!dirty || upsert.isPending}
          variant={dirty ? "default" : "ghost"}
          onClick={() => upsert.mutate(local)}>
          <Save className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
