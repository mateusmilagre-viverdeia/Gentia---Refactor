import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell, BellDot, Star, Briefcase, MessageCircle, AlertTriangle,
  RefreshCw, Check, CheckCheck, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBRTRelative } from "@/lib/datetime";


const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  high_score: { icon: Star, color: 'text-amber-500' },
  cross_match: { icon: Briefcase, color: 'text-blue-500' },
  response_received: { icon: MessageCircle, color: 'text-green-500' },
  stale_job: { icon: AlertTriangle, color: 'text-destructive' },
  recurring_results: { icon: RefreshCw, color: 'text-purple-500' },
};

export function HuntingNotifications() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['hunting-notifications', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('hunting_notifications')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!currentOrganization?.id,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('hunting_notifications')
        .update({ read: true })
        .eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunting-notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) return;
      await supabase
        .from('hunting_notifications')
        .update({ read: true })
        .eq('account_id', currentOrganization.id)
        .eq('read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunting-notifications'] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) return;
      await supabase
        .from('hunting_notifications')
        .delete()
        .eq('account_id', currentOrganization.id)
        .eq('read', true);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunting-notifications'] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações Hunting</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCheck className="h-3 w-3" />
                Ler todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => clearAllMutation.mutate()}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif: any) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.high_score;
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    className={cn(
                      'w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-3',
                      !notif.read && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (!notif.read) markReadMutation.mutate(notif.id);
                    }}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium truncate', !notif.read && 'text-foreground')}>
                          {notif.title}
                        </p>
                        {!notif.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatBRTRelative(new Date(notif.created_at))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
