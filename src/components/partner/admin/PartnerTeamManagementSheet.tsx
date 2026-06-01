import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, MoreHorizontal, Trash2, Shield, Loader2 } from "lucide-react";
import type { EPPartnerUserRole } from "@/types/partner.types";

interface PartnerUser {
  id: string;
  partner_id: string;
  user_id: string;
  role: EPPartnerUserRole;
  invited_by: string | null;
  created_at: string;
  profile?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

interface PartnerTeamManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
}

const roleLabels: Record<EPPartnerUserRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  viewer: "Visualizador",
};

const roleBadgeVariants: Record<EPPartnerUserRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  viewer: "outline",
};

export function PartnerTeamManagementSheet({
  open,
  onOpenChange,
  partnerId,
  partnerName,
}: PartnerTeamManagementSheetProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<EPPartnerUserRole>("viewer");

  const fetchUsers = useCallback(async () => {
    if (!partnerId) return;

    try {
      setLoading(true);

      // Fetch partner users
      const { data: usersData, error: usersError } = await supabase
        .from("ep_partner_users")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: true });

      if (usersError) throw usersError;

      // Get user IDs to fetch profiles
      const userIds = (usersData || []).map((u) => u.user_id);

      // Fetch profiles for these users
      let profilesMap: Record<
        string,
        { id: string; email: string | null; first_name: string | null; last_name: string | null }
      > = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      // Map the data
      const mappedUsers: PartnerUser[] = (usersData || []).map((u) => ({
        id: u.id,
        partner_id: u.partner_id,
        user_id: u.user_id,
        role: u.role as EPPartnerUserRole,
        invited_by: u.invited_by,
        created_at: u.created_at,
        profile: profilesMap[u.user_id] || undefined,
      }));

      setUsers(mappedUsers);
    } catch (err) {
      console.error("Error fetching partner users:", err);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (open && partnerId) {
      fetchUsers();
    }
  }, [open, partnerId, fetchUsers]);

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !user) {
      toast.error("Preencha o email do usuário");
      return;
    }

    try {
      setAddingUser(true);

      // Search for user by email
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", newUserEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        toast.error("Usuário não encontrado. Verifique o email.");
        return;
      }

      // Check if already a member
      const existingUser = users.find((u) => u.user_id === profileData.id);
      if (existingUser) {
        toast.error("Este usuário já faz parte da equipe.");
        return;
      }

      // Permitir múltiplos proprietários

      // Insert new partner user
      const { error: insertError } = await supabase.from("ep_partner_users").insert({
        partner_id: partnerId,
        user_id: profileData.id,
        role: newUserRole,
        invited_by: user.id,
      });

      if (insertError) throw insertError;

      // Assign ep_partner role to the user
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: profileData.id,
        role: "ep_partner",
      });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Role assignment error:", roleError);
      }

      toast.success("Usuário adicionado à equipe");
      setNewUserEmail("");
      setNewUserRole("viewer");
      await fetchUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error("Erro ao adicionar usuário");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (targetUserId: string) => {
    const targetUser = users.find((u) => u.user_id === targetUserId);
    if (!targetUser) return;

    if (targetUser.role === "owner") {
      toast.error("Não é possível remover o proprietário");
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("ep_partner_users")
        .delete()
        .eq("partner_id", partnerId)
        .eq("user_id", targetUserId);

      if (deleteError) throw deleteError;

      toast.success("Usuário removido da equipe");
      await fetchUsers();
    } catch (err) {
      console.error("Error removing user:", err);
      toast.error("Erro ao remover usuário");
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: EPPartnerUserRole) => {
    const targetUser = users.find((u) => u.user_id === targetUserId);
    if (!targetUser) return;

    // Permitir alterações de/para owner

    try {
      const { error: updateError } = await supabase
        .from("ep_partner_users")
        .update({ role: newRole })
        .eq("partner_id", partnerId)
        .eq("user_id", targetUserId);

      if (updateError) throw updateError;

      toast.success("Função atualizada");
      await fetchUsers();
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error("Erro ao atualizar função");
    }
  };

  const getUserDisplayName = (partnerUser: PartnerUser) => {
    if (partnerUser.profile?.first_name || partnerUser.profile?.last_name) {
      return `${partnerUser.profile.first_name || ""} ${partnerUser.profile.last_name || ""}`.trim();
    }
    return partnerUser.profile?.email || "Usuário";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Equipe - {partnerName}</SheetTitle>
          <SheetDescription>
            Gerencie os membros da equipe deste sócio
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Add User Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Membro
            </h4>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email do usuário</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as EPPartnerUserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Proprietário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} disabled={addingUser} className="w-full">
                {addingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="space-y-4">
            <h4 className="font-medium">Membros da Equipe ({users.length})</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum membro na equipe
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((partnerUser) => (
                    <TableRow key={partnerUser.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getUserDisplayName(partnerUser)}</p>
                          <p className="text-sm text-muted-foreground">
                            {partnerUser.profile?.email || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[partnerUser.role]}>
                          {roleLabels[partnerUser.role]}
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
                            {partnerUser.role !== "owner" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(partnerUser.user_id, "owner")}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Tornar Proprietário
                              </DropdownMenuItem>
                            )}
                            {partnerUser.role !== "admin" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(partnerUser.user_id, "admin")}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Tornar Administrador
                              </DropdownMenuItem>
                            )}
                            {partnerUser.role !== "viewer" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(partnerUser.user_id, "viewer")}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Tornar Visualizador
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveUser(partnerUser.user_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
