import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, FileText } from 'lucide-react';

const MISSION_QUESTIONS = [
  "Qual é o segmento de negócio da empresa?",
  "O que a empresa faz?",
  "Quem é o público-alvo?",
  "Quais problemas a empresa resolve?",
  "Por que esses problemas são importantes?",
  "Por que esses problemas são relevantes?",
  "Qual impacto desejado no mundo?",
  "Quais palavras-chave se repetem?"
];

interface AdminMissionViewProps {
  mission: any | null;
}

export function AdminMissionView({ mission }: AdminMissionViewProps) {
  if (!mission) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Missão ainda não foi definida.</p>
        </CardContent>
      </Card>
    );
  }

  const answers = mission.answers || {};
  const analysis = mission.analysis || {};
  const missionStatement = analysis.mission || analysis.mission_statement;

  return (
    <div className="space-y-6">
      {/* Mission Statement */}
      {missionStatement && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Declaração de Missão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">{missionStatement}</p>
          </CardContent>
        </Card>
      )}

      {/* Keywords */}
      {analysis.keywords && analysis.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palavras-chave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword: string, index: number) => (
                <Badge key={index} variant="secondary">{keyword}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Respostas do Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MISSION_QUESTIONS.map((question, index) => {
              const answer = answers[`q${index + 1}`] || answers[index + 1];
              return (
                <div key={index} className="border-b pb-4 last:border-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {index + 1}. {question}
                  </p>
                  <p className="text-foreground">
                    {answer || <span className="italic text-muted-foreground">Não respondido</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight: string, index: number) => (
                <li key={index} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stage Info */}
      <div className="text-sm text-muted-foreground">
        Estágio atual: {mission.stage || 1}
      </div>
    </div>
  );
}
