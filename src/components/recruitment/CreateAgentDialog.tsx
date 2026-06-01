import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useValuesQuestionsForAgent } from "@/hooks/useValuesQuestionsForAgent";
import { FileText, Sparkles, Check, Loader2 } from "lucide-react";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: AgentFormData) => void;
}

export interface AgentFormData {
  name: string;
  description: string;
  type: "structured" | "adaptive";
  language: string;
  template: "none" | "cultural_fit" | "behavioral_fit" | "technical_fit";
}

const languages = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
  { value: "de", label: "Alemão" },
];

export const CreateAgentDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: CreateAgentDialogProps) => {
  const { 
    hasQuestions, 
    stats, 
    hasValues, 
    valuesStats, 
    isLoading: isLoadingQuestions 
  } = useValuesQuestionsForAgent();
  
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    type: "structured",
    language: "pt-BR",
    template: "none",
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        description: "",
        type: "structured",
        language: "pt-BR",
        template: "none",
      });
    }
  }, [open]);

  // Auto-fill when template changes
  useEffect(() => {
    if (formData.template === "cultural_fit") {
      setFormData(prev => ({
        ...prev,
        name: "Agente de Fit Cultural",
        description: "Avalia o alinhamento cultural do candidato com base nos valores da empresa. Perguntas importadas automaticamente do módulo de Perguntas Baseadas em Valores.",
        type: "structured" as const,
      }));
    } else if (formData.template === "behavioral_fit") {
      setFormData(prev => ({
        ...prev,
        name: "Agente de Fit Comportamental",
        description: "Avalia o perfil comportamental do candidato através do Assessment DISC. O candidato receberá um link por email para responder as 32 perguntas do assessment.",
        type: "structured" as const,
      }));
    } else if (formData.template === "technical_fit") {
      setFormData(prev => ({
        ...prev,
        name: "Agente de Fit Técnico",
        description: "Agente adaptativo que conduz entrevistas técnicas dinâmicas, ajustando as perguntas conforme as respostas do candidato e o perfil técnico da vaga.",
        type: "adaptive" as const,
      }));
    } else if (formData.template === "none") {
      setFormData(prev => ({
        ...prev,
        name: "",
        description: "",
        type: "structured",
      }));
    }
  }, [formData.template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Criar agente</DialogTitle>
        </DialogHeader>

        <ScrollArea type="always" className="w-full h-[60vh]">
          <div className="pr-6 pb-2">
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Template</Label>
            <RadioGroup
              value={formData.template}
              onValueChange={(value: "none" | "cultural_fit" | "behavioral_fit" | "technical_fit") =>
                setFormData({ ...formData, template: value })
              }
              className="grid gap-3"
            >
              {/* Start from scratch */}
              <Label
                htmlFor="template-none"
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  formData.template === "none"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="none" id="template-none" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Começar do zero</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criar agente customizado sem perguntas iniciais
                  </p>
                </div>
              </Label>

              {/* Cultural Fit Template */}
              <Label
                htmlFor="template-cultural"
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                  !hasQuestions && !isLoadingQuestions
                    ? "opacity-50 cursor-not-allowed border-border"
                    : formData.template === "cultural_fit"
                    ? "border-primary bg-primary/5 cursor-pointer"
                    : "border-border hover:border-primary/50 cursor-pointer"
                )}
              >
                <RadioGroupItem 
                  value="cultural_fit" 
                  id="template-cultural" 
                  className="mt-0.5"
                  disabled={!hasQuestions && !isLoadingQuestions}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Agente de Fit Cultural</span>
                    {hasQuestions && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {stats.total} perguntas
                      </span>
                    )}
                    {hasValues && (
                      <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                        {valuesStats.total} critérios
                      </span>
                    )}
                  </div>
                  
                  {isLoadingQuestions ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verificando perguntas de valores...
                    </div>
                  ) : hasQuestions ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Importa automaticamente da página de Valores:
                      </p>
                      
                      {/* Questions section */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground/80">
                          ✓ {stats.total} perguntas baseadas em valores
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pl-4">
                          {stats.byStage.initial > 0 && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Iniciais ({stats.byStage.initial})
                            </div>
                          )}
                          {stats.byStage.wildcardInitial > 0 && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Coringas I ({stats.byStage.wildcardInitial})
                            </div>
                          )}
                          {stats.byStage.byValue > 0 && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Por Valor ({stats.byStage.byValue})
                            </div>
                          )}
                          {stats.byStage.wildcardFinal > 0 && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Coringas F ({stats.byStage.wildcardFinal})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Criteria section */}
                      {hasValues && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground/80">
                            ✓ {valuesStats.total} critérios de avaliação (com comportamentos)
                          </p>
                          <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Nota mínima: 7
                            </div>
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Peso: x3 - Importante
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure primeiro as perguntas em "Perguntas Baseadas em Valores"
                    </p>
                  )}
                </div>
              </Label>

              {/* Behavioral Fit Template */}
              <Label
                htmlFor="template-behavioral"
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  formData.template === "behavioral_fit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="behavioral_fit" id="template-behavioral" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Agente de Fit Comportamental</span>
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                      32 perguntas DISC
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Envia Assessment DISC por email. Configure o perfil desejado por vaga para calcular o match automaticamente.
                  </p>
                </div>
              </Label>

              {/* Technical Fit Template */}
              <Label
                htmlFor="template-technical"
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  formData.template === "technical_fit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="technical_fit" id="template-technical" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">Agente de Fit Técnico</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                      Adaptativo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agente adaptativo que conduz entrevistas técnicas dinâmicas, ajustando as perguntas conforme as respostas do candidato e o perfil técnico da vaga.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="ex: Entrevistador de RH"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={formData.template === "cultural_fit"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="ex: Um agente especializado em triagem de candidatos para vagas de engenharia."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              disabled={formData.template === "cultural_fit"}
            />
          </div>

          {formData.template !== "cultural_fit" && (
            <div className="space-y-3">
              <Label>Tipo de Agente</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: "structured" | "adaptive") =>
                  setFormData({ ...formData, type: value })
                }
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="structured"
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-colors",
                    formData.type === "structured"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="structured" id="structured" />
                    <span className="font-medium">Estruturado</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O agente segue um conjunto predefinido de perguntas.
                  </p>
                </Label>

                <Label
                  htmlFor="adaptive"
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-colors",
                    formData.type === "adaptive"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="adaptive" id="adaptive" />
                    <span className="font-medium">Adaptativo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O agente adapta suas perguntas com base nas respostas.
                  </p>
                </Label>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData({ ...formData, language: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            </form>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
          >
            {formData.template === "cultural_fit" 
              ? `Criar com ${stats.total} perguntas${hasValues ? ` e ${valuesStats.total} critérios` : ''}` 
              : "Criar"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
