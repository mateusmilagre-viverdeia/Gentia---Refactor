import { useState } from "react";
import { useAllFees, useFeeMetrics, type FeeRow } from "@/hooks/useFeesGlobal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar, Target, Check, Pencil, Ban } from "lucide-react";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { parseISO } from "date-fns";
import { MarkFeeReceivedDialog } from "@/components/recruitment/financial/MarkFeeReceivedDialog";
import { EditFeeDialog } from "@/components/recruitment/financial/EditFeeDialog";
import { CancelFeeDialog } from "@/components/recruitment/financial/CancelFeeDialog";
import { formatBRT } from "@/lib/datetime";

const statusColors: Record<string, string> = {
  a_receber: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  recebido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  em_disputa: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  reposicao_gratuita: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const statusLabels: Record<string, string> = {
  a_receber: "A receber",
  recebido: "Recebido",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
  reposicao_gratuita: "Reposição",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function FinanceiroPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [markFeeId, setMarkFeeId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<FeeRow | null>(null);
  const [cancelFeeId, setCancelFeeId] = useState<string | null>(null);

  const { data: fees = [], isLoading } = useAllFees({ status: statusFilter });
  const { data: metrics } = useFeeMetrics();

  const filtered = search
    ? fees.filter(f => (f.cliente_nome || "").toLowerCase().includes(search.toLowerCase()) || (f.vaga_title || "").toLowerCase().includes(search.toLowerCase()))
    : fees;

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Build pie data from clienteMap (top 5 + outros)
  const pieData = (() => {
    if (!metrics?.clienteMap) return [];
    const arr = Array.from(metrics.clienteMap.entries()).map(([id, val]) => {
      const cliFee = fees.find(f => f.cliente_id === id);
      return { name: cliFee?.cliente_nome || "—", value: val };
    }).sort((a, b) => b.value - a.value);
    if (arr.length <= 5) return arr;
    const top = arr.slice(0, 5);
    const outros = arr.slice(5).reduce((s, x) => s + x.value, 0);
    return [...top, { name: "Outros", value: outros }];
  })();

  return (
    <RecruitmentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Controle de fees e receita</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard icon={DollarSign} label="A receber" value={fmt(metrics?.aReceber || 0)} color="text-blue-600" />
          <MetricCard icon={TrendingUp} label="Recebido no mês" value={fmt(metrics?.recebidoMes || 0)} color="text-green-600" />
          <MetricCard icon={Calendar} label="Recebido no ano" value={fmt(metrics?.recebidoAno || 0)} color="text-emerald-600" />
          <MetricCard icon={Target} label="Ticket médio" value={fmt(metrics?.ticketMedio || 0)} color="text-purple-600" />
          <MetricCard icon={Calendar} label="Previsão próx. mês" value={fmt(metrics?.previsaoProxMes || 0)} color="text-orange-600" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Receita anual (recebido vs. previsto)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics?.series || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="recebido" fill="hsl(var(--primary))" name="Recebido" />
                  <Bar dataKey="previsto" fill="hsl(var(--primary) / 0.4)" name="Previsto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fees por cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* A receber este mês */}
        {metrics?.proximosFees && metrics.proximosFees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A receber nos próximos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.proximosFees.slice(0, 8).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{fmt(f.valor_fee)}</p>
                      <p className="text-xs text-muted-foreground">
                        Previsão: {formatBRT(parseISO(f.data_previsao), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setMarkFeeId(f.id)}>
                      <Check className="h-4 w-4 mr-1" /> Marcar como recebido
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters + Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-base">Histórico consolidado</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="a_receber">A receber</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="em_disputa">Em disputa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum fee encontrado</TableCell></TableRow>
                ) : filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm">{f.cliente_nome || "—"}</TableCell>
                    <TableCell className="text-sm">{f.vaga_title || "—"}</TableCell>
                    <TableCell className="font-medium">{fmt(f.valor_fee)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[f.status] || ""}>{statusLabels[f.status] || f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{f.data_previsao ? formatBRT(parseISO(f.data_previsao), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{f.data_recebimento ? formatBRT(parseISO(f.data_recebimento), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{f.numero_nota_fiscal || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {f.status === "a_receber" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setMarkFeeId(f.id)} title="Marcar como recebido">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditFee(f)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setCancelFeeId(f.id)} title="Cancelar">
                              <Ban className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </>
                        )}
                        {f.status !== "a_receber" && f.status !== "cancelado" && (
                          <Button size="sm" variant="ghost" onClick={() => setEditFee(f)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {markFeeId && (
          <MarkFeeReceivedDialog open={!!markFeeId} onOpenChange={(o) => !o && setMarkFeeId(null)} feeId={markFeeId} />
        )}
        <EditFeeDialog open={!!editFee} onOpenChange={(o) => !o && setEditFee(null)} fee={editFee} />
        <CancelFeeDialog open={!!cancelFeeId} onOpenChange={(o) => !o && setCancelFeeId(null)} feeId={cancelFeeId} />
      </div>
    </RecruitmentLayout>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className={`text-xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
