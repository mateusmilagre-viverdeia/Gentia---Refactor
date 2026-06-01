// Wrapper for the existing Support Dashboard functionality
// Uses the ConsultoriaLayout

import { Navigate } from "react-router-dom";
import { ConsultoriaLayout } from "@/components/consultoria";
import { useEPRole } from "@/hooks/useEPRole";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConsultoriaSuporte() {
  const { isSuperAdmin, isHeadCS, loading: roleLoading } = useEPRole();

  if (roleLoading) {
    return (
      <ConsultoriaLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </ConsultoriaLayout>
    );
  }

  // Only super admin and head cs can access support
  if (!isSuperAdmin && !isHeadCS) {
    return <Navigate to="/consultoria" replace />;
  }

  // Redirect to the admin support dashboard
  return <Navigate to="/admin/suporte" replace />;
}
