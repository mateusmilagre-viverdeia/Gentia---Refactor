import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Check, Zap, Loader2, ArrowUp, ArrowDown, ExternalLink, Clock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { usePlatformCreditConfig } from '@/hooks/usePricingAdmin';
import { estimateMinutesPerCredits } from '@/lib/pricingCalculator';
import { cn } from '@/lib/utils';

const formatInterviewMinutes = (minutes: number) =>
  `~${new Intl.NumberFormat('pt-BR').format(minutes)} min`;

interface PurchaseCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}

export function PurchaseCreditsModal({ open, onOpenChange }: PurchaseCreditsModalProps) {
  const { packages, subscription, subscriptionLoading, subscribeToPlan, manageSubscription } = useCredits();
  const { data: pricingConfig } = usePlatformCreditConfig();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const usdToBrl = Number(pricingConfig?.usd_to_brl ?? 5.10);
  const marginPercent = Number(pricingConfig?.margin_percent ?? 100);

  const handleSubscribe = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      await subscribeToPlan(packageId);
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const currentPackageId = subscription?.package_id;
  const hasActiveSub = subscription?.has_subscription && subscription?.status === 'active';

  // Find current package index for upgrade/downgrade comparison
  const currentPkgIndex = packages.findIndex(p => p.id === currentPackageId);

  const getButtonConfig = (pkg: typeof packages[0], index: number) => {
    if (!hasActiveSub) {
      return { label: 'Assinar', variant: pkg.is_popular ? 'default' as const : 'outline' as const, icon: null };
    }
    if (pkg.id === currentPackageId) {
      return { label: 'Plano Atual', variant: 'secondary' as const, icon: null, disabled: true };
    }
    if (index > currentPkgIndex) {
      return { label: 'Upgrade', variant: 'default' as const, icon: <ArrowUp className="h-4 w-4 mr-1" /> };
    }
    return { label: 'Downgrade', variant: 'outline' as const, icon: <ArrowDown className="h-4 w-4 mr-1" /> };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Planos de Créditos
          </DialogTitle>
          <DialogDescription>
            Escolha o plano ideal para suas necessidades de recrutamento. Créditos acumulam entre os meses.
          </DialogDescription>
        </DialogHeader>

        {subscriptionLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mt-4">
              {packages.map((pkg, index) => {
                const btnConfig = getButtonConfig(pkg, index);
                const isCurrentPlan = pkg.id === currentPackageId && hasActiveSub;
                const pricePerCreditCents = pkg.price_per_credit_cents ?? Math.round(pkg.price_cents / pkg.credits);
                const pricePerCredit = formatPrice(pricePerCreditCents);
                const creditValueBrl = pricePerCreditCents / 100;
                const minutesPerCredit = estimateMinutesPerCredits(1, { usdToBrl, marginPercent, creditValueBrl });
                const totalInterviewMinutes = estimateMinutesPerCredits(pkg.credits, { usdToBrl, marginPercent, creditValueBrl });
                const savings = index > 0
                  ? Math.round((1 - (pkg.price_cents / pkg.credits) / (packages[0].price_cents / packages[0].credits)) * 100)
                  : 0;

                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "relative transition-all hover:shadow-md flex flex-col",
                      isCurrentPlan && "border-primary ring-2 ring-primary/20",
                      pkg.is_popular && !isCurrentPlan && "border-primary/50 shadow-sm"
                    )}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap" variant="default">
                        Seu Plano
                      </Badge>
                    )}
                    {pkg.is_popular && !isCurrentPlan && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap" variant="default">
                        <Zap className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    <CardContent className="pt-5 pb-4 px-3 flex flex-col flex-1 space-y-3">
                      <div className="text-center">
                        <div className="font-bold text-sm">{pkg.name}</div>
                        <div className="text-2xl font-bold mt-1">{pkg.credits}</div>
                        <div className="text-xs text-muted-foreground">créditos/mês</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold">{formatPrice(pkg.price_cents)}</div>
                        <div className="text-xs text-muted-foreground">/mês</div>
                      </div>

                      <div className="space-y-1.5 text-xs flex-1">
                        <div className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                          <span>{pricePerCredit}/crédito</span>
                        </div>
                        {pkg.name?.startsWith('Pro ') && (
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Clock className="h-3 w-3 text-primary shrink-0" />
                            <span>{formatInterviewMinutes(totalInterviewMinutes)} de entrevistas IA</span>
                          </div>
                        )}
                        {savings > 0 && (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <Check className="h-3 w-3 shrink-0" />
                            <span>{savings}% economia</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Check className="h-3 w-3 shrink-0" />
                          <span>Acumula saldo</span>
                        </div>
                      </div>

                      <Button
                        className="w-full text-xs"
                        size="sm"
                        variant={btnConfig.variant}
                        onClick={() => handleSubscribe(pkg.id)}
                        disabled={purchasing === pkg.id || btnConfig.disabled}
                      >
                        {purchasing === pkg.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            {btnConfig.icon}
                            {btnConfig.label}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground text-center">
              Estimativa baseada no consumo médio de entrevistas por voz com IA. Créditos também são consumidos em outras ações da plataforma (hunting, enriquecimento de candidatos, geração de conteúdo, etc.).
            </p>

            {/* Pro-rata info & manage */}
            <div className="mt-4 space-y-3">
              {hasActiveSub && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="text-sm">
                    <span className="font-medium">Plano ativo:</span>{' '}
                    {subscription?.package_name} — {subscription?.credits_per_period} créditos/mês
                    {subscription?.current_period_end && (
                      <span className="text-muted-foreground ml-2">
                        · Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => manageSubscription()}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Gerenciar
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {hasActiveSub
                  ? 'Upgrades são cobrados pro-rata e os créditos proporcionais ao tempo restante são adicionados imediatamente. Downgrades passam a valer na próxima renovação. Créditos não utilizados acumulam entre os meses.'
                  : 'Assinatura mensal recorrente. Créditos não utilizados acumulam para o próximo mês.'}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
