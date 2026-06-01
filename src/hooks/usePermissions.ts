import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAccount } from '@/hooks/useAccount';
import type { PermissionAction, ModulePermission, PermissionMatrixRow } from '@/types/permissions.types';

interface UsePermissionsReturn {
  loading: boolean;
  permissionsMatrix: Record<string, ModulePermission>;
  canAccess: (moduleSlug: string, action?: PermissionAction) => boolean;
  getModulePermissions: (moduleSlug: string) => ModulePermission;
  refreshPermissions: () => Promise<void>;
}

const defaultPermission: ModulePermission = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  isCustom: false,
};

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { isOwner } = useAccount();
  const [loading, setLoading] = useState(true);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, ModulePermission>>({});

  // Use impersonated user's ID when impersonating
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const loadPermissions = useCallback(async () => {
    if (!effectiveUserId) {
      setPermissionsMatrix({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Owner tem todas as permissões
      if (isOwner) {
        const { data: modules } = await supabase
          .from('modules')
          .select('slug');

        if (modules) {
          const fullPermissions: Record<string, ModulePermission> = {};
          modules.forEach((m) => {
            fullPermissions[m.slug] = {
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              isCustom: false,
            };
          });
          setPermissionsMatrix(fullPermissions);
        }
        setLoading(false);
        return;
      }

      // Buscar matriz de permissões via função RPC
      const { data, error } = await supabase.rpc('get_user_permissions_matrix', {
        p_user_id: effectiveUserId,
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        setLoading(false);
        return;
      }

      const matrix: Record<string, ModulePermission> = {};
      (data as PermissionMatrixRow[] || []).forEach((row) => {
        matrix[row.module_slug] = {
          canView: row.can_view,
          canCreate: row.can_create,
          canEdit: row.can_edit,
          canDelete: row.can_delete,
          isCustom: row.is_custom,
        };
      });

      setPermissionsMatrix(matrix);
    } catch (error) {
      console.error('Error in usePermissions:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, isOwner]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const canAccess = useCallback(
    (moduleSlug: string, action: PermissionAction = 'view'): boolean => {
      // Owner sempre pode tudo
      if (isOwner) return true;

      const permission = permissionsMatrix[moduleSlug];
      if (!permission) return false;

      switch (action) {
        case 'view':
          return permission.canView;
        case 'create':
          return permission.canCreate;
        case 'edit':
          return permission.canEdit;
        case 'delete':
          return permission.canDelete;
        default:
          return false;
      }
    },
    [permissionsMatrix, isOwner]
  );

  const getModulePermissions = useCallback(
    (moduleSlug: string): ModulePermission => {
      if (isOwner) {
        return {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          isCustom: false,
        };
      }
      return permissionsMatrix[moduleSlug] || defaultPermission;
    },
    [permissionsMatrix, isOwner]
  );

  return {
    loading,
    permissionsMatrix,
    canAccess,
    getModulePermissions,
    refreshPermissions: loadPermissions,
  };
}
