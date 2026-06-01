import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreditCosts,
  useUpsertCreditCost,
  useDeleteCreditCost,
  usePlatformCreditConfig,
  CreditCost,
} from "@/hooks/usePricingAdmin";
import { Plus, Save, Trash2, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const UNITS = ["per_use", "per_minute", "candidato", "shortlist", "relatório"];

function Row({ cost, creditValueBRL }: { cost: CreditCost; creditValueBRL: number }) {
  const [local, setLocal] = useState(cost);
  const upsert = useUpsertCreditCost();
  const del = useDeleteCreditCost();
  const dirty = JSON.stringify(local) !== JSON.stringify(cost);

  const equivBRL = (local.credits_per_use || 0) * creditValueBRL;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{local.feature_key}</TableCell>
      <TableCell>
        <Input
          value={local.description || ""}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          className="h-8"
        />
      </TableCell>
      <TableCell className="w-24">
        <Input
          type="number"
          value={local.credits_per_use}
          onChange={(e) => setLocal({ ...local, credits_per_use: Number(e.target.value) })}
          className="h-8"
        />
      </TableCell>
      <TableCell className="w-36">
        <Select value={local.usage_unit} onValueChange={(v) => setLocal({ ...local, usage_unit: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">R$ {equivBRL.toFixed(2)}</TableCell>
      <TableCell>
        <Switch checked={!!local.is_active} onCheckedChange={(v) => setLocal({ ...local, is_active: v })} />
      </TableCell>
      <TableCell className="flex gap-1">
        <Button size="sm" variant={dirty ? "default" : "ghost"} disabled={!dirty || upsert.isPending}
          onClick={() => upsert.mutate(local)}>
          <Save className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost"><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover feature {local.feature_key}?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => del.mutate(cost.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function FeatureCostsTab() {
  const { data: costs, isLoading } = useCreditCosts();
  const { data: config } = usePlatformCreditConfig();
  const upsert = useUpsertCreditCost();
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ feature_key: "", description: "", credits_per_use: 1, usage_unit: "per_use" });

  const creditValueBRL = Number(config?.credit_value_brl || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> Custo por Feature</CardTitle>
        <CardDescription>
          Catálogo de features que consomem créditos. Para IAs (entrevistas, copilot, pesquisa, avaliações, etc.) o
          débito <strong>real</strong> é calculado dinamicamente por tokens/duração via <code className="text-xs">consumeAICredits</code> usando as
          tarifas da aba <strong>Modelos LLM</strong>. Os valores aqui são <strong>médias informativas</strong> para
          comunicação ao cliente e benchmarking interno. O valor em R$ usa o preço por crédito da aba "Conversão".
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-64" /> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>R$ equiv.</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs?.map((c) => <Row key={c.id} cost={c} creditValueBRL={creditValueBRL} />)}
                {adding && (
                  <TableRow>
                    <TableCell>
                      <Input placeholder="feature_key" className="h-8 font-mono text-xs"
                        value={newRow.feature_key}
                        onChange={(e) => setNewRow({ ...newRow, feature_key: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={newRow.description}
                        onChange={(e) => setNewRow({ ...newRow, description: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8" value={newRow.credits_per_use}
                        onChange={(e) => setNewRow({ ...newRow, credits_per_use: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Select value={newRow.usage_unit} onValueChange={(v) => setNewRow({ ...newRow, usage_unit: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" disabled={!newRow.feature_key || upsert.isPending}
                        onClick={() => {
                          upsert.mutate({ ...newRow, is_active: true, credit_type: "universal" } as any, {
                            onSuccess: () => {
                              setAdding(false);
                              setNewRow({ feature_key: "", description: "", credits_per_use: 1, usage_unit: "per_use" });
                            },
                          });
                        }}><Save className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {!adding && (
              <div className="mt-4">
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nova feature
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
