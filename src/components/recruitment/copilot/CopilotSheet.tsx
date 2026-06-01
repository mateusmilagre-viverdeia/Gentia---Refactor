import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Coins, Brain } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCredits } from "@/hooks/useCredits";
import { useCopilot, type CopilotScope } from "./useCopilot";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scope: CopilotScope;
  candidateId?: string;
  jobId?: string;
  contextLabel?: string;
}

const SUGGESTIONS: Record<CopilotScope, string[]> = {
  candidate: [
    "Resuma os pontos fortes e fracos deste candidato",
    "Como foi o desempenho na entrevista cultural?",
    "Há red flags no histórico ou comunicações?",
  ],
  job: [
    "Compare os 3 melhores candidatos desta vaga",
    "Quem tem maior fit cultural?",
    "Qual candidato está parado há mais tempo?",
  ],
  global: [
    "Quais candidatos estão parados há mais de 7 dias na entrevista?",
    "Mostre os 5 melhores candidatos disponíveis",
    "Quais vagas têm menos de 3 candidatos qualificados?",
  ],
};

export function CopilotSheet({ open, onOpenChange, scope, candidateId, jobId, contextLabel }: Props) {
  const { currentAccount } = useOrganization();
  const { balance, refresh: refreshCredits } = useCredits();
  const { messages, sending, send } = useCopilot({
    accountId: currentAccount?.id,
    scope,
    candidateId,
    jobId,
    open,
  });
  const [input, setInput] = useState("");
  const [deepMode, setDeepMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const handleSend = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput("");
    const mode = deepMode ? "deep" : "auto";
    setDeepMode(false); // reset after each send
    await send(t, mode);
    refreshCredits();
  };

  const noCredits = Number(balance) < 0.5;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Copilot de Recrutamento
          </SheetTitle>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              {scope === "candidate" ? "Candidato" : scope === "job" ? "Vaga" : "Geral"}
              {contextLabel ? ` · ${contextLabel}` : ""}
            </Badge>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-amber-500" />
              {Number(balance).toFixed(1)}
            </span>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pergunte qualquer coisa sobre {scope === "candidate" ? "este candidato" : scope === "job" ? "esta vaga" : "seu pipeline"}. A IA vai buscar nos dados.
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS[scope].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={sending || noCredits}
                    className="w-full text-left text-xs px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary/10 ml-6" : "bg-muted/40 mr-6"
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown>
                    {(m.content || "").replace(/\[fonte:[a-z_]+:[a-z0-9-]+\]/gi, "")}
                  </ReactMarkdown>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 not-prose">
                      {m.sources.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {s.type}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 not-prose">
                    {m.tier && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          m.tier === "deep" && "border-orange-500/40 text-orange-600 dark:text-orange-400",
                          m.tier === "advanced" && "border-primary/40 text-primary",
                        )}
                        title={m.model_used || undefined}
                      >
                        {m.tier === "fast" ? "Rápido" : m.tier === "advanced" ? "Avançado" : "Profundo"}
                      </Badge>
                    )}
                    {typeof m.credits_consumed === "number" && m.credits_consumed > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {m.credits_consumed.toFixed(2)} créditos
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          ))}

          {sending && (
            <div className="bg-muted/40 mr-6 rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
            </div>
          )}
        </div>

        <div className="border-t p-3 space-y-2">
          {noCredits && (
            <p className="text-xs text-destructive">Sem créditos suficientes. Recarregue para continuar.</p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDeepMode((v) => !v)}
              disabled={sending || noCredits}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition disabled:opacity-50",
                deepMode
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
              title="Usa modelo premium para análises críticas (custo maior)"
            >
              <Brain className="h-3 w-3" />
              {deepMode ? "Análise profunda ativa" : "Análise profunda"}
            </button>
            {deepMode && (
              <span className="text-[10px] text-muted-foreground">
                ~0,1 crédito nesta consulta
              </span>
            )}
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={deepMode ? "Faça sua pergunta crítica…" : "Pergunte algo…"}
              disabled={sending || noCredits}
              className="min-h-[44px] max-h-32 resize-none text-sm"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={sending || noCredits || !input.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
