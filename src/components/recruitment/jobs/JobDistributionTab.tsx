import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Rss, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import { IndeedDistributionCard } from './IndeedDistributionCard';
import { useEnabledChannels } from '@/hooks/useEnabledChannels';
import { useJobPublishingStatus, usePublishJob, useUnpublishJob } from '@/hooks/useJobPublishing';
import { useDistributionCredentials } from '@/hooks/useDistributionCredentials';
import { ALL_CHANNELS } from '@/hooks/useJobDistribution';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Pendente', variant: 'warning' as const },
  active: { icon: CheckCircle2, label: 'Ativo', variant: 'success' as const },
  error: { icon: AlertCircle, label: 'Erro', variant: 'destructive' as const },
  removed: { icon: AlertCircle, label: 'Removido', variant: 'secondary' as const },
} as const;

interface JobDistributionTabProps {
  jobId: string;
}

export function JobDistributionTab({ jobId }: JobDistributionTabProps) {
  const { enabledChannels, isLoading: channelsLoading } = useEnabledChannels();
  const { data: credentials = [], isLoading: credentialsLoading } = useDistributionCredentials();
  const { data: logs = [], isLoading: logsLoading } = useJobPublishingStatus(jobId);
  const publishJob = usePublishJob();
  const unpublishJob = useUnpublishJob();
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('recruitment_jobs')
      .select('account_id')
      .eq('id', jobId)
      .maybeSingle()
      .then(({ data }) => setAccountId((data as any)?.account_id ?? null));
  }, [jobId]);

  const isLoading = channelsLoading || logsLoading || credentialsLoading;
  const logMap = new Map(logs.map(l => [l.channel_name, l]));

  const automaticChannels = ALL_CHANNELS.filter(ch => ch.category === 'automatic');

  // Only show channels that have active credentials (completed integration)
  const activeCredentialSet = new Set(
    credentials.filter(c => c.status === 'active').map(c => c.channel_name)
  );
  const readyChannels = enabledChannels.filter(ch => activeCredentialSet.has(ch.name));

  const handleToggle = (channelName: string, checked: boolean) => {
    if (checked) {
      publishJob.mutate({ jobId, channelName });
    } else {
      unpublishJob.mutate({ jobId, channelName });
    }
  };

  const isMutating = publishJob.isPending || unpublishJob.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rss className="h-4 w-4" />
            Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (readyChannels.length === 0 && automaticChannels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rss className="h-4 w-4" />
            Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma plataforma com integração concluída. Configure as credenciais nas configurações do recrutamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Rss className="h-4 w-4" />
          Distribuição
        </CardTitle>
        <CardDescription>
          Gerencie a publicação desta vaga nas plataformas integradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {automaticChannels.map(channel => (
            <div
              key={channel.name}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                <div>
                  <p className="text-sm font-medium">{channel.displayName}</p>
                  <p className="text-xs text-muted-foreground">{channel.reach}</p>
                </div>
              </div>
              <Badge variant="success" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Sempre ativo
              </Badge>
            </div>
          ))}

          {readyChannels.map(channel => {
            const log = logMap.get(channel.name);
            const isActive = log?.status === 'active' || log?.status === 'pending';
            const statusKey = log?.status as keyof typeof STATUS_CONFIG;
            const statusConfig = statusKey ? STATUS_CONFIG[statusKey] : null;
            const StatusIcon = statusConfig?.icon;

            return (
              <div
                key={channel.name}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                  <div>
                    <p className="text-sm font-medium">{channel.displayName}</p>
                    <p className="text-xs text-muted-foreground">{channel.reach}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusConfig && (
                    <Badge variant={statusConfig.variant} className="text-xs gap-1">
                      {StatusIcon && <StatusIcon className="h-3 w-3" />}
                      {statusConfig.label}
                    </Badge>
                  )}
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => handleToggle(channel.name, checked)}
                    disabled={isMutating}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      {accountId && (
        <CardContent className="pt-0">
          <IndeedDistributionCard jobId={jobId} accountId={accountId} />
        </CardContent>
      )}
    </Card>
  );
}
