import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Rss, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Settings,
  ExternalLink,
} from 'lucide-react';
import { 
  useJobDistributionLogs, 
  useChannelStatus,
  AVAILABLE_CHANNELS,
} from '@/hooks/useJobDistribution';
import { ChannelLogo } from './ChannelLogo';

interface JobDistributionStatusProps {
  jobId: string;
  isPublic?: boolean;
  status?: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pendente',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  active: {
    icon: CheckCircle2,
    label: 'Ativo',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  removed: {
    icon: AlertCircle,
    label: 'Removido',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  error: {
    icon: AlertCircle,
    label: 'Erro',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
} as const;

export function JobDistributionStatus({ 
  jobId, 
  isPublic = true, 
  status = 'active' 
}: JobDistributionStatusProps) {
  const { data: logs = [], isLoading: logsLoading } = useJobDistributionLogs(jobId);
  const { channels, isLoading: channelsLoading } = useChannelStatus();
  
  const isLoading = logsLoading || channelsLoading;
  
  // Mapear logs por canal
  const logMap = new Map(logs.map(log => [log.channel_name, log]));
  
  // Filtrar apenas canais habilitados ou automáticos
  const activeChannels = channels.filter(ch => ch.isAutomatic || ch.isEnabled || ch.isRegistered);
  
  // Verificar se a vaga está elegível para distribuição
  const isEligible = status === 'active' && isPublic;
  
  if (!isEligible) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rss className="h-4 w-4" />
            Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {status !== 'active' && (
              <p>A vaga precisa estar ativa para ser distribuída.</p>
            )}
            {status === 'active' && !isPublic && (
              <p>A vaga precisa ser pública para aparecer nos agregadores.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rss className="h-4 w-4" />
            Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Rss className="h-4 w-4" />
          Distribuição
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum canal de distribuição configurado.
          </p>
        ) : (
          <div className="space-y-2">
            {activeChannels.map((channel) => {
              const channelMeta = AVAILABLE_CHANNELS.find(c => c.name === channel.name);
              const log = logMap.get(channel.name);
              
              // Para canais automáticos como Google Jobs, sempre mostrar como ativo
              const effectiveStatus = channel.isAutomatic 
                ? 'active' 
                : (log?.status || 'pending');
              
              const statusConfig = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG] 
                || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={channel.name}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channelMeta?.icon} />
                    <span className="text-sm font-medium">
                      {channelMeta?.displayName || channel.name}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${statusConfig.bgColor} ${statusConfig.color} text-xs`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground"
            asChild
          >
            <Link to="/recruitment/settings?tab=distribuicao">
              <Settings className="h-4 w-4 mr-2" />
              Configurar canais
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
