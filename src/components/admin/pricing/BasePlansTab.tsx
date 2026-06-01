import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionPlans, useUpsertSubscriptionPlan, SubscriptionPlan } from "@/hooks/usePricingAdmin";
import { Building2, Save, Plus } from "lucide-react";

function PlanRow({ plan }: { plan: SubscriptionPlan }) {
  const upsert = useUpsertSubscriptionPlan();
  const [form, setForm] = useState(plan);
  const [creditsJson, setCreditsJson] = useState(JSON.stringify(plan.included_credits || {}, null, 2));
  useEffect(() => {
    setForm(plan);
    setCreditsJson(JSON.stringify(plan.included_credits || {}, null, 2));
  }, [plan]);

  const save = () => {
    let parsed: any = {};
    try { parsed = JSON.parse(creditsJson || "{}"); } catch { return; }
    upsert.mutate({ ...form, included_credits: parsed });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {form.name}
          {form.is_default && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">default</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Preço (R$)</Label>
            <Input type="number" step="0.01" value={form.price_cents / 100}
              onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })} />
          </div>
          <div className="space-y-1">
            <Label>Seats inclusos</Label>
            <Input type="number" value={form.included_seats}
              onChange={(e) => setForm({ ...form, included_seats: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Trial (dias)</Label>
            <Input type="number" value={form.trial_days || 0}
              onChange={(e) => setForm({ ...form, trial_days: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Descrição</Label>
          <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Créditos inclusos (JSON)</Label>
          <Textarea rows={4} value={creditsJson} onChange={(e) => setCreditsJson(e.target.value)}
            className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Ex.: {"{ \"universal\": 100 }"}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            <Label>Padrão</Label>
          </div>
          <Button size="sm" className="ml-auto" onClick={save} disabled={upsert.isPending}>
            <Save className="h-3 w-3 mr-1" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function BasePlansTab() {
  const { data, isLoading } = useSubscriptionPlans();
  const upsert = useUpsertSubscriptionPlan();

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Planos Base</CardTitle>
          <CardDescription>Planos SaaS de assinatura — definem preço, seats inclusos e créditos iniciais.</CardDescription>
        </CardHeader>
      </Card>
      {data?.map((p) => <PlanRow key={p.id} plan={p} />)}
      <Button variant="outline" size="sm"
        onClick={() => upsert.mutate({
          name: "Novo plano", price_cents: 0, included_seats: 1, included_credits: {}, trial_days: 15,
          is_active: false, is_default: false, sort_order: (data?.length || 0) + 1,
        })}>
        <Plus className="h-3 w-3 mr-1" /> Novo plano
      </Button>
    </div>
  );
}
