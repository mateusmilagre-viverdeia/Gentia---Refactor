import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useConsultantAvailabilityBlocks } from "@/hooks/useConsultantAvailabilityBlocks";
import { useAuth } from "@/contexts/AuthContext";
import type { AvailabilityBlockType } from "@/types/resource-planning.types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABEL: Record<AvailabilityBlockType, string> = {
  vacation: "Férias",
  holiday: "Feriado",
  training: "Treinamento",
  sick: "Afastamento",
  offsite: "Offsite",
  other: "Outro",
};

export function AvailabilityBlocksPanel(props: { consultants: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const { blocks, loading, createBlock, creating, deleteBlock, deleting, updateBlock, updating } =
    useConsultantAvailabilityBlocks();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [consultantId, setConsultantId] = useState<string>(props.consultants[0]?.id ?? "");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [blockType, setBlockType] = useState<AvailabilityBlockType>("vacation");
  const [hoursPerDay, setHoursPerDay] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const resetForm = () => {
    setEditingId(null);
    setStartDate("");
    setEndDate("");
    setBlockType("vacation");
    setHoursPerDay("");
    setNotes("");
  };

  const openCreate = () => {
    resetForm();
    setConsultantId(props.consultants[0]?.id ?? "");
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setConsultantId(b.consultant_id);
    setStartDate(b.start_date);
    setEndDate(b.end_date);
    setBlockType(b.block_type);
    setHoursPerDay(b.hours_per_day === null ? "" : String(b.hours_per_day));
    setNotes(b.notes ?? "");
    setOpen(true);
  };

  const consultantNameById = useMemo(() => {
    const m = new Map<string, string>();
    props.consultants.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [props.consultants]);

  const sorted = useMemo(() => {
    return [...blocks].sort((a, b) => {
      if (a.start_date === b.start_date) return a.end_date.localeCompare(b.end_date);
      return b.start_date.localeCompare(a.start_date);
    });
  }, [blocks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Disponibilidade</CardTitle>
          <CardDescription>Bloqueios (férias, feriados, treinamentos) que reduzem a capacidade semanal.</CardDescription>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) resetForm();
            setOpen(v);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Bloquear
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar bloqueio" : "Novo bloqueio"}</DialogTitle>
              <DialogDescription>Defina um período de indisponibilidade para um consultor.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label>Consultor</Label>
                <Select value={consultantId} onValueChange={setConsultantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.consultants.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={blockType} onValueChange={(v) => setBlockType(v as AvailabilityBlockType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABEL) as AvailabilityBlockType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Horas por dia (opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="(auto)"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, usamos uma aproximação baseada na capacidade semanal do consultor.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Notas (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!consultantId || !startDate || !endDate || endDate < startDate || creating || updating}
                  onClick={async () => {
                    try {
                      if (editingId) {
                        await updateBlock({
                          id: editingId,
                          consultantId,
                          startDate,
                          endDate,
                          blockType,
                          hoursPerDay: hoursPerDay === "" ? null : Number(hoursPerDay),
                          notes: notes.trim() || undefined,
                          updatedBy: user?.id,
                        });
                        toast.success("Bloqueio atualizado");
                      } else {
                        await createBlock({
                          consultantId,
                          startDate,
                          endDate,
                          blockType,
                          hoursPerDay: hoursPerDay === "" ? null : Number(hoursPerDay),
                          notes: notes.trim() || undefined,
                          createdBy: user?.id,
                        });
                        toast.success("Bloqueio criado");
                      }
                      setOpen(false);
                    } catch (e: any) {
                      toast.error(e?.message || "Erro ao criar bloqueio");
                    }
                  }}
                >
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
          <div className="text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Horas/dia</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{consultantNameById.get(b.consultant_id) || b.consultant_id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABEL[b.block_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.start_date} → {b.end_date}
                  </TableCell>
                  <TableCell className="text-right">{b.hours_per_day ?? "(auto)"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleting}
                        onClick={async () => {
                          try {
                            await deleteBlock(b.id);
                            toast.success("Bloqueio removido");
                          } catch (e: any) {
                            toast.error(e?.message || "Erro ao remover bloqueio");
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
