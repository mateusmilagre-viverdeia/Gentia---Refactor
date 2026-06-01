import { useState, useMemo } from "react";
import { useAllGarantias } from "@/hooks/useGarantias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, TrendingDown } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

const statusBadgeClass: Record<string, string> = {
  ativa: "bg-green-100 text-green-800",
  acionada: "bg-red-100 text-red-800",
  expirada: "bg-gray-100 text-gray-800",
  concluida: "bg-blue-100 text-blue-800",
};

export function GarantiasAnalyticsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: garantias = [], isLoading } = useAllGarantias({ status: statusFilter });

  const stats = useMemo(() => {
    const ativa = garantias.filter((g) => g.status === "ativa").length;
    const acionadas = garantias.filter((g) => g.status === "acionada").length;
    const expiradas = garantias.filter((g) => g.status === "expirada").length;
    const concluidas = garantias.filter((g) => g.status === "concluida").length;
    const total = garantias.length;
    const taxa = total > 0 ? Math.round((acionadas / total) * 100) : 0;

    // tempo médio até desligamento (apenas acionadas)
    const tempos = garantias
      .filter((g) => g.status === "acionada" && g.data_desligamento)
      .map((g) => differenceInDays(parseISO(g.data_desligamento!), parseISO(g.data_contratacao)));
    const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;

    return { ativa, acionadas, expiradas, concluidas, total, taxa, tempoMedio };
  }, [garantias]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Garantias de Reposição</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as garantias</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="acionada">Acionadas</SelectItem>
            <SelectItem value="expirada">Expiradas</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-green-600" />Ativas</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{stats.ativa}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-red-600" />Acionadas</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{stats.acionadas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><ShieldX className="h-3.5 w-3.5 text-muted-foreground" />Expiradas</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{stats.expiradas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-orange-600" />Taxa acionamento</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{stats.taxa}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-600" />Tempo médio</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.tempoMedio !== null ? `${stats.tempoMedio}d` : "—"}</div>
            <div className="text-[10px] text-muted-foreground">até desligamento</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaga original</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Candidato</TableHead>
                <TableHead>Contratação</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : garantias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Shield className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nenhuma garantia encontrada
                  </TableCell>
                </TableRow>
              ) : garantias.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-sm font-medium">
                    {g.vaga_original_id ? (
                      <Link to={`/atracao-contratacao/recrutamento/jobs/${g.vaga_original_id}`} className="hover:underline">
                        {g.vaga_titulo || "—"}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{g.cliente_nome || "—"}</TableCell>
                  <TableCell className="text-sm">{g.candidato_nome || "—"}</TableCell>
                  <TableCell className="text-sm">{formatBRT(parseISO(g.data_contratacao), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-sm">{formatBRT(parseISO(g.garantia_expira_em), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusBadgeClass[g.status] || ""}>{g.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{g.motivo_desligamento || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
