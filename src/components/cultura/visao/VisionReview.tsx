import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVision } from "@/contexts/VisionContext";
import { ChevronLeft, Sparkles, Edit } from "lucide-react";

const VISION_QUESTIONS = [
  "Qual é o segmento de negócio em que você está inserido?",
  "O que sua empresa faz?",
  "Esse segmento é um business de quê?",
  "Quem é o público-alvo da sua empresa?",
  "Onde você vê sua empresa em 3 a 5 anos?",
  "Para qual direção deseja apontar seus esforços?",
  "Como você medirá o sucesso da sua empresa?",
  "Se você saísse na capa da Forbes, qual seria a matéria?",
  "Quando imagina sua empresa alcançando a visão, qual imagem vem à mente?",
  "Das respostas acima, quais palavras-chave se repetem e têm mais significado?",
];

export function VisionReview() {
  const { session, updateStage } = useVision();
  
  const handleEdit = (questionNumber: number) => {
    updateStage(questionNumber);
  };
  
  const handleGenerateVision = () => {
    updateStage(12); // Stage 12 = Processing
  };
  
  const handleBackToWizard = () => {
    updateStage(session.stage < 11 ? session.stage : 10);
  };
  
  const answeredCount = Object.keys(session.answers).filter(
    key => session.answers[Number(key)]?.trim()
  ).length;
  
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">📋 Revisão de Respostas</h2>
        <p className="text-gray-600">
          Revise suas respostas antes de gerar a análise. Você pode editar qualquer resposta clicando no botão "Editar".
        </p>
      </div>
      
      <div className="space-y-3">
        {VISION_QUESTIONS.map((question, index) => {
          const questionNumber = index + 1;
          const answer = session.answers[questionNumber];
          
          return (
            <Card key={questionNumber} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {questionNumber}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-base">{question}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(questionNumber)}
                        className="flex-shrink-0"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {answer || "Não respondida"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between pt-8 border-t">
        <Button variant="outline" onClick={handleBackToWizard}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        {session.analysis && session.analysis.visionInspirational ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateVision}
              size="lg"
              disabled={answeredCount < 10}
            >
              Regerar Análise
              <Sparkles className="h-5 w-5 ml-2" />
            </Button>
            <Button
              onClick={() => updateStage(13)}
              size="lg"
              className="bg-black text-white hover:bg-gray-800"
            >
              Ver Resultado
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerateVision}
            size="lg"
            className="bg-black text-white hover:bg-gray-800"
            disabled={answeredCount < 10}
          >
            Gerar Análise
            <Sparkles className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
