import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEPRole } from "@/hooks/useEPRole";
import { useEPPartner } from "@/hooks/useEPPartner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Calendar,
  MoreVertical,
  Eye,
  XCircle,
  Users,
  RefreshCw,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import type { PartnerClientGrant } from "@/types/partner.types";
import { GrantAccessModal } from "@/components/partner/GrantAccessModal";
import { formatBRT } from "@/lib/datetime";

export default function SocioClientes() {
  const navigate = useNavigate();
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { grants, stats, loading, error, refresh, revokeAccess, grantAccess } = useEPPartner();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<PartnerClientGrant | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isEPPartner && !isSuperAdmin) {
      navigate('/');
    }
  }, [roleLoading, isEPPartner, isSuperAdmin, navigate]);

  const handleRevoke = async () => {
    if (!selectedGrant) return;
    
    setIsRevoking(true);
    const result = await revokeAccess(selectedGrant.id);
    setIsRevoking(false);
    
    if (result.success) {
      toast.success("Acesso revogado com sucesso!");
    } else {
      toast.error(result.error || "Erro ao revogar acesso");
    }
    
    setRevokeDialogOpen(false);
    setSelectedGrant(null);
  };

  const handleGrantAccess = async (orgId: string, expiresAt: Date, notes?: string) => {
    const result = await grantAccess(orgId, expiresAt, notes);
    if (result.success) {
      toast.success("Acesso concedido com sucesso!");
    } else {
      toast.error(result.error || "Erro ao conceder acesso");
    }
    return result;
  };

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Clientes" }
  ];

  if (roleLoading || loading) {
    return (
      <AppLayout title="Clientes" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Clientes" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Clientes" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus Clientes</h1>
            <p className="text-muted-foreground">
              {stats.activeClients} clientes ativos • {stats.availableSeats} vagas disponíveis
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => setGrantModalOpen(true)} disabled={stats.availableSeats <= 0}>
              <Plus className="h-4 w-4 mr-2" />
              Conceder Acesso
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Vagas</p>
                <p className="text-xl font-bold">{stats.totalSeats}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Building2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vagas Usadas</p>
                <p className="text-xl font-bold">{stats.usedSeats}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-xl font-bold">{stats.availableSeats}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients List */}
        {grants.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cliente ainda</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Compartilhe seu código promocional para que novos clientes possam se registrar 
                e ter acesso à plataforma através da sua parceria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grants.map((grant) => (
              <Card key={grant.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {grant.company?.name || 'Empresa não identificada'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Ativo desde {grant.granted_at 
                              ? formatBRT(new Date(grant.granted_at), "dd 'de' MMM, yyyy")
                              : '-'
                            }
                          </span>
                          <span>•</span>
                          <span>
                            Expira em {formatBRT(new Date(grant.expires_at), "dd 'de' MMM, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                        Ativo
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {grant.org_id && (
                            <DropdownMenuItem onClick={() => navigate(`/consultor/projeto/${grant.org_id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver projeto
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setSelectedGrant(grant);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Revogar acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Revoke Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar acesso</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja revogar o acesso de{" "}
                <strong>{selectedGrant?.company?.name || 'esta empresa'}</strong>?
                Esta ação não pode ser desfeita e a empresa perderá acesso imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRevoke}
                disabled={isRevoking}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isRevoking ? "Revogando..." : "Revogar acesso"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Grant Access Modal */}
        <GrantAccessModal
          open={grantModalOpen}
          onOpenChange={setGrantModalOpen}
          onGrant={handleGrantAccess}
          availableSeats={stats.availableSeats}
        />
      </div>
    </AppLayout>
  );
}
