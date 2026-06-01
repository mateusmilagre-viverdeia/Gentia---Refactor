import { TalentPoolFunnel, TalentPoolConversionRates } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Unlock, MessageCircle, Calendar, UserCheck } from "lucide-react";

interface TalentPoolFunnelChartProps {
  funnel: TalentPoolFunnel;
  conversionRates: TalentPoolConversionRates;
}

export function TalentPoolFunnelChart({ funnel, conversionRates }: TalentPoolFunnelChartProps) {
  const stages = [
    {
      label: "Perfis Visualizados",
      value: funnel.uniqueProfilesViewed,
      icon: Eye,
      color: "bg-blue-500",
      percentage: 100,
    },
    {
      label: "Desbloqueados",
      value: funnel.totalUnlocks,
      icon: Unlock,
      color: "bg-purple-500",
      percentage: conversionRates.viewToUnlock,
      conversionLabel: "View → Unlock",
    },
    {
      label: "Contato Iniciado",
      value: funnel.contactsInitiated,
      icon: MessageCircle,
      color: "bg-amber-500",
      percentage: conversionRates.unlockToContact,
      conversionLabel: "Unlock → Contato",
    },
    {
      label: "Entrevista",
      value: funnel.interviewsScheduled,
      icon: Calendar,
      color: "bg-orange-500",
      percentage: conversionRates.contactToInterview,
      conversionLabel: "Contato → Entrevista",
    },
    {
      label: "Contratados",
      value: funnel.hired,
      icon: UserCheck,
      color: "bg-green-500",
      percentage: conversionRates.interviewToHire,
      conversionLabel: "Entrevista → Hire",
    },
  ];

  const maxValue = Math.max(funnel.uniqueProfilesViewed, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Conversão</CardTitle>
        <CardDescription>
          Acompanhe a jornada desde visualização até contratação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, index) => {
          const widthPercentage = Math.max((stage.value / maxValue) * 100, 5);
          const Icon = stage.icon;

          return (
            <div key={stage.label} className="space-y-1">
              {/* Conversion rate arrow */}
              {index > 0 && (
                <div className="flex items-center justify-center text-xs text-muted-foreground py-1">
                  <span className="flex items-center gap-1">
                    ↓ {stage.percentage.toFixed(1)}%
                    <span className="text-muted-foreground/60">({stage.conversionLabel})</span>
                  </span>
                </div>
              )}

              {/* Stage bar */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div
                    className={`${stage.color} rounded-lg px-3 py-2 text-white flex items-center justify-between transition-all`}
                    style={{ width: `${widthPercentage}%`, minWidth: "120px" }}
                  >
                    <span className="text-sm font-medium truncate">{stage.label}</span>
                    <span className="text-sm font-bold ml-2">{stage.value}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Overall conversion */}
        {funnel.uniqueProfilesViewed > 0 && funnel.hired > 0 && (
          <div className="pt-4 border-t mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa geral (View → Hire)</span>
              <span className="font-bold text-green-600">
                {((funnel.hired / funnel.uniqueProfilesViewed) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
