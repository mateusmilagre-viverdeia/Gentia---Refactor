import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useJobPublishingStatus } from '@/hooks/useJobPublishing';
import { PREMIUM_CHANNELS } from '@/hooks/useJobDistribution';
import { ChannelLogo } from './ChannelLogo';

interface JobPublishStatusProps {
  jobId: string;
}

export function JobPublishStatus({ jobId }: JobPublishStatusProps) {
  const { data: logs = [] } = useJobPublishingStatus(jobId);

  const activePublications = logs.filter(l => l.status === 'active');

  if (activePublications.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {activePublications.map(log => {
        const channel = PREMIUM_CHANNELS.find(c => c.name === log.channel_name);
        return (
          <Tooltip key={log.channel_name}>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0.5">
                <ChannelLogo channelName={log.channel_name} size="xs" />
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Publicada no {channel?.displayName || log.channel_name}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
