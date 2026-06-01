import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAccount } from '@/hooks/useAccount';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PermissionManager } from '@/components/permissions/PermissionManager';
import { AccessDenied } from '@/components/permissions/AccessDenied';
import { roleLabels, type AccountRole } from '@/types/account.types';
import { categoryLabels } from '@/types/permissions.types';
import { Shield, Settings, Users, Eye, Plus, Edit, Trash2, Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface Module {
  slug: string;
  name: string;
  category: string;
  description: string | null;
}

interface DefaultPermission {
  module_slug: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const Permissoes = () => {
  const { canManage, loading: accountLoading } = useAccount();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole>('member');
  const [defaultPermissions, setDefaultPermissions] = useState<DefaultPermission[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadData();
    }
  }, [currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      // Carregar membros
      const { data: membersData, error: membersError } = await supabase
        .from('account_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('account_id', currentOrganization.id)
        .order('created_at');

      if (membersError) throw membersError;
      setMembers((membersData as any[]) || []);

      // Carregar módulos
      const { data: modulesData } = await supabase
        .from('modules')
        .select('slug, name, category, description')
        .order('sort_order');

      if (modulesData) {
        setModules(modulesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPermissions = async (role: AccountRole) => {
    setLoadingDefaults(true);
    try {
      const { data, error } = await supabase.rpc('get_default_permissions_for_role', {
        p_role: role,
      });

      if (error) throw error;
      setDefaultPermissions((data as DefaultPermission[]) || []);
    } catch (error) {
      console.error('Error loading default permissions:', error);
    } finally {
      setLoadingDefaults(false);
    }
  };

  useEffect(() => {
    loadDefaultPermissions(selectedRole);
  }, [selectedRole]);

  const getMemberName = (member: Member) => {
    const profile = member.profile as any;
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim();
    }
    return profile?.email || 'Usuário';
  };

  const getMemberInitials = (member: Member) => {
    const name = getMemberName(member);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const openPermissionModal = (member: Member) => {
    setSelectedMember(member);
    setShowPermissionModal(true);
  };

  const roles: AccountRole[] = ['owner', 'admin', 'admin_rh', 'leader', 'member', 'viewer'];

  const breadcrumb = [{ label: "Home", href: "/" }, { label: "Conta", href: "/conta/perfil" }, { label: "Permissões" }];

  if (accountLoading || loading) {
    return (
      <AppLayout title="Permissões" breadcrumb={breadcrumb}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!canManage) {
    return (
      <AppLayout title="Permissões" breadcrumb={breadcrumb}>
        <AccessDenied
          title="Acesso Restrito"
          description="Apenas administradores podem gerenciar permissões da conta."
        />
      </AppLayout>
    );
  }

  // Agrupar módulos por categoria
  const groupedModules = modules.reduce((acc, mod) => {
    if (!acc[mod.category]) {
      acc[mod.category] = [];
    }
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, typeof modules>);

  return (
    <AppLayout title="Permissões" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Permissões
            </h1>
            <p className="text-muted-foreground">
              Gerencie as permissões de acesso dos membros da sua conta
            </p>
          </div>
        </div>

        {/* Seção: Permissões por Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Permissões por Usuário
            </CardTitle>
            <CardDescription>
              Clique em um membro para gerenciar suas permissões individuais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getMemberInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getMemberName(member)}</p>
                          <p className="text-sm text-muted-foreground">
                            {(member.profile as any)?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPermissionModal(member)}
                        disabled={member.role === 'owner'}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Seção: Matriz de Permissões Padrão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Permissões Padrão por Role
            </CardTitle>
            <CardDescription>
              Visualize as permissões padrão para cada nível de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {roles.map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRole(role)}
                >
                  {roleLabels[role] || role}
                </Button>
              ))}
            </div>

            {loadingDefaults ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedModules).map(([category, mods]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium mb-2">
                      {categoryLabels[category] || category}
                    </h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Módulo</TableHead>
                            <TableHead className="text-center w-20">
                              <div className="flex items-center justify-center gap-1">
                                <Eye className="h-3 w-3" />
                                Ver
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-20">
                              <div className="flex items-center justify-center gap-1">
                                <Plus className="h-3 w-3" />
                                Criar
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-20">
                              <div className="flex items-center justify-center gap-1">
                                <Edit className="h-3 w-3" />
                                Editar
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-20">
                              <div className="flex items-center justify-center gap-1">
                                <Trash2 className="h-3 w-3" />
                                Excluir
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mods.map((mod) => {
                            const perm = defaultPermissions.find(
                              (p) => p.module_slug === mod.slug
                            );
                            return (
                              <TableRow key={mod.slug}>
                                <TableCell className="font-medium">{mod.name}</TableCell>
                                <TableCell className="text-center">
                                  {perm?.can_view ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perm?.can_create ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perm?.can_edit ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perm?.can_delete ? (
                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Permissões */}
        <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Permissões</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <PermissionManager
                memberId={selectedMember.id}
                memberName={getMemberName(selectedMember)}
                memberRole={selectedMember.role}
                userId={selectedMember.user_id}
                onSave={() => {
                  setShowPermissionModal(false);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Permissoes;
