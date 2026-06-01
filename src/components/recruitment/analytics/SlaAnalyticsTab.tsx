import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSlaAlerts, useUpdateSlaAlert, useTriggerSlaMonitor } from "@/hooks/useSlaAlerts";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCw, Check, EyeOff } from "lucide-react";
import { parseISO, differenceInBusinessDays } from "date-fns";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatBRT } from "@/lib/datetime";

const tipoLabels: Record<string, string> = {
  proximo_vencimento: "Próximo vencimento",
  vencido: "Vencido",
  sem_candidatos: "Sem candidatos",
  sem_respostas: "Sem respostas",
  garantia_proxima_expiracao: "Garantia próxima do fim",
};

const tipoBadgeClass: Record<string, string> = {
  proximo_vencimento: "bg-yellow-100 text-yellow-800",
  vencido: "bg-red-100 text-red-800",
  garantia_proxima_expiracao: "bg-blue-100 text-blue-800",
};

function useSlaAvgTimeByDimension(dimension: "recruiter" | "client") {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  return useQuery({
    queryKey: ["sla-avg-time", accountId, dimension],
    queryFn: async () => {
      if (!accountId) return [];
      const { data: jobs } = await (supabase as any)
        .from("recruitment_jobs")
        .select("id, recruiter_id, owner_id, cliente_id, data_abertura_cliente, data_contratacao, data_limite_entrega, status, sla_status, clientes_consultoria:cliente_id(razao_social, nome_fantasia)")
        .eq("account_id", accountId)
        .not("data_abertura_cliente", "is", null);

      const list = (jobs || []) as any[];
      const filled = list.filter((j) => j.data_contratacao);

      const ids = Array.from(new Set(filled.map((j) => j.recruiter_id || j.owner_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (dimension === "recruiter" && ids.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "Sem nome"]));
      }

      const groups = new Map<string, { name: string; sum: number; count: number }>();
      for (const j of filled) {
        const key = dimension === "recruiter" ? (j.recruiter_id || j.owner_id || "—") : (j.cliente_id || "—");
        const name =
          dimension === "recruiter"
            ? nameMap.get(key) || "Sem recrutador"
            : j.clientes_consultoria?.nome_fantasia || j.clientes_consultoria?.razao_social || "Sem cliente";
        const days = differenceInBusinessDays(parseISO(j.data_contratacao), parseISO(j.data_abertura_cliente));
        if (days < 0) continue;
        const cur = groups.get(key) || { name, sum: 0, count: 0 };
        cur.sum += days;
        cur.count += 1;
        groups.set(key, cur);
      }
      return Array.from(groups.values())
        .map((g) => ({ name: g.name, dias: Math.round(g.sum / g.count), preenchidas: g.count }))
        .sort((a, b) => b.preenchidas - a.preenchidas)
        .slice(0, 10);
    },
    enabled: !!accountId,
  });
}

export function SlaAnalyticsTab() {
  const [statusFilter, setStatusFilter] = useState("ativo");
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  const { slaMetaDias, update: updateSettings, isUpdating } = useAccountSettings(accountId);
  const [metaDraft, setMetaDraft] = useState<number>(slaMetaDias);
  const META_DIAS_UTEIS = slaMetaDias;
  const { data: alerts = [], isLoading } = useSlaAlerts({ status: statusFilter });
  const updateAlert = useUpdateSlaAlert();
  const trigger = useTriggerSlaMonitor();
  const { data: byRecruiter = [] } = useSlaAvgTimeByDimension("recruiter");
  const { data: byClient = [] } = useSlaAvgTimeByDimension("client");

  const chartConfig = useMemo(
    () => ({ dias: { label: "Dias úteis", color: "hsl(var(--primary))" } }),
    [],
  );

  useEffect(() => {
    setMetaDraft(slaMetaDias);
  }, [slaMetaDias]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Alertas de SLA</h2>
          <p className="text-sm text-muted-foreground">Vagas com prazos próximos do vencimento ou já vencidos</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" title="Configurar meta SLA">
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Meta: {slaMetaDias}d
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <Label htmlFor="sla-meta">Meta de tempo até contratação (dias úteis)</Label>
                <Input
                  id="sla-meta"
                  type="number"
                  min={1}
                  max={365}
                  value={metaDraft}
                  onChange={(e) => setMetaDraft(parseInt(e.target.value || "30", 10))}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isUpdating || metaDraft === slaMetaDias || !metaDraft}
                  onClick={() => updateSettings({ sla_meta_dias: metaDraft })}
                >
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="visualizado">Visualizados</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="ignorado">Ignorados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => trigger.mutate()} disabled={trigger.isPending}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${trigger.isPending ? "animate-spin" : ""}`} />
            Executar agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo médio até contratação por recrutador</CardTitle></CardHeader>
          <CardContent>
            {byRecruiter.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem vagas preenchidas no período</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byRecruiter} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine x={META_DIAS_UTEIS} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta ${META_DIAS_UTEIS}d`, position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                    <Bar dataKey="dias" fill="var(--color-dias)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo médio até contratação por cliente</CardTitle></CardHeader>
          <CardContent>
            {byClient.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem vagas preenchidas no período</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byClient} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine x={META_DIAS_UTEIS} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta ${META_DIAS_UTEIS}d`, position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                    <Bar dataKey="dias" fill="var(--color-dias)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nenhum alerta {statusFilter !== "all" ? statusFilter : ""}
                  </TableCell>
                </TableRow>
              ) : alerts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant="secondary" className={tipoBadgeClass[a.tipo_alerta] || ""}>
                      {tipoLabels[a.tipo_alerta] || a.tipo_alerta}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {a.vaga_id ? (
                      <Link to={`/atracao-contratacao/recrutamento/jobs/${a.vaga_id}`} className="hover:underline">
                        {a.job_title || "—"}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{a.cliente_nome || "—"}</TableCell>
                  <TableCell className="text-sm">{a.dias_restantes !== null ? `${a.dias_restantes}d` : "—"}</TableCell>
                  <TableCell className="text-sm">{formatBRT(parseISO(a.created_at), "dd/MM HH:mm")}</TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell>
                    {a.status === "ativo" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => updateAlert.mutate({ id: a.id, status: "visualizado" })} title="Visualizar">
                          <EyeOff className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateAlert.mutate({ id: a.id, status: "resolvido" })} title="Resolver">
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
