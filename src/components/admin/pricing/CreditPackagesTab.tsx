import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useCreditPackages, useUpsertCreditPackage, useDeleteCreditPackage, CreditPackage,
  usePlatformCreditConfig,
} from "@/hooks/usePricingAdmin";
import { Package, Plus, Pencil, Trash2, Copy, Check, X } from "lucide-react";
import { estimateMinutesPerCredits } from "@/lib/pricingCalculator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const empty: Partial<CreditPackage> = {
  name: "",
  credit_type: "universal",
  credits: 100,
  price_cents: 9900,
  bonus_percent: 0,
  is_active: true,
  is_popular: false,
  display_order: 0,
  billing_interval: "one_time",
  price_per_credit_cents: 0,
};

function PackageForm({ pkg, onClose }: { pkg: Partial<CreditPackage>; onClose: () => void }) {
  const [form, setForm] = useState<Partial<CreditPackage>>(pkg);
  const upsert = useUpsertCreditPackage();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Nome</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Descrição</Label>
          <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Créditos</Label>
          <Input type="number" value={form.credits || 0} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Preço (R$)</Label>
          <Input type="number" step="0.01" value={(form.price_cents || 0) / 100}
            onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })} />
        </div>
        <div className="space-y-1">
          <Label>Bônus (%)</Label>
          <Input type="number" value={form.bonus_percent || 0}
            onChange={(e) => setForm({ ...form, bonus_percent: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Ordem</Label>
          <Input type="number" value={form.display_order || 0}
            onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Intervalo</Label>
          <Select value={form.billing_interval || "one_time"} onValueChange={(v) => setForm({ ...form, billing_interval: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">Avulso (one-time)</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Stripe price ID</Label>
          <Input value={form.stripe_price_id || ""} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          <Label>Ativo</Label>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Switch checked={!!form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
          <Label>Popular</Label>
        </div>
      </div>
      {!!form.credits && !!form.price_cents && (
        <p className="text-sm text-muted-foreground">
          Preço/crédito: R$ {(form.price_cents / 100 / form.credits).toFixed(3)}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => upsert.mutate(form, { onSuccess: onClose })} disabled={upsert.isPending}>
          Salvar
        </Button>
      </DialogFooter>
    </div>
  );
}

export function CreditPackagesTab() {
  const { data, isLoading } = useCreditPackages();
  const { data: config } = usePlatformCreditConfig();
  const del = useDeleteCreditPackage();
  const [editing, setEditing] = useState<Partial<CreditPackage> | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" /> Pacotes de Crédito</CardTitle>
          <CardDescription>Pacotes oferecidos no checkout (avulsos e assinaturas mensais).</CardDescription>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing({ ...empty })}>
              <Plus className="h-3 w-3 mr-1" /> Novo pacote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar pacote" : "Novo pacote"}</DialogTitle>
              <DialogDescription>Configure preço, créditos e disponibilidade.</DialogDescription>
            </DialogHeader>
            {editing && <PackageForm pkg={editing} onClose={() => setEditing(null)} />}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-96" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>R$/cred</TableHead>
                <TableHead>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">Min. IA voz</TooltipTrigger>
                      <TooltipContent>
                        Estimativa de minutos de entrevista por voz (gpt-realtime-mini)
                        <br />que os créditos do pacote compram (~10,6 cr / 30min).
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead>Bônus</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.is_popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.billing_interval === "monthly" ? "default" : "outline"}>
                      {p.billing_interval}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.credits.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>R$ {(p.price_cents / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    R$ {p.credits ? (p.price_cents / 100 / p.credits).toFixed(3) : "0"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(() => {
                      if (!config || !p.credits) return "—";
                      const creditValueBrl = p.price_cents / 100 / p.credits;
                      const minutes = estimateMinutesPerCredits(p.credits, {
                        usdToBrl: Number(config.usd_to_brl),
                        marginPercent: Number(config.margin_percent),
                        creditValueBrl,
                      });
                      return `~${minutes.toLocaleString("pt-BR")} min`;
                    })()}
                  </TableCell>
                  <TableCell>{p.bonus_percent || 0}%</TableCell>
                  <TableCell>
                    {p.stripe_price_id
                      ? <Badge variant="outline" className="text-green-600"><Check className="h-3 w-3 mr-1" />ok</Badge>
                      : <Badge variant="outline" className="text-amber-600"><X className="h-3 w-3 mr-1" />pendente</Badge>}
                  </TableCell>
                  <TableCell>
                    {p.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ ...p, id: undefined, name: `${p.name} (cópia)` })}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover pacote "{p.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Não desfaz cobranças já realizadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(p.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
