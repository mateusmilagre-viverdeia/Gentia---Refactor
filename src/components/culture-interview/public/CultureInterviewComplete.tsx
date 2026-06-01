import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useEffect } from "react";

interface CultureInterviewCompleteProps {
  companyName: string;
  jobTitle: string;
  isProcessing: boolean;
  returnUrl?: string | null;
}

export function CultureInterviewComplete({
  companyName,
  jobTitle,
  isProcessing,
  returnUrl,
}: CultureInterviewCompleteProps) {
  // Auto-redirect back to the candidate's application page once processing finishes
  useEffect(() => {
    if (!isProcessing && returnUrl) {
      const t = setTimeout(() => {
        window.location.href = returnUrl;
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [isProcessing, returnUrl]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Processando Entrevista...</h2>
            <p className="text-muted-foreground">
              Aguarde enquanto analisamos suas respostas. Isso pode levar alguns segundos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Entrevista Concluída!</h2>
          <p className="text-muted-foreground">
            Obrigado por participar da entrevista para <strong>{jobTitle}</strong> na <strong>{companyName}</strong>.
          </p>
          <p className="text-muted-foreground text-sm">
            Nossa equipe analisará suas respostas e entrará em contato em breve.
          </p>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Aguardando análise
          </Badge>
          {returnUrl && (
            <div className="pt-2">
              <Button
                onClick={() => { window.location.href = returnUrl; }}
                className="gap-2"
              >
                Voltar para sua candidatura
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Redirecionando automaticamente em instantes...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
