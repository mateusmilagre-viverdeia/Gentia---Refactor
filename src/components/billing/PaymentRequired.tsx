import { useState } from 'react';
import { CreditCard, AlertTriangle, Clock, Loader2, Building2, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBilling } from '@/contexts/BillingContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function PaymentRequired() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const { status, daysUntilBlocked, refresh, trialEnd, daysUntilTrialEnd } = useBilling();
  const { signOut } = useAuth();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleStartSubscription = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoadingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { org_id: currentOrganization.id }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing-portal', {
        body: { org_id: currentOrganization.id }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      toast.error('Erro ao abrir portal de pagamento. Tente novamente.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'blocked':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-destructive" />,
          title: 'Acesso Bloqueado',
          description: 'Sua assinatura está vencida e o período de carência expirou. Atualize seu pagamento para continuar usando a plataforma.',
          showPortal: true,
          showCheckout: false,
        };
      case 'past_due':
        return {
          icon: <Clock className="h-16 w-16 text-warning" />,
          title: 'Pagamento Pendente',
          description: daysUntilBlocked 
            ? `Seu pagamento está atrasado. Você tem ${daysUntilBlocked} dia${daysUntilBlocked !== 1 ? 's' : ''} para regularizar antes do bloqueio.`
            : 'Seu pagamento está atrasado. Regularize para evitar o bloqueio.',
          showPortal: true,
          showCheckout: false,
        };
      case 'unpaid':
      default:
        if (trialEnd && (daysUntilTrialEnd === 0 || daysUntilTrialEnd === null)) {
          return {
            icon: <CreditCard className="h-16 w-16 text-muted-foreground" />,
            title: 'Seu teste gratuito terminou',
            description: 'Para continuar usando a plataforma, você precisa ativar sua assinatura.',
            showPortal: false,
            showCheckout: true,
          };
        }
        return {
          icon: <CreditCard className="h-16 w-16 text-muted-foreground" />,
          title: 'Assinatura Necessária',
          description: 'Para acessar a plataforma, você precisa ativar sua assinatura.',
          showPortal: false,
          showCheckout: true,
        };
    }
  };

  const content = getStatusContent();

  const otherOrgs = organizations.filter(org => org.id !== currentOrganization?.id);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {otherOrgs.length > 0 && (
            <div className="mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{currentOrganization?.name}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[300px] bg-popover">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Trocar para outra organização
                  </div>
                  <DropdownMenuSeparator />
                  {otherOrgs.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => switchOrganization(org.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1">{org.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground mt-2">
                Você pode trocar para outra organização que já tenha assinatura ativa.
              </p>
            </div>
          )}

          <div className="flex justify-center mb-4">
            {content.icon}
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription className="text-base">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.showCheckout && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleStartSubscription}
              disabled={isLoadingCheckout}
            >
              {isLoadingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Iniciar Assinatura
                </>
              )}
            </Button>
          )}
          
          {content.showPortal && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo portal...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Atualizar Pagamento
                </>
              )}
            </Button>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => refresh()}
          >
            Verificar Status Novamente
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Se você acabou de realizar o pagamento, aguarde alguns segundos e clique em "Verificar Status Novamente".
          </p>

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
