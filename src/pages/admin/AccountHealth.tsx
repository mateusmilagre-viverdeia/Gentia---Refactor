import { useMemo, useState } from "react";
import {
  useAccountHealthList,
  useRecalculateAccountHealth,
  AccountHealthRow,
} from "@/hooks/useAccountHealth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Activity, Search, Eye } from "lucide-react";
import { HealthScoreBadge } from "@/components/admin/health/HealthScoreBadge";
import { AccountHealthDetailDialog } from "@/components/admin/health/AccountHealthDetailDialog";
;
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

export default function AccountHealth() {
  const { isSuperAdmin, loading: adminLoading } = useAdminDashboard();
  const { data: rows, isLoading } = useAccountHealthList();
  const recalc = useRecalculateAccountHealth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<AccountHealthRow | null>(null);

  if (!adminLoading && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.company_name?.toLowerCase().includes(q) ||
          r.company_sector?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "pending"
          ? !r.calculated_at
          : r.health_status === statusFilter && r.calculated_at,
      );
    }
    list = [...list].sort((a, b) =>
      sortDir === "desc"
        ? b.overall_score - a.overall_score
        : a.overall_score - b.overall_score,
    );
    return list;
  }, [rows, search, statusFilter, sortDir]);

  const stats = useMemo(() => {
    const calculated = (rows ?? []).filter((r) => r.calculated_at);
    const total = rows?.length ?? 0;
    const green = calculated.filter((r) => r.health_status === "green").length;
    const yellow = calculated.filter((r) => r.health_status === "yellow").length;
    const red = calculated.filter((r) => r.health_status === "red").length;
    const pending = total - calculated.length;
    return { total, green, yellow, red, pending };
  }, [rows]);

  return (
    <AppLayout title="Saúde de Contas" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Saúde de Contas" }]}>
      <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Saúde de Contas
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão consolidada da saúde de cada conta cliente da plataforma
            </p>
          </div>
          <Button
            onClick={() => recalc.mutate({ all: true })}
            disabled={recalc.isPending}
          >
            {recalc.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalcular todas
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de contas</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-600">Saudáveis</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{stats.green}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-600">Atenção</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{stats.yellow}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-red-600">Risco</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.red}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sem cálculo</CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou setor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="green">Saudáveis</SelectItem>
                  <SelectItem value="yellow">Atenção</SelectItem>
                  <SelectItem value="red">Risco</SelectItem>
                  <SelectItem value="pending">Sem cálculo</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortDir}
                onValueChange={(v) => setSortDir(v as "asc" | "desc")}
              >
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Maior score primeiro</SelectItem>
                  <SelectItem value="asc">Menor score primeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma conta encontrada com os filtros atuais
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.account_id}>
                      <TableCell className="font-medium">
                        {r.company_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.company_sector ?? "—"}
                      </TableCell>
                      <TableCell>
                        {r.calculated_at ? (
                          <span className="font-mono font-semibold">
                            {r.overall_score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.calculated_at ? (
                          <HealthScoreBadge
                            status={r.health_status}
                            showScore={false}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.calculated_at
                          ? formatBRT(new Date(r.calculated_at), "dd/MM/yy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recalc.mutate({ account_id: r.account_id })}
                          disabled={recalc.isPending}
                          title="Recalcular esta conta"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${recalc.isPending ? "animate-spin" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(r)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AccountHealthDetailDialog
          account={selected}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
        />
      </div>
    </AppLayout>
  );
}
