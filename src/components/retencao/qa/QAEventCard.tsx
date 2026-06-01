import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QAQuestion, QA_DIMENSIONS } from "@/types/qa.types";

interface QAEventCardProps {
  eventNumber: number;
  eventDescription: string;
  questions: QAQuestion[];
  responses: Record<string, number>;
  onResponseChange: (questionId: string, score: number) => void;
}

export function QAEventCard({
  eventNumber,
  eventDescription,
  questions,
  responses,
  onResponseChange
}: QAEventCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {eventNumber}
          </span>
          <span className="text-sm text-muted-foreground">Evento {eventNumber} de 20</span>
        </div>
        <CardTitle className="text-lg leading-relaxed">
          "{eventDescription}"
        </CardTitle>
        <p className="text-sm text-muted-foreground italic mt-2">
          Imagine este evento acontecendo AGORA em sua vida profissional...
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question) => {
          const dimInfo = QA_DIMENSIONS[question.dimension];
          return (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 ${dimInfo.bgColor}`} />
                <p className="text-sm font-medium">{question.question_text}</p>
              </div>
              
              <div className="pl-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{question.scale_low_label}</span>
                  <span>{question.scale_high_label}</span>
                </div>
                
                <RadioGroup
                  value={responses[question.id]?.toString() || ''}
                  onValueChange={(value) => onResponseChange(question.id, parseInt(value))}
                  className="flex justify-between"
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex flex-col items-center gap-1">
                      <RadioGroupItem
                        value={score.toString()}
                        id={`${question.id}-${score}`}
                        className="h-8 w-8"
                      />
                      <Label
                        htmlFor={`${question.id}-${score}`}
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        {score}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
