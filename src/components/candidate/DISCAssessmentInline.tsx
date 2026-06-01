import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCandidateDISC, CandidateDISCResponse } from "@/hooks/useCandidateDISC";
import { useJobDISCProfile } from "@/hooks/useJobDISCProfile";
import { DISCQuestion } from "@/types/disc.types";
import {
  Brain,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const RESPONSE_OPTIONS = [
  { value: 1, label: "Discordo totalmente" },
  { value: 2, label: "Discordo" },
  { value: 3, label: "Neutro" },
  { value: 4, label: "Concordo" },
  { value: 5, label: "Concordo totalmente" },
];

interface DISCAssessmentInlineProps {
  jobId: string;
  accountId: string;
  candidateProfileId: string;
  candidateName: string;
  /** Pre-resolved recruitment_candidates.id — avoids fragile email-based lookups */
  candidateId?: string;
  onComplete: () => void;
}

type InlineStage = "loading" | "intro" | "questions" | "completed" | "error";

export function DISCAssessmentInline({
  jobId,
  accountId,
  candidateProfileId,
  candidateName,
  candidateId: candidateIdProp,
  onComplete,
}: DISCAssessmentInlineProps) {
  const {
    fetchQuestions,
    startSession,
    submitResponses,
    isLoading: hookLoading,
  } = useCandidateDISC();

  const { profile: desiredProfile } = useJobDISCProfile(jobId);

  const [stage, setStage] = useState<InlineStage>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DISCQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize: find or create session
  useEffect(() => {
    if (!jobId || !accountId || !candidateProfileId) return;
    setStage("loading");
    let cancelled = false;
    const init = async () => {
      console.log("[DISCInline] init with", { jobId, accountId, candidateProfileId });
      try {
        // Check existing session using candidate_profile_id
        const { data: existing } = await (supabase
          .from("candidate_disc_sessions")
          .select("id, status")
          .eq("job_id", jobId) as any)
          .eq("candidate_profile_id", candidateProfileId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        // Fallback: search by candidate_id if no session found by profile_id
        let session = existing;
        if (!session && candidateIdProp) {
          console.log("[DISCInline] No session by profile_id, trying candidateIdProp:", candidateIdProp);
          const { data: sessionByCandId } = await supabase
            .from("candidate_disc_sessions")
            .select("id, status")
            .eq("job_id", jobId)
            .eq("candidate_id", candidateIdProp)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sessionByCandId) {
            await (supabase
              .from("candidate_disc_sessions")
              .update({ candidate_profile_id: candidateProfileId } as any)
              .eq("id", sessionByCandId.id) as any);
            session = sessionByCandId;
            console.log("[DISCInline] Found session via candidateIdProp:", session.id);
          }
        }

        // Email-based fallback removed — identity is resolved via candidateIdProp or application lookup

        if (cancelled) return;

        if (session?.status === "completed") {
          setStage("completed");
          return;
        }

        if (session) {
          setSessionId(session.id);
        } else {
          // Need to create a new session — resolve candidate_id safely.
          // IMPORTANTE: nunca usar a application mais recente da vaga sem filtrar
          // pelo candidato logado, pois pegaria outro candidato.
          let candidateId = candidateIdProp || null;

          // Fallback 1: application desse perfil específico para a vaga
          if (!candidateId) {
            const { data: app } = await (supabase
              .from("recruitment_applications")
              .select("candidate_id, recruitment_candidates!inner(id, account_id)") as any)
              .eq("job_id", jobId)
              .eq("account_id", accountId)
              .order("applied_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            // Só usa se o candidato pertencer à conta da vaga
            if (app?.candidate_id) {
              candidateId = app.candidate_id;
              console.log("[DISCInline] Resolved candidate_id from application:", candidateId);
            }
          }

          // Fallback 2: cultural session deste perfil para esta vaga
          if (!candidateId) {
            const { data: culturalSession } = await supabase
              .from("culture_interview_sessions")
              .select("candidate_id")
              .eq("job_id", jobId)
              .eq("candidate_profile_id", candidateProfileId)
              .eq("status", "completed")
              .maybeSingle();
            if (culturalSession?.candidate_id) {
              candidateId = culturalSession.candidate_id;
              console.log("[DISCInline] Resolved candidate_id from cultural session:", candidateId);
            }
          }

          // Sem candidate_id válido: parar e mostrar erro claro em vez de
          // criar sessão errada via edge function
          if (!candidateId) {
            console.warn("[DISCInline] Sem candidate_id resolvido — abortando criação de sessão", {
              candidateProfileId,
              jobId,
            });
            throw new Error("Não foi possível identificar seu cadastro nesta vaga. Recarregue a página.");
          }

          {
            // Normal flow: create session manually
            // Find DISC agent for this job workflow
            const { data: wfStep } = await supabase
              .from("recruitment_job_workflow_steps")
              .select("agent_id")
              .eq("job_id", jobId)
              .eq("step_type", "disc")
              .eq("is_active", true)
              .maybeSingle();

            const token = crypto.randomUUID();
            const insertPayload: Record<string, unknown> = {
              candidate_id: candidateId,
              candidate_profile_id: candidateProfileId,
              job_id: jobId,
              account_id: accountId,
              agent_id: wfStep?.agent_id || null,
              token,
              status: "pending",
            };

            const { data: newSession, error: insertErr } = await (supabase
              .from("candidate_disc_sessions")
              .insert(insertPayload as any)
              .select("id")
              .single());

            if (insertErr) throw insertErr;
            if (cancelled) return;
            setSessionId(newSession.id);
          }
        }

        const q = await fetchQuestions();
        if (cancelled) return;
        setQuestions(q);

        if (existing?.status === "in_progress") {
          // Restore saved responses from database
          const { data: savedResponses } = await supabase
            .from("candidate_disc_responses")
            .select("question_id, score")
            .eq("session_id", existing.id);
          
          if (savedResponses && savedResponses.length > 0) {
            const restoredResponses: Record<string, number> = {};
            savedResponses.forEach((r: any) => {
              restoredResponses[r.question_id] = r.score;
            });
            setResponses(restoredResponses);
            
            // Find the first unanswered question
            const answeredIds = new Set(savedResponses.map((r: any) => r.question_id));
            const firstUnanswered = q.findIndex((question: DISCQuestion) => !answeredIds.has(question.id));
            setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : q.length - 1);
            console.log(`[DISCInline] Restored ${savedResponses.length} responses, resuming at question ${firstUnanswered + 1}`);
          }
          setStage("questions");
        } else {
          setStage("intro");
        }
      } catch (err) {
        console.error("[DISCInline] init error:", err);
        if (!cancelled) setStage("error");
        toast.error("Erro ao carregar assessment comportamental");
      }
    };
    init();
    return () => { cancelled = true; };
  }, [jobId, accountId, candidateProfileId, candidateIdProp, fetchQuestions, retryCount]);

  // Beforeunload protection during questions
  useEffect(() => {
    if (stage !== "questions") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  const handleStart = useCallback(async () => {
    if (!sessionId) return;
    const ok = await startSession(sessionId);
    if (ok) setStage("questions");
  }, [sessionId, startSession]);

  const handleResponseChange = async (questionId: string, score: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: score }));
    
    // Progressive save to database
    if (sessionId) {
      setIsSavingResponse(true);
      try {
        const { error } = await supabase
          .from("candidate_disc_responses")
          .upsert(
            { session_id: sessionId, question_id: questionId, score },
            { onConflict: "session_id,question_id" }
          );
        if (error) console.error("[DISCInline] Error saving response:", error);
      } catch (err) {
        console.error("[DISCInline] Error saving response:", err);
      } finally {
        setIsSavingResponse(false);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!sessionId) return;
    const responseArray: CandidateDISCResponse[] = Object.entries(responses).map(
      ([question_id, score]) => ({ question_id, score })
    );

    const result = await submitResponses(
      sessionId,
      responseArray,
      questions,
      desiredProfile
        ? {
            primary_profile: desiredProfile.primary_profile,
            secondary_profile: desiredProfile.secondary_profile,
            min_match_score: desiredProfile.min_match_score,
            weight_d: desiredProfile.weight_d,
            weight_i: desiredProfile.weight_i,
            weight_s: desiredProfile.weight_s,
            weight_c: desiredProfile.weight_c,
            use_advanced_mode: desiredProfile.use_advanced_mode,
            target_d: desiredProfile.target_d,
            target_i: desiredProfile.target_i,
            target_s: desiredProfile.target_s,
            target_c: desiredProfile.target_c,
            tolerance: desiredProfile.tolerance,
            eliminator_d: desiredProfile.eliminator_d,
            eliminator_i: desiredProfile.eliminator_i,
            eliminator_s: desiredProfile.eliminator_s,
            eliminator_c: desiredProfile.eliminator_c,
          }
        : undefined
    );

    if (result) {
      setStage("completed");
      toast.success("Assessment comportamental concluído!");
      onComplete();
    } else {
      toast.error("Erro ao finalizar assessment. Recarregue a página e tente novamente.");
    }
  }, [sessionId, responses, questions, desiredProfile, submitResponses, onComplete]);

  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return (Object.keys(responses).length / questions.length) * 100;
  }, [responses, questions.length]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;
  const allAnswered = Object.keys(responses).length === questions.length;

  if (stage === "loading") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Carregando assessment comportamental...</p>
        </CardContent>
      </Card>
    );
  }

  if (stage === "error") {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Brain className="h-7 w-7 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Erro ao carregar assessment</h3>
          <p className="text-sm text-muted-foreground">
            Não foi possível iniciar o assessment comportamental. Tente novamente.
          </p>
          <Button onClick={() => setRetryCount(c => c + 1)} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stage === "completed") {
    return (
      <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Assessment comportamental concluído!</p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Seu perfil comportamental foi registrado com sucesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === "intro") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Assessment Comportamental DISC</CardTitle>
          <CardDescription>
            Avalie seu perfil comportamental para esta vaga
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Instruções:</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                Aproximadamente 10-15 minutos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {questions.length} afirmações sobre comportamento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Não existem respostas certas ou erradas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Responda com base no seu comportamento natural
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Button onClick={handleStart} size="lg" className="px-8 gap-2">
              Iniciar Assessment
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Questions stage
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Assessment Comportamental</h2>
          <p className="text-sm text-muted-foreground">
            Pergunta {currentQuestionIndex + 1} de {questions.length}
          </p>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {Object.keys(responses).length}/{questions.length} respondidas
          </p>
        </div>

        {currentQuestion && (
          <div className="bg-muted/30 rounded-lg p-5">
            <p className="text-base font-medium mb-5">{currentQuestion.question_text}</p>

            <RadioGroup
              key={currentQuestion.id}
              value={currentResponse?.toString()}
              onValueChange={(val) =>
                handleResponseChange(currentQuestion.id, parseInt(val))
              }
              className="space-y-2"
            >
              {RESPONSE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleResponseChange(currentQuestion.id, option.value)}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    currentResponse === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={`q-${currentQuestion.id}-${option.value}`}
                  />
                  <Label
                    htmlFor={`q-${currentQuestion.id}-${option.value}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex((p) => p + 1)}
              disabled={currentResponse === undefined}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!allAnswered || hookLoading}>
              {hookLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Finalizar Assessment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
