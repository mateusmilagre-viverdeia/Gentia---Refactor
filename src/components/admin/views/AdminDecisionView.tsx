import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale, Sparkles } from 'lucide-react';
import { DecisionDetail } from '@/hooks/useAdminDashboard';

const DECISION_QUESTIONS = [
  "Quais comportamentos são intoleráveis na nossa empresa?",
  "Quais regras devem ser seguidas sem exceção?",
  "Quais critérios usamos para tomar decisões importantes?",
  "Como decidimos quem contratar?",
  "Como decidimos quem demitir?",
  "Como decidimos quem promover?",
  "Como tomamos decisões em geral na empresa?"
];

interface AdminDecisionViewProps {
  decision: DecisionDetail | null;
}

export function AdminDecisionView({ decision }: AdminDecisionViewProps) {
  if (!decision || !decision.answers || decision.answers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Framework de decisão ainda não foi definido.</p>
        </CardContent>
      </Card>
    );
  }

  // Group answers by question
  const answersByQuestion = decision.answers.reduce((acc, answer) => {
    const qNum = answer.question_number;
    if (!acc[qNum]) acc[qNum] = [];
    acc[qNum].push(answer);
    return acc;
  }, {} as Record<number, typeof decision.answers>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Framework de Tomada de Decisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {decision.answers.length} respostas distribuídas em {Object.keys(answersByQuestion).length} perguntas
          </p>
        </CardContent>
      </Card>

      {/* Questions and Answers */}
      {DECISION_QUESTIONS.map((question, index) => {
        const questionNum = index + 1;
        const answers = answersByQuestion[questionNum] || [];

        return (
          <Card key={questionNum}>
            <CardHeader>
              <CardTitle className="text-base">
                {questionNum}. {question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {answers.length > 0 ? (
                <div className="space-y-3">
                  {answers.map((answer, ansIndex) => (
                    <div key={ansIndex} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      {answer.is_suggestion && (
                        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className="text-sm">{answer.answer_text}</span>
                      {answer.is_suggestion && (
                        <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                          Sugestão
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhuma resposta</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Stage Info */}
      <div className="text-sm text-muted-foreground">
        Estágio atual: {decision.session?.stage || 1}
      </div>
    </div>
  );
}
