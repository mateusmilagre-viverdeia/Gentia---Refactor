import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useCultureInterviewSession, startCultureSession } from "@/hooks/useCultureInterviewSession";
import { CultureInterviewIntro } from "@/components/culture-interview/public/CultureInterviewIntro";
import { CultureInterviewActive } from "@/components/culture-interview/public/CultureInterviewActive";
import { CultureInterviewActiveConductor } from "@/components/culture-interview/public/CultureInterviewActiveConductor";
import { CultureInterviewComplete } from "@/components/culture-interview/public/CultureInterviewComplete";
import { CultureInterviewError } from "@/components/culture-interview/public/CultureInterviewError";
import { AudioPreflightCheck } from "@/components/voice-interview/AudioPreflightCheck";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PageStage = "loading" | "intro" | "resume" | "preflight" | "active" | "processing" | "completed" | "error";

export default function CandidateInterviewPage() {
  const { interviewToken } = useParams<{ interviewToken: string }>();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return");
  const [stage, setStage] = useState<PageStage>("loading");
  const [errorType, setErrorType] = useState<"not_found" | "expired" | "cancelled" | "error" | "mic_denied">("error");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Session data for active interview
  const [ephemeralToken, setEphemeralToken] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");

  const { data, isLoading } = useCultureInterviewSession(interviewToken);

  // Handle loading state
  if (isLoading && stage === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando entrevista...</p>
        </div>
      </div>
    );
  }

  // Handle validation errors
  if (data && !data.valid && stage === "loading") {
    const errorMap: Record<string, "not_found" | "expired" | "cancelled" | "error"> = {
      "SESSION_NOT_FOUND": "not_found",
      "SESSION_EXPIRED": "expired",
      "SESSION_CANCELLED": "cancelled",
    };
    return (
      <CultureInterviewError 
        type={errorMap[data.error || ""] || "error"}
        message={data.message}
      />
    );
  }

  // Handle already completed
  if (data?.valid && data.session?.status === "completed" && stage === "loading") {
    return (
      <CultureInterviewComplete
        companyName={data.session.companyName}
        jobTitle={data.session.jobTitle}
        isProcessing={false}
        returnUrl={returnUrl}
      />
    );
  }

  // Handle in_progress OR abandoned-resumable
  const isResumable =
    data?.valid &&
    data.session?.canResume &&
    (data.session?.status === "in_progress" || data.session?.status === "abandoned");
  if (isResumable && stage === "loading") {
    setStage("resume");
  }

  // Update stage to intro once loaded
  if (data?.valid && data.session && stage === "loading" && !isResumable && data.session.status !== "in_progress") {
    setStage("intro");
  }

  const handleRequestStart = () => {
    // Pula direto para o preflight; a sessão Realtime só abre depois que o áudio passar.
    setStage("preflight");
  };

  const handlePreflightReady = async () => {
    if (!interviewToken) return;

    try {
      const result = await startCultureSession(interviewToken);

      if ("error" in result) {
        toast.error(result.message || "Erro ao iniciar entrevista");
        setStage("intro");
        return;
      }

      setEphemeralToken(result.ephemeralToken);
      setSessionId(result.sessionId);
      setStage("active");
    } catch (err) {
      toast.error("Erro ao conectar. Tente novamente.");
      setStage("intro");
    }
  };

  const handleInterviewComplete = async (
    transcript: string,
    durationSeconds: number,
    transcriptEntries?: Array<{ type: string; text: string; startSeconds: number }>,
    completedNaturally?: boolean,
    tokenUsage?: { audioInputTokens: number; audioOutputTokens: number; textInputTokens: number; textOutputTokens: number },
    force?: boolean,
  ) => {
    setStage("processing");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sessionId,
            transcript,
            durationSeconds,
            transcriptEntries,
            completedNaturally: completedNaturally ?? false,
            force: force === true ? true : undefined,
            tokenUsage: tokenUsage ? {
              audioInputTokens: tokenUsage.audioInputTokens,
              audioOutputTokens: tokenUsage.audioOutputTokens,
              textInputTokens: tokenUsage.textInputTokens,
              textOutputTokens: tokenUsage.textOutputTokens,
              // Observability only — NOT used for duration/billing anymore.
              // Server now uses probed audio file duration as ground truth.
              audioInputSeconds: tokenUsage.audioInputTokens / 100,
              audioOutputSeconds: tokenUsage.audioOutputTokens / 100,
            } : undefined,
          }),
        }
      );

      // 409 = gate de cobertura em simulação (is_test=true). A sessão segue
      // em in_progress no backend; oferecemos recarregar para continuar OU
      // forçar encerramento com cobertura parcial.
      if (response.status === 409) {
        const payload = await response.json().catch(() => ({} as any));
        const missing = Array.isArray(payload?.missing) ? payload.missing : [];
        const total = payload?.total ?? 0;
        const covered = payload?.covered ?? 0;
        toast.warning(
          `Encerramento bloqueado: faltam ${total - covered} de ${total} pergunta(s).`,
          {
            description: "Recarregue para continuar respondendo ou clique em 'Encerrar mesmo assim'.",
            duration: 12000,
            action: {
              label: "Encerrar mesmo assim",
              onClick: () => {
                void handleInterviewComplete(
                  transcript,
                  durationSeconds,
                  transcriptEntries,
                  completedNaturally,
                  tokenUsage,
                  true,
                );
              },
            },
          },
        );
        // Voltar para tela de retomada via reload da rota
        setTimeout(() => {
          if (returnUrl) {
            // Recarregar manterá o token e o validate-session detectará in_progress → stage "resume"
            window.location.reload();
          } else {
            window.location.reload();
          }
        }, 1500);
        return;
      }

      await response.json();
      setStage("completed");
    } catch (err) {
      setStage("completed");
    }
  };


  const handleError = (error: string) => {
    if (error.includes("microfone")) {
      setErrorType("mic_denied");
    } else {
      setErrorType("error");
    }
    setErrorMessage(error);
    setStage("error");
  };

  // Render based on stage
  if (stage === "error") {
    return (
      <CultureInterviewError 
        type={errorType}
        message={errorMessage}
        onRetry={() => setStage("intro")}
      />
    );
  }

  if (stage === "preflight") {
    return (
      <AudioPreflightCheck
        sessionId={sessionId || `pending-${interviewToken}`}
        sessionType="cultural"
        onReady={handlePreflightReady}
        onCancel={() => setStage("intro")}
      />
    );
  }

  if (stage === "active" && ephemeralToken) {
    const useConductor = !!data?.session?.conductorEnabled;
    if (useConductor) {
      return (
        <CultureInterviewActiveConductor
          sessionId={sessionId}
          ephemeralToken={ephemeralToken}
          companyName={data?.session?.companyName || "Empresa"}
          jobTitle={data?.session?.jobTitle || "Vaga"}
          candidateName={data?.session?.candidateName}
          onComplete={handleInterviewComplete}
          onError={handleError}
        />
      );
    }
    return (
      <CultureInterviewActive
        sessionId={sessionId}
        ephemeralToken={ephemeralToken}
        companyName={data?.session?.companyName || "Empresa"}
        jobTitle={data?.session?.jobTitle || "Vaga"}
        candidateName={data?.session?.candidateName}
        aiInitiatesConversation={true}
        onComplete={handleInterviewComplete}
        onError={handleError}
      />
    );
  }

  if (stage === "processing" || stage === "completed") {
    return (
      <CultureInterviewComplete
        companyName={data?.session?.companyName || "Empresa"}
        jobTitle={data?.session?.jobTitle || "Vaga"}
        isProcessing={stage === "processing"}
        returnUrl={returnUrl}
      />
    );
  }

  if (stage === "resume" && data?.session) {
    const progress = data.session.resumeProgress;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Entrevista interrompida</h1>
            <p className="text-muted-foreground">
              Detectamos que sua entrevista com <strong>{data.session.companyName}</strong> foi interrompida.
              {progress && progress.total > 0 && (
                <> Você já respondeu <strong>{progress.covered} de {progress.total}</strong> perguntas.</>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Vamos continuar de onde você parou — nada do que você já disse será perdido.
            </p>
          </div>
          <button
            onClick={handleRequestStart}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Retomar entrevista
          </button>
        </div>
      </div>
    );
  }

  if (data?.session) {
    return (
      <CultureInterviewIntro
        session={data.session}
        isStarting={false}
        onStart={handleRequestStart}
      />
    );
  }

  return null;
}
