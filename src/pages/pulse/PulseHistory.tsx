import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PulseStreakDisplay } from '@/components/pulse';
import type { PulseResponse, PulseUserStreak, PulseDriver } from '@/types/pulse.types';

interface ResponseWithQuestion extends PulseResponse {
  culture_question_id?: string | null;
  pulse_questions?: {
    question_text: string;
    pulse_drivers?: { name: string; key: string } | null;
  } | null;
}

export default function PulseHistory() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([]);
  const [streak, setStreak] = useState<PulseUserStreak | null>(null);
  const [averages, setAverages] = useState<{ 
    last7: number; 
    last14: number; 
    last30: number;
  }>({ last7: 0, last14: 0, last30: 0 });

  // Fetch account_id from profile
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setAccountId(data?.account_id || null);
      });
  }, [user?.id]);

  useEffect(() => {
    if (accountId && user?.id) {
      fetchHistory();
    }
  }, [accountId, user?.id]);

  const fetchHistory = async () => {
    if (!accountId || !user?.id) return;

    setIsLoading(true);
    try {
      // Fetch identified responses (non-anonymous)
      const { data: responsesData } = await supabase
        .from('pulse_responses')
        .select(`
          *,
          pulse_questions (
            question_text,
            pulse_drivers (name, key)
          )
        `)
        .eq('account_id', accountId)
        .eq('respondent_user_id', user!.id)
        .eq('is_anonymous', false)
        .order('date', { ascending: false })
        .limit(50);

      setResponses((responsesData || []) as ResponseWithQuestion[]);

      // Fetch streak
      const { data: streakData } = await supabase
        .from('pulse_user_streaks')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', user!.id)
        .maybeSingle();

      setStreak(streakData as PulseUserStreak | null);

      // Calculate averages
      const now = new Date();
      const last7 = new Date(now);
      last7.setDate(last7.getDate() - 7);
      const last14 = new Date(now);
      last14.setDate(last14.getDate() - 14);
      const last30 = new Date(now);
      last30.setDate(last30.getDate() - 30);

      const calcAverage = (days: Date) => {
        const filtered = (responsesData || []).filter(r => 
          new Date(r.date) >= days && r.numeric_score !== null
        );
        if (filtered.length === 0) return 0;
        return filtered.reduce((sum, r) => sum + (r.numeric_score || 0), 0) / filtered.length;
      };

      setAverages({
        last7: calcAverage(last7),
        last14: calcAverage(last14),
        last30: calcAverage(last30),
      });

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 8) return '😄';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😕';
    return '😞';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Activity className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Carregando histórico...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/retencao/pulse">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Meu Histórico</h1>
            <p className="text-sm text-muted-foreground">
              Suas respostas identificadas
            </p>
          </div>
        </div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PulseStreakDisplay streak={streak} className="mb-6" />
        </motion.div>

        {/* Averages */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: '7 dias', value: averages.last7 },
            { label: '14 dias', value: averages.last14 },
            { label: '30 dias', value: averages.last30 },
          ].map((avg, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{avg.label}</span>
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(avg.value)}`}>
                  {avg.value > 0 ? avg.value.toFixed(1) : '—'}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Responses list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Respostas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma resposta identificada ainda
              </p>
            ) : (
              <div className="space-y-4">
                {responses.map((response, index) => (
                  <motion.div
                    key={response.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="text-3xl">
                      {response.raw_emoji || getScoreEmoji(response.numeric_score || 0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {response.pulse_questions?.question_text || 'Pergunta'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(response.date).toLocaleDateString('pt-BR')}
                        </span>
                        {response.pulse_questions?.pulse_drivers && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {response.pulse_questions.pulse_drivers.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {response.numeric_score !== null && (
                      <div className={`text-lg font-bold ${getScoreColor(response.numeric_score)}`}>
                        {response.numeric_score.toFixed(1)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note about anonymous */}
        <motion.p
          className="mt-6 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          💡 Respostas anônimas não aparecem aqui, mas contribuem para os dados agregados do time.
        </motion.p>
      </div>
    </div>
  );
}
