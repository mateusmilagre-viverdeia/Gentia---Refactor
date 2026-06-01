import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Briefcase, PauseCircle, CheckCircle2, FileEdit } from "lucide-react";

interface PipelineHealthCardProps {
  pipelineHealth: number;
  jobsByStatus: {
    active: number;
    paused: number;
    closed: number;
    draft: number;
  } | undefined;
  isLoading: boolean;
}

export function PipelineHealthCard({ pipelineHealth, jobsByStatus, isLoading }: PipelineHealthCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthColor = pipelineHealth >= 70 
    ? 'text-emerald-600' 
    : pipelineHealth >= 40 
      ? 'text-amber-600' 
      : 'text-red-600';

  const healthBgColor = pipelineHealth >= 70 
    ? 'bg-emerald-500' 
    : pipelineHealth >= 40 
      ? 'bg-amber-500' 
      : 'bg-red-500';

  const healthLabel = pipelineHealth >= 70 
    ? 'Excelente' 
    : pipelineHealth >= 40 
      ? 'Atenção' 
      : 'Crítico';

  const statusItems = [
    { 
      label: 'Ativas', 
      value: jobsByStatus?.active || 0, 
      icon: Briefcase,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      label: 'Pausadas', 
      value: jobsByStatus?.paused || 0, 
      icon: PauseCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: 'Fechadas', 
      value: jobsByStatus?.closed || 0, 
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Rascunhos', 
      value: jobsByStatus?.draft || 0, 
      icon: FileEdit,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Saúde do Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Gauge */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={`${pipelineHealth * 2.51} 251`}
                className={healthColor}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${healthColor}`}>{pipelineHealth}</span>
              <span className="text-xs text-muted-foreground">Score</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${healthBgColor} text-white`}>
            {healthLabel}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-2 p-3 rounded-lg ${item.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${item.color}`} />
                <div>
                  <div className="text-lg font-semibold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
