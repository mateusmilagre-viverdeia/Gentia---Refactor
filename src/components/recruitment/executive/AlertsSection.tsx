import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Info, CheckCircle2, Bell } from "lucide-react";
import type { Alert } from "@/hooks/useExecutiveDashboard";

interface AlertsSectionProps {
  alerts: Alert[] | undefined;
  isLoading: boolean;
}

export function AlertsSection({ alerts, isLoading }: AlertsSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-muted-foreground">
              Nenhum alerta no momento. Seu pipeline está saudável!
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          iconColor: 'text-amber-600',
          borderColor: 'border-amber-200',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          borderColor: 'border-emerald-200',
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200',
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas e Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const Icon = styles.icon;
          
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bgColor} ${styles.borderColor}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.iconColor}`} />
              <span className="text-sm">{alert.message}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
