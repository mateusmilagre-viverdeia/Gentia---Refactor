import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useResourcePlanning } from "@/hooks/useResourcePlanning";
import type { ResourcePriority } from "@/types/resource-planning.types";
import { Calendar, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ResourceWeeksHeatmap } from "@/components/headcs/resource-planning/ResourceWeeksHeatmap";
import { ResourceRecommendations } from "@/components/headcs/resource-planning/ResourceRecommendations";
import { ResourceSnapshotsPanel } from "@/components/headcs/resource-planning/ResourceSnapshotsPanel";
import { AvailabilityBlocksPanel } from "@/components/headcs/resource-planning/AvailabilityBlocksPanel";
import { HolidaysPanel } from "@/components/headcs/resource-planning/HolidaysPanel";

function statusBadgeVariant(status: "underutilized" | "optimal" | "overloaded") {
  switch (status) {
    case "overloaded":
      return "destructive" as const;
    case "optimal":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function heatBg(utilizationPct: number) {
  if (utilizationPct < 50) return "bg-muted";
  if (utilizationPct <= 80) return "bg-accent";
  return "bg-destructive/15";
}

export function ResourcePlanningDashboard() {
  const [selectedWeekIso, setSelectedWeekIso] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [capacityDraft, setCapacityDraft] = useState<Record<string, { weekly: number; max: number }>>({});
  const [demandDraft, setDemandDraft] = useState<
    Record<string, { manualHours: string; priority: ResourcePriority }>
  >({});

  const planning = useResourcePlanning({ horizonWeeks: 12, selectedWeekIso });

  const activeWeekIso = selectedWeekIso ?? planning.weeks[0]?.iso ?? "";
  const demandRows = planning.demandRowsByWeek.get(activeWeekIso) || [];

  const activeWeekLabel = useMemo(() => {
    const w = planning.weeks.find((x) => x.iso === activeWeekIso);
    return w ? `${w.label} (${w.iso})` : activeWeekIso;
  }, [planning.weeks, activeWeekIso]);

  const totalDemandSelectedWeek = useMemo(() => {
    return demandRows.reduce((s, r) => s + (r.finalHours || 0), 0);
  }, [demandRows]);

  const sortedConsultants = useMemo(() => {
    return [...planning.consultantRows].sort((a, b) => b.utilizationPct - a.utilizationPct);
  }, [planning.consultantRows]);

  const handleSaveSnapshot = async () => {
    try {
      await planning.saveSnapshot(snapshotLabel);
      setSnapshotLabel("");
      toast.success("Versão salva");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar versão");
    }
  };

  const handleUpsertRequirement = async (accountId: string, estimatedHours: number, priority: ResourcePriority) => {
    try {
      await planning.upsertRequirement({
        accountId,
        weekStart: activeWeekIso,
        estimatedHours,
        priority,
      });
      toast.success("Demanda atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar demanda");
    }
  };

  const handleUpsertCapacity = async (consultantId: string) => {
    const draft = capacityDraft[consultantId];
    if (!draft) return;
    try {
      await planning.upsertCapacity({
        consultantId,
        weeklyHours: draft.weekly,
        maxProjects: draft.max,
      });
      toast.success("Capacidade atualizada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar capacidade");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeWeekIso} onValueChange={(v) => setSelectedWeekIso(v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Semana" />
          </SelectTrigger>
          <SelectContent>
            {planning.weeks.map((w) => (
              <SelectItem key={w.iso} value={w.iso}>
                {w.label} (início)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Horizonte: {planning.horizonWeeks} semanas
        </Badge>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="ml-auto" disabled={planning.savingSnapshot}>
              <Save className="mr-2 h-4 w-4" />
              Salvar versão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar versão do planejamento</DialogTitle>
              <DialogDescription>
                Salva um snapshot (12 semanas) para histórico e auditoria.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="snapshotLabel">Rótulo (opcional)</Label>
                <Input
                  id="snapshotLabel"
                  placeholder='Ex.: "Planejamento Q1 - v1"'
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogTrigger>
                <Button onClick={handleSaveSnapshot} disabled={planning.savingSnapshot}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Capacidade (semana)</CardDescription>
            <CardTitle className="text-2xl">{planning.totals.totalWeeklyCapacity}h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">soma de capacidade semanal por consultor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Demanda (semana selecionada)</CardDescription>
            <CardTitle className="text-2xl">{totalDemandSelectedWeek.toFixed(1)}h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">manual (quando existe) + sugestão (histórico)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Consultores Overloaded</CardDescription>
            <CardTitle className="text-2xl">{planning.totals.overloaded}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">&gt; 80% (base: média de horas registradas)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Consultores Ociosos</CardDescription>
            <CardTitle className="text-2xl">{planning.totals.underutilized}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">&lt; 50% (base: média de horas registradas)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heatmap (12 semanas)</CardTitle>
          <CardDescription>
            Visão rápida por consultor (cor baseada na utilização média das últimas 4 semanas). Semana atual: {activeWeekLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceWeeksHeatmap
            consultants={sortedConsultants}
            weeks={planning.weeks}
            getEffectiveCapacity={planning.getEffectiveWeeklyCapacity}
          />
        </CardContent>
      </Card>

      <HolidaysPanel />
      <AvailabilityBlocksPanel consultants={planning.consultants} />

      {/* Consultants heat view */}
      <Card>
        <CardHeader>
          <CardTitle>Capacidade por consultor</CardTitle>
          <CardDescription>
            Status calculado por utilização (média das últimas 4 semanas) vs capacidade configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultor</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Média (4 sem)</TableHead>
                <TableHead>Utilização</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedConsultants.map((c) => (
                <TableRow key={c.consultantId}>
                  <TableCell className="font-medium">{c.consultantName}</TableCell>
                  <TableCell>{c.weeklyCapacityHours}h/sem</TableCell>
                  <TableCell>{c.avgLoggedHoursLast4Weeks}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("h-2 w-24 rounded", heatBg(c.utilizationPct))}
                        title={`${c.utilizationPct}%`}
                      />
                      <Badge variant={statusBadgeVariant(c.status)}>{c.utilizationPct}%</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      onOpenChange={(open) => {
                        if (open) {
                          const cap = planning.getCapacitySetting(c.consultantId);
                          setCapacityDraft((prev) => ({
                            ...prev,
                            [c.consultantId]: {
                              weekly: c.weeklyCapacityHours,
                              max: cap?.max_projects ?? 5,
                            },
                          }));
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings2 className="mr-2 h-4 w-4" />
                          Ajustar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Capacidade — {c.consultantName}</DialogTitle>
                          <DialogDescription>
                            Define a capacidade “teórica” semanal usada no planejamento.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 pt-2">
                          <div className="grid gap-2">
                            <Label>Horas semanais</Label>
                            <Input
                              type="number"
                              min={0}
                              value={capacityDraft[c.consultantId]?.weekly ?? c.weeklyCapacityHours}
                              onChange={(e) =>
                                setCapacityDraft((prev) => ({
                                  ...prev,
                                  [c.consultantId]: {
                                    weekly: Number(e.target.value || 0),
                                    max: prev[c.consultantId]?.max ?? 5,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Máx. projetos</Label>
                            <Input
                              type="number"
                              min={0}
                              value={capacityDraft[c.consultantId]?.max ?? 5}
                              onChange={(e) =>
                                setCapacityDraft((prev) => ({
                                  ...prev,
                                  [c.consultantId]: {
                                    weekly: prev[c.consultantId]?.weekly ?? c.weeklyCapacityHours,
                                    max: Number(e.target.value || 0),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <DialogTrigger asChild>
                              <Button variant="outline">Cancelar</Button>
                            </DialogTrigger>
                            <Button
                              onClick={async () => {
                                await handleUpsertCapacity(c.consultantId);
                              }}
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Demand editor */}
      <Card>
        <CardHeader>
          <CardTitle>Demanda por projeto (semana selecionada)</CardTitle>
          <CardDescription>
            “Final” = Manual (se definido) senão Sugestão (histórico). Prioridade 1=Alta, 2=Média, 3=Baixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {planning.loading ? (
            <div className="text-muted-foreground">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="text-right">Sugestão</TableHead>
                  <TableHead className="text-right">Manual</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="text-right">Prioridade</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandRows.map((row) => {
                  const draft = demandDraft[row.accountId];
                  const manualHoursStr = draft?.manualHours ?? (row.manualHours === null ? "" : String(row.manualHours));
                  const manualHoursNum = manualHoursStr === "" ? null : Number(manualHoursStr);
                  const effectivePriority = draft?.priority ?? row.priority;
                  const displayFinalHours = manualHoursNum ?? row.suggestedHours;

                  return (
                  <TableRow key={row.accountId}>
                    <TableCell className="font-medium">{row.accountName}</TableCell>
                    <TableCell className="text-right">{row.suggestedHours}h</TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="h-8 w-[110px] ml-auto"
                        type="number"
                        min={0}
                        step={0.5}
                        value={manualHoursStr}
                        placeholder="(auto)"
                        onChange={(e) => {
                          const next = e.target.value;
                          setDemandDraft((prev) => ({
                            ...prev,
                            [row.accountId]: {
                              manualHours: next,
                              priority: effectivePriority,
                            },
                          }));
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{displayFinalHours}h</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={String(effectivePriority)}
                        onValueChange={(v) => {
                          setDemandDraft((prev) => ({
                            ...prev,
                            [row.accountId]: {
                              manualHours: manualHoursStr,
                              priority: Number(v) as ResourcePriority,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[110px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Alta</SelectItem>
                          <SelectItem value="2">Média</SelectItem>
                          <SelectItem value="3">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpsertRequirement(
                            row.accountId,
                            Number(manualHoursNum ?? row.suggestedHours ?? 0),
                            effectivePriority
                          )
                        }
                      >
                        Aplicar
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recomendações</CardTitle>
          <CardDescription>Alertas simples para tomada de decisão (sem auto-alocação).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceRecommendations
            totalCapacity={planning.totals.totalWeeklyCapacity}
            demandRows={demandRows}
            overloadedCount={planning.totals.overloaded}
          />
        </CardContent>
      </Card>

      <ResourceSnapshotsPanel currentTotals={planning.totals} />
    </div>
  );
}
