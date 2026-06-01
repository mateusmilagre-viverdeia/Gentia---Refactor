import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import type { CompensationModel } from "@/types/compensation.types";

interface CompensationModelSelectorProps {
  models: CompensationModel[];
  selectedModelId: string | undefined;
  onSelect: (modelId: string) => void;
  onCreateNew: () => void;
  onSettings?: (modelId: string) => void;
}

export const CompensationModelSelector = ({
  models,
  selectedModelId,
  onSelect,
  onCreateNew,
  onSettings,
}: CompensationModelSelectorProps) => {
  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="flex items-center gap-3">
      <Select value={selectedModelId} onValueChange={onSelect}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione um modelo" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <span>{model.name}</span>
                {!model.is_active && (
                  <span className="text-xs text-muted-foreground">(inativo)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedModel && onSettings && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSettings(selectedModel.id)}
          title="Configurações do modelo"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      <Button onClick={onCreateNew} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Novo Modelo
      </Button>
    </div>
  );
};
