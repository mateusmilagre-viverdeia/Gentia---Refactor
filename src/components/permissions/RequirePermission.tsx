import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionAction } from '@/types/permissions.types';
import { Skeleton } from '@/components/ui/skeleton';

interface RequirePermissionProps {
  module: string;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function RequirePermission({
  module,
  action = 'view',
  children,
  fallback = null,
  showLoading = false,
}: RequirePermissionProps) {
  const { loading, canAccess } = usePermissions();

  if (loading && showLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (loading) {
    return null;
  }

  if (!canAccess(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
