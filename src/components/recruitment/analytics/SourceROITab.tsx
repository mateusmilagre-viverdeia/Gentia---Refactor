import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAccount } from "@/hooks/useAccount";
import { useSourceROI } from "@/hooks/useSourceROI";
import { useRecruitmentSourceSpend } from "@/hooks/useRecruitmentSourceSpend";
import { Plus, Trash2 } from "lucide-react";

function currentYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function SourceROITab() {
  const { canManageRH } = useAccount();
  const [ym, setYm] = useState(() => currentYM());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { spendQuery, roiQuery } = useSourceROI({ year: ym.year, month: ym.month });
  const spend = useRecruitmentSourceSpend({ year: ym.year, month: ym.month });

  const roiRows = roiQuery.data ?? [];
  const totals = useMemo(() => {
    const totalSpend = roiRows.reduce((s, r) => s + r.spend, 0);
    const totalFilled = roiRows.reduce((s, r) => s + r.jobsFilled, 0);
    const overallCpa = totalFilled > 0 ? totalSpend / totalFilled : null;
    return { totalSpend, totalFilled, overallCpa };
  }, [roiRows]);

  const openCreate = () => {
    setEditingId(null);
    setSource("");
    setAmount("");
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (row: { id: string; source: string; amount: number; notes: string | null }) => {
    setEditingId(row.id);
    setSource(row.source);
    setAmount(String(row.amount));
    setNotes(row.notes ?? "");
    setDialogOpen(true);
  };

  const save = async () => {
    const parsed = Number(amount);
    if (!source.trim()) {
      toast.error("Informe a fonte");
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await spend.upsert.mutateAsync({
        id: editingId ?? undefined,
        source: source.trim(),
        amount: parsed,
        notes: notes.trim() ? notes.trim() : null,
      });
      toast.success("Orçamento salvo");
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar orçamento");
    }
  };

  const remove = async (id: string) => {
    try {
      await spend.remove.mutateAsync(id);
      toast.success("Item removido");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>ROI de Fontes</CardTitle>
            <p className="text-sm text-muted-foreground">
              CPA por vaga preenchida (1 contratação por vaga), atribuindo a fonte do primeiro contratado no mês.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="w-[120px]"
              type="number"
              min={1}
              max={12}
              value={ym.month}
              onChange={(e) => setYm((p) => ({ ...p, month: Number(e.target.value) }))}
              aria-label="Mês"
            />
            <Input
              className="w-[140px]"
              type="number"
              min={2000}
              max={2100}
              value={ym.year}
              onChange={(e) => setYm((p) => ({ ...p, year: Number(e.target.value) }))}
              aria-label="Ano"
            />
            {canManageRH && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Gasto total</div>
              <div className="text-xl font-semibold">{formatCurrency(totals.totalSpend)}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Vagas preenchidas</div>
              <div className="text-xl font-semibold">{totals.totalFilled}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">CPA geral</div>
              <div className="text-xl font-semibold">
                {totals.overallCpa == null ? "—" : formatCurrency(totals.overallCpa)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Vagas preenchidas</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  {canManageRH && <TableHead className="w-[160px] text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roiQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canManageRH ? 5 : 4} className="text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : roiRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageRH ? 5 : 4} className="text-muted-foreground">
                      Sem dados para o período.
                    </TableCell>
                  </TableRow>
                ) : (
                  roiRows.map((r) => (
                    <TableRow key={r.source}>
                      <TableCell className="font-medium">{r.source}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                      <TableCell className="text-right">{r.jobsFilled}</TableCell>
                      <TableCell className="text-right">{r.cpa == null ? "—" : formatCurrency(r.cpa)}</TableCell>
                      {canManageRH && (
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const raw = (spendQuery.data ?? []).find((s) => s.source === r.source);
                                if (raw) openEdit({ id: raw.id, source: raw.source, amount: raw.amount, notes: raw.notes });
                                else {
                                  setEditingId(null);
                                  setSource(r.source);
                                  setAmount(String(r.spend));
                                  setNotes("");
                                  setDialogOpen(true);
                                }
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const raw = (spendQuery.data ?? []).find((s) => s.source === r.source);
                                if (raw) void remove(raw.id);
                              }}
                              disabled={spend.remove.isPending}
                              aria-label="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar orçamento" : "Adicionar orçamento"}</DialogTitle>
            <DialogDescription>
              Defina o gasto mensal por fonte para calcular CPA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Fonte</div>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex.: LinkedIn" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Valor</div>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Notas (opcional)</div>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: campanha" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={spend.upsert.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
