import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useLicensedAccess } from '@/hooks/useLicensedAccess';
import { ViewOnlyBanner } from '@/components/ui/ViewOnlyBanner';
import { Lock } from 'lucide-react';

interface LicensedRouteGuardProps {
  children: ReactNode;
}

export function LicensedRouteGuard({ children }: LicensedRouteGuardProps) {
  const location = useLocation();
  const { isRouteDisabled, isRouteViewOnly, getRouteAccessLevel } = useLicensedAccess();

  const accessLevel = getRouteAccessLevel(location.pathname);
  const isDisabled = isRouteDisabled(location.pathname);
  const isViewOnly = isRouteViewOnly(location.pathname);

  // If route is disabled, show blocked message
  if (isDisabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Módulo Indisponível</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Este módulo não está disponível no plano atual da sua organização.
          Entre em contato com seu consultor para mais informações.
        </p>
      </div>
    );
  }

  // If route is view-only, show banner and children
  if (isViewOnly) {
    return (
      <>
        <ViewOnlyBanner />
        {children}
      </>
    );
  }

  // Full access
  return <>{children}</>;
}
