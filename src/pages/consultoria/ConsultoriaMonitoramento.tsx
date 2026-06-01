// Wrapper for the existing Admin Dashboard functionality
// Uses the ConsultoriaLayout

import { Navigate } from "react-router-dom";
import { ConsultoriaLayout } from "@/components/consultoria";
import { useEPRole } from "@/hooks/useEPRole";
import { Skeleton } from "@/components/ui/skeleton";

// Import the admin dashboard content (we'll reuse the component logic)
import AdminDashboard from "@/pages/admin/Dashboard";

export default function ConsultoriaMonitoramento() {
  const { isSuperAdmin, loading: roleLoading } = useEPRole();

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

  // Only super admin can access monitoring
  if (!isSuperAdmin) {
    return <Navigate to="/consultoria" replace />;
  }

  // For now, redirect to the admin dashboard
  // In the future, this could have a dedicated monitoring view
  return <Navigate to="/admin/dashboard" replace />;
}
