import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Printer, StopCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useCompareFinalists } from "@/hooks/useCompareFinalists";
import type { ComponentProps } from "react";

interface FinalistInput {
  candidateId: string;
  name: string;
  cultureScore: number | null;
  discScore: number | null;
  techScore: number | null;
  compositeScore: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobId: string;
  finalists: FinalistInput[];
}

const MAX_CANDIDATES = 5;

export function CompareFinalistsSheet({ open, onOpenChange, jobId, finalists }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(finalists.map(f => f.candidateId)));
  const [focus, setFocus] = useState("");
  const { run, abort, reset, output, isLoading, error } = useCompareFinalists();

  // Reseta seleção quando o Sheet abre/fecha ou a lista muda
  useEffect(() => {
    if (open) {
      setSelected(new Set(finalists.slice(0, MAX_CANDIDATES).map(f => f.candidateId)));
      reset();
    }
  }, [open, finalists, reset]);

  const selectedCount = selected.size;
  const overLimit = selectedCount > MAX_CANDIDATES;
  const canRun = selectedCount >= 2 && !overLimit && !isLoading;

  const orderedFinalists = useMemo(
    () => [...finalists].sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0)),
    [finalists],
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleRun = async () => {
    if (!canRun) return;
    await run({ jobId, candidateIds: Array.from(selected), focus: focus.trim() || undefined });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Análise copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handlePrint = () => window.print();

  const markdownComponents: ComponentProps<typeof ReactMarkdown>["components"] = {
    h1: ({ node, ...p }) => <h1 className="text-xl font-bold mt-4 mb-2" {...p} />,
    h2: ({ node, ...p }) => <h2 className="text-lg font-semibold mt-4 mb-2" {...p} />,
    h3: ({ node, ...p }) => <h3 className="text-base font-semibold mt-3 mb-1" {...p} />,
    ul: ({ node, ...p }) => <ul className="list-disc pl-5 space-y-1 my-2" {...p} />,
    ol: ({ node, ...p }) => <ol className="list-decimal pl-5 space-y-1 my-2" {...p} />,
    p: ({ node, ...p }) => <p className="my-2 leading-relaxed" {...p} />,
    strong: ({ node, ...p }) => <strong className="font-semibold text-foreground" {...p} />,
    code: ({ node, ...p }) => <code className="bg-muted px-1 py-0.5 rounded text-xs" {...p} />,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Comparar finalistas com IA
          </SheetTitle>
          <SheetDescription>
            A IA analisa scores cultural, comportamental e técnico dos aprovados e sugere uma recomendação.
            Resultado não é salvo.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Seleção */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Finalistas ({selectedCount} selecionados)</Label>
              {overLimit && (
                <Badge variant="destructive" className="text-xs">
                  Máximo {MAX_CANDIDATES} candidatos
                </Badge>
              )}
            </div>
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {orderedFinalists.map((f) => {
                const checked = selected.has(f.candidateId);
                return (
                  <label
                    key={f.candidateId}
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(f.candidateId)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cultural: {fmt(f.cultureScore)} • DISC: {fmt(f.discScore)} • Técnico: {fmt(f.techScore)}
                        {f.compositeScore != null && ` • Composto: ${Math.round(f.compositeScore)}`}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Foco */}
          <div className="space-y-2">
            <Label htmlFor="focus">Foco da análise (opcional)</Label>
            <Textarea
              id="focus"
              placeholder="Ex.: Priorize fit cultural sobre técnico. A vaga exige autonomia e comunicação direta."
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {!isLoading ? (
              <Button onClick={handleRun} disabled={!canRun} className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Rodar análise
              </Button>
            ) : (
              <Button variant="destructive" onClick={abort} className="flex-1">
                <StopCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-3 border border-destructive/40 bg-destructive/10 rounded-md text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resultado */}
          {(isLoading || output) && (
            <div className="border rounded-lg p-4 bg-card">
              {isLoading && !output && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando finalistas...
                </div>
              )}
              {output && (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none print:prose-base">
                    <ReactMarkdown components={markdownComponents}>{output}</ReactMarkdown>
                  </div>
                  {!isLoading && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t print:hidden">
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copiar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handlePrint}>
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Imprimir
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function fmt(v: number | null): string {
  return v == null ? "—" : String(Math.round(v));
}
