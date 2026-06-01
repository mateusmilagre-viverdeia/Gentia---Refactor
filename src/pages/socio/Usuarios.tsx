import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEPPartner } from "@/hooks/useEPPartner";
import { useEPPartnerUsers } from "@/hooks/useEPPartnerUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Users, UserPlus, Trash2, Shield, Eye, Crown, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { EPPartnerUserRole } from "@/types/partner.types";

const roleLabels: Record<EPPartnerUserRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  viewer: 'Visualizador',
};

const roleDescriptions: Record<EPPartnerUserRole, string> = {
  owner: 'Acesso total + gerenciar equipe',
  admin: 'Acesso total ao painel',
  viewer: 'Apenas visualização',
};

const roleIcons: Record<EPPartnerUserRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-amber-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  viewer: <Eye className="h-4 w-4 text-muted-foreground" />,
};

export default function SocioUsuarios() {
  const { partner, loading: partnerLoading } = useEPPartner();
  const { 
    users, 
    loading: usersLoading, 
    isOwner, 
    addUser, 
    removeUser,
    updateUserRole,
  } = useEPPartnerUsers(partner?.id || null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<EPPartnerUserRole>("admin");
  const [adding, setAdding] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Equipe" }
  ];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      toast.error("Digite o email do usuário");
      return;
    }

    setAdding(true);
    const result = await addUser(newEmail.trim(), newRole);
    setAdding(false);

    if (result.success) {
      toast.success("Usuário adicionado com sucesso!");
      setNewEmail("");
      setNewRole("admin");
    } else {
      toast.error(result.error || "Erro ao adicionar usuário");
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    const result = await removeUser(userToRemove);
    
    if (result.success) {
      toast.success("Usuário removido da equipe");
    } else {
      toast.error(result.error || "Erro ao remover usuário");
    }

    setRemoveDialogOpen(false);
    setUserToRemove(null);
  };

  const handleRoleChange = async (userId: string, newRole: EPPartnerUserRole) => {
    const result = await updateUserRole(userId, newRole);
    
    if (result.success) {
      toast.success("Função atualizada");
    } else {
      toast.error(result.error || "Erro ao atualizar função");
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName) {
      return `${firstName.charAt(0)}${lastName?.charAt(0) || ''}`.toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  if (partnerLoading || usersLoading) {
    return (
      <AppLayout title="Equipe" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (!partner) {
    return (
      <AppLayout title="Equipe" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Acesso Negado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Você não está cadastrado como Sócio EP.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Equipe" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Equipe da Empresa</h1>
            <p className="text-muted-foreground">
              {partner.company_name || partner.name} • {users.length} {users.length === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>

        {/* Add User Form - Only for owner */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Adicionar Membro
              </CardTitle>
              <CardDescription>
                Adicione outro sócio ou colaborador para acessar o painel da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="email">Email do usuário</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={adding}
                  />
                </div>
                <div className="w-full sm:w-48 space-y-2">
                  <Label>Função</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as EPPartnerUserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          Visualizador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={adding || !newEmail.trim()}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Adicionar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Membros da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  {isOwner && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 4 : 3} className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum membro encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getInitials(member.profile?.first_name, member.profile?.last_name, member.profile?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.first_name 
                                ? `${member.profile.first_name} ${member.profile.last_name || ''}`.trim()
                                : member.profile?.email || 'Usuário'
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.role === 'owner' || !isOwner ? (
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="gap-1">
                            {roleIcons[member.role]}
                            {roleLabels[member.role]}
                          </Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.user_id, v as EPPartnerUserRole)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-blue-500" />
                                  Administrador
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                  Visualizador
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setUserToRemove(member.user_id);
                                setRemoveDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Sobre as Funções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['owner', 'admin', 'viewer'] as EPPartnerUserRole[]).map((role) => (
                <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">{roleIcons[role]}</div>
                  <div>
                    <p className="font-medium">{roleLabels[role]}</p>
                    <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta pessoa perderá o acesso ao painel da empresa. Esta ação pode ser revertida adicionando o usuário novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
