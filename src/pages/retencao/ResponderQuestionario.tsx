import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSurveys } from '@/hooks/useSurveys';
import { AppLayout } from '@/components/layout/AppLayout';
import { SurveyResponseForm } from '@/components/retencao/questionarios/SurveyResponseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock, Lock } from 'lucide-react';
import type { Survey, SurveyQuestion, InvitationStatus } from '@/types/survey.types';

type PageState = 'loading' | 'form' | 'success' | 'error' | 'already_answered' | 'closed' | 'no_permission';

interface InvitationData {
  id: string;
  survey_id: string;
  user_id: string;
  status: InvitationStatus;
  viewed_at: string | null;
  responded_at: string | null;
}

export default function ResponderQuestionario() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSurveyWithQuestions, submitResponse } = useSurveys();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [survey, setSurvey] = useState<(Survey & { questions: SurveyQuestion[] }) | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSurveyAndVerify = async () => {
      if (!surveyId || !user?.id) {
        setErrorMessage('ID do questionário não encontrado');
        setPageState('error');
        return;
      }

      try {
        // 1. Load survey with questions
        const surveyData = await getSurveyWithQuestions(surveyId);
        setSurvey(surveyData);

        // 2. Check if survey is active
        if (surveyData.status === 'closed' || surveyData.status === 'archived') {
          setPageState('closed');
          return;
        }

        if (surveyData.status === 'draft') {
          setErrorMessage('Este questionário ainda não foi publicado');
          setPageState('error');
          return;
        }

        // 3. Check if user has an invitation
        const { data: inviteData, error: inviteError } = await supabase
          .from('survey_invitations')
          .select('id, survey_id, user_id, status, viewed_at, responded_at')
          .eq('survey_id', surveyId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (inviteError) throw inviteError;

        if (!inviteData) {
          setPageState('no_permission');
          return;
        }

        setInvitation(inviteData as InvitationData);

        // 4. Check if already answered
        if (inviteData.status === 'completed') {
          setPageState('already_answered');
          return;
        }

        // 5. Update invitation as viewed
        if (inviteData.status === 'pending') {
          await supabase
            .from('survey_invitations')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', inviteData.id);
        }

        setPageState('form');
      } catch (error: any) {
        console.error('Error loading survey:', error);
        setErrorMessage(error.message || 'Erro ao carregar questionário');
        setPageState('error');
      }
    };

    loadSurveyAndVerify();
  }, [surveyId, user?.id, getSurveyWithQuestions]);

  const handleSubmit = async (answers: { questionId: string; text?: string; options?: string[]; scale?: number }[]) => {
    if (!surveyId || !survey) return;

    setIsSubmitting(true);
    try {
      await submitResponse({
        surveyId,
        answers,
        isAnonymous: survey.is_anonymous,
      });
      setPageState('success');
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Carregando questionário...</p>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Resposta enviada!</h2>
              <p className="text-muted-foreground mb-6">
                Obrigado por responder o questionário. Sua participação é muito importante.
              </p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        );

      case 'already_answered':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Você já respondeu!</h2>
              <p className="text-muted-foreground mb-6">
                Você já enviou sua resposta para este questionário.
              </p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        );

      case 'closed':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Questionário encerrado</h2>
              <p className="text-muted-foreground mb-6">
                Este questionário não está mais recebendo respostas.
              </p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        );

      case 'no_permission':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Acesso não autorizado</h2>
              <p className="text-muted-foreground mb-6">
                Você não foi convidado para responder este questionário.
              </p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Erro</h2>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        );

      case 'form':
        if (!survey || !survey.questions?.length) {
          return (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Este questionário não possui perguntas.</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{survey.title}</CardTitle>
                {survey.description && (
                  <CardDescription>{survey.description}</CardDescription>
                )}
                {survey.is_anonymous && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4" />
                    Esta pesquisa é anônima. Suas respostas não serão identificadas.
                  </p>
                )}
              </CardHeader>
            </Card>

            <SurveyResponseForm
              questions={survey.questions}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        );
    }
  };

  return (
    <AppLayout title="Responder Questionário">
      <div className="container py-6">
        {renderContent()}
      </div>
    </AppLayout>
  );
}
