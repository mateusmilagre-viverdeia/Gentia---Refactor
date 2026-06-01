import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Archive, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';

type FilterType = 'all' | 'announcement' | 'action' | 'billing' | 'pending';

const filterLabels: Record<FilterType, string> = {
  all: 'Todas',
  announcement: 'Comunicados',
  action: 'Ações',
  billing: 'Cobrança',
  pending: 'Pendências',
};

export default function Notificacoes() {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    archiveNotification,
    isRead 
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  const [filter, setFilter] = useState<FilterType>('all');

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    
    const targetUrl = notification.target_url || notification.link;
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    // Tab filter
    if (activeTab === 'unread' && isRead(n.id)) return false;
    
    // Type filter
    if (filter !== 'all') {
      if (filter === 'action' && !['action', 'action_overdue'].includes(n.type)) return false;
      if (filter !== 'action' && n.type !== filter) return false;
    }
    
    return true;
  });

  // Count by type
  const countByType = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout 
      title="Notificações"
      breadcrumb={[
        { label: "Conta", href: "/conta/perfil" },
        { label: "Notificações" }
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Central de Notificações</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 
                ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Todas as notificações foram lidas'
              }
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unread' | 'all')}>
                <TabsList>
                  <TabsTrigger value="unread" className="gap-2">
                    Não lidas
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Filter by type */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {(Object.keys(filterLabels) as FilterType[]).map((type) => (
                    <Button
                      key={type}
                      variant={filter === type ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFilter(type)}
                    >
                      {filterLabels[type]}
                      {type !== 'all' && countByType[type] && (
                        <span className="ml-1 opacity-60">({countByType[type]})</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Carregando notificações...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    {activeTab === 'unread' 
                      ? 'Nenhuma notificação não lida'
                      : 'Nenhuma notificação encontrada'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className="flex items-center gap-2 pr-4">
                      <div className="flex-1">
                        <NotificationItem
                          notification={notification}
                          isRead={isRead(notification.id)}
                          onClick={() => handleNotificationClick(notification)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => archiveNotification(notification.id)}
                        title="Arquivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
