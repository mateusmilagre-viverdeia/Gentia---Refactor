import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserPlus, 
  UserMinus,
  Calendar, 
  AlertTriangle, 
  CreditCard, 
  ExternalLink,
  Loader2,
  Info,
  RefreshCw,
  Gift
} from 'lucide-react';

import { toast } from 'sonner';
import { ReduceSeatsModal } from './ReduceSeatsModal';
import { formatBRT } from "@/lib/datetime";

interface SeatsPanelProps {
  accountId: string;
  totalSeats: number;
  usedSeats: number;
  pendingSeats: number;
  availableSeats: number;
  grantedSeats?: number;
  grantedSeatsValidUntil?: string | null;
  onPurchaseClick: () => void;
  onRefresh: () => void;
  isEPPartnerOrg?: boolean;
}

interface BillingInfo {
  nextBillingDate: Date | null;
  includedSeats: number;
  additionalSeats: number;
  status: string | null;
}

export function SeatsPanel({
  accountId,
  totalSeats,
  usedSeats,
  pendingSeats,
  availableSeats,
  grantedSeats = 0,
  grantedSeatsValidUntil = null,
  onPurchaseClick,
  onRefresh,
  isEPPartnerOrg = false,
}: SeatsPanelProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    nextBillingDate: null,
    includedSeats: 1,
    additionalSeats: 0,
    status: null,
  });
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reduceModalOpen, setReduceModalOpen] = useState(false);

  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        // Fetch org_seats for included/additional breakdown
        const { data: orgSeats } = await supabase
          .from('org_seats')
          .select('included_seats, current_seat_count')
          .eq('org_id', accountId)
          .maybeSingle();

        // Fetch org_billing for next billing date
        const { data: billing } = await supabase
          .from('org_billing')
          .select('current_period_end, status')
          .eq('org_id', accountId)
          .maybeSingle();

        setBillingInfo({
          nextBillingDate: billing?.current_period_end 
            ? new Date(billing.current_period_end) 
            : null,
          includedSeats: orgSeats?.included_seats || 1,
          additionalSeats: orgSeats?.current_seat_count || 0,
          status: billing?.status || null,
        });
      } catch (err) {
        console.error('Error fetching billing info:', err);
      }
    };

    if (accountId) {
      fetchBillingInfo();
    }
  }, [accountId]);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing-portal', {
        body: { org_id: accountId }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      toast.error('Erro ao abrir portal de pagamento');
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleSyncSeats = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription-seats', {
        body: { account_id: accountId, action: 'sync' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Assentos sincronizados com sucesso');
        onRefresh();
      } else {
        toast.error(data?.error || 'Erro ao sincronizar');
      }
    } catch (err) {
      console.error('Error syncing seats:', err);
      toast.error('Erro ao sincronizar assentos');
    } finally {
      setSyncing(false);
    }
  };

  const hasOverLimit = pendingSeats > 0 && availableSeats < pendingSeats;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Gestão de Assentos
            {isEPPartnerOrg && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                <Gift className="h-3 w-3 mr-1" />
                Sócio EP
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSyncSeats} disabled={syncing}>
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sincronizar com pagamento</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* EP Partner Notice */}
        {isEPPartnerOrg && (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Gift className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700">
                Organização de Sócio EP
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode adicionar membros ilimitadamente sem cobrança adicional.
              </p>
            </div>
          </div>
        )}

        {/* Seats Breakdown - only show for non-EP Partner orgs */}
         {!isEPPartnerOrg && (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Incluídos (plano base)</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Assentos que vêm com o plano base da assinatura
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-2xl font-bold">{billingInfo.includedSeats}</span>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Adicionais (pagos)</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Assentos adicionais comprados separadamente
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-2xl font-bold">{billingInfo.additionalSeats}</span>
            </div>

             {grantedSeats > 0 && (
               <div className="p-3 bg-muted/50 rounded-lg">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="text-sm text-muted-foreground">Liberação (temporária)</span>
                   <Tooltip>
                     <TooltipTrigger>
                       <Info className="h-3.5 w-3.5 text-muted-foreground" />
                     </TooltipTrigger>
                     <TooltipContent>
                       Assentos liberados temporariamente por um admin
                     </TooltipContent>
                   </Tooltip>
                 </div>
                 <span className="text-2xl font-bold">{grantedSeats}</span>
                 {grantedSeatsValidUntil && (
                   <p className="text-xs text-muted-foreground mt-1">
                     Válido até {formatBRT(new Date(grantedSeatsValidUntil), 'dd/MM/yyyy')}
                   </p>
                 )}
               </div>
             )}
          </div>
        )}

        {/* Summary Row */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Total</span>
              <p className="font-semibold">{isEPPartnerOrg ? '∞' : totalSeats} assentos</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <span className="text-sm text-muted-foreground">Em uso</span>
              <p className="font-semibold">{usedSeats}</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <p className="font-semibold">{pendingSeats}</p>
            </div>
            {!isEPPartnerOrg && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <span className="text-sm text-muted-foreground">Disponíveis</span>
                  <p className={`font-semibold ${availableSeats === 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {availableSeats}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Next Billing Date */}
        {billingInfo.nextBillingDate && !isEPPartnerOrg && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Próxima cobrança:{' '}
              <strong>
                {formatBRT(billingInfo.nextBillingDate, "dd 'de' MMMM 'de' yyyy")}
              </strong>
            </span>
          </div>
        )}

        {/* Over Limit Alert - only for non-EP Partner orgs */}
        {hasOverLimit && !isEPPartnerOrg && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600">
                Atenção: Limite de assentos atingido
              </p>
              <p className="text-xs text-muted-foreground">
                Você tem {pendingSeats} convite{pendingSeats > 1 ? 's' : ''} pendente{pendingSeats > 1 ? 's' : ''} 
                mas apenas {availableSeats} assento{availableSeats !== 1 ? 's' : ''} disponível{availableSeats !== 1 ? 'is' : ''}.
                Compre mais assentos para liberar os convites.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onPurchaseClick} className="flex-1">
            <UserPlus className="h-4 w-4 mr-2" />
            {isEPPartnerOrg ? 'Adicionar Assentos' : 'Comprar Assentos'}
          </Button>
          {billingInfo.additionalSeats > 0 && !isEPPartnerOrg && (
            <Button 
              variant="outline" 
              onClick={() => setReduceModalOpen(true)}
              className="flex-1"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Reduzir Assentos
            </Button>
          )}
        </div>
        {!isEPPartnerOrg && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="flex-1"
            >
              {loadingPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Gerenciar Assinatura
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reduce Seats Modal - only for non-EP Partner orgs */}
      {!isEPPartnerOrg && (
        <ReduceSeatsModal
          open={reduceModalOpen}
          onClose={() => setReduceModalOpen(false)}
          accountId={accountId}
          additionalSeats={billingInfo.additionalSeats}
          usedSeats={usedSeats}
          pendingSeats={pendingSeats}
          includedSeats={billingInfo.includedSeats}
          onSuccess={onRefresh}
        />
      )}
    </Card>
  );
}
