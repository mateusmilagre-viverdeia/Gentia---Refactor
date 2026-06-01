import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    isRead 
  } = useNotifications();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    
    // Navigate to target URL if available
    const targetUrl = notification.target_url || notification.link;
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const recentNotifications = notifications.slice(0, 8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center",
              "min-w-[18px] h-[18px] px-1 rounded-full",
              "bg-primary text-primary-foreground text-xs font-medium"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isRead={isRead(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                  compact
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full justify-center text-sm h-9"
            onClick={() => navigate('/conta/notificacoes')}
          >
            Ver todas as notificações
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
