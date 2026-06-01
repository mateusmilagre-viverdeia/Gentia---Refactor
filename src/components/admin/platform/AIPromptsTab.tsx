import { useMemo, useState } from "react";
import { useAIPrompts, useSavePrompt, type MergedPrompt } from "@/hooks/useAIPrompts";
import { interpolatePreview } from "@/lib/aiPromptsRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCcw, Save, Mic, ClipboardCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function PromptEditor({ prompt }: { prompt: MergedPrompt }) {
  const [draft, setDraft] = useState(prompt.currentTemplate);
  const save = useSavePrompt();

  const dirty = draft !== prompt.currentTemplate;

  const previewVars = useMemo(() => {
    const vars: Record<string, string> = {};
    prompt.variables.forEach((v) => (vars[v.name] = v.example));
    return vars;
  }, [prompt.variables]);

  const preview = interpolatePreview(draft, previewVars);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {prompt.label}
              {prompt.isCustomized && <Badge variant="secondary">Prompt customizado</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">{prompt.description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              Edge function: <code className="font-mono">{prompt.edgeFunction}</code>
              {prompt.updatedAt && (
                <span className="ml-3">
                  Última edição: {new Date(prompt.updatedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </p>
            {prompt.category === "voice" && (
              <p className="text-xs text-muted-foreground mt-1">
                Para trocar o modelo Realtime use a aba <strong>Serviços de IA</strong>.
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(prompt.defaultTemplate)}
              disabled={draft === prompt.defaultTemplate}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Restaurar default
            </Button>
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate(
                  { def: prompt, template: draft },
                  {
                    onSuccess: () => toast.success(`Prompt "${prompt.label}" salvo`),
                    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
                  },
                )
              }
            >
              {save.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm font-medium">Template (use {"{{variavel}}"} para placeholders)</label>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={20}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Variáveis disponíveis</label>
              {prompt.variables.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">Nenhuma — prompt estático.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs">
                  {prompt.variables.map((v) => (
                    <li key={v.name} className="border rounded p-2">
                      <code className="font-mono text-primary">{`{{${v.name}}}`}</code>
                      <p className="text-muted-foreground mt-0.5">{v.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Preview interpolado</label>
              <pre className="text-[10px] bg-muted p-2 rounded max-h-64 overflow-auto whitespace-pre-wrap mt-1">
                {preview.slice(0, 1500)}
                {preview.length > 1500 && "\n…"}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIPromptsTab() {
  const { data, isLoading, error } = useAIPrompts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4">
        <AlertCircle className="h-4 w-4" />
        <span>Erro ao carregar prompts: {(error as Error).message}</span>
      </div>
    );
  }

  const voice = data?.filter((p) => p.category === "voice") || [];
  const evaluation = data?.filter((p) => p.category === "evaluation") || [];

  return (
    <div className="space-y-4">
      <div className="rounded border bg-muted/40 p-3 text-sm">
        <p>
          Edite os prompts das IAs de entrevista por voz e de avaliação. Mudanças entram em
          vigor imediatamente nas próximas execuções. O modelo Realtime de voz é configurado
          na aba <strong>Serviços de IA</strong>.
        </p>
      </div>

      <Tabs defaultValue="voice">
        <TabsList>
          <TabsTrigger value="voice" className="gap-2">
            <Mic className="h-4 w-4" /> Voz ({voice.length})
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <ClipboardCheck className="h-4 w-4" /> Avaliação ({evaluation.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="voice" className="space-y-4 mt-4">
          {voice.map((p) => (
            <PromptEditor key={p.key} prompt={p} />
          ))}
        </TabsContent>
        <TabsContent value="evaluation" className="space-y-4 mt-4">
          {evaluation.map((p) => (
            <PromptEditor key={p.key} prompt={p} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
