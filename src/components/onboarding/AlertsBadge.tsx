import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import { cn } from '@/lib/utils';
import { useAllOnboardingAlerts } from '@/hooks/useOnboardingAlerts';
import { getAlertSeverityColor } from '@/types/onboarding.types';
import { formatBRTRelative } from "@/lib/datetime";

export function AlertsBadge() {
  const { alerts, isLoading } = useAllOnboardingAlerts();

  const criticalCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <Badge 
              variant={criticalCount > 0 ? 'destructive' : 'secondary'}
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs"
            >
              {alerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <h4 className="font-medium">Alertas de Onboarding</h4>
          <p className="text-xs text-muted-foreground">
            {alerts.length === 0 ? 'Nenhum alerta pendente' : `${alerts.length} alerta(s) não lido(s)`}
          </p>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tudo em ordem!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="p-2 space-y-1">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      alert.severity === 'critical' || alert.severity === 'high' ? 'bg-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      {alert.process_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.process_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatBRTRelative(new Date(alert.created_at))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
