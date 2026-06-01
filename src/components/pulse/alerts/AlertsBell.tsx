import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

import { AlertTriangle, AlertCircle, Info, TrendingUp, TrendingDown, Users, Target } from 'lucide-react';
import { formatBRTRelative } from "@/lib/datetime";

interface PulseAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  is_read: boolean;
  created_at: string;
}

interface AlertsBellProps {
  accountId: string | null;
}

const severityIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColors = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
};

export function AlertsBell({ accountId }: AlertsBellProps) {
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('pulse_alerts')
        .select('id, alert_type, severity, title, description, is_read, created_at')
        .eq('account_id', accountId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      setAlerts(data || []);
    };

    fetchAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('pulse-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pulse_alerts',
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('pulse_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, is_read: true } : a
    ));
  };

  const markAllAsRead = async () => {
    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('pulse_alerts')
      .update({ is_read: true })
      .in('id', unreadIds);

    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  if (!accountId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Alertas Pulse</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todos como lidos
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Nenhum alerta</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                const Icon = severityIcons[alert.severity as keyof typeof severityIcons] || Info;
                const colorClass = severityColors[alert.severity as keyof typeof severityColors] || 'text-primary';
                
                return (
                  <div 
                    key={alert.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!alert.is_read ? 'bg-muted/30' : ''}`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 ${colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${!alert.is_read ? '' : 'text-muted-foreground'}`}>
                            {alert.title}
                          </p>
                          {!alert.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        {alert.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {alert.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatBRTRelative(new Date(alert.created_at))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {alerts.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => {
                setOpen(false);
                window.location.href = '/retencao/pulse/dashboard';
              }}
            >
              Ver todos os alertas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
