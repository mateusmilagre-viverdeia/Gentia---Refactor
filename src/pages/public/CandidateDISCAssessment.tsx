import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCandidateDISC, CandidateDISCResponse } from '@/hooks/useCandidateDISC';
import { useJobDISCProfile } from '@/hooks/useJobDISCProfile';
import { supabase } from '@/integrations/supabase/client';
import { DISCQuestion, RESPONSE_SCALE } from '@/types/disc.types';
import { 
  Brain, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

type AssessmentStage = 'loading' | 'error' | 'intro' | 'questions' | 'completed';

export default function CandidateDISCAssessment() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { 
    fetchSessionByToken, 
    fetchQuestions, 
    startSession, 
    submitResponses, 
    isLoading, 
    error: hookError 
  } = useCandidateDISC();
  
  const [stage, setStage] = useState<AssessmentStage>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<DISCQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [lostLinkEmail, setLostLinkEmail] = useState('');
  const [lostLinkStatus, setLostLinkStatus] = useState<string | null>(null);
  const [lostLinkOptions, setLostLinkOptions] = useState<
    Array<{ sessionId: string; jobId: string; jobTitle: string; companyName: string; expiresAt?: string | null }>
  >([]);
  
  const { profile: desiredProfile } = useJobDISCProfile(session?.job_id);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setError('Token inválido');
        setStage('error');
        return;
      }

      try {
        // Fetch session
        const sessionData = await fetchSessionByToken(token);
        if (!sessionData) {
          setStage('error');
          return;
        }
        
        setSession(sessionData);

        // Check if already completed
        if (sessionData.status === 'completed') {
          setStage('completed');
          return;
        }

        // Fetch candidate, job, and company info
        const [candidateRes, jobRes] = await Promise.all([
          supabase
            .from('recruitment_candidates')
            .select('first_name, last_name')
            .eq('id', sessionData.candidate_id)
            .single(),
          supabase
            .from('recruitment_jobs')
            .select('title, account:companies(name)')
            .eq('id', sessionData.job_id)
            .single(),
        ]);

        if (candidateRes.data) {
          setCandidateName(`${candidateRes.data.first_name} ${candidateRes.data.last_name || ''}`.trim());
        }
        if (jobRes.data) {
          setJobTitle(jobRes.data.title);
          setCompanyName((jobRes.data.account as any)?.name || '');
        }

        // Fetch questions
        const questionsData = await fetchQuestions();
        setQuestions(questionsData);

        // Set stage based on session status
        if (sessionData.status === 'in_progress') {
          setStage('questions');
        } else {
          setStage('intro');
        }
      } catch (err: any) {
        console.error('Error initializing assessment:', err);
        setError(err.message || 'Erro ao carregar assessment');
        setStage('error');
      }
    };

    init();
  }, [token, fetchSessionByToken, fetchQuestions]);

  // Handle start
  const handleStart = async () => {
    if (!session) return;
    
    const success = await startSession(session.id);
    if (success) {
      setStage('questions');
    }
  };

  // Handle response selection
  const handleResponseChange = (questionId: string, score: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: score,
    }));
  };

  // Navigate questions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!session) return;

    const responseArray: CandidateDISCResponse[] = Object.entries(responses).map(
      ([questionId, score]) => ({
        question_id: questionId,
        score,
      })
    );

    const result = await submitResponses(
      session.id, 
      responseArray, 
      questions,
      desiredProfile ? {
        primary_profile: desiredProfile.primary_profile,
        secondary_profile: desiredProfile.secondary_profile,
        min_match_score: desiredProfile.min_match_score,
        weight_d: desiredProfile.weight_d,
        weight_i: desiredProfile.weight_i,
        weight_s: desiredProfile.weight_s,
        weight_c: desiredProfile.weight_c,
        use_advanced_mode: desiredProfile.use_advanced_mode,
        target_d: desiredProfile.target_d,
        target_i: desiredProfile.target_i,
        target_s: desiredProfile.target_s,
        target_c: desiredProfile.target_c,
        tolerance: desiredProfile.tolerance,
        eliminator_d: desiredProfile.eliminator_d,
        eliminator_i: desiredProfile.eliminator_i,
        eliminator_s: desiredProfile.eliminator_s,
        eliminator_c: desiredProfile.eliminator_c,
      } : undefined
    );

    if (result) {
      setStage('completed');
    } else {
      toast.error("Erro ao finalizar assessment. Recarregue a página e tente novamente.");
    }
  };

  // Progress calculation
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return (Object.keys(responses).length / questions.length) * 100;
  }, [responses, questions.length]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;
  const allAnswered = Object.keys(responses).length === questions.length;

  // Render based on stage
  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando assessment...</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    const runTokenRevalidate = async () => {
      if (!token) return;
      setIsRevalidating(true);
      setLostLinkStatus(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('disc-token-revalidate', {
          body: { token },
        });

        if (fnError) throw fnError;
        if (!data?.success || !data?.newToken) {
          throw new Error(data?.error || 'Falha ao revalidar');
        }
        navigate(`/assessment/disc/${data.newToken}`);
      } catch (e: any) {
        setLostLinkStatus(e?.message || 'Falha ao revalidar o link');
      } finally {
        setIsRevalidating(false);
      }
    };

    const discoverLostLink = async () => {
      const email = lostLinkEmail.trim();
      if (!email) {
        setLostLinkStatus('Informe seu e-mail.');
        return;
      }

      setIsRevalidating(true);
      setLostLinkStatus(null);
      setLostLinkOptions([]);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('disc-token-revalidate', {
          body: { email },
        });

        if (fnError) throw fnError;
        if (!data?.success) {
          throw new Error(data?.error || 'Não foi possível localizar suas avaliações');
        }

        if (data.action === 'send' && data.option?.sessionId) {
          // Auto-send
          const { data: sendData, error: sendError } = await supabase.functions.invoke('disc-token-revalidate', {
            body: { email, sessionId: data.option.sessionId },
          });
          if (sendError) throw sendError;
          if (sendData?.success && sendData?.sent === false && sendData?.skipped_reason === 'rate_limited_24h') {
            setLostLinkStatus('Já enviamos um link recentemente. Tente novamente amanhã.');
            return;
          }
          setLostLinkStatus('Enviamos um novo link para seu e-mail (e WhatsApp, se disponível).');
          return;
        }

        if (data.action === 'choose' && Array.isArray(data.options)) {
          setLostLinkOptions(data.options);
          return;
        }

        setLostLinkStatus('Não encontramos avaliações pendentes para este e-mail.');
      } catch (e: any) {
        setLostLinkStatus(e?.message || 'Falha ao buscar avaliações');
      } finally {
        setIsRevalidating(false);
      }
    };

    const sendForOption = async (sessionId: string) => {
      const email = lostLinkEmail.trim();
      if (!email) {
        setLostLinkStatus('Informe seu e-mail.');
        return;
      }
      setIsRevalidating(true);
      setLostLinkStatus(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('disc-token-revalidate', {
          body: { email, sessionId },
        });
        if (fnError) throw fnError;

        if (data?.success && data?.sent === false && data?.skipped_reason === 'rate_limited_24h') {
          setLostLinkStatus('Já enviamos um link recentemente. Tente novamente amanhã.');
          return;
        }
        if (!data?.success) {
          throw new Error(data?.error || 'Falha ao enviar link');
        }
        setLostLinkStatus('Enviamos um novo link para seu e-mail (e WhatsApp, se disponível).');
        setLostLinkOptions([]);
      } catch (e: any) {
        setLostLinkStatus(e?.message || 'Falha ao enviar link');
      } finally {
        setIsRevalidating(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link inválido ou expirado</h2>
            <p className="text-muted-foreground mb-4">
              {lostLinkStatus || error || hookError || 'Não foi possível carregar o assessment'}
            </p>

            {token && (
              <div className="space-y-2">
                <Button onClick={runTokenRevalidate} disabled={isRevalidating} className="w-full">
                  {isRevalidating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Gerar novo link e continuar
                </Button>
              </div>
            )}

            <div className="my-6 border-t border-border/60" />

            <div className="text-left space-y-3">
              <div>
                <p className="font-medium">Perdi meu link</p>
                <p className="text-sm text-muted-foreground">Informe seu e-mail para localizar suas avaliações pendentes.</p>
              </div>

              <Input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={lostLinkEmail}
                onChange={(e) => setLostLinkEmail(e.target.value)}
                disabled={isRevalidating}
              />

              <Button variant="outline" onClick={discoverLostLink} disabled={isRevalidating} className="w-full">
                {isRevalidating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Encontrar minhas avaliações
              </Button>

              {lostLinkOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Selecione a vaga:</p>
                  {lostLinkOptions.map((opt) => (
                    <button
                      key={opt.sessionId}
                      onClick={() => sendForOption(opt.sessionId)}
                      disabled={isRevalidating}
                      className={cn(
                        'w-full text-left rounded-lg border border-border/60 bg-background px-3 py-2 transition-colors',
                        'hover:bg-muted/40'
                      )}
                    >
                      <div className="text-sm font-medium">{opt.jobTitle}</div>
                      <div className="text-xs text-muted-foreground">{opt.companyName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Assessment Concluído!</h2>
            <p className="text-muted-foreground mb-4">
              Obrigado por completar o assessment comportamental. Seu resultado foi registrado e será analisado pela equipe de recrutamento.
            </p>
            <p className="text-sm text-muted-foreground">
              Você pode fechar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Assessment Comportamental DISC</CardTitle>
            <CardDescription className="text-base mt-2">
              {companyName && <span className="font-medium">{companyName}</span>}
              {jobTitle && (
                <>
                  {companyName && ' • '}
                  <span>{jobTitle}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidateName && (
              <p className="text-center text-lg">
                Olá, <span className="font-semibold">{candidateName}</span>!
              </p>
            )}
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Instruções:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  O assessment leva aproximadamente 10-15 minutos
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  São {questions.length} afirmações sobre comportamento
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Para cada afirmação, indique o quanto ela se aplica a você
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Não existem respostas certas ou erradas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Seja honesto(a) e responda com base no seu comportamento natural
                </li>
              </ul>
            </div>

            <div className="text-center">
              <Button onClick={handleStart} size="lg" className="px-8">
                Iniciar Assessment
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Questions stage
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-semibold">Assessment Comportamental</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pergunta {currentQuestionIndex + 1} de {questions.length}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Object.keys(responses).length} de {questions.length} respondidas
          </p>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <p className="text-lg font-medium text-center">
                {currentQuestion.question_text}
              </p>

              <RadioGroup
                value={currentResponse?.toString()}
                onValueChange={(value) => handleResponseChange(currentQuestion.id, parseInt(value))}
                className="space-y-3"
              >
                {Object.entries(RESPONSE_SCALE).map(([score, label]) => (
                  <Label
                    key={score}
                    htmlFor={`response-${score}`}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                      currentResponse === parseInt(score)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={score} id={`response-${score}`} />
                    <span>{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Finalizar
            </Button>
          ) : (
            <Button
              onClick={goToNextQuestion}
              disabled={!currentResponse}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Quick Navigation */}
        <div className="flex flex-wrap gap-1 justify-center">
          {questions.map((q, idx) => {
            const isAnswered = responses[q.id] !== undefined;
            const isCurrent = idx === currentQuestionIndex;
            
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={cn(
                  "w-8 h-8 text-xs rounded-full border transition-all",
                  isCurrent && "ring-2 ring-primary ring-offset-2",
                  isAnswered
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
