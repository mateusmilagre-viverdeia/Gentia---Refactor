import { useState } from "react";
import { useTalentPoolAnalytics } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Store, Users, Coins, UserCheck, TrendingUp, Eye } from "lucide-react";
import { TalentPoolFunnelChart } from "./TalentPoolFunnelChart";
import { CreditRevenueChart } from "./CreditRevenueChart";
import { TalentPoolTrendChart } from "./TalentPoolTrendChart";
import { TalentPoolSourceStats } from "./TalentPoolSourceStats";

export function TalentPoolAnalyticsTab() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const { data: analytics, isLoading, error } = useTalentPoolAnalytics("overview", periodDays);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>Erro ao carregar analytics: {error.message}</p>
      </div>
    );
  }

  const buyer = analytics?.buyer;
  const source = analytics?.source;
  const overview = analytics?.overview;

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Analytics do Talent Pool
          </h2>
          <p className="text-sm text-muted-foreground">
            Métricas de conversão, consumo de créditos e performance
          </p>
        </div>
        <Select
          value={periodDays.toString()}
          onValueChange={(v) => setPeriodDays(parseInt(v))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview?.totalInPool || 0}</p>
                <p className="text-xs text-muted-foreground">No Pool</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Eye className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{buyer?.funnel.totalViews || 0}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{buyer?.revenue.totalCreditsSpent || 0}</p>
                <p className="text-xs text-muted-foreground">Créditos Gastos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{buyer?.funnel.hired || 0}</p>
                <p className="text-xs text-muted-foreground">Contratados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="buyer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="buyer" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Como Comprador
          </TabsTrigger>
          <TabsTrigger value="source" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Como Fonte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buyer" className="space-y-6">
          {buyer ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TalentPoolFunnelChart
                  funnel={buyer.funnel}
                  conversionRates={buyer.conversionRates}
                />
                <CreditRevenueChart revenue={buyer.revenue} />
              </div>
              <TalentPoolTrendChart trends={buyer.trends} />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma atividade como comprador no período selecionado</p>
                <p className="text-sm mt-2">
                  Explore o Talent Pool e desbloqueie candidatos para ver métricas aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="source" className="space-y-6">
          {source && source.totalCandidatesShared > 0 ? (
            <TalentPoolSourceStats stats={source} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum candidato compartilhado no pool</p>
                <p className="text-sm mt-2">
                  Candidatos desqualificados com bom fit cultural podem ser adicionados automaticamente
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
