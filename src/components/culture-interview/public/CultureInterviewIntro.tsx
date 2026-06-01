import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Mic, 
  Clock, 
  CheckCircle2, 
  Volume2,
  Wifi,
  AlertCircle,
  MessageSquare,
  UserCog,
  TestTube2
} from "lucide-react";
import { CultureSessionData } from "@/hooks/useCultureInterviewSession";
import { InterviewIntroTips } from "@/components/interviews/InterviewIntroTips";
import { useBiographyGate } from "@/hooks/useBiographyGate";
import { useNavigate, useParams } from "react-router-dom";


interface CultureInterviewIntroProps {
  session: CultureSessionData;
  isStarting: boolean;
  onStart: () => void;
}

export function CultureInterviewIntro({ 
  session, 
  isStarting, 
  onStart 
}: CultureInterviewIntroProps) {
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
              {session.isTest && (
                <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium w-fit">
                  <TestTube2 className="h-3 w-3" />
                  Modo Simulação Ativo (V3)
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {session.status === "abandoned" && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Sua tentativa anterior foi interrompida
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Sem problemas — pode iniciar uma nova entrevista agora. Vamos começar do início.
              </p>
            </div>
          </div>
        )}

        {/* Welcome Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Entrevista Cultural</h2>
              <p className="text-muted-foreground">
                Olá {session.candidateName.split(" ")[0]}! Bem-vindo(a) à sua entrevista por voz.
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
                  <span>Conversa por voz natural com IA (~15-20 minutos)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>A IA faz perguntas sobre sua experiência e motivações</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Fale naturalmente - a IA aguarda você terminar antes de responder</span>
                </li>
              </ul>
            </div>

            <InterviewIntroTips />

            {/* Requirements */}
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
              <span>Duração estimada: 15-20 minutos</span>
            </div>

            {/* Instruções para o candidato */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Leia com atenção estes 5 pontos antes de iniciar:
              </h4>
              <ol className="text-sm text-foreground/90 space-y-3 list-decimal list-inside marker:font-semibold marker:text-primary">
                <li>
                  Pode pensar com calma antes de responder. Se precisar de uns segundos pra organizar a ideia, sem problema — eu vou esperar.
                </li>
                <li>
                  Se em algum momento eu te interromper antes de você terminar, é só me avisar dizendo algo como <span className="italic">"espera, ainda não acabei"</span> ou <span className="italic">"deixa eu completar"</span>. Eu vou pedir desculpa, voltar pra pergunta e te dar espaço pra concluir. Sua resposta complementar vai contar normalmente.
                </li>
                <li>
                  Quando terminar uma resposta e quiser seguir, pode dizer <span className="italic">"é isso"</span>, <span className="italic">"pode ir"</span> ou simplesmente parar de falar — eu vou perceber.
                </li>
                <li>
                  A entrevista termina quando eu disser que terminamos. <strong>Só depois disso</strong> você pode clicar no botão de encerrar na tela. Se clicar antes, a entrevista é cortada e você pode perder a vaga.
                </li>
                <li>
                  Você precisa estar em um lugar silencioso e sem muito ruído ou barulho externo. Isso pode comprometer muito a qualidade da sua entrevista e seu resultado.
                </li>
              </ol>
              <p className="text-sm font-medium text-foreground pt-1">
                Tudo certo pra começar?
              </p>
            </div>







            {/* Biography gate */}
            {!bio.loading && !bio.complete && !session.isTest && (
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
              disabled={isStarting || bio.loading || (!bio.complete && !session.isTest)}
            >
              {isStarting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Iniciar Entrevista
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
