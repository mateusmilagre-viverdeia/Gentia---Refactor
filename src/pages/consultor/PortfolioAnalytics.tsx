import { AppLayout } from "@/components/layout/AppLayout";
import { PortfolioAnalyticsDashboard } from "@/components/consultor/analytics";
import { useEPRole } from "@/hooks/useEPRole";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioAnalytics() {
  const { isEPTeam, loading: roleLoading } = useEPRole();

  const breadcrumb = [
    { label: "Home", href: "/" },
    { label: "Consultoria EP", href: "/consultor/dashboard" },
    { label: "Analytics do Portfolio" }
  ];

  if (roleLoading) {
    return (
      <AppLayout title="Analytics" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!isEPTeam) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout title="Analytics do Portfolio" breadcrumb={breadcrumb}>
      <div className="p-6">
        <PortfolioAnalyticsDashboard />
      </div>
    </AppLayout>
  );
}
