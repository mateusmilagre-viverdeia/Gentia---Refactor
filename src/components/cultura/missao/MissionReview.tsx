import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMission } from "@/contexts/MissionContext";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { MISSION_QUESTIONS_V1, MISSION_QUESTIONS_V2 } from "@/data/mission-questions";

export function MissionReview() {
  const { session, updateStage } = useMission();

  const version = session.questionnaireVersion || 1;
  const totalQuestions = version === 2 ? 9 : 8;

  const getQuestionText = (questionNumber: number) => {
    if (version === 1) {
      return MISSION_QUESTIONS_V1[questionNumber - 1];
    }
    
    const questionData = MISSION_QUESTIONS_V2[questionNumber - 1];
    
    // Se é a pergunta 4 com segmento, usar a versão específica
    if (questionData.requiresSegment && questionData.segmentVersions && session.segment) {
      return questionData.segmentVersions[session.segment].question;
    }
    
    return questionData.question;
  };

  const handleEdit = (questionNumber: number) => {
    updateStage(questionNumber);
  };

  const handleGenerateMission = () => {
    updateStage(15);
  };

  const handleBackToWizard = () => {
    updateStage(totalQuestions);
  };

  const answeredCount = Object.keys(session.answers).filter(
    (q) => session.answers[Number(q)]?.trim()
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Revise suas Respostas</CardTitle>
          <CardDescription>
            Confira todas as suas respostas antes de gerar a declaração de missão.
            Você pode editar qualquer resposta clicando no botão "Editar".
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNumber) => {
          const question = getQuestionText(questionNumber);
          const answer = session.answers[questionNumber];

          return (
            <Card key={questionNumber}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <CardTitle className="text-base">
                      Pergunta {questionNumber}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-foreground">
                      {question}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(questionNumber)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {answer || "Não respondida"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={handleBackToWizard}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar às Perguntas
        </Button>

        <Button
          onClick={handleGenerateMission}
          disabled={answeredCount < totalQuestions}
          size="lg"
        >
          Gerar Declaração de Missão
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
