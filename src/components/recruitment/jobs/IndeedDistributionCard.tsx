import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRT } from "@/lib/datetime";


interface IndeedDistributionCardProps {
  jobId: string;
  accountId: string;
}

export function IndeedDistributionCard({ jobId, accountId }: IndeedDistributionCardProps) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [lastLog, setLastLog] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: cfg }, { data: log }, { data: job }] = await Promise.all([
        supabase
          .from('indeed_feed_config')
          .select('is_active')
          .eq('account_id', accountId)
          .maybeSingle(),
        supabase
          .from('indeed_submission_log')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('recruitment_jobs')
          .select('title, description, location, work_modality')
          .eq('id', jobId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setEnabled(Boolean((cfg as any)?.is_active));
      setLastLog(log);
      const missing: string[] = [];
      const j: any = job;
      if (!j?.title?.trim()) missing.push('Título');
      if (!j?.description || !j.description.trim()) missing.push('Descrição');
      if (!j?.location?.trim()) missing.push('Localização');
      setMissingFields(missing);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, accountId]);

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const renderStatus = () => {
    if (!enabled) {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          Desativado
        </Badge>
      );
    }
    if (missingFields.length > 0) {
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Campos faltando
        </Badge>
      );
    }
    if (lastLog?.status === 'error') {
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }
    if (lastLog?.status === 'success') {
      return (
        <Badge variant="success" className="text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          No feed
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="text-xs gap-1">
        Aguardando próxima geração
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="font-semibold">Indeed</span>
            <span className="text-xs font-normal text-muted-foreground">via feed XML</span>
          </span>
          {renderStatus()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {missingFields.length > 0 && (
          <div className="rounded-md bg-destructive/5 border border-destructive/20 p-2">
            <p className="font-medium text-destructive mb-1">Para entrar no feed, preencha:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {missingFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {lastLog?.feed_generated_at && (
          <p className="text-muted-foreground">
            Última atualização:{' '}
            {formatBRT(new Date(lastLog.feed_generated_at), "dd/MM/yyyy HH:mm")}
          </p>
        )}
        {lastLog?.error_message && (
          <p className="text-destructive">{lastLog.error_message}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link to="/atracao-contratacao/recrutamento/configuracoes?tab=distribuicao">
            <Settings className="h-3.5 w-3.5 mr-2" />
            Configurar feed Indeed
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
