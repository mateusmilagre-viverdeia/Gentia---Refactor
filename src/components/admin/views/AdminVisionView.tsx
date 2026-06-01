import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Target, TrendingUp, FileText } from 'lucide-react';

const VISION_QUESTIONS = [
  "Qual é o segmento de negócio?",
  "O que a empresa faz?",
  "Qual é o tipo de business?",
  "Quem é o público-alvo?",
  "Como você vê a empresa em 3-5 anos?",
  "Para onde você quer direcionar os esforços?",
  "Como você mede o sucesso?",
  "Se a Forbes fizesse uma matéria, o que diria?",
  "Qual imagem mental você tem da visão?",
  "Quais palavras-chave se repetem?"
];

interface AdminVisionViewProps {
  vision: any | null;
}

export function AdminVisionView({ vision }: AdminVisionViewProps) {
  if (!vision) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Visão ainda não foi definida.</p>
        </CardContent>
      </Card>
    );
  }

  const answers = vision.answers || {};
  const analysis = vision.analysis || {};
  const finalVision = vision.final_vision;
  const selectedType = vision.selected_vision_type;

  return (
    <div className="space-y-6">
      {/* Final Vision */}
      {finalVision && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visão Definitiva
              {selectedType && (
                <Badge variant="outline" className="ml-2">
                  {selectedType === 'inspirational' ? 'Inspiracional' : 'Mensurável'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">{finalVision}</p>
          </CardContent>
        </Card>
      )}

      {/* Vision Options */}
      <div className="grid md:grid-cols-2 gap-4">
        {analysis.vision_inspirational && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Visão Inspiracional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{analysis.vision_inspirational}</p>
            </CardContent>
          </Card>
        )}
        
        {analysis.vision_measurable && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Visão Mensurável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{analysis.vision_measurable}</p>
            </CardContent>
          </Card>
        )}
      </div>

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
            {VISION_QUESTIONS.map((question, index) => {
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
        Estágio atual: {vision.stage || 1}
      </div>
    </div>
  );
}
