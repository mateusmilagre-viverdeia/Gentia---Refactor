import { ChannelLogo } from '@/components/recruitment/jobs/ChannelLogo';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Rss } from 'lucide-react';
import { useEnabledChannels } from '@/hooks/useEnabledChannels';
import { useToggleChannel } from '@/hooks/useJobDistribution';

export function ClientChannelSelector() {
  const { channels, isLoading } = useEnabledChannels();
  const toggleChannel = useToggleChannel();

  const handleToggle = (channelName: string, checked: boolean) => {
    toggleChannel.mutate({ channelName, isEnabled: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-5 w-5" />
          Publicação Automática
        </CardTitle>
        <CardDescription>
          Selecione as plataformas onde suas vagas serão publicadas automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {channels.map(channel => (
              <div
                key={channel.name}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                  <div>
                    <p className="text-sm font-medium">{channel.displayName}</p>
                    <p className="text-xs text-muted-foreground">{channel.reach} · {channel.cost}</p>
                  </div>
                </div>
                <Switch
                  checked={channel.isEnabled}
                  onCheckedChange={(checked) => handleToggle(channel.name, checked)}
                  disabled={toggleChannel.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
