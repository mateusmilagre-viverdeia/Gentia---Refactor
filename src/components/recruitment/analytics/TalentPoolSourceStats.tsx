import { TalentPoolSourceStats as SourceStats } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Unlock, Coins, UserCheck, TrendingUp } from "lucide-react";

interface TalentPoolSourceStatsProps {
  stats: SourceStats;
}

export function TalentPoolSourceStats({ stats }: TalentPoolSourceStatsProps) {
  const metrics = [
    {
      label: "Candidatos Compartilhados",
      value: stats.totalCandidatesShared,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Views Recebidas",
      value: stats.totalViewsReceived,
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Desbloqueios",
      value: stats.totalUnlocksReceived,
      icon: Unlock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Créditos Gerados",
      value: stats.totalCreditsGenerated,
      icon: Coins,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      suffix: " créditos",
    },
    {
      label: "Contratações",
      value: stats.hiresFromOurPool,
      icon: UserCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Média Unlocks/Candidato",
      value: stats.avgUnlocksPerCandidate,
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Valor Gerado (Fonte)</CardTitle>
        <CardDescription>
          Métricas dos candidatos que sua organização compartilhou no pool
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`${metric.bgColor} rounded-lg p-4 text-center`}
              >
                <Icon className={`h-6 w-6 ${metric.color} mx-auto mb-2`} />
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                  {metric.suffix && <span className="text-sm">{metric.suffix}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metric.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight card */}
        {stats.totalCandidatesShared > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Insights</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {stats.avgUnlocksPerCandidate >= 2 && (
                <li>• Seus candidatos têm alta demanda ({stats.avgUnlocksPerCandidate.toFixed(1)} unlocks/candidato)</li>
              )}
              {stats.hiresFromOurPool > 0 && (
                <li>• {stats.hiresFromOurPool} candidato(s) do seu pool já foram contratados</li>
              )}
              {stats.totalCreditsGenerated > 0 && (
                <li>• Você gerou {stats.totalCreditsGenerated} créditos para o ecossistema</li>
              )}
              {stats.totalCandidatesShared > 0 && stats.totalUnlocksReceived === 0 && (
                <li>• Considere atualizar os perfis para aumentar a visibilidade</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
