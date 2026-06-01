import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Mic, 
  Clock, 
  CheckCircle2, 
  Code,
  Volume2,
  Wifi,
  AlertCircle,
  UserCog
} from "lucide-react";
import { TechnicalSessionData } from "@/hooks/useTechnicalInterviewSession";
import { InterviewIntroTips } from "@/components/interviews/InterviewIntroTips";
import { useBiographyGate } from "@/hooks/useBiographyGate";
import { useNavigate, useParams } from "react-router-dom";

interface TechnicalInterviewIntroProps {
  session: TechnicalSessionData;
  isStarting: boolean;
  onStart: () => void;
}

export function TechnicalInterviewIntro({ 
  session, 
  isStarting, 
  onStart 
}: TechnicalInterviewIntroProps) {
  const bio = useBiographyGate();
  const navigate = useNavigate();
  const params = useParams();
  const jobIdParam = (params as any)?.jobId || (params as any)?.id || "";
  const goToBio = () => navigate(`/candidato/biografia${jobIdParam ? `?vaga=${jobIdParam}` : ""}`);
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{session.companyName}</p>
              <h1 className="text-xl font-bold">{session.jobTitle}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Code className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Entrevista Técnica</h2>
              <p className="text-muted-foreground">
                Olá {session.candidateName.split(" ")[0]}! Bem-vindo(a) à sua entrevista técnica por voz.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Como funciona
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Conversa por voz com IA adaptativa (~15-25 minutos)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>A IA faz perguntas técnicas e adapta a profundidade conforme suas respostas</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Fale naturalmente - a IA aguarda você terminar antes de responder</span>
                </li>
              </ul>
            </div>


            <InterviewIntroTips />


            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                Requisitos
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li className="flex items-center gap-2">
                  <Mic className="h-3 w-3" />
                  Microfone funcionando
                </li>
                <li className="flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Som do dispositivo ligado
                </li>
                <li className="flex items-center gap-2">
                  <Wifi className="h-3 w-3" />
                  Conexão estável com internet
                </li>
              </ul>
            </div>

            {/* Duration info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duração estimada: 15-25 minutos</span>
            </div>

            {/* Biography gate */}
            {!bio.loading && !bio.complete && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Complete sua biografia antes de iniciar a entrevista
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Faltam: {bio.missing.join(", ")}. A IA usa esses dados, então não vai perguntar de novo na entrevista.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={goToBio}>
                  <UserCog className="h-4 w-4" />
                  Completar biografia
                </Button>
              </div>
            )}

            {/* Start button */}
            <Button 
              size="lg" 
              className="w-full gap-2" 
              onClick={onStart}
              disabled={isStarting || bio.loading || !bio.complete}
            >
              {isStarting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Iniciar Entrevista Técnica
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
