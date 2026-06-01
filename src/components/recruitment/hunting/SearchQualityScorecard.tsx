import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Award, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  accountId: string;
  jobId?: string;
}

interface Row {
  search_id: string;
  query: string;
  created_at: string;
  total: number;
  qualified: number;
  approved: number;
  rejected: number;
  low_quality: number;
  tier_a: number;
  tier_b: number;
  tier_c: number;
  cost: number;
}

export function SearchQualityScorecard({ accountId, jobId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['hunting-search-quality', accountId, jobId || 'all'],
    queryFn: async (): Promise<{ rows: Row[]; sourceStats: any[] }> => {
      let query = supabase
        .from('recruitment_hunting_searches')
        .select('id, query, created_at, account_id, job_id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (jobId) query = query.eq('job_id', jobId);

      const { data: searches } = await query;
      if (!searches || searches.length === 0) return { rows: [], sourceStats: [] };

      const ids = searches.map((s: any) => s.id);
      const { data: results } = await supabase
        .from('recruitment_hunting_results')
        .select('search_id, source, match_score, llm_tier, status, is_low_quality, discovery_cost_credits')
        .in('search_id', ids);

      const rows: Row[] = searches.map((s: any) => {
        const list = (results || []).filter((r: any) => r.search_id === s.id);
        return {
          search_id: s.id,
          query: s.query,
          created_at: s.created_at,
          total: list.length,
          qualified: list.filter((r: any) => (r.match_score || 0) >= 70).length,
          approved: list.filter((r: any) => ['imported', 'shortlisted', 'hired', 'interviewing'].includes(r.status)).length,
          rejected: list.filter((r: any) => ['discarded', 'rejected'].includes(r.status)).length,
          low_quality: list.filter((r: any) => r.is_low_quality).length,
          tier_a: list.filter((r: any) => r.llm_tier === 'A').length,
          tier_b: list.filter((r: any) => r.llm_tier === 'B').length,
          tier_c: list.filter((r: any) => r.llm_tier === 'C').length,
          cost: list.reduce((sum: number, r: any) => sum + Number(r.discovery_cost_credits || 0), 0),
        };
      });

      // Source stats aggregation
      const bySource: Record<string, { total: number; qualified: number; approved: number }> = {};
      (results || []).forEach((r: any) => {
        const k = r.source || 'other';
        bySource[k] = bySource[k] || { total: 0, qualified: 0, approved: 0 };
        bySource[k].total++;
        if ((r.match_score || 0) >= 70) bySource[k].qualified++;
        if (['imported', 'shortlisted', 'hired', 'interviewing'].includes(r.status)) bySource[k].approved++;
      });
      const sourceStats = Object.entries(bySource).map(([source, s]) => ({
        source,
        ...s,
        hit_rate: s.total > 0 ? Math.round((s.qualified / s.total) * 100) : 0,
        approval_rate: s.qualified > 0 ? Math.round((s.approved / s.qualified) * 100) : 0,
      })).sort((a, b) => b.total - a.total);

      return { rows, sourceStats };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  const rows = data?.rows || [];
  const sourceStats = data?.sourceStats || [];

  // Aggregates
  const totalQualified = rows.reduce((s, r) => s + r.qualified, 0);
  const totalApproved = rows.reduce((s, r) => s + r.approved, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const costPerQualified = totalQualified > 0 ? totalCost / totalQualified : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Buscas analisadas</p>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Candidatos qualificados (≥70)</p>
            <p className="text-2xl font-semibold">{totalQualified}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aprovados pelo recrutador</p>
            <p className="text-2xl font-semibold">{totalApproved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo / qualificado</p>
            <p className="text-2xl font-semibold">{costPerQualified.toFixed(2)} cr</p>
          </CardContent>
        </Card>
      </div>

      {/* Source stats */}
      {sourceStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hit-rate por fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sourceStats.map((s) => (
                <div key={s.source} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="capitalize w-24 justify-center">{s.source}</Badge>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <span><span className="text-muted-foreground">Total:</span> {s.total}</span>
                    <span><span className="text-muted-foreground">Hit:</span> <strong>{s.hit_rate}%</strong></span>
                    <span><span className="text-muted-foreground">Aprov.:</span> <strong>{s.approval_rate}%</strong></span>
                  </div>
                  {s.hit_rate >= 60 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : s.hit_rate < 30 ? (
                    <TrendingDown className="h-4 w-4 text-orange-500" />
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-search scorecard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scorecard por busca (últimas {rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma busca registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2">Query</th>
                    <th className="text-right px-2">Total</th>
                    <th className="text-right px-2">Qual.</th>
                    <th className="text-right px-2">Aprov.</th>
                    <th className="text-right px-2">Rej.</th>
                    <th className="text-right px-2"><EyeOff className="h-3 w-3 inline" /></th>
                    <th className="text-right px-2"><Award className="h-3 w-3 inline" /> A/B/C</th>
                    <th className="text-right pl-2">Custo</th>
                    <th className="text-right pl-2">% qual.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pctQual = r.total > 0 ? Math.round((r.qualified / r.total) * 100) : 0;
                    return (
                      <tr key={r.search_id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-2 max-w-[280px] truncate" title={r.query}>{r.query}</td>
                        <td className="text-right px-2">{r.total}</td>
                        <td className="text-right px-2 text-emerald-700">{r.qualified}</td>
                        <td className="text-right px-2 text-blue-700">{r.approved}</td>
                        <td className="text-right px-2 text-orange-600">{r.rejected}</td>
                        <td className="text-right px-2 text-muted-foreground">{r.low_quality}</td>
                        <td className="text-right px-2 whitespace-nowrap">
                          <span className="text-emerald-700">{r.tier_a}</span>/
                          <span className="text-blue-700">{r.tier_b}</span>/
                          <span className="text-zinc-500">{r.tier_c}</span>
                        </td>
                        <td className="text-right pl-2">{r.cost.toFixed(1)}</td>
                        <td className={`text-right pl-2 font-medium ${
                          pctQual >= 50 ? 'text-emerald-700' : pctQual >= 25 ? 'text-amber-600' : 'text-red-600'
                        }`}>{pctQual}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
