import { useState } from 'react';
import { CreditCard, Calendar, Users, Loader2, ExternalLink, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBilling } from '@/contexts/BillingContext';
import { toast } from 'sonner';
import { formatBRT } from "@/lib/datetime";


export default function Billing() {
  const { currentOrganization } = useOrganization();
  const { status, subscriptionEnd, hasGrant, grantExpiresAt, daysUntilBlocked, refresh, isLoading } = useBilling();
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

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Período de Teste</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pagamento Pendente</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Bloqueada</Badge>;
      case 'admin_grant':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Acesso Liberado</Badge>;
      case 'unpaid':
      default:
        return <Badge variant="outline">Sem Assinatura</Badge>;
    }
  };

  const breadcrumb = [
    { label: 'Conta', href: '/conta/perfil' },
    { label: 'Assinatura' }
  ];

  if (isLoading) {
    return (
      <AppLayout title="Assinatura" breadcrumb={breadcrumb}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Assinatura" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Status da Assinatura
                </CardTitle>
                <CardDescription>
                  Gerencie sua assinatura e método de pagamento
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Admin Grant Info */}
            {hasGrant && grantExpiresAt && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-600">Acesso Liberado pelo Suporte</p>
                  <p className="text-sm text-muted-foreground">
                    Seu acesso foi liberado temporariamente até{' '}
                    <strong>{formatBRT(grantExpiresAt, "dd 'de' MMMM 'de' yyyy")}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Past Due Warning */}
            {status === 'past_due' && daysUntilBlocked !== null && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-600">Pagamento Pendente</p>
                  <p className="text-sm text-muted-foreground">
                    Você tem <strong>{daysUntilBlocked} dia{daysUntilBlocked !== 1 ? 's' : ''}</strong> para regularizar o pagamento antes do bloqueio.
                  </p>
                </div>
              </div>
            )}

            {/* Subscription Details */}
            {(status === 'active' || status === 'trialing' || status === 'past_due') && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima renovação</p>
                    <p className="font-medium">
                      {subscriptionEnd 
                        ? formatBRT(subscriptionEnd, "dd 'de' MMMM 'de' yyyy")
                        : 'Não disponível'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Organização</p>
                    <p className="font-medium">{currentOrganization?.name || 'Não selecionada'}</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {status === 'unpaid' || status === 'blocked' ? (
                <Button 
                  onClick={handleStartSubscription}
                  disabled={isLoadingCheckout}
                  className="flex-1"
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
              ) : (
                <Button 
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="flex-1"
                >
                  {isLoadingPortal ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Abrindo portal...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Gerenciar Assinatura
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={() => refresh()}
                disabled={isLoading}
              >
                Atualizar Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Plano EP Partners</CardTitle>
            <CardDescription>
              Acesso completo à plataforma de gestão de cultura e pessoas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">R$ 297</span>
                <span className="text-muted-foreground">/mês por organização</span>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">+ R$ 19,90</span>
                <span className="text-muted-foreground">/mês por usuário adicional</span>
              </div>

              <Separator />

              <div className="grid gap-2">
                {[
                  'Diagnóstico de Cultura Organizacional',
                  'Criação de Cultura e Culture Code',
                  'Atração e Contratação por Valores',
                  'Assessment DISC e People Analytics',
                  'Gestão de Onboarding',
                  'Pulse (Termômetro Organizacional)',
                  'Planos de Ação',
                  'Suporte prioritário'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
