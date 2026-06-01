import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface OutreachABResultsProps {
  accountId: string;
  jobId?: string;
}

interface ABGroup {
  groupId: string;
  campaignName: string;
  variants: {
    variant: string;
    campaignId: string;
    contactsSent: number;
    responsesReceived: number;
    interestedCount: number;
    convertedCount: number;
    responseRate: number;
    conversionRate: number;
  }[];
  winner: string | null;
}

export function OutreachABResults({ accountId, jobId }: OutreachABResultsProps) {
  const { data: abGroups, isLoading } = useQuery({
    queryKey: ['outreach-ab-results', accountId, jobId],
    queryFn: async (): Promise<ABGroup[]> => {
      let query = supabase
        .from('recruitment_outreach_campaigns')
        .select('id, name, ab_variant, ab_group_id, contacts_sent, responses_received, interested_count, converted_count')
        .eq('account_id', accountId)
        .not('ab_group_id', 'is', null);

      if (jobId) query = query.eq('job_id', jobId);

      const { data: campaigns } = await query;
      if (!campaigns || campaigns.length === 0) return [];

      // Group by ab_group_id
      const groups = new Map<string, ABGroup>();
      campaigns.forEach((c: any) => {
        const gid = c.ab_group_id;
        if (!groups.has(gid)) {
          groups.set(gid, {
            groupId: gid,
            campaignName: c.name.replace(/ \(Variante [AB]\)$/, ''),
            variants: [],
            winner: null,
          });
        }
        const sent = c.contacts_sent || 0;
        const responded = c.responses_received || 0;
        const converted = c.converted_count || 0;
        groups.get(gid)!.variants.push({
          variant: c.ab_variant || 'A',
          campaignId: c.id,
          contactsSent: sent,
          responsesReceived: responded,
          interestedCount: c.interested_count || 0,
          convertedCount: converted,
          responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
          conversionRate: sent > 0 ? Math.round((converted / sent) * 100) : 0,
        });
      });

      // Determine winner
      return [...groups.values()].map(g => {
        if (g.variants.length >= 2) {
          const sorted = [...g.variants].sort((a, b) => b.responseRate - a.responseRate);
          if (sorted[0].contactsSent >= 5 && sorted[0].responseRate > sorted[1].responseRate) {
            g.winner = sorted[0].variant;
          }
        }
        return g;
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!abGroups || abGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum teste A/B ativo. Crie uma campanha com A/B habilitado para ver resultados aqui.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {abGroups.map(group => {
        const chartData = group.variants.map(v => ({
          name: `Variante ${v.variant}`,
          'Taxa Resposta': v.responseRate,
          'Taxa Conversão': v.conversionRate,
          'Enviados': v.contactsSent,
          'Responderam': v.responsesReceived,
        }));

        return (
          <Card key={group.groupId} className="border-border/50">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{group.campaignName}</h4>
                {group.winner && (
                  <Badge variant="success" className="gap-1">
                    <Trophy className="h-3 w-3" />
                    Variante {group.winner} vencendo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {group.variants.map(v => (
                  <div
                    key={v.variant}
                    className={`rounded-lg border p-3 ${v.variant === group.winner ? 'border-primary bg-primary/5' : 'border-border/50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Variante {v.variant}</span>
                      {v.variant === group.winner && <Trophy className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Enviados:</span> {v.contactsSent}</div>
                      <div><span className="text-muted-foreground">Responderam:</span> {v.responsesReceived}</div>
                      <div><span className="text-muted-foreground">Taxa Resposta:</span> <strong>{v.responseRate}%</strong></div>
                      <div><span className="text-muted-foreground">Conversão:</span> <strong>{v.conversionRate}%</strong></div>
                    </div>
                  </div>
                ))}
              </div>

              {chartData.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Taxa Resposta" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Taxa Conversão" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
