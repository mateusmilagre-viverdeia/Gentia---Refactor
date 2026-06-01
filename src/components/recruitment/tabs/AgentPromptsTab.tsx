import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bot, FileSearch, Calculator, RotateCcw, Loader2, Check, ChevronDown, Copy, Code2 } from "lucide-react";
import { useAgentPrompts, PromptType } from "@/hooks/useAgentPrompts";
import { PROMPT_TYPES, AVAILABLE_VARIABLES } from "@/lib/defaultAgentPrompts";
import { toast } from "sonner";

interface AgentPromptsTabProps {
  agentId: string;
}

const PROMPT_ORDER: PromptType[] = ["system", "evaluation", "scoring"];

const getIcon = (type: PromptType) => {
  switch (type) {
    case "system":
      return Bot;
    case "evaluation":
      return FileSearch;
    case "scoring":
      return Calculator;
  }
};

export const AgentPromptsTab = ({ agentId }: AgentPromptsTabProps) => {
  const {
    promptsWithDefaults,
    isLoading,
    saveAllPrompts,
    deletePrompt,
    isSaving,
    getDefaultPrompt,
    getDefaultName,
  } = useAgentPrompts(agentId);

  const [activeTab, setActiveTab] = useState<PromptType>("system");
  const [localPrompts, setLocalPrompts] = useState<Record<PromptType, string>>({
    system: "",
    evaluation: "",
    scoring: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const hasInitialized = useRef(false);

  // Get stable string representations for comparison
  const systemContent = promptsWithDefaults.system?.content;
  const evaluationContent = promptsWithDefaults.evaluation?.content;
  const scoringContent = promptsWithDefaults.scoring?.content;

  // Initialize local prompts from database or defaults - only once
  useEffect(() => {
    if (isLoading || hasInitialized.current) return;
    
    hasInitialized.current = true;
    setLocalPrompts({
      system: systemContent ?? getDefaultPrompt("system"),
      evaluation: evaluationContent ?? getDefaultPrompt("evaluation"),
      scoring: scoringContent ?? getDefaultPrompt("scoring"),
    });
  }, [isLoading, systemContent, evaluationContent, scoringContent, getDefaultPrompt]);

  const handlePromptChange = useCallback((type: PromptType, content: string) => {
    setLocalPrompts((prev) => ({ ...prev, [type]: content }));
    setHasChanges(true);
  }, []);

  const handleSave = () => {
    const promptsToSave = PROMPT_ORDER.map((type) => ({
      promptType: type,
      name: getDefaultName(type),
      content: localPrompts[type],
      isActive: true,
    }));
    saveAllPrompts(promptsToSave);
    setHasChanges(false);
  };

  const handleRestoreDefault = (type: PromptType) => {
    setLocalPrompts((prev) => ({ ...prev, [type]: getDefaultPrompt(type) }));
    deletePrompt(type);
    setHasChanges(true);
  };

  const handleRestoreAllDefaults = () => {
    setLocalPrompts({
      system: getDefaultPrompt("system"),
      evaluation: getDefaultPrompt("evaluation"),
      scoring: getDefaultPrompt("scoring"),
    });
    PROMPT_ORDER.forEach((type) => deletePrompt(type));
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setLocalPrompts({
      system: promptsWithDefaults.system?.content ?? getDefaultPrompt("system"),
      evaluation: promptsWithDefaults.evaluation?.content ?? getDefaultPrompt("evaluation"),
      scoring: promptsWithDefaults.scoring?.content ?? getDefaultPrompt("scoring"),
    });
    setHasChanges(false);
  };

  const isCustomized = (type: PromptType): boolean => {
    return promptsWithDefaults[type] !== null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Prompts de IA</CardTitle>
              <CardDescription>
                Personalize os prompts usados pela IA para avaliar candidatos. A avaliação ocorre em 2 etapas: 
                primeiro a análise detalhada, depois o cálculo do score.
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restaurar Todos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar prompts padrão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá restaurar todos os prompts para os valores padrão do sistema. 
                    Suas personalizações serão perdidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreAllDefaults}>
                    Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PromptType)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              {PROMPT_ORDER.map((type) => {
                const Icon = getIcon(type);
                const info = PROMPT_TYPES[type];
                return (
                  <TabsTrigger key={type} value={type} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {info.name}
                    {isCustomized(type) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        Personalizado
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PROMPT_ORDER.map((type) => {
              const info = PROMPT_TYPES[type];
              const currentVariables = AVAILABLE_VARIABLES[type] ?? [];

              return (
                <TabsContent key={type} value={type} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{info.name}</h4>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                    {isCustomized(type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestoreDefault(type)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restaurar Padrão
                      </Button>
                    )}
                  </div>

                  <div className="relative group/editor">
                    <textarea
                      value={localPrompts[type]}
                      onChange={(e) => handlePromptChange(type, e.target.value)}
                      className="min-h-[500px] w-full rounded-lg border-0 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm leading-relaxed resize-y p-4 pr-24 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-[#6c7086] selection:bg-[#585b70] selection:text-white"
                      placeholder={`Conteúdo do prompt de ${info.name.toLowerCase()}...`}
                      spellCheck={false}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4]"
                        onClick={() => {
                          navigator.clipboard.writeText(localPrompts[type]);
                          toast.success('Prompt copiado!');
                        }}
                        title="Copiar tudo"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {promptsWithDefaults[type] && (
                        <Badge variant="outline" className="text-xs bg-[#313244] text-[#cdd6f4] border-[#45475a]">
                          v{promptsWithDefaults[type]?.version}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {currentVariables.length > 0 && (
                    <Collapsible className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <Code2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-xs">Variáveis Dinâmicas</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {currentVariables.length} disponíveis
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted/40">
                          {currentVariables.map((v: any) => (
                            <div
                              key={v.key}
                              className="group flex flex-col gap-1 p-3 rounded-md bg-background border hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs font-medium">
                                    {v.key}
                                  </code>
                                  <span className="text-sm font-medium text-foreground">
                                    {v.label}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => {
                                    handlePromptChange(type, localPrompts[type] + v.key);
                                    toast.success(`Variável ${v.key} inserida`);
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {v.description}
                              </p>
                              {v.example && (
                                <p className="text-xs text-muted-foreground/70 italic">
                                  Exemplo: {v.example}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          {hasChanges && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={isSaving}
              >
                Descartar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Salvar Prompts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow explanation card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como funciona a avaliação em 2 etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Etapa de Avaliação</p>
                  <p className="text-sm text-muted-foreground">
                    A IA analisa a transcrição e gera avaliações detalhadas por critério
                  </p>
                </div>
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Etapa de Scoring</p>
                  <p className="text-sm text-muted-foreground">
                    Usando os dados da etapa 1, calcula o score final e recomendação
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
