import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { Coins, Plus, Search, Gift, Building2, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GrantCreditsModal } from "@/components/recruitment/credits";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";

interface GrantRow {
  id: string;
  account_id: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  account_name?: string;
  created_by_email?: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Último ano" },
  { value: "all", label: "Todos" },
];

export default function CreditGrantsAdmin() {
  const { isSuperAdmin, loading: loadingSA } = useSuperAdmin();
  const [rows, setRows] = useState<GrantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");

  const fetchGrants = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("recruitment_usage_log")
        .select("id, account_id, amount, balance_after, description, created_by, created_at")
        .eq("operation", "admin_grant")
        .order("created_at", { ascending: false })
        .limit(500);

      if (period !== "all") {
        const since = new Date();
        since.setDate(since.getDate() - parseInt(period, 10));
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const accountIds = Array.from(new Set((data ?? []).map((r) => r.account_id).filter(Boolean)));
      const userIds = Array.from(new Set((data ?? []).map((r) => r.created_by).filter(Boolean) as string[]));

      const [companiesRes, profilesRes] = await Promise.all([
        accountIds.length
          ? supabase.from("companies").select("id, name").in("id", accountIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        userIds.length
          ? supabase.from("profiles").select("id, email, full_name").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; email: string; full_name: string }[] }),
      ]);

      const companyMap = new Map<string, string>(
        (companiesRes.data ?? []).map((c: any) => [c.id as string, c.name as string])
      );
      const profileMap = new Map<string, string>(
        (profilesRes.data ?? []).map((p: any) => [p.id as string, (p.email || p.full_name || p.id) as string] as [string, string])
      );

      setRows(
        (data ?? []).map((r) => ({
          ...r,
          account_name: companyMap.get(r.account_id) ?? "—",
          created_by_email: (r.created_by ? profileMap.get(r.created_by) ?? "—" : "—") as string,
        }))
      );
    } catch (err) {
      console.error("Error loading credit grants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchGrants();
  }, [isSuperAdmin, period]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.account_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.created_by_email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const uniqueOrgs = new Set(rows.map((r) => r.account_id)).size;
    return { total, uniqueOrgs, count: rows.length };
  }, [rows]);

  if (loadingSA) {
    return (
      <AppLayout title="Créditos — Concessões">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Créditos — Concessões">
        <AccessDenied
          title="Acesso Restrito"
          description="Esta área é exclusiva para super administradores."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Créditos — Concessões"
      breadcrumb={[
        { label: "Administração", href: "/admin/dashboard" },
        { label: "Créditos — Concessões" },
      ]}
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Créditos — Concessões</h1>
              <p className="text-sm text-muted-foreground">
                Conceda créditos manualmente a empresas e acompanhe o histórico de liberações.
              </p>
            </div>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Conceder Créditos
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" /> Total concedido no período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">créditos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Empresas beneficiadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.uniqueOrgs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Concessões realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.count}</div>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Histórico de Concessões</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empresa, motivo, admin..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma concessão encontrada no período selecionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Saldo após</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Concedido por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatBRT(new Date(row.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          +{Number(row.amount).toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(row.balance_after).toFixed(1)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={row.description ?? ""}>
                        {row.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.created_by_email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <GrantCreditsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={fetchGrants}
        />
      </div>
    </AppLayout>
  );
}
