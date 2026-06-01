import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFunnelBySourceAnalytics, type FunnelBySource } from "@/hooks/useFunnelBySourceAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { GitBranch, TrendingUp, Users, UserCheck, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FunnelBySourceChartProps {
  period: DashboardPeriod;
}

export function FunnelBySourceChart({ period }: FunnelBySourceChartProps) {
  const { data, isLoading } = useFunnelBySourceAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Funil por Fonte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Funil por Fonte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <GitBranch className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado de funil disponível</p>
            <p className="text-xs mt-1">Dados aparecerão conforme candidatos avancem no processo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" />
          Funil de Conversão por Fonte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {data.slice(0, 6).map((sourceFunnel) => (
              <SourceFunnelItem key={sourceFunnel.source} data={sourceFunnel} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SourceFunnelItem({ data }: { data: FunnelBySource }) {
  const maxCount = data.steps[0]?.count || 1;

  return (
    <div className="space-y-3 pb-4 border-b last:border-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium">{data.sourceLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{data.totalCandidates}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5" />
            <span>{data.totalHired}</span>
          </div>
          <Badge 
            variant={data.overallConversion >= 10 ? "default" : "secondary"}
            className="text-xs"
          >
            {data.overallConversion}%
          </Badge>
        </div>
      </div>

      {/* Funnel Steps */}
      <div className="space-y-2">
        {data.steps.map((step, index) => {
          const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          
          return (
            <div key={step.event} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">{step.eventLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.count}</span>
                  {step.conversionFromPrevious !== null && (
                    <span className={`text-xs ${step.conversionFromPrevious >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                      ({step.conversionFromPrevious}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2">
                <div 
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.max(widthPercent, 2)}%`,
                    backgroundColor: data.color,
                    opacity: 1 - (index * 0.15),
                  }}
                />
                <div className="absolute top-0 left-0 w-full h-full bg-muted rounded-full -z-10" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
