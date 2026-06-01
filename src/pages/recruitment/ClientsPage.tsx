import { useState } from "react";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Plus, Search, DollarSign, Briefcase, Users, MoreHorizontal, Pencil, Power, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ClientFormDialog } from "@/components/recruitment/clients/ClientFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAllClientCareerPages } from "@/hooks/useClientCareerPage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inativo: "bg-muted text-muted-foreground",
  prospect: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospect: "Prospect",
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { members } = useAccountMembers();
  const updateClient = useUpdateClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const { data: clientsRaw = [], isLoading } = useClients({ search, status: statusFilter });
  const { data: careerPages = {} } = useAllClientCareerPages(currentOrganization?.id);

  // Per-client jobs aggregation
  const { data: jobStats = {} } = useQuery({
    queryKey: ["clients-jobs-stats", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return {};
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("cliente_id, status, fee_acordado")
        .eq("account_id", currentOrganization.id)
        .not("cliente_id", "is", null);

      const map: Record<string, { abertas: number; fechadas: number; fees: number[] }> = {};
      (data || []).forEach((j: any) => {
        if (!j.cliente_id) return;
        if (!map[j.cliente_id]) map[j.cliente_id] = { abertas: 0, fechadas: 0, fees: [] };
        if (j.status === "active") map[j.cliente_id].abertas += 1;
        if (j.status === "closed" || j.status === "filled") map[j.cliente_id].fechadas += 1;
        if (j.fee_acordado) map[j.cliente_id].fees.push(Number(j.fee_acordado));
      });
      return map;
    },
    enabled: !!currentOrganization?.id,
  });

  const clients = clientsRaw.filter((c) => {
    if (responsavelFilter === "all") return true;
    if (responsavelFilter === "none") return !c.responsavel_interno;
    return c.responsavel_interno === responsavelFilter;
  });

  const memberMap = new Map(members.map((m) => [m.user_id, m.name]));

  const { data: metrics } = useQuery({
    queryKey: ["clients-metrics", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return { activeClients: 0, openJobs: 0, feesAReceber: 0 };
      const [activeRes, jobsRes, feesRes] = await Promise.all([
        supabase.from("clientes_consultoria").select("id", { count: "exact", head: true }).eq("account_id", currentOrganization.id).eq("status", "ativo"),
        supabase.from("recruitment_jobs").select("id", { count: "exact", head: true }).not("cliente_id", "is", null).eq("account_id", currentOrganization.id).eq("status", "active"),
        supabase.from("fees_historico").select("valor_fee").eq("account_id", currentOrganization.id).eq("status", "a_receber"),
      ]);
      return {
        activeClients: activeRes.count || 0,
        openJobs: jobsRes.count || 0,
        feesAReceber: (feesRes.data || []).reduce((s, f) => s + (f.valor_fee || 0), 0),
      };
    },
    enabled: !!currentOrganization?.id,
  });

  const handleInactivate = async (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    const next = client.status === "ativo" ? "inativo" : "ativo";
    await updateClient.mutateAsync({ id: client.id, status: next });
    toast.success(`Cliente ${next === "ativo" ? "reativado" : "inativado"}`);
  };

  const handleEdit = (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormOpen(true);
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground text-sm">Empresas que contratam seus serviços</p>
          </div>
          <Button onClick={() => { setEditingClient(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard icon={Users} label="Clientes ativos" value={metrics?.activeClients ?? 0} />
          <MetricCard icon={Briefcase} label="Vagas abertas" value={metrics?.openJobs ?? 0} />
          <MetricCard icon={DollarSign} label="Fees a receber" value={`R$ ${(metrics?.feesAReceber ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              <SelectItem value="none">Sem responsável</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Abertas</TableHead>
                <TableHead className="text-center">Fechadas</TableHead>
                <TableHead className="text-right">Fee médio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const stats = (jobStats as any)[client.id] || { abertas: 0, fechadas: 0, fees: [] };
                  const feeMedio = stats.fees.length ? stats.fees.reduce((a: number, b: number) => a + b, 0) / stats.fees.length : null;
                  const responsavelNome = client.responsavel_interno ? memberMap.get(client.responsavel_interno) : null;
                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/atracao-contratacao/recrutamento/clientes/${client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {client.logo_url ? (
                              <img src={client.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                            ) : (
                              <Building2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{client.nome_fantasia || client.razao_social}</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Globe
                                      className={`h-3.5 w-3.5 ${
                                        careerPages[client.id]?.is_active
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-muted-foreground/40"
                                      }`}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {careerPages[client.id]?.is_active
                                      ? `Página de carreiras ativa (${careerPages[client.id].total_views} views)`
                                      : "Sem página de carreiras"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {client.setor && <p className="text-xs text-muted-foreground">{client.setor}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{responsavelNome || "—"}</TableCell>
                      <TableCell className="text-center text-sm font-medium">{stats.abertas}</TableCell>
                      <TableCell className="text-center text-sm">{stats.fechadas}</TableCell>
                      <TableCell className="text-right text-sm">
                        {feeMedio != null ? `R$ ${feeMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[client.status] || ""}>
                          {statusLabels[client.status] || client.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEdit(e, client)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleInactivate(e, client)}>
                              <Power className="h-4 w-4 mr-2" />
                              {client.status === "ativo" ? "Inativar" : "Reativar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingClient(null); }}
        client={editingClient}
      />
    </RecruitmentLayout>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
