import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NpsContext {
  candidate_name?: string;
  job_title?: string;
  consultancy_name?: string;
  trigger?: "exit" | "hired";
  already_answered?: boolean;
  score?: number;
  logo_url?: string | null;
  error?: string;
}

const SCORE_COLOR = (n: number) => {
  if (n <= 6) return "bg-destructive/10 hover:bg-destructive/20 border-destructive/40 text-destructive-foreground";
  if (n <= 8) return "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/40";
  return "bg-green-500/10 hover:bg-green-500/20 border-green-500/40";
};

const SCORE_SELECTED = (n: number) => {
  if (n <= 6) return "bg-destructive text-destructive-foreground border-destructive";
  if (n <= 8) return "bg-yellow-500 text-white border-yellow-500";
  return "bg-green-600 text-white border-green-600";
};

export default function NpsResponsePage() {
  const { token } = useParams<{ token: string }>();
  const [ctx, setCtx] = useState<NpsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_nps_context", { p_token: token });
        if (error) throw error;
        setCtx(data as any);
      } catch (e) {
        setCtx({ error: "load_failed" });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (score === null || !token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_nps_response", {
        p_token: token,
        p_score: score,
        p_feedback: feedback || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "submit_failed");
      setSubmitted(true);
    } catch (e: any) {
      alert("Não foi possível enviar sua resposta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ctx || ctx.error || !ctx.candidate_name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Link inválido</h1>
          <p className="text-muted-foreground">
            Este link de pesquisa não é válido ou já expirou.
          </p>
        </div>
      </div>
    );
  }

  if (ctx.already_answered || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Obrigado pelo feedback!</h1>
          <p className="text-muted-foreground">
            Sua opinião é muito importante para a {ctx.consultancy_name}.
          </p>
        </div>
      </div>
    );
  }

  const intro = ctx.trigger === "hired"
    ? `Parabéns pela contratação como ${ctx.job_title}! Adoraríamos saber como foi sua experiência no processo.`
    : `Agradecemos sua participação no processo para ${ctx.job_title}. Sua opinião nos ajuda a melhorar.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {ctx.logo_url && (
            <img src={ctx.logo_url} alt={ctx.consultancy_name} className="h-10 w-auto" />
          )}
          <span className="font-semibold text-lg">{ctx.consultancy_name}</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 md:py-12">
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Olá, {ctx.candidate_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground text-base">{intro}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg md:text-xl font-semibold mb-4 leading-snug">
              De 0 a 10, quanto você recomendaria a {ctx.consultancy_name} para um amigo ou colega que esteja buscando emprego?
            </h2>

            <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={cn(
                    "h-12 sm:h-14 rounded-lg border-2 font-bold text-base transition-all",
                    score === n ? SCORE_SELECTED(n) : SCORE_COLOR(n),
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
              <span>Não recomendaria</span>
              <span>Recomendaria muito</span>
            </div>
          </div>

          {score !== null && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-sm font-medium">
                Quer nos contar mais sobre sua experiência? <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="O que mais você gostaria que soubéssemos?"
                maxLength={1000}
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar feedback"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Feedback gerenciado pela {ctx.consultancy_name}
      </footer>
    </div>
  );
}
