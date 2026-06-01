import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useDistributionCredentials } from '@/hooks/useDistributionCredentials';
import { useJobPublishingStatus, usePublishJob, useUnpublishJob } from '@/hooks/useJobPublishing';
import { PREMIUM_CHANNELS } from '@/hooks/useJobDistribution';
import { Link } from 'react-router-dom';
import { ChannelLogo } from './ChannelLogo';
import { getPublicJobUrl } from '@/lib/publicUrl';

interface JobPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    status?: string;
  };
}

export function JobPublishDialog({ open, onOpenChange, job }: JobPublishDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const { data: credentials = [], isLoading: loadingCredentials } = useDistributionCredentials();
  const { data: publishingLogs = [], isLoading: loadingLogs } = useJobPublishingStatus(job.id);
  const publishJob = usePublishJob();
  const unpublishJob = useUnpublishJob();

  const isPublishing = publishJob.isPending;
  const isUnpublishing = unpublishJob.isPending;

  const publishUrl = getPublicJobUrl(job.id);

  const getChannelStatus = (channelName: string) => {
    const log = publishingLogs.find(l => l.channel_name === channelName);
    const cred = credentials.find(c => c.channel_name === channelName);
    return {
      log,
      credential: cred,
      isPublished: log?.status === 'active',
      hasCredentials: cred?.status === 'active',
      hasError: log?.status === 'error',
      errorMessage: log?.error_message,
    };
  };

  const toggleChannel = (channelName: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelName)
        ? prev.filter(c => c !== channelName)
        : [...prev, channelName]
    );
  };

  const handlePublish = async () => {
    for (const channelName of selectedChannels) {
      await publishJob.mutateAsync({ jobId: job.id, channelName });
    }
    setSelectedChannels([]);
  };

  const handleUnpublish = async (channelName: string) => {
    await unpublishJob.mutateAsync({ jobId: job.id, channelName });
  };

  const availableChannels = PREMIUM_CHANNELS.filter(ch => ch.status !== 'coming_soon');

  const isLoading = loadingCredentials || loadingLogs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar Vaga</DialogTitle>
          <DialogDescription>
            Publique "{job.title}" em plataformas externas
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Job Preview */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <p className="font-medium text-sm">{job.title}</p>
              {job.location && (
                <p className="text-xs text-muted-foreground">📍 {job.location}</p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span className="truncate">{publishUrl}</span>
              </div>
            </div>

            <Separator />

            {/* Channels */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Plataformas</p>
              
              {availableChannels.map(channel => {
                const status = getChannelStatus(channel.name);

                return (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {!status.isPublished && status.hasCredentials && (
                        <Checkbox
                          checked={selectedChannels.includes(channel.name)}
                          onCheckedChange={() => toggleChannel(channel.name)}
                          disabled={isPublishing}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                          <span className="text-sm font-medium">{channel.displayName}</span>
                        </div>
                        {!status.hasCredentials && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Credenciais não configuradas
                          </p>
                        )}
                        {status.hasError && (
                          <p className="text-xs text-destructive mt-0.5">
                            {status.errorMessage || 'Erro na publicação'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status.isPublished ? (
                        <>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Publicada
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive"
                            onClick={() => handleUnpublish(channel.name)}
                            disabled={isUnpublishing}
                          >
                            {isUnpublishing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Despublicar'
                            )}
                          </Button>
                        </>
                      ) : status.hasError ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      ) : !status.hasCredentials ? (
                        <Button variant="outline" size="sm" className="text-xs" asChild>
                          <Link to="/recruitment/settings?tab=distribuicao">
                            Configurar
                          </Link>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Disponível
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {selectedChannels.length > 0 && (
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                `Publicar em ${selectedChannels.length} plataforma${selectedChannels.length > 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
