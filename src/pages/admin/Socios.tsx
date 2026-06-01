import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminPartners, PartnerWithStats } from "@/hooks/useAdminPartners";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Power, 
  Users,
  Building2,
  Ticket,
  UsersRound
} from "lucide-react";
import { CreatePartnerModal } from "@/components/partner/admin/CreatePartnerModal";
import { EditPartnerModal } from "@/components/partner/admin/EditPartnerModal";
import { PartnerDetailsSheet } from "@/components/partner/admin/PartnerDetailsSheet";
import { PartnerTeamManagementSheet } from "@/components/partner/admin/PartnerTeamManagementSheet";
import { toast } from "sonner";

export default function AdminSocios() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const { partners, loading, error, fetchAllPartners, togglePartnerStatus, createOwnProjectGrant } = useAdminPartners();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithStats | null>(null);

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchAllPartners();
  }, [fetchAllPartners]);

  const filteredPartners = partners.filter(partner => 
    partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.promo_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (partner: PartnerWithStats) => {
    const result = await togglePartnerStatus(partner.id, !partner.active);
    if (result.success) {
      toast.success(partner.active ? "Sócio desativado" : "Sócio ativado");
    } else {
      toast.error(result.error || "Erro ao alterar status");
    }
  };

  const handleViewDetails = (partner: PartnerWithStats) => {
    setSelectedPartner(partner);
    setDetailsSheetOpen(true);
  };

  const handleEditPartner = (partner: PartnerWithStats) => {
    setSelectedPartner(partner);
    setEditModalOpen(true);
  };

  const handleManageTeam = (partner: PartnerWithStats) => {
    setSelectedPartner(partner);
    setTeamSheetOpen(true);
  };

  const breadcrumb = [
    { label: "Admin", href: "/admin/dashboard" },
    { label: "Sócios EP" }
  ];

  // Stats
  const totalPartners = partners.length;
  const activePartners = partners.filter(p => p.active).length;
  const totalSeats = partners.reduce((acc, p) => acc + p.totalSeats, 0);
  const usedSeats = partners.reduce((acc, p) => acc + p.usedSeats, 0);

  if (adminLoading || loading) {
    return (
      <AppLayout title="Sócios EP" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Sócios EP" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Sócios EP" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sócios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPartners}</div>
              <p className="text-xs text-muted-foreground">{activePartners} ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas Totais</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSeats}</div>
              <p className="text-xs text-muted-foreground">{usedSeats} em uso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas Disponíveis</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSeats - usedSeats}</div>
              <p className="text-xs text-muted-foreground">Para novos clientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Vagas utilizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, empresa ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Sócio
          </Button>
        </div>

        {/* Partners Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Código Promo</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum sócio encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-muted-foreground">{partner.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {partner.company_name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {partner.promo_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className={partner.usedSeats >= partner.totalSeats ? "text-destructive" : ""}>
                          {partner.usedSeats} / {partner.totalSeats}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.active ? "default" : "secondary"}>
                          {partner.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(partner)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditPartner(partner)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageTeam(partner)}>
                              <UsersRound className="h-4 w-4 mr-2" />
                              Gerenciar Equipe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(partner)}>
                              <Power className="h-4 w-4 mr-2" />
                              {partner.active ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreatePartnerModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchAllPartners}
      />

      {selectedPartner && (
        <>
          <EditPartnerModal 
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            partner={selectedPartner}
            onSuccess={fetchAllPartners}
          />
          <PartnerDetailsSheet
            open={detailsSheetOpen}
            onOpenChange={setDetailsSheetOpen}
            partner={selectedPartner}
            onLinkOwnProject={async (partnerId, orgId) => {
              const result = await createOwnProjectGrant(partnerId, orgId);
              if (result.success) {
                fetchAllPartners();
              }
              return result;
            }}
          />
          <PartnerTeamManagementSheet
            open={teamSheetOpen}
            onOpenChange={setTeamSheetOpen}
            partnerId={selectedPartner.id}
            partnerName={selectedPartner.company_name || selectedPartner.name}
          />
        </>
      )}
    </AppLayout>
  );
}
