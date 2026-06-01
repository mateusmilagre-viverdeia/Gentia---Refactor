import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PulseProgressBar } from "@/components/pulse/PulseProgressBar";
import { Star, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Question = {
  id: string;
  type: "nps" | "stars" | "multiple_choice" | "text";
  question_text: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
};

type InviteData = {
  id: string;
  status: string;
  expires_at: string;
  template_id: string;
  consultant_user_id: string;
  consultant_name?: string;
};

export default function SatisfactionSurvey() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [step, setStep] = useState(0);
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const { data: invData, error: invErr } = await (supabase as any)
          .from("consultant_satisfaction_invites")
          .select("id, status, expires_at, template_id, consultant_user_id")
          .eq("token", token)
          .maybeSingle();

        if (invErr || !invData) {
          setError("Link inválido ou não encontrado.");
          return;
        }
        if (invData.status !== "pending") {
          setError("Esta avaliação já foi respondida. Obrigado!");
          return;
        }
        if (new Date(invData.expires_at).getTime() < Date.now()) {
          setError("Este link expirou.");
          return;
        }

        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", invData.consultant_user_id)
          .maybeSingle();

        const consultantName = profile
          ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || undefined
          : undefined;

        const { data: qs, error: qErr } = await (supabase as any)
          .from("consultant_satisfaction_questions")
          .select("*")
          .eq("template_id", invData.template_id)
          .order("order_index", { ascending: true });

        if (qErr) {
          setError("Não foi possível carregar as perguntas.");
          return;
        }

        setInvite({ ...invData, consultant_name: consultantName });
        setQuestions((qs ?? []) as Question[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const total = questions.length;
  const current = questions[step];

  const setAnswer = (qid: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const isAnswered = (q: Question) => {
    const v = answers[q.id];
    if (!q.is_required) return true;
    if (q.type === "text") return typeof v === "string" && v.trim().length > 0;
    if (q.type === "multiple_choice") return typeof v === "string" && v.length > 0;
    return typeof v === "number";
  };

  const next = () => {
    if (current && !isAnswered(current)) {
      toast.error("Por favor, responda a pergunta para continuar.");
      return;
    }
    if (step < total - 1) setStep(step + 1);
  };

  const submit = async () => {
    if (!token) return;
    if (current && !isAnswered(current)) {
      toast.error("Por favor, responda a pergunta.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        token,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers: questions.map((q) => {
          const v = answers[q.id];
          return {
            question_id: q.id,
            value_numeric: q.type === "nps" || q.type === "stars" ? (typeof v === "number" ? v : null) : null,
            value_text: q.type === "text" ? (v ?? null) : null,
            value_options: q.type === "multiple_choice" ? (v ?? null) : null,
          };
        }),
      };
      const { data, error } = await supabase.functions.invoke("submit-satisfaction-response", { body: payload });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Erro ao enviar");
      }
      setCompleted(true);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível enviar a resposta.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação foi registrada com sucesso e nos ajudará a evoluir continuamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Avaliação do Consultor</h1>
          {invite?.consultant_name && (
            <p className="text-muted-foreground mt-1">
              Avaliando: <span className="font-medium text-foreground">{invite.consultant_name}</span>
            </p>
          )}
        </div>

        <PulseProgressBar current={step + 1} total={total} className="mb-6" />

        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-6">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg md:text-xl font-semibold">
                    {current.question_text}
                    {current.is_required && <span className="text-destructive ml-1">*</span>}
                  </h2>

                  {current.type === "nps" && (
                    <div className="grid grid-cols-11 gap-1">
                      {Array.from({ length: 11 }).map((_, n) => (
                        <button
                          key={n}
                          onClick={() => setAnswer(current.id, n)}
                          className={cn(
                            "aspect-square rounded-lg border text-sm font-semibold transition-all",
                            answers[current.id] === n
                              ? "bg-primary text-primary-foreground border-primary scale-105"
                              : "bg-background hover:bg-muted border-border"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <div className="col-span-11 flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Nada provável</span>
                        <span>Extremamente provável</span>
                      </div>
                    </div>
                  )}

                  {current.type === "stars" && (
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setAnswer(current.id, s)} className="p-1">
                          <Star
                            className={cn(
                              "h-10 w-10 transition-all",
                              (answers[current.id] ?? 0) >= s
                                ? "fill-yellow-400 text-yellow-400 scale-110"
                                : "text-muted-foreground"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {current.type === "multiple_choice" && (
                    <RadioGroup
                      value={answers[current.id] ?? ""}
                      onValueChange={(v) => setAnswer(current.id, v)}
                      className="space-y-2"
                    >
                      {(current.options ?? []).map((opt: string, i) => (
                        <div key={i} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted cursor-pointer">
                          <RadioGroupItem value={opt} id={`opt-${i}`} />
                          <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {current.type === "text" && (
                    <Textarea
                      value={answers[current.id] ?? ""}
                      onChange={(e) => setAnswer(current.id, e.target.value)}
                      placeholder="Sua resposta..."
                      rows={4}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {step === total - 1 && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Identificação (opcional)</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Seu nome" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
                  <Input type="email" placeholder="Seu e-mail" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              {step < total - 1 ? (
                <Button onClick={next} size="lg">
                  Próxima <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={submit} size="lg" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Enviar avaliação
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Gentia
        </p>
      </div>
    </div>
  );
}
