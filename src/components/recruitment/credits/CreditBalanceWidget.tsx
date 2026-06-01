import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Plus, RefreshCw } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface CreditBalanceWidgetProps {
  onPurchase?: () => void;
  compact?: boolean;
}

export function CreditBalanceWidget({ onPurchase, compact = false }: CreditBalanceWidgetProps) {
  const { credits, balance, isLoading, refresh } = useCredits();
  const credit = credits[0];

  if (isLoading) {
    return (
      <Card className={cn(compact ? "p-3" : "")}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando créditos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credit) {
    return (
      <Card className={cn(compact ? "p-3" : "")}>
        <CardContent className="pt-4">
          <div className="text-center text-muted-foreground">
            <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum crédito disponível</p>
            {onPurchase && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onPurchase}>
                <Plus className="h-4 w-4 mr-1" />
                Comprar Créditos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{Number(balance).toFixed(1)} créditos</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {onPurchase && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPurchase}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const usagePercent = credit.monthly_included > 0
    ? (credit.monthly_used / credit.monthly_included) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Seus Créditos
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onPurchase && (
              <Button variant="outline" size="sm" onClick={onPurchase}>
                <Plus className="h-4 w-4 mr-1" />
                Comprar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold">{Number(balance).toFixed(1)}</div>
        {credit.monthly_included > 0 && (
          <>
            <div className="text-xs text-muted-foreground">
              {Number(credit.monthly_used).toFixed(1)}/{Number(credit.monthly_included).toFixed(1)} usados este mês
            </div>
            <Progress value={Math.min(usagePercent, 100)} className="h-1.5" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
