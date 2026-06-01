import { useState } from 'react';
import { RecruitmentLayout } from '@/components/layout/RecruitmentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, TrendingUp, History, ExternalLink, CalendarClock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useEPRole } from '@/hooks/useEPRole';
import {
  PurchaseCreditsModal,
  UsageHistoryTable,
  LowBalanceAlert,
  InterviewCostAnalytics,
  GrantCreditsModal
} from '@/components/recruitment/credits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function CreditsPage() {
  const { credits, costs, balance, subscription, manageSubscription, isLoading, refresh } = useCredits();
  const { isSuperAdmin, isHeadCS, isEPAdminRH } = useEPRole();
  const canGrantCredits = isSuperAdmin || isHeadCS || isEPAdminRH;
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);

  const credit = credits[0];
  const monthlyUsed = credit?.monthly_used || 0;
  const monthlyIncluded = credit?.monthly_included || 0;
  const usagePercent = monthlyIncluded > 0 ? (monthlyUsed / monthlyIncluded) * 100 : 0;

  const hasActiveSub = subscription?.has_subscription && subscription?.status === 'active';

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6" />
              Créditos & Uso
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus créditos e visualize o histórico de consumo
            </p>
          </div>
          <div className="flex gap-2">
            {canGrantCredits && (
              <Button variant="outline" onClick={() => setGrantModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Conceder Créditos
              </Button>
            )}
            <Button onClick={() => setPurchaseModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {hasActiveSub ? 'Alterar Plano' : 'Assinar Plano'}
            </Button>
          </div>
        </div>

        {/* Low Balance Alert */}
        <LowBalanceAlert threshold={10} />

        {/* Balance Card with Subscription Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Saldo de Créditos
              {hasActiveSub && (
                <Badge variant="success" className="ml-2">
                  {subscription?.package_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-bold">{Number(balance).toFixed(1)}</div>

            {hasActiveSub && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {subscription?.credits_per_period} créditos/mês
                </span>
                {subscription?.current_period_end && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}

            {monthlyIncluded > 0 && (
              <>
                <div className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {Number(monthlyUsed).toFixed(1)}/{Number(monthlyIncluded).toFixed(1)} usados este mês
                </div>
                <Progress value={Math.min(usagePercent, 100)} className="h-1.5" />
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPurchaseModalOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                {hasActiveSub ? 'Alterar Plano' : 'Assinar Plano'}
              </Button>
              {hasActiveSub && (
                <Button variant="ghost" size="sm" onClick={() => manageSubscription()}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Gerenciar Assinatura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Costs Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Tabela de Custos
            </CardTitle>
            <CardDescription>
              Custo em créditos por funcionalidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="font-medium text-sm">{cost.description}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {cost.credits_per_use}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage History & Cost Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico e Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="history">
              <TabsList className="mb-4">
                <TabsTrigger value="history">Histórico de Uso</TabsTrigger>
                <TabsTrigger value="voice-costs">Custos de Entrevistas</TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                <UsageHistoryTable />
              </TabsContent>
              <TabsContent value="voice-costs">
                <InterviewCostAnalytics />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Purchase Modal */}
        <PurchaseCreditsModal
          open={purchaseModalOpen}
          onOpenChange={setPurchaseModalOpen}
        />

        <GrantCreditsModal
          open={grantModalOpen}
          onOpenChange={setGrantModalOpen}
          onSuccess={refresh}
        />
      </div>
    </RecruitmentLayout>
  );
}
