import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, RotateCcw, Shield } from 'lucide-react';
import type { PermissionMatrixRow, ModulePermission } from '@/types/permissions.types';
import { categoryLabels, actionLabels } from '@/types/permissions.types';

interface PermissionManagerProps {
  memberId: string;
  memberName: string;
  memberRole: string;
  userId: string;
  onSave?: () => void;
}

interface PermissionState {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
}

export function PermissionManager({
  memberId,
  memberName,
  memberRole,
  userId,
  onSave,
}: PermissionManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, PermissionState>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, PermissionState>>({});
  const [modules, setModules] = useState<{ slug: string; name: string; category: string }[]>([]);

  useEffect(() => {
    loadPermissions();
  }, [userId]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Carregar módulos
      const { data: modulesData } = await supabase
        .from('modules')
        .select('slug, name, category')
        .order('sort_order');

      if (modulesData) {
        setModules(modulesData);
      }

      // Carregar matriz de permissões do usuário
      const { data, error } = await supabase.rpc('get_user_permissions_matrix', {
        p_user_id: userId,
      });

      if (error) throw error;

      const permMap: Record<string, PermissionState> = {};
      (data as PermissionMatrixRow[] || []).forEach((row) => {
        permMap[row.module_slug] = {
          can_view: row.can_view,
          can_create: row.can_create,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
          is_custom: row.is_custom,
        };
      });

      setPermissions(permMap);
      setOriginalPermissions(JSON.parse(JSON.stringify(permMap)));
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleSlug: string, action: keyof PermissionState, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleSlug]: {
        ...prev[moduleSlug],
        [action]: value,
        is_custom: true,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Identificar permissões que mudaram
      const changes: { module_slug: string; permissions: PermissionState }[] = [];
      
      Object.entries(permissions).forEach(([slug, perm]) => {
        const original = originalPermissions[slug];
        if (
          perm.can_view !== original?.can_view ||
          perm.can_create !== original?.can_create ||
          perm.can_edit !== original?.can_edit ||
          perm.can_delete !== original?.can_delete
        ) {
          changes.push({ module_slug: slug, permissions: perm });
        }
      });

      // Salvar alterações
      for (const change of changes) {
        const { error } = await supabase
          .from('user_permissions')
          .upsert(
            {
              account_member_id: memberId,
              module_slug: change.module_slug,
              can_view: change.permissions.can_view,
              can_create: change.permissions.can_create,
              can_edit: change.permissions.can_edit,
              can_delete: change.permissions.can_delete,
            },
            { onConflict: 'account_member_id,module_slug' }
          );

        if (error) throw error;
      }

      toast.success('Permissões atualizadas com sucesso');
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      onSave?.();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      // Remover todas as permissões customizadas
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('account_member_id', memberId);

      if (error) throw error;

      toast.success('Permissões restauradas para o padrão');
      await loadPermissions();
      onSave?.();
    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast.error('Erro ao restaurar permissões');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  // Agrupar módulos por categoria
  const groupedModules = modules.reduce((acc, mod) => {
    if (!acc[mod.category]) {
      acc[mod.category] = [];
    }
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, typeof modules>);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isOwner = memberRole === 'owner';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">{memberName}</h3>
            <p className="text-sm text-muted-foreground">
              Role: <Badge variant="outline">{memberRole}</Badge>
            </p>
          </div>
        </div>
        {!isOwner && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar Padrão
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        )}
      </div>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proprietário da Conta</CardTitle>
            <CardDescription>
              O proprietário tem acesso total a todos os módulos e funcionalidades.
              Não é possível alterar suas permissões.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedModules).map(([category, mods]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  {categoryLabels[category] || category}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Módulo</th>
                        <th className="text-center py-2 px-2 font-medium w-16">Ver</th>
                        <th className="text-center py-2 px-2 font-medium w-16">Criar</th>
                        <th className="text-center py-2 px-2 font-medium w-16">Editar</th>
                        <th className="text-center py-2 px-2 font-medium w-16">Excluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mods.map((mod) => {
                        const perm = permissions[mod.slug];
                        return (
                          <tr key={mod.slug} className="border-b last:border-0">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                {mod.name}
                                {perm?.is_custom && (
                                  <Badge variant="secondary" className="text-xs">
                                    Customizado
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-2 px-2">
                              <Checkbox
                                checked={perm?.can_view ?? false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(mod.slug, 'can_view', !!v)
                                }
                              />
                            </td>
                            <td className="text-center py-2 px-2">
                              <Checkbox
                                checked={perm?.can_create ?? false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(mod.slug, 'can_create', !!v)
                                }
                              />
                            </td>
                            <td className="text-center py-2 px-2">
                              <Checkbox
                                checked={perm?.can_edit ?? false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(mod.slug, 'can_edit', !!v)
                                }
                              />
                            </td>
                            <td className="text-center py-2 px-2">
                              <Checkbox
                                checked={perm?.can_delete ?? false}
                                onCheckedChange={(v) =>
                                  handlePermissionChange(mod.slug, 'can_delete', !!v)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
