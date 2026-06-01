import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useResourceSnapshots } from "@/hooks/useResourceSnapshots";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

type SnapshotTotals = {
  totalWeeklyCapacity?: number;
  totalDemandWeek0?: number;
  overloaded?: number;
  underutilized?: number;
};

function safeTotals(snapshot: any): SnapshotTotals {
  if (!snapshot || typeof snapshot !== "object") return {};
  return (snapshot.totals || {}) as SnapshotTotals;
}

export function ResourceSnapshotsPanel(props: {
  currentTotals: { totalWeeklyCapacity: number; totalDemandWeek0: number; overloaded: number; underutilized: number };
}) {
  const { snapshots, loading, deleteSnapshot, deleting } = useResourceSnapshots({ limit: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => snapshots.find((s) => s.id === selectedId) ?? null, [snapshots, selectedId]);

  const diff = useMemo(() => {
    if (!selected) return null;
    const t = safeTotals(selected.snapshot);
    const c = props.currentTotals;
    return {
      capacity: (t.totalWeeklyCapacity ?? 0) - c.totalWeeklyCapacity,
      demand: (t.totalDemandWeek0 ?? 0) - c.totalDemandWeek0,
      overloaded: (t.overloaded ?? 0) - c.overloaded,
      underutilized: (t.underutilized ?? 0) - c.underutilized,
    };
  }, [selected, props.currentTotals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versões (snapshots)</CardTitle>
        <CardDescription>Histórico de planejamentos salvos (somente leitura + comparação simples).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedId ?? ""} onValueChange={(v) => setSelectedId(v)}>
            <SelectTrigger className="w-[360px]">
              <SelectValue placeholder={loading ? "Carregando…" : "Selecione uma versão"} />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {formatBRT(new Date(s.created_at), "dd/MM HH:mm")} — {s.label || "(sem rótulo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected && (
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={async () => {
                try {
                  await deleteSnapshot(selected.id);
                  setSelectedId(null);
                  toast.success("Versão removida");
                } catch (e: any) {
                  toast.error(e?.message || "Erro ao remover versão");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>

        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Semana: {selected.week_start}</Badge>
              <Badge variant="outline">Horizonte: {selected.horizon_weeks}</Badge>
              {selected.label ? <Badge variant="secondary">{selected.label}</Badge> : null}
            </div>

            {diff ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead className="text-right">Snapshot - Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Capacidade semanal</TableCell>
                    <TableCell className="text-right">{diff.capacity.toFixed(1)}h</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Demanda (semana base)</TableCell>
                    <TableCell className="text-right">{diff.demand.toFixed(1)}h</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overloaded</TableCell>
                    <TableCell className="text-right">{diff.overloaded}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ociosos</TableCell>
                    <TableCell className="text-right">{diff.underutilized}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Selecione uma versão para ver detalhes e comparar.</div>
        )}
      </CardContent>
    </Card>
  );
}
