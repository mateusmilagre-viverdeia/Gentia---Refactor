import { useMemo, useState } from 'react';
import { ChannelLogo } from '@/components/recruitment/jobs/ChannelLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Rss,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  Settings2,
  Loader2,
  Lock,
  Bell,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ALL_CHANNELS,
  useChannelStatus,
  useMarkChannelRegistered,
  useToggleChannel,
  type UnifiedChannel,
  type RegistrationStep,
} from '@/hooks/useJobDistribution';
import { useDistributionCredentials, type DistributionCredential } from '@/hooks/useDistributionCredentials';
import { ChannelCredentialsForm } from './ChannelCredentialsForm';
import { FeedValidator } from './FeedValidator';

// ─── Category badge ───
function CategoryBadge({ category }: { category: UnifiedChannel['category'] }) {
  switch (category) {
    case 'automatic':
      return <Badge variant="success" className="text-[9px] px-1.5 py-0">Automático</Badge>;
    case 'premium':
      return <Badge variant="purple" className="text-[9px] px-1.5 py-0">Premium</Badge>;
    case 'feed_xml':
      return <Badge variant="info" className="text-[9px] px-1.5 py-0">Feed XML</Badge>;
  }
}

// ─── Status indicator ───
function ChannelStatusIndicator({
  channel,
  credential,
}: {
  channel: { category: string; isAutomatic?: boolean; status?: string; isRegistered?: boolean; isEnabled?: boolean };
  credential?: DistributionCredential;
}) {
  if (channel.category === 'automatic') {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>Sempre ativo</span>
      </div>
    );
  }

  if (channel.status === 'coming_soon') {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Em desenvolvimento</span>
      </div>
    );
  }

  if (channel.category === 'premium') {
    if (!credential) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Não configurado</span>
        </div>
      );
    }
    const statusMap: Record<string, { icon: React.ReactNode; text: string; className: string }> = {
      active: { icon: <CheckCircle2 className="h-3 w-3" />, text: 'Ativo', className: 'text-green-600 dark:text-green-400' },
      expired: { icon: <XCircle className="h-3 w-3" />, text: 'Token expirado', className: 'text-red-600 dark:text-red-400' },
      error: { icon: <XCircle className="h-3 w-3" />, text: 'Erro', className: 'text-red-600 dark:text-red-400' },
      pending: { icon: <Clock className="h-3 w-3" />, text: 'Pendente validação', className: 'text-amber-600 dark:text-amber-400' },
    };
    const s = statusMap[credential.status] || statusMap.pending;
    return (
      <div className={`flex items-center gap-1 text-xs ${s.className}`}>
        {s.icon}
        <span>{s.text}</span>
      </div>
    );
  }

  // feed_xml
  if (channel.isRegistered) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>Cadastrado</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Pendente cadastro</span>
    </div>
  );
}

// ─── Registration steps modal content ───
function RegistrationStepsContent({
  channel,
  feedUrl,
  onMarkRegistered,
  isPending,
}: {
  channel: UnifiedChannel;
  feedUrl: string;
  onMarkRegistered: () => void;
  isPending: boolean;
}) {
  const steps = channel.registrationSteps || [];

  const handleCopy = (value?: string) => {
    const text = value === 'feed_url' ? feedUrl : value;
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('URL copiada!');
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          {!channel.isAutomatic && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              {i + 1}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <h5 className="font-medium text-sm">{step.title}</h5>
            {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
            {step.action?.type === 'copy' && (
              <div className="flex gap-2">
                <Input value={step.action.value === 'feed_url' ? feedUrl : step.action.value} readOnly className="font-mono text-xs flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleCopy(step.action?.value)}>
                  <Copy className="h-4 w-4 mr-1" />
                  {step.action.label}
                </Button>
              </div>
            )}
            {step.action?.type === 'link' && (
              <Button variant="outline" size="sm" onClick={() => window.open(step.action?.url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-1" />
                {step.action.label}
              </Button>
            )}
            {step.tips && (
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                {step.tips.map((tip, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      {channel.registrationNotes && channel.registrationNotes.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Dicas:</p>
          {channel.registrationNotes.map((note, i) => (
            <p key={i} className="text-xs text-muted-foreground">• {note}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Integration guide text renderer ───
function IntegrationGuideContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  const formatBold = (str: string) => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
    );
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return; // skip empty lines (spacing handled by space-y)
    }
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
            {numberedMatch[1]}
          </div>
          <p className="text-sm font-medium">{formatBold(numberedMatch[2])}</p>
        </div>
      );
    } else {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground">{formatBold(trimmed)}</p>
      );
    }
  });

  return <div className="space-y-2">{elements}</div>;
}

export function IntegrationChannelsList() {
  const { channels: freeChannelsStatus, isLoading, feedUrl } = useChannelStatus();
  const { data: credentials = [] } = useDistributionCredentials();
  const markRegistered = useMarkChannelRegistered();
  const toggleChannel = useToggleChannel();

  const [instructionsChannel, setInstructionsChannel] = useState<UnifiedChannel | null>(null);
  const [configureChannel, setConfigureChannel] = useState<UnifiedChannel | null>(null);
  const [guideChannel, setGuideChannel] = useState<UnifiedChannel | null>(null);
  const [apiIntegrationOpen, setApiIntegrationOpen] = useState<Record<string, boolean>>({});

  const credentialsMap = new Map(credentials.map(c => [c.channel_name, c]));
  const freeStatusMap = new Map(freeChannelsStatus.map(ch => [ch.name, ch]));

  const copyFeedUrl = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      toast.success('URL do Feed copiada!');
    }
  };

  const handleToggle = (channelName: string, isEnabled: boolean) => {
    toggleChannel.mutate({ channelName, isEnabled });
  };

  const handleMarkRegistered = (channelName: string) => {
    markRegistered.mutate({ channelName, isRegistered: true });
    setInstructionsChannel(null);
  };

  const groupedChannels = useMemo(() => {
    const groups = [
      { key: 'automatic', title: 'Automáticos', description: 'Ativos por padrão via páginas públicas e marcação estruturada.' },
      { key: 'feed_xml', title: 'Feed XML', description: 'Canais que consomem o feed público de vagas após cadastro externo.' },
      { key: 'premium', title: 'Premium/API', description: 'Integrações diretas que exigem parceria, credenciais e validação.' },
    ] as const;

    return groups.map(group => ({
      ...group,
      channels: ALL_CHANNELS.filter(channel => channel.category === group.key),
    })).filter(group => group.channels.length > 0);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Integrações de Publicação
          </CardTitle>
          <CardDescription>
            Gerencie onde suas vagas serão publicadas. Configure canais gratuitos via feed XML ou integrações premium via API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Feed URL */}
          {feedUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Feed XML:</Label>
              <Input value={feedUrl} readOnly className="font-mono text-xs h-8 flex-1" />
              <Button variant="outline" size="sm" onClick={copyFeedUrl} className="shrink-0">
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(feedUrl, '_blank')} className="shrink-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Feed Validator */}
          <FeedValidator feedUrl={feedUrl} />

          <Separator />

          {/* Channel cards */}
          <div className="space-y-6">
            {groupedChannels.map((group) => (
              <section key={group.key} className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{group.title}</h4>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>

                <div className="space-y-2">
                  {group.channels.map((channel) => {
                    const freeStatus = freeStatusMap.get(channel.name);
                    const credential = credentialsMap.get(channel.name);
                    const isEnabled = channel.category === 'automatic' ? true : freeStatus?.isEnabled ?? false;
                    const isRegistered = freeStatus?.isRegistered ?? false;
                    const isComingSoon = channel.status === 'coming_soon';
                    const isCredentialActive = credential?.status === 'active';
                    const enrichedChannel = { ...channel, isEnabled, isRegistered };

                    const checklist = [
                      { label: 'Feed disponível', done: channel.category !== 'premium' && !!feedUrl },
                      { label: 'Cadastro externo', done: channel.category === 'automatic' || isRegistered || channel.category === 'premium' },
                      { label: 'Credencial configurada', done: !channel.requiresCredentials || !!credential },
                      { label: 'Credencial validada', done: !channel.requiresCredentials || isCredentialActive },
                      { label: 'Canal habilitado', done: isEnabled || channel.category === 'automatic' },
                    ];

                    return (
                      <div
                        key={channel.name}
                        className="grid gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors lg:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <ChannelLogo channelName={channel.name} size="sm" fallbackIcon={channel.icon} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-medium text-sm">{channel.displayName}</h4>
                                <CategoryBadge category={channel.category} />
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{channel.reach}</Badge>
                                {(channel.cost === 'Pago' || channel.cost === 'Pay-per-click') && (
                                  <Badge variant="warning" className="text-[9px] px-1.5 py-0">{channel.cost}</Badge>
                                )}
                                {isComingSoon && (
                                  <Badge variant="info" className="text-[9px] px-1.5 py-0">Em breve</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{channel.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {checklist.map(item => (
                                <span key={item.label} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  {item.done ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3" />}
                                  {item.label}
                                </span>
                              ))}
                            </div>

                            <ChannelStatusIndicator channel={enrichedChannel} credential={credential} />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                          {channel.category === 'automatic' && (
                            <span className="text-xs text-muted-foreground">Sempre ativo</span>
                          )}

                          {channel.category === 'feed_xml' && (
                            <>
                              {(channel.name === 'jooble' || channel.name === 'careerjet') ? (
                                <>
                                  {apiIntegrationOpen[channel.name] && (
                                    <>
                                      {channel.integrationGuide && channel.integrationGuide !== 'Não foi encontrada uma documentação.' && (
                                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGuideChannel(channel)}>
                                          <HelpCircle className="h-3 w-3 mr-1" />
                                          Como integrar
                                        </Button>
                                      )}
                                      {channel.requiresCredentials && !isComingSoon && (
                                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfigureChannel(channel)}>
                                          <Settings2 className="h-3 w-3 mr-1" />
                                          Configurar
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  <Button variant={apiIntegrationOpen[channel.name] ? 'secondary' : 'ghost'} size="sm" className="text-xs" onClick={() => setApiIntegrationOpen(prev => ({ ...prev, [channel.name]: !prev[channel.name] }))}>
                                    {apiIntegrationOpen[channel.name] ? 'Fechar API' : 'Integrar por API'}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {channel.integrationGuide && channel.integrationGuide !== 'Não foi encontrada uma documentação.' && (
                                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGuideChannel(channel)}>
                                      <HelpCircle className="h-3 w-3 mr-1" />
                                      Como integrar
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setInstructionsChannel(channel)}>
                                Como cadastrar
                              </Button>
                              <Switch checked={isEnabled} onCheckedChange={(checked) => handleToggle(channel.name, checked)} disabled={toggleChannel.isPending || isComingSoon} />
                            </>
                          )}

                          {channel.category === 'premium' && !isComingSoon && (
                            <>
                              {channel.integrationGuide && (
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGuideChannel(channel)}>
                                  <HelpCircle className="h-3 w-3 mr-1" />
                                  Como integrar
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfigureChannel(channel)}>
                                <Settings2 className="h-3 w-3 mr-1" />
                                Configurar
                              </Button>
                            </>
                          )}

                          {channel.category === 'premium' && isComingSoon && (
                            <>
                              {channel.integrationGuide && (
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGuideChannel(channel)}>
                                  <HelpCircle className="h-3 w-3 mr-1" />
                                  Como integrar
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.success(`Você será notificado quando ${channel.displayName} estiver disponível!`)}>
                                <Bell className="h-3 w-3 mr-1" />
                                Notificar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Como cadastrar (feed_xml) */}
      <Dialog open={!!instructionsChannel} onOpenChange={() => setInstructionsChannel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelLogo channelName={instructionsChannel?.name || ''} size="md" />
              Como cadastrar no {instructionsChannel?.displayName}
            </DialogTitle>
            <DialogDescription>
              {(instructionsChannel as any)?.approvalTime && `Tempo de aprovação: ${(instructionsChannel as any).approvalTime}`}
            </DialogDescription>
          </DialogHeader>

          {instructionsChannel && feedUrl && (
            <RegistrationStepsContent
              channel={instructionsChannel as UnifiedChannel}
              feedUrl={feedUrl}
              onMarkRegistered={() => handleMarkRegistered(instructionsChannel.name)}
              isPending={markRegistered.isPending}
            />
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setInstructionsChannel(null)}>
              Fechar
            </Button>
            <Button
              onClick={() => instructionsChannel && handleMarkRegistered(instructionsChannel.name)}
              disabled={markRegistered.isPending}
            >
              {markRegistered.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Cadastrado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Como integrar (guide) */}
      <Dialog open={!!guideChannel} onOpenChange={() => setGuideChannel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelLogo channelName={guideChannel?.name || ''} size="md" />
              Como integrar com {guideChannel?.displayName}
            </DialogTitle>
          </DialogHeader>

          {guideChannel?.integrationGuide && (
            <div className="space-y-3">
              <IntegrationGuideContent text={guideChannel.integrationGuide} />
              {guideChannel.integrationVideoUrl && (
                <div className="mt-4">
                  <iframe
                    className="w-full aspect-video rounded-lg"
                    src={guideChannel.integrationVideoUrl.replace('watch?v=', 'embed/')}
                    title={`Vídeo: Como integrar com ${guideChannel.displayName}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setGuideChannel(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Configurar credenciais (premium) */}
      {configureChannel && (
        <ChannelCredentialsForm
          channel={configureChannel as UnifiedChannel}
          existingCredential={credentialsMap.get(configureChannel.name)}
          open={!!configureChannel}
          onOpenChange={(open) => !open && setConfigureChannel(null)}
        />
      )}
    </div>
  );
}
