import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Lock, RotateCcw, Save, Loader2, Cpu, MessageSquare, Briefcase, Send, Search, Phone } from "lucide-react";

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "Google" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)", provider: "Google" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)", provider: "Google" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "openai/gpt-5", label: "GPT-5", provider: "OpenAI" },
  { value: "openai/gpt-5.2", label: "GPT-5.2", provider: "OpenAI" },
  { value: "gpt-realtime-mini", label: "GPT Realtime Mini (GA)", provider: "OpenAI Realtime" },
  { value: "gpt-realtime", label: "GPT Realtime (GA)", provider: "OpenAI Realtime" },
  { value: "gpt-4o-realtime-preview-2025-06-03", label: "GPT-4o Realtime Preview (jun/2025)", provider: "OpenAI Realtime" },
  { value: "gpt-4o-mini-realtime-preview-2024-12-17", label: "GPT-4o Mini Realtime Preview (dez/2024)", provider: "OpenAI Realtime" },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  entrevistas: { label: "Entrevistas", icon: <MessageSquare className="h-4 w-4" />, color: "text-blue-500" },
  avaliacao: { label: "Avaliação", icon: <Cpu className="h-4 w-4" />, color: "text-purple-500" },
  vagas: { label: "Vagas", icon: <Briefcase className="h-4 w-4" />, color: "text-green-500" },
  outreach: { label: "Outreach", icon: <Send className="h-4 w-4" />, color: "text-orange-500" },
  hunting: { label: "Hunting", icon: <Search className="h-4 w-4" />, color: "text-red-500" },
  comunicacao: { label: "Comunicação", icon: <Phone className="h-4 w-4" />, color: "text-teal-500" },
};

interface AIModelConfig {
  id: string;
  service_key: string;
  service_label: string;
  category: string;
  current_model: string;
  default_model: string;
  is_locked: boolean;
  updated_at: string;
}

export function AIServicesConfigTab() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ["platform-ai-model-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_ai_model_config")
        .select("*")
        .order("category")
        .order("service_label");
      if (error) throw error;
      return data as AIModelConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, model }: { id: string; model: string }) => {
      const { error } = await supabase
        .from("platform_ai_model_config")
        .update({ current_model: model, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-ai-model-config"] });
    },
  });

  const handleModelChange = (serviceKey: string, model: string) => {
    setPendingChanges((prev) => ({ ...prev, [serviceKey]: model }));
  };

  const handleSaveAll = async () => {
    if (!configs) return;
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      toast.info("Nenhuma alteração pendente.");
      return;
    }

    try {
      for (const [serviceKey, model] of entries) {
        const config = configs.find((c) => c.service_key === serviceKey);
        if (config) {
          await updateMutation.mutateAsync({ id: config.id, model });
        }
      }
      setPendingChanges({});
      toast.success(`${entries.length} modelo(s) atualizado(s) com sucesso.`);
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  };

  const handleResetAll = async () => {
    if (!configs) return;
    const unlocked = configs.filter((c) => !c.is_locked && c.current_model !== c.default_model);
    if (unlocked.length === 0) {
      toast.info("Todos os modelos já estão no padrão.");
      return;
    }

    try {
      for (const config of unlocked) {
        await updateMutation.mutateAsync({ id: config.id, model: config.default_model });
      }
      setPendingChanges({});
      toast.success(`${unlocked.length} modelo(s) restaurado(s) ao padrão.`);
    } catch {
      toast.error("Erro ao restaurar padrões.");
    }
  };

  const getCurrentModel = (config: AIModelConfig) => {
    return pendingChanges[config.service_key] || config.current_model;
  };

  const isModified = (config: AIModelConfig) => {
    const current = getCurrentModel(config);
    return current !== config.current_model;
  };

  const isNonDefault = (config: AIModelConfig) => {
    const current = getCurrentModel(config);
    return current !== config.default_model;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by category
  const grouped = (configs || []).reduce<Record<string, AIModelConfig[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const categoryOrder = ["entrevistas", "avaliacao", "vagas", "outreach", "hunting", "comunicacao"];
  const hasPending = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure os modelos de IA usados em cada serviço do módulo de recrutamento.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetAll} disabled={updateMutation.isPending}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Restaurar Padrões
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={!hasPending || updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salvar Alterações
            {hasPending && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {Object.keys(pendingChanges).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Categories */}
      <TooltipProvider>
        {categoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          const catConfig = CATEGORY_CONFIG[cat] || { label: cat, icon: <Cpu className="h-4 w-4" />, color: "text-muted-foreground" };

          return (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={catConfig.color}>{catConfig.icon}</span>
                  {catConfig.label}
                  <Badge variant="outline" className="ml-auto text-xs font-normal">
                    {items.length} serviço(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((config) => (
                  <div
                    key={config.id}
                    className={`flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors ${
                      isModified(config) ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{config.service_label}</span>
                        {config.is_locked && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <Lock className="h-2.5 w-2.5" />
                                Fixo
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Este serviço usa a API Realtime da OpenAI e não pode ser alterado.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!config.is_locked && isNonDefault(config) && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            Customizado
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{config.service_key}</span>
                    </div>

                    <div className="w-64 shrink-0">
                      {config.is_locked ? (
                        <div className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md">
                          {config.current_model}
                        </div>
                      ) : (
                        <Select
                          value={getCurrentModel(config)}
                          onValueChange={(val) => handleModelChange(config.service_key, val)}
                        >
                          <SelectTrigger className="h-9 text-sm font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] px-1">
                                    {m.provider}
                                  </Badge>
                                  <span className="font-mono">{m.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
