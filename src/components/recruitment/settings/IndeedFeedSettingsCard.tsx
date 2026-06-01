import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Rss, Copy, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';
import { formatBRT } from "@/lib/datetime";


interface IndeedConfig {
  id: string;
  account_id: string;
  feed_url: string | null;
  feed_slug: string | null;
  is_active: boolean;
  last_generated_at: string | null;
  total_jobs_in_feed: number | null;
}

interface IndeedLog {
  id: string;
  job_id: string | null;
  action: string;
  status: string;
  feed_generated_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface SkippedJob {
  job_id: string;
  title: string;
  reason: string;
}

export function IndeedFeedSettingsCard() {
  const { account } = useAccount();
  const accountId = account?.id;
  const [config, setConfig] = useState<IndeedConfig | null>(null);
  const [logs, setLogs] = useState<IndeedLog[]>([]);
  const [skipped, setSkipped] = useState<SkippedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [toggling, setToggling] = useState(false);

  const refresh = async () => {
    if (!accountId) return;
    setLoading(true);
    const [{ data: cfg }, { data: lg }] = await Promise.all([
      supabase.from('indeed_feed_config').select('*').eq('account_id', accountId).maybeSingle(),
      supabase
        .from('indeed_submission_log')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    setConfig((cfg as any) ?? null);
    setLogs((lg as any) ?? []);

    // Skipped jobs from the latest generation
    const lastGenAt = (cfg as any)?.last_generated_at as string | null;
    if (lastGenAt) {
      const { data: skips } = await supabase
        .from('indeed_submission_log')
        .select('job_id, error_message')
        .eq('account_id', accountId)
        .eq('action', 'skipped')
        .eq('feed_generated_at', lastGenAt);

      const items = (skips ?? []) as Array<{ job_id: string | null; error_message: string | null }>;
      const jobIds = items.map((s) => s.job_id).filter(Boolean) as string[];
      let titleMap: Record<string, string> = {};
      if (jobIds.length > 0) {
        const { data: jobs } = await supabase
          .from('recruitment_jobs')
          .select('id, title')
          .in('id', jobIds);
        for (const j of (jobs ?? []) as Array<{ id: string; title: string | null }>) {
          titleMap[j.id] = j.title || '(sem título)';
        }
      }
      setSkipped(
        items
          .filter((s) => s.job_id)
          .map((s) => ({
            job_id: s.job_id as string,
            title: titleMap[s.job_id as string] || '(vaga removida)',
            reason: s.error_message || 'motivo não registrado',
          })),
      );
    } else {
      setSkipped([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleRegenerate = async () => {
    if (!accountId) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-indeed-feed', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      toast.success(`Feed regenerado: ${(data as any)?.total_jobs ?? 0} vagas`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao regenerar feed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!accountId) return;
    setToggling(true);
    try {
      if (config) {
        const { error } = await supabase
          .from('indeed_feed_config')
          .update({ is_active: checked })
          .eq('account_id', accountId);
        if (error) throw error;
      } else if (checked) {
        // Trigger creation via regenerate
        await handleRegenerate();
      }
      toast.success(checked ? 'Feed Indeed ativado' : 'Feed Indeed desativado');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar');
    } finally {
      setToggling(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publicUrl = config?.feed_slug
    ? `${supabaseUrl}/functions/v1/indeed-feed-public?slug=${config.feed_slug}`
    : '';

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Rss className="h-4 w-4" />
          Indeed — Feed XML
        </CardTitle>
        <CardDescription>
          Distribua suas vagas automaticamente no Indeed via feed XML. O Indeed lê o feed periodicamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm font-medium">Feed ativo</Label>
                <p className="text-xs text-muted-foreground">
                  {config?.is_active
                    ? `${config?.total_jobs_in_feed ?? 0} vagas no feed`
                    : 'O feed está desativado'}
                </p>
              </div>
              <Switch
                checked={config?.is_active ?? false}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>

            {config?.is_active && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">URL pública do feed</Label>
                  <div className="flex gap-2">
                    <Input value={publicUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={handleCopy} disabled={!publicUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cole esta URL no painel de publishers do Indeed.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerar agora
                  </Button>
                  {publicUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visualizar XML
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://employers.indeed.com/p/post-jobs" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Como registrar no Indeed
                    </a>
                  </Button>
                </div>

                {config.last_generated_at && (
                  <p className="text-xs text-muted-foreground">
                    Última geração:{' '}
                    {formatBRT(new Date(config.last_generated_at), "dd/MM/yyyy 'às' HH:mm")}{' '}
                    — {config.total_jobs_in_feed ?? 0} vaga(s) válida(s)
                    {skipped.length > 0 ? `, ${skipped.length} pulada(s)` : ''}
                  </p>
                )}

                {skipped.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Vagas não incluídas no feed ({skipped.length})
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Para entrar no Indeed, cada vaga precisa de <strong>título</strong> e{' '}
                      <strong>localização (cidade)</strong>. A descrição é gerada automaticamente
                      quando estiver vazia.
                    </p>
                    <div className="rounded-md border divide-y">
                      {skipped.map((s) => (
                        <div
                          key={s.job_id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{s.title}</p>
                            <p className="text-muted-foreground truncate">→ {s.reason}</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild className="shrink-0">
                            <Link to={`/atracao-contratacao/recrutamento/vagas/${s.job_id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {logs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Últimas execuções</Label>
                    <div className="rounded-md border divide-y max-h-64 overflow-auto">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            <span>{log.action}</span>
                            {log.error_message && (
                              <span className="text-muted-foreground">— {log.error_message}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {formatBRT(new Date(log.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
