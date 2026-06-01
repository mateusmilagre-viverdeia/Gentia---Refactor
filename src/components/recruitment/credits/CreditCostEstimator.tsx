import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface CreditCostEstimatorProps {
  featureKey: string;
  quantity?: number;
  showBalance?: boolean;
  className?: string;
}

export function CreditCostEstimator({
  featureKey,
  quantity = 1,
  showBalance = true,
  className
}: CreditCostEstimatorProps) {
  const { getCost, balance, isLoading } = useCredits();

  if (isLoading) return null;

  const cost = getCost(featureKey);
  if (!cost) return null;

  const totalCost = cost.credits_per_use * quantity;
  const canAfford = balance >= totalCost;

  return (
    <Card className={cn("bg-muted/50", className)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{cost.description || featureKey}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {totalCost} créditos
            </Badge>
            {showBalance && (
              <div className="flex items-center gap-1.5">
                {canAfford ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={cn("text-sm font-medium", canAfford ? "text-green-600" : "text-red-500")}>
                  {Number(balance).toFixed(1)} disponíveis
                </span>
              </div>
            )}
          </div>
        </div>
        {!canAfford && (
          <p className="text-xs text-red-500 mt-2">
            Créditos insuficientes. Você precisa de mais {(totalCost - balance).toFixed(1)} créditos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface MultiCostEstimatorProps {
  features: { featureKey: string; quantity?: number; label?: string }[];
  className?: string;
}

export function MultiCostEstimator({ features, className }: MultiCostEstimatorProps) {
  const { getCost, balance, isLoading } = useCredits();

  if (isLoading) return null;

  let totalCost = 0;
  const items: { label: string; cost: number }[] = [];

  features.forEach(({ featureKey, quantity = 1, label }) => {
    const cost = getCost(featureKey);
    if (!cost) return;
    const itemCost = cost.credits_per_use * quantity;
    totalCost += itemCost;
    items.push({ label: label || cost.description || featureKey, cost: itemCost });
  });

  if (items.length === 0) return null;

  const canAfford = balance >= totalCost;

  return (
    <Card className={cn("bg-muted/50", className)}>
      <CardContent className="py-3 px-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Coins className="h-4 w-4 text-amber-500" />
          Custo Estimado
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-amber-600">Total</span>
          <div className="flex items-center gap-2">
            <Badge variant={canAfford ? "outline" : "destructive"}>
              {totalCost} créditos
            </Badge>
            <span className={cn("text-xs", canAfford ? "text-muted-foreground" : "text-red-500")}>
              ({Number(balance).toFixed(1)} disponíveis)
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground pl-4">
          {items.map((item, i) => (
            <span key={i}>
              {item.label}: {item.cost}
              {i < items.length - 1 ? ' • ' : ''}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
