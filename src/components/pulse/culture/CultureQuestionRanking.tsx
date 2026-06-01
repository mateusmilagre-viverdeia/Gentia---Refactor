import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PILLAR_LABELS, type CulturePillar } from '@/types/pulseCulture.types';
import { cn } from '@/lib/utils';

interface QuestionScore {
  question_id: string;
  question_text: string;
  pillar: CulturePillar;
  avg_score: number;
  response_count: number;
}

interface CultureQuestionRankingProps {
  accountId: string | null;
  days?: number;
}

export function CultureQuestionRanking({ accountId, days = 30 }: CultureQuestionRankingProps) {
  const [questions, setQuestions] = useState<QuestionScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchRanking = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch responses with culture_question_id
      const { data: responses, error: respError } = await supabase
        .from('pulse_responses')
        .select('culture_question_id, numeric_score')
        .eq('account_id', accountId)
        .not('culture_question_id', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (respError) throw respError;
      if (!responses || responses.length === 0) {
        setQuestions([]);
        return;
      }

      // Aggregate by question
      const aggregated: Record<string, { sum: number; count: number }> = {};
      responses.forEach(r => {
        const qid = r.culture_question_id!;
        if (!aggregated[qid]) aggregated[qid] = { sum: 0, count: 0 };
        aggregated[qid].sum += (r.numeric_score || 0);
        aggregated[qid].count += 1;
      });

      const questionIds = Object.keys(aggregated);
      if (questionIds.length === 0) {
        setQuestions([]);
        return;
      }

      // Fetch question details
      const { data: questionData, error: qError } = await supabase
        .from('pulse_culture_questions')
        .select('id, question_text, pillar_type')
        .in('id', questionIds);

      if (qError) throw qError;

      const result: QuestionScore[] = (questionData || []).map(q => ({
        question_id: q.id,
        question_text: q.question_text,
        pillar: q.pillar_type as CulturePillar,
        avg_score: Math.round((aggregated[q.id].sum / aggregated[q.id].count) * 10) / 10,
        response_count: aggregated[q.id].count,
      }));

      result.sort((a, b) => a.avg_score - b.avg_score);
      setQuestions(result);
    } catch (error) {
      console.error('Error fetching question ranking:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, days]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null; // Don't show if no data
  }

  const worst5 = questions.slice(0, 5);
  const best5 = [...questions].sort((a, b) => b.avg_score - a.avg_score).slice(0, 5);
  const allSorted = expanded ? questions : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Perguntas</CardTitle>
        <CardDescription>Top 5 melhores e piores perguntas por score médio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Worst */}
        <div>
          <h4 className="text-sm font-medium text-red-600 flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4" />
            Menores Scores
          </h4>
          <div className="space-y-2">
            {worst5.map((q, i) => (
              <div key={q.question_id} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10">
                <span className="text-xs font-bold text-red-500 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{PILLAR_LABELS[q.pillar]}</Badge>
                    <span className="text-xs text-muted-foreground">{q.response_count} respostas</span>
                  </div>
                </div>
                <Badge variant="destructive">{q.avg_score.toFixed(1)}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Best */}
        <div>
          <h4 className="text-sm font-medium text-green-600 flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            Maiores Scores
          </h4>
          <div className="space-y-2">
            {best5.map((q, i) => (
              <div key={q.question_id} className="flex items-start gap-3 p-3 rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10">
                <span className="text-xs font-bold text-green-500 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{PILLAR_LABELS[q.pillar]}</Badge>
                    <span className="text-xs text-muted-foreground">{q.response_count} respostas</span>
                  </div>
                </div>
                <Badge variant="success">{q.avg_score.toFixed(1)}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Expand */}
        {questions.length > 5 && (
          <>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Ocultar ranking completo
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver todas as {questions.length} perguntas
                </>
              )}
            </Button>

            {expanded && (
              <div className="space-y-2">
                {allSorted.map((q, i) => (
                  <div key={q.question_id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{q.question_text}</p>
                      <Badge variant="outline" className="text-xs mt-1">{PILLAR_LABELS[q.pillar]}</Badge>
                    </div>
                    <Badge variant={q.avg_score < 5 ? 'destructive' : q.avg_score < 7 ? 'warning' : 'success'}>
                      {q.avg_score.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
