import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTechnicalInterviewSession, startTechnicalSession } from "@/hooks/useTechnicalInterviewSession";
import { TechnicalInterviewIntro } from "@/components/technical-interview/public/TechnicalInterviewIntro";
import { TechnicalInterviewActive } from "@/components/technical-interview/public/TechnicalInterviewActive";
import { TechnicalInterviewComplete } from "@/components/technical-interview/public/TechnicalInterviewComplete";
import { TechnicalInterviewError } from "@/components/technical-interview/public/TechnicalInterviewError";
import { AudioPreflightCheck } from "@/components/voice-interview/AudioPreflightCheck";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PageStage = "loading" | "intro" | "resume" | "preflight" | "active" | "processing" | "completed" | "error";

export default function TechnicalInterviewPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return");
  const [stage, setStage] = useState<PageStage>("loading");
  const [errorType, setErrorType] = useState<"not_found" | "expired" | "cancelled" | "error" | "mic_denied">("error");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Session data for active interview
  const [ephemeralToken, setEphemeralToken] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const { data, isLoading, error } = useTechnicalInterviewSession(token);

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
      <TechnicalInterviewError 
        type={errorMap[data.error || ""] || "error"}
        message={data.message}
      />
    );
  }

  // Handle already completed
  if (data?.valid && data.session?.status === "completed" && stage === "loading") {
    return (
      <TechnicalInterviewComplete
        companyName={data.session.companyName}
        jobTitle={data.session.jobTitle}
        isProcessing={false}
        score={data.session.overallScore || null}
        recommendation={data.session.recommendation || null}
        returnUrl={returnUrl}
      />
    );
  }

  // Handle in_progress with canResume
  if (data?.valid && data.session?.status === "in_progress" && data.session.canResume && stage === "loading") {
    setStage("resume");
  }

  // Update stage to intro once loaded
  if (data?.valid && data.session && stage === "loading" && data.session.status !== "in_progress") {
    setStage("intro");
  }

  const handleRequestStart = () => {
    setStage("preflight");
  };

  const handlePreflightReady = async () => {
    if (!token) return;

    try {
      const result = await startTechnicalSession(token);

      if ("error" in result) {
        toast.error(result.message || "Erro ao iniciar entrevista");
        setStage("intro");
        return;
      }

      setEphemeralToken(result.ephemeralToken);
      setSessionId(result.sessionId);
      setSkills(result.skills);
      setStage("active");
    } catch (err) {
      toast.error("Erro ao conectar. Tente novamente.");
      setStage("intro");
    }
  };

  const handleInterviewComplete = async (
    transcript: string,
    durationSeconds: number,
    completedNaturally?: boolean,
    transcriptEntries?: unknown,
    tokenUsage?: { audioInputTokens: number; audioOutputTokens: number; textInputTokens: number; textOutputTokens: number },
  ) => {
    setStage("processing");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-complete`,
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
            completedNaturally: completedNaturally ?? false,
            transcriptEntries: transcriptEntries ?? [],
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

      const result = await response.json();
      setScore(result.overallScore || null);
      setRecommendation(result.recommendation || null);
      setStage("completed");
    } catch (err) {
      setScore(null);
      setRecommendation(null);
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
      <TechnicalInterviewError 
        type={errorType}
        message={errorMessage}
        onRetry={() => setStage("intro")}
      />
    );
  }

  if (stage === "preflight") {
    return (
      <AudioPreflightCheck
        sessionId={sessionId || `pending-${token}`}
        sessionType="technical"
        onReady={handlePreflightReady}
        onCancel={() => setStage("intro")}
      />
    );
  }

  if (stage === "active" && ephemeralToken) {
    return (
      <TechnicalInterviewActive
        sessionId={sessionId}
        ephemeralToken={ephemeralToken}
        companyName={data?.session?.companyName || "Empresa"}
        jobTitle={data?.session?.jobTitle || "Vaga"}
        skills={skills}
        onComplete={handleInterviewComplete}
        onError={handleError}
      />
    );
  }

  if (stage === "processing" || stage === "completed") {
    return (
      <TechnicalInterviewComplete
        companyName={data?.session?.companyName || "Empresa"}
        jobTitle={data?.session?.jobTitle || "Vaga"}
        isProcessing={stage === "processing"}
        score={score}
        recommendation={recommendation}
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
              Detectamos que sua entrevista técnica com <strong>{data.session.companyName}</strong> foi interrompida.
              {progress && progress.total > 0 && (
                <> Você já avaliou <strong>{progress.covered} de {progress.total}</strong> competências.</>
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
      <TechnicalInterviewIntro
        session={data.session}
        isStarting={false}
        onStart={handleRequestStart}
      />
    );
  }

  return null;
}
