import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  Eye,
  TrendingDown,
  Users,
  Target,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatBRTRelative } from "@/lib/datetime";


interface PulseAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  related_driver_id: string | null;
  related_team_id: string | null;
}

interface AlertsCenterProps {
  accountId: string;
  onAlertCountChange?: (count: number) => void;
}

const severityConfig = {
  critical: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    badge: 'destructive' as const
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-warning', 
    bg: 'bg-warning/10',
    badge: 'secondary' as const
  },
  info: { 
    icon: Info, 
    color: 'text-primary', 
    bg: 'bg-primary/10',
    badge: 'outline' as const
  },
};

const alertTypeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  score_drop: { icon: TrendingDown, label: 'Queda de Score' },
  low_participation: { icon: Users, label: 'Baixa Participação' },
  low_score_persistent: { icon: Target, label: 'Score Baixo' },
  team_divergence: { icon: Users, label: 'Divergência de Equipe' },
  improvement: { icon: TrendingUp, label: 'Melhoria' },
};

export function AlertsCenter({ accountId, onAlertCountChange }: AlertsCenterProps) {
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('pulse_alerts')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
      
      const unreadCount = (data || []).filter(a => !a.is_read && !a.is_resolved).length;
      onAlertCountChange?.(unreadCount);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchAlerts();
    }
  }, [accountId]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('analyze-pulse-metrics', {
        body: { account_id: accountId },
      });

      if (error) throw error;

      toast({
        title: 'Análise concluída',
        description: `${data.alerts_created} novos alertas gerados.`,
      });

      fetchAlerts();
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast({
        title: 'Erro na análise',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
      
      const newUnreadCount = alerts.filter(a => a.id !== alertId && !a.is_read && !a.is_resolved).length;
      onAlertCountChange?.(newUnreadCount);
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ 
          is_resolved: true, 
          is_read: true,
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_resolved: true, is_read: true, resolved_at: new Date().toISOString() } : a
      ));
      
      const newUnreadCount = alerts.filter(a => a.id !== alertId && !a.is_read && !a.is_resolved).length;
      onAlertCountChange?.(newUnreadCount);

      toast({
        title: 'Alerta resolvido',
        description: 'O alerta foi marcado como resolvido.',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'unread') return !alert.is_read && !alert.is_resolved;
    if (activeTab === 'all') return !alert.is_resolved;
    if (activeTab === 'resolved') return alert.is_resolved;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_resolved).length;

  const renderAlert = (alert: PulseAlert) => {
    const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
    const alertType = alertTypeConfig[alert.alert_type] || { icon: Bell, label: alert.alert_type };
    const SeverityIcon = severity.icon;
    const TypeIcon = alertType.icon;

    return (
      <div 
        key={alert.id}
        className={`p-4 rounded-lg border ${severity.bg} ${!alert.is_read ? 'border-l-4' : ''}`}
        style={{ borderLeftColor: !alert.is_read ? 'hsl(var(--primary))' : undefined }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${severity.bg}`}>
              <SeverityIcon className={`h-4 w-4 ${severity.color}`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{alert.title}</h4>
                <Badge variant={severity.badge} className="text-xs">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {alertType.label}
                </Badge>
              </div>
              {alert.description && (
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatBRTRelative(new Date(alert.created_at))}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!alert.is_read && !alert.is_resolved && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => markAsRead(alert.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {!alert.is_resolved && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => resolveAlert(alert.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Central de Alertas</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Analisar Métricas
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="unread">
              Não Lidos
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Todos Ativos</TabsTrigger>
            <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <ScrollArea className="h-[400px]">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-20" />
                  <p>Nenhum alerta encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map(renderAlert)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
