import { AlertTriangle, Clock, Shield, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBilling } from '@/contexts/BillingContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BillingBanner() {
  const { status, daysUntilBlocked, daysUntilTrialEnd, hasGrant, grantExpiresAt } = useBilling();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  // Show trial countdown for trialing status
  if (status === 'trialing' && daysUntilTrialEnd !== null && daysUntilTrialEnd > 0) {
    const isUrgent = daysUntilTrialEnd <= 3;
    
    return (
      <div className={cn(
        "border-b px-4 py-2",
        isUrgent 
          ? "bg-warning/10 border-warning/20" 
          : "bg-primary/10 border-primary/20"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className={cn("h-4 w-4", isUrgent ? "text-warning" : "text-primary")} />
            <span>
              🎉 Período de teste: <strong>{daysUntilTrialEnd} dia{daysUntilTrialEnd !== 1 ? 's' : ''}</strong> restante{daysUntilTrialEnd !== 1 ? 's' : ''}.
            </span>
            <Link to="/conta/assinatura" className="text-primary hover:underline font-medium">
              Assinar agora
            </Link>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show grant expiration warning (7 days before)
  if (hasGrant && grantExpiresAt) {
    const daysUntilExpiration = Math.ceil(
      (grantExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration <= 7) {
      return (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span>
                Seu acesso liberado expira em <strong>{daysUntilExpiration} dia{daysUntilExpiration !== 1 ? 's' : ''}</strong>.
              </span>
              <Link to="/conta/billing" className="text-primary hover:underline font-medium">
                Ativar assinatura
              </Link>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
  }

  // Show past_due warning
  if (status === 'past_due') {
    return (
      <div className={cn(
        "border-b px-4 py-2",
        daysUntilBlocked && daysUntilBlocked <= 3 
          ? "bg-destructive/10 border-destructive/20" 
          : "bg-warning/10 border-warning/20"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {daysUntilBlocked && daysUntilBlocked <= 3 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 text-warning" />
            )}
            <span>
              {daysUntilBlocked 
                ? <>Pagamento atrasado. <strong>{daysUntilBlocked} dia{daysUntilBlocked !== 1 ? 's' : ''}</strong> restante{daysUntilBlocked !== 1 ? 's' : ''} até o bloqueio.</>
                : <>Pagamento atrasado. Regularize para evitar o bloqueio.</>
              }
            </span>
            <Link to="/conta/billing" className="text-primary hover:underline font-medium">
              Regularizar agora
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
