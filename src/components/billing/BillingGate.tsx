import { useBilling } from '@/contexts/BillingContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PaymentRequired } from './PaymentRequired';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEPRole } from '@/hooks/useEPRole';

interface BillingGateProps {
  children: React.ReactNode;
}

export function BillingGate({ children }: BillingGateProps) {
  const { canAccess, isLoading, status } = useBilling();
  const { loading: orgLoading, currentOrganization, isConsultantMode } = useOrganization();
  const { user } = useAuth();
  const { isSuperAdmin, isHeadCS, loading: roleLoading } = useEPRole();

  const { data: isAssignedConsultant, isLoading: consultantCheckLoading } = useQuery({
    queryKey: ['consultant-billing-bypass', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) return false;
      
      const { data: consultant } = await supabase
        .from('ep_consultants')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();
      
      if (!consultant) return false;

      const { data: assignment } = await supabase
        .from('consultant_assignments')
        .select('id')
        .eq('consultant_id', consultant.id)
        .eq('account_id', currentOrganization.id)
        .eq('active', true)
        .maybeSingle();

      return !!assignment;
    },
    enabled: !!user?.id && !!currentOrganization?.id && !isConsultantMode && !canAccess,
    staleTime: 60_000,
  });

  if (isLoading || orgLoading || consultantCheckLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Super admins and Head CS always bypass billing
  if (isSuperAdmin || isHeadCS) {
    return <>{children}</>;
  }

  // Consultants bypass billing
  if (isConsultantMode || isAssignedConsultant) {
    return <>{children}</>;
  }

  if (status === 'no_org' || status === 'admin_grant') {
    return <>{children}</>;
  }

  console.log('[BillingGate] Status:', status, 'canAccess:', canAccess, 'org:', currentOrganization?.id);

  if (!canAccess) {
    return <PaymentRequired />;
  }

  return <>{children}</>;
}
