import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QAResult, QA_DIMENSIONS, QADimension, getDimensionStrength } from "@/types/qa.types";

interface QADimensionChartProps {
  result: QAResult;
}

export function QADimensionChart({ result }: QADimensionChartProps) {
  const dimensions: { key: QADimension; score: number }[] = [
    { key: 'C', score: result.c_score },
    { key: 'R', score: result.r_score },
    { key: 'A', score: result.a_score },
    { key: 'D', score: result.d_score },
  ];

  // Max possible score per dimension = 10 questions × 5 = 50
  const maxScore = 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dimensões CRAD</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {dimensions.map(({ key, score }) => {
          const info = QA_DIMENSIONS[key];
          const percentage = (score / maxScore) * 100;
          const strength = getDimensionStrength(score, maxScore);
          
          const strengthLabels = {
            baixo: { label: 'Baixo', color: 'text-red-500' },
            moderado: { label: 'Moderado', color: 'text-amber-500' },
            alto: { label: 'Alto', color: 'text-green-500' }
          };

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${info.color}`}>{key}</span>
                  <span className="font-medium">{info.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{score}</span>
                  <span className={`text-xs ${strengthLabels[strength].color}`}>
                    {strengthLabels[strength].label}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress value={percentage} className={`h-3 ${info.bgColor}/20`} />
              </div>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
