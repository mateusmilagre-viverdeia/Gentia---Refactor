import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Coins, X, Zap } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useAutoRecharge } from '@/hooks/useAutoRecharge';
import { PurchaseCreditsModal } from './PurchaseCreditsModal';
import { cn } from '@/lib/utils';

interface LowBalanceAlertProps {
  threshold?: number;
  creditTypes?: string[];
  onPurchase?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function LowBalanceAlert({
  threshold = 5,
  onPurchase,
  onDismiss,
  className,
  compact = false
}: LowBalanceAlertProps) {
  const { balance, isLoading } = useCredits();
  const { settings: autoRechargeSettings } = useAutoRecharge();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  if (isLoading) return null;

  const isLow = balance > 0 && balance < threshold;
  const isEmpty = balance === 0;

  if (!isLow && !isEmpty) return null;

  const hasAutoRecharge = autoRechargeSettings?.enabled;

  const handlePurchaseClick = () => {
    if (onPurchase) {
      onPurchase();
    } else {
      setPurchaseOpen(true);
    }
  };

  if (compact) {
    return (
      <>
        <div className={cn(
          "px-3 py-2 rounded-lg text-xs",
          isEmpty
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          className
        )}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {isEmpty ? 'Créditos esgotados' : `Créditos baixos (${Number(balance).toFixed(1)})`}
            </span>
            {hasAutoRecharge && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Auto
              </Badge>
            )}
          </div>
        </div>
        <PurchaseCreditsModal open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      </>
    );
  }

  return (
    <>
      <Alert variant={isEmpty ? "destructive" : "default"} className={cn("relative", className)}>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          {isEmpty ? 'Créditos Esgotados' : 'Créditos Baixos'}
          {hasAutoRecharge && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Recarga automática ativa
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {isEmpty ? (
            <p>Você não possui mais créditos. Algumas funcionalidades estão indisponíveis.</p>
          ) : (
            <p>Seus créditos estão acabando ({Number(balance).toFixed(1)} restantes).</p>
          )}
          {hasAutoRecharge ? (
            <p className="text-xs text-muted-foreground mt-2">
              A recarga automática será acionada quando o saldo ficar abaixo do limite configurado.
            </p>
          ) : (
            <Button
              variant={isEmpty ? "default" : "outline"}
              size="sm"
              className="mt-3"
              onClick={handlePurchaseClick}
            >
              <Coins className="h-4 w-4 mr-1" />
              {isEmpty ? 'Comprar Créditos Agora' : 'Fazer Upgrade'}
            </Button>
          )}
        </AlertDescription>
      </Alert>
      <PurchaseCreditsModal open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </>
  );
}
