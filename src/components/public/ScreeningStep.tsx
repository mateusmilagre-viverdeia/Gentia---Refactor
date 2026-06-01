import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScreeningQuestion {
  id: string;
  category: string;
  text: string;
  required: boolean;
}

interface ScreeningStepProps {
  applicationId: string;
  candidateId: string;
  jobId: string;
  accountId: string;
  questions: ScreeningQuestion[];
  onComplete: (passed: boolean) => void;
}

export function ScreeningStep({
  applicationId,
  candidateId,
  jobId,
  accountId,
  questions,
  onComplete,
}: ScreeningStepProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"passed" | "failed" | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!allAnswered) return;

    setIsSubmitting(true);
    try {
      // Check if any required question has "No" answer
      const questionsWithAnswers = questions.map((q) => ({
        id: q.id,
        category: q.category,
        text: q.text,
        required: q.required,
        answer: answers[q.id],
        passed: q.required ? answers[q.id] === true : true,
      }));

      const passed = questionsWithAnswers.every((q) => q.passed);

      // Call screening-evaluate edge function
      const { error } = await supabase.functions.invoke("screening-evaluate", {
        body: {
          applicationId,
          candidateId,
          jobId,
          accountId,
          questions: questionsWithAnswers,
          passed,
        },
      });

      if (error) {
        console.error("Screening evaluate error:", error);
        toast.error("Erro ao processar triagem. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      setResult(passed ? "passed" : "failed");

      if (passed) {
        toast.success("Triagem concluída! Avançando para a próxima etapa...");
        setTimeout(() => onComplete(true), 1500);
      } else {
        onComplete(false);
      }
    } catch (err) {
      console.error("Error submitting screening:", err);
      toast.error("Erro ao enviar respostas");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result === "failed") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Obrigado pelo interesse!</h2>
          <p className="text-muted-foreground">
            Infelizmente, com base nas suas respostas, seu perfil não atende aos requisitos mínimos desta vaga neste momento. 
            Agradecemos sua participação e desejamos sucesso na sua jornada profissional!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (result === "passed") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Triagem concluída!</h2>
          <p className="text-muted-foreground">
            Suas respostas foram registradas. Você está sendo direcionado para a próxima etapa...
          </p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Shield className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Triagem Inicial</h2>
            <p className="text-sm text-muted-foreground">
              Responda às perguntas abaixo para continuar no processo seletivo.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  {idx + 1}.
                </span>
                <p className="text-sm font-medium">{q.text}</p>
              </div>
              <div className="flex gap-3 ml-5">
                <Button
                  type="button"
                  variant={answers[q.id] === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
                  className={cn(
                    "min-w-[80px]",
                    answers[q.id] === true && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant={answers[q.id] === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
                  className={cn(
                    "min-w-[80px]",
                    answers[q.id] === false && "bg-red-600 hover:bg-red-700"
                  )}
                >
                  Não
                </Button>
              </div>
              {q.required && (
                <p className="text-[11px] text-muted-foreground ml-5">
                  * Pergunta obrigatória
                </p>
              )}
            </div>
          ))}
        </div>

        <Button
          className="w-full mt-6"
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            "Confirmar respostas"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
