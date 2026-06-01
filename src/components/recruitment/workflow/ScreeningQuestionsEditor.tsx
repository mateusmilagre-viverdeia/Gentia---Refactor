import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Sparkles, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScreeningQuestion } from "@/types/job-workflow.types";

interface ScreeningQuestionsEditorProps {
  jobId?: string;
  questions: ScreeningQuestion[];
  onChange: (questions: ScreeningQuestion[]) => void;
  disabled?: boolean;
}

function generateId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ScreeningQuestionsEditor({
  jobId,
  questions,
  onChange,
  disabled,
}: ScreeningQuestionsEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const addQuestion = () => {
    onChange([
      ...questions,
      { id: generateId(), category: "custom", text: "", required: true },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<ScreeningQuestion>) => {
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx));
  };

  const generateQuestions = useCallback(async () => {
    if (!jobId) {
      toast.error("Salve a vaga antes de gerar perguntas automaticamente");
      return;
    }

    setIsGenerating(true);
    try {
      // Fetch job data (including job_description_id)
      const { data: job } = await (supabase as any)
        .from("recruitment_jobs")
        .select("work_modality, location, account_id, job_description_id")
        .eq("id", jobId)
        .maybeSingle();

      // Fetch job description using the correct FK
      let requiredSkills: string[] = [];
      if (job?.job_description_id) {
        const { data: jd } = await (supabase as any)
          .from("job_descriptions")
          .select("required_skills")
          .eq("id", job.job_description_id)
          .maybeSingle();
        requiredSkills = (jd as any)?.required_skills || [];
      }

      // Fetch selling company content and parse blocks
      let sellingBlock5 = "";
      let sellingBlock6 = "";
      if (job?.account_id) {
        const { data: sellingSession } = await (supabase as any)
          .from("selling_company_sessions" as any)
          .select("id")
          .eq("account_id", job.account_id)
          .eq("status", "approved")
          .maybeSingle();

        if (sellingSession) {
          const { data: version } = await (supabase as any)
            .from("selling_company_versions" as any)
            .select("content")
            .eq("session_id", (sellingSession as any).id)
            .eq("approved", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const sellingContent = (version as any)?.content || "";
          if (sellingContent) {
            const { parseContentBlocks } = await import("@/lib/parseContentBlocks");
            const blocks = parseContentBlocks(sellingContent);
            sellingBlock5 = blocks.find((b) => b.id === "santo-vai-bater")?.content || "";
            sellingBlock6 = blocks.find((b) => b.id === "lado-dificil")?.content || "";
          }
        }
      }

      // Call AI edge function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        "generate-screening-questions",
        {
          body: {
            sellingBlock5,
            sellingBlock6,
            requiredSkills,
            workModality: job?.work_modality || "",
            location: job?.location || "",
            accountId: job?.account_id || "",
          },
        }
      );

      if (aiError) {
        console.error("AI function error:", aiError);
        throw new Error("AI generation failed");
      }

      const generated: ScreeningQuestion[] = aiResult?.questions || [];

      if (generated.length === 0) {
        toast.info("Nenhuma pergunta foi gerada. Preencha os dados da vaga (modalidade, competências obrigatórias) e a página 'Vendendo a Empresa' primeiro.");
      } else {
        onChange([...questions, ...generated]);
        toast.success(`${generated.length} perguntas geradas com IA`);
      }
    } catch (err) {
      console.error("Error generating screening questions:", err);
      toast.error("Erro ao gerar perguntas. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }, [jobId, questions, onChange]);

  const CATEGORY_LABELS: Record<string, string> = {
    modality: "Modalidade",
    skill: "Competência",
    selling: "Cultura",
    custom: "Personalizada",
  };

  const CATEGORY_COLORS: Record<string, string> = {
    modality: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    skill: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    selling: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    custom: "text-muted-foreground bg-muted",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Perguntas de triagem</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateQuestions}
          disabled={disabled || isGenerating}
          className="gap-2"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isGenerating ? "Gerando..." : "Gerar automaticamente"}
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhuma pergunta configurada. Clique em "Gerar automaticamente" ou adicione manualmente.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="flex items-start gap-2 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      CATEGORY_COLORS[q.category] || CATEGORY_COLORS.custom
                    }`}
                  >
                    {CATEGORY_LABELS[q.category] || "Custom"}
                  </span>
                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                </div>
                <Input
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                  placeholder="Digite a pergunta..."
                  disabled={disabled}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`req-${q.id}`}
                    checked={q.required}
                    onCheckedChange={(checked) =>
                      updateQuestion(idx, { required: !!checked })
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor={`req-${q.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Obrigatória (resposta "Não" elimina o candidato)
                  </Label>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeQuestion(idx)}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addQuestion}
        disabled={disabled}
        className="gap-2 w-full"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar pergunta
      </Button>
    </div>
  );
}
