import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Check, X, Briefcase, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CrossMatchSuggestionsProps {
  accountId: string;
  jobId?: string;
}

interface CrossMatchSuggestion {
  id: string;
  source_result_id: string | null;
  source_candidate_id: string | null;
  suggested_job_id: string;
  match_score: number;
  reasoning: string;
  status: string;
  candidate_name?: string;
  source_job_title?: string;
  suggested_job_title?: string;
}

export function CrossMatchSuggestions({ accountId, jobId }: CrossMatchSuggestionsProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['cross-match-suggestions', accountId, jobId],
    queryFn: async (): Promise<CrossMatchSuggestion[]> => {
      let query = supabase
        .from('recruitment_cross_match_suggestions')
        .select('*')
        .eq('account_id', accountId)
        .in('status', ['pending', 'pending_ai_review'])
        .order('match_score', { ascending: false })
        .limit(20);

      if (jobId) {
        query = query.or(`source_job_id.eq.${jobId},suggested_job_id.eq.${jobId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Enrich with names
      const resultIds = [...new Set(data.map((d: any) => d.source_result_id).filter(Boolean))];
      const candidateIds = [...new Set(data.map((d: any) => d.source_candidate_id).filter(Boolean))];
      const jobIds = [...new Set([
        ...data.map((d: any) => d.source_job_id),
        ...data.map((d: any) => d.suggested_job_id),
      ].filter(Boolean))];

      const [{ data: results }, { data: jobs }, { data: candidates }] = await Promise.all([
        resultIds.length > 0
          ? supabase.from('recruitment_hunting_results').select('id, extracted_data').in('id', resultIds)
          : Promise.resolve({ data: [] }),
        jobIds.length > 0
          ? supabase.from('recruitment_jobs').select('id, title').in('id', jobIds)
          : Promise.resolve({ data: [] }),
        candidateIds.length > 0
          ? supabase.from('recruitment_candidates').select('id, first_name, last_name').in('id', candidateIds)
          : Promise.resolve({ data: [] }),
      ]);

      const resultMap = new Map((results || []).map((r: any) => [r.id, r]));
      const jobMap = new Map((jobs || []).map((j: any) => [j.id, j]));
      const candidateMap = new Map((candidates || []).map((c: any) => [c.id, c]));

      return data.map((s: any) => {
        const result = resultMap.get(s.source_result_id);
        const candidate = candidateMap.get(s.source_candidate_id);
        return {
          ...s,
          candidate_name: [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || (result?.extracted_data as any)?.name || 'Candidato',
          source_job_title: jobMap.get(s.source_job_id)?.title || '',
          suggested_job_title: jobMap.get(s.suggested_job_id)?.title || '',
        };
      });
    },
  });

  const acceptSuggestion = useMutation({
    mutationFn: async (suggestion: CrossMatchSuggestion) => {
      // 1. If source is a hunting result, clone it to the new job
      if (suggestion.source_result_id) {
        const { data: sourceResult } = await supabase
          .from('recruitment_hunting_results')
          .select('search_id, source, source_url, extracted_data, match_score')
          .eq('id', suggestion.source_result_id)
          .single();

        if (sourceResult) {
          // Find or create a search for the target job
          let targetSearchId: string | null = null;
          const { data: existingSearch } = await supabase
            .from('recruitment_hunting_searches')
            .select('id')
            .eq('job_id', suggestion.suggested_job_id)
            .eq('account_id', accountId)
            .limit(1)
            .single();

          if (existingSearch) {
            targetSearchId = existingSearch.id;
          } else {
            const { data: newSearch } = await supabase
              .from('recruitment_hunting_searches')
              .insert({
                account_id: accountId,
                job_id: suggestion.suggested_job_id,
                query: `Cross-match: ${suggestion.suggested_job_title}`,
                sources: [sourceResult.source],
                status: 'completed',
                results_count: 0,
              })
              .select('id')
              .single();
            targetSearchId = newSearch?.id || null;
          }

          if (targetSearchId) {
            await supabase
              .from('recruitment_hunting_results')
              .insert({
                search_id: targetSearchId,
                source: sourceResult.source,
                source_url: sourceResult.source_url,
                extracted_data: sourceResult.extracted_data,
                match_score: suggestion.match_score,
                status: 'reviewed',
                match_reasoning: `Cross-match: ${suggestion.reasoning}`,
              });
          }
        }
      }

      // 2. If source is a candidate (organic), create an application
      if (suggestion.source_candidate_id) {
        const { data: existingApp } = await supabase
          .from('recruitment_applications')
          .select('id')
          .eq('candidate_id', suggestion.source_candidate_id)
          .eq('job_id', suggestion.suggested_job_id)
          .limit(1)
          .maybeSingle();

        if (!existingApp) {
          await supabase
            .from('recruitment_applications')
            .insert({
              candidate_id: suggestion.source_candidate_id,
              job_id: suggestion.suggested_job_id,
              account_id: accountId,
              status: 'new',
              source: 'cross_match',
            });
        }
      }

      // 3. Update suggestion status
      const { error } = await supabase
        .from('recruitment_cross_match_suggestions')
        .update({
          status: 'accepted',
          imported_to_job_id: suggestion.suggested_job_id,
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id);
      if (error) throw error;

      return suggestion;
    },
    onSuccess: (suggestion) => {
      queryClient.invalidateQueries({ queryKey: ['cross-match-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['hunting-results'] });
      toast.success('Candidato realocado com sucesso!', {
        action: {
          label: 'Ver na vaga',
          onClick: () => navigate(`/atracao-contratacao/recrutamento/hunting-outreach?tab=hunting`),
        },
      });
    },
  });

  const dismissSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_cross_match_suggestions')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-match-suggestions'] });
      toast.success('Sugestão descartada');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Sugestões Cross-Vaga ({suggestions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate">{s.candidate_name}</span>
                {s.match_score > 0 && (
                  <Badge variant="outline" className="text-xs">{s.match_score}%</Badge>
                )}
                {s.status === 'pending_ai_review' && (
                  <Badge variant="secondary" className="text-xs">Aguardando IA</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <span className="truncate">{s.source_job_title}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium text-foreground">{s.suggested_job_title}</span>
              </div>
              {s.reasoning && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.reasoning}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:bg-green-50"
                onClick={() => acceptSuggestion.mutate(s)}
                disabled={acceptSuggestion.isPending || dismissSuggestion.isPending}
                title="Aceitar e realocar candidato"
              >
                {acceptSuggestion.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-600 hover:bg-red-50"
                onClick={() => dismissSuggestion.mutate(s.id)}
                disabled={acceptSuggestion.isPending || dismissSuggestion.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
