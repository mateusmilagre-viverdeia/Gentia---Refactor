import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  jobId: string;
}

const TYPE_LABEL: Record<string, string> = {
  add_mandatory_skill: 'Adicionar skill obrigatória',
  add_negative_keyword: 'Adicionar keyword negativa',
  adjust_seniority: 'Ajustar senioridade',
  adjust_experience: 'Ajustar anos de experiência',
  add_industry: 'Adicionar indústria-alvo',
  other: 'Outro ajuste',
};

export function ICPSuggestionsCard({ jobId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['icp-suggestions', jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from('recruitment_hunting_icp_suggestions')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const detect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('hunting-detect-rejection-patterns', {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha');
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['icp-suggestions', jobId] });
      toast({
        title: 'Análise concluída',
        description: d.inserted > 0 ? `${d.inserted} nova(s) sugestão(ões).` : (d.message || 'Sem novos padrões detectados.'),
      });
    },
    onError: (e: any) => {
      toast({ title: 'Falha na análise', description: e?.message, variant: 'destructive' });
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'dismissed' }) => {
      const { error } = await supabase
        .from('recruitment_hunting_icp_suggestions')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icp-suggestions', jobId] }),
  });

  if (isLoading) return null;
  const items = suggestions || [];

  return (
    <Card className="border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            Sugestões de ajuste no ICP
            {items.length > 0 && <Badge variant="secondary" className="text-xs">{items.length}</Badge>}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => detect.mutate()}
            disabled={detect.isPending}
          >
            {detect.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Analisar rejeições
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhuma sugestão pendente. Clique em "Analisar rejeições" para verificar padrões nos descartes recentes.
          </p>
        ) : (
          items.map((s: any) => (
            <div key={s.id} className="rounded-md border bg-background p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{TYPE_LABEL[s.suggestion_type] || s.suggestion_type}</Badge>
                {s.evidence?.count && (
                  <span className="text-xs text-muted-foreground">
                    {s.evidence.count} rejeições
                  </span>
                )}
              </div>
              <p className="text-sm font-medium">
                {typeof s.suggested_value === 'string' ? s.suggested_value : JSON.stringify(s.suggested_value)}
              </p>
              {s.rationale && (
                <p className="text-xs text-muted-foreground">{s.rationale}</p>
              )}
              <div className="flex items-center gap-1 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-emerald-700 border-emerald-500/40"
                  onClick={() => resolve.mutate({ id: s.id, status: 'accepted' })}
                  disabled={resolve.isPending}
                >
                  <Check className="h-3 w-3" />
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => resolve.mutate({ id: s.id, status: 'dismissed' })}
                  disabled={resolve.isPending}
                >
                  <X className="h-3 w-3" />
                  Descartar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
