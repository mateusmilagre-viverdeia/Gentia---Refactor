import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamManagement } from "@/components/team/TeamManagement";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const Usuarios = () => {
  const { user } = useAuth();
  const { account, accountRole, loading } = useAccount();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle return from Stripe after seat purchase
  useEffect(() => {
    const seatsPurchased = searchParams.get('seats_purchased');
    const quantity = searchParams.get('quantity');
    
    if (seatsPurchased === 'true') {
      const qty = parseInt(quantity || '1');
      toast.success(
        `Compra realizada com sucesso! ${qty} assento${qty > 1 ? 's' : ''} será${qty > 1 ? 'ão' : ''} adicionado${qty > 1 ? 's' : ''} em instantes.`,
        {
          duration: 6000,
          description: 'O pagamento está sendo processado pelo Stripe.'
        }
      );
      
      // Clear URL params
      navigate('/conta/equipe', { replace: true });
    }
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <AppLayout title="Equipe & Permissões" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }, { label: "Equipe & Permissões" }]}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout title="Equipe & Permissões" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }, { label: "Equipe & Permissões" }]}>
        <Card>
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Nenhuma Empresa Configurada</CardTitle>
            <CardDescription>
              Configure sua empresa em "Minha Empresa" primeiro para gerenciar sua equipe.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Equipe & Permissões" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }, { label: "Equipe & Permissões" }]}>
      <TeamManagement 
        accountId={account.id}
        accountName={account.name}
        currentUserRole={accountRole || 'viewer'}
        currentUserId={user?.id || ''}
      />
    </AppLayout>
  );
};

export default Usuarios;
