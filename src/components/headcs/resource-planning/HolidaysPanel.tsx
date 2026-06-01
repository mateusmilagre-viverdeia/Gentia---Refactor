import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyHolidays } from "@/hooks/useCompanyHolidays";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function HolidaysPanel() {
  const { holidays, loading, createHoliday, updateHoliday, deleteHoliday, creating, updating, deleting } =
    useCompanyHolidays();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const sorted = useMemo(() => {
    return [...holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [holidays]);

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setName("");
    setNotes("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (h: { id: string; holiday_date: string; name: string; notes: string | null }) => {
    setEditingId(h.id);
    setDate(h.holiday_date);
    setName(h.name);
    setNotes(h.notes ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!date || !name.trim()) return;
    try {
      if (editingId) {
        await updateHoliday({ id: editingId, date, name: name.trim(), notes: notes.trim() || undefined });
        toast.success("Feriado atualizado");
      } else {
        await createHoliday({ date, name: name.trim(), notes: notes.trim() || undefined });
        toast.success("Feriado criado");
      }
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar feriado");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Feriados</CardTitle>
          <CardDescription>
            Feriados cadastrados aqui reduzem automaticamente a capacidade semanal (regra auto: horas/ dia = semanal/5).
          </CardDescription>
        </div>

        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : (setOpen(false), resetForm()))}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar feriado" : "Novo feriado"}</DialogTitle>
              <DialogDescription>Cadastre feriados do calendário para ajuste automático de capacidade.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Confraternização Universal" />
              </div>
              <div className="grid gap-2">
                <Label>Notas (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (setOpen(false), resetForm())}>
                  Cancelar
                </Button>
                <Button disabled={!date || !name.trim() || creating || updating} onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.holiday_date}</TableCell>
                  <TableCell>{h.name}</TableCell>
                  <TableCell className="max-w-[360px] truncate" title={h.notes ?? ""}>
                    {h.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleting}
                        onClick={async () => {
                          try {
                            await deleteHoliday(h.id);
                            toast.success("Feriado removido");
                          } catch (e: any) {
                            toast.error(e?.message || "Erro ao remover feriado");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
