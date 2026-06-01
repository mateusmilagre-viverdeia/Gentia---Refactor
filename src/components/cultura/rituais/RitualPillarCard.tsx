import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { useRitual } from "@/contexts/RitualContext";
import { RitualPillar } from "@/types/ritual.types";
import { RitualItemRow } from "./RitualItemRow";
import { RitualSuggestionCarousel } from "./RitualSuggestionCarousel";
import { RitualFilters, RitualFiltersState } from "./RitualFilters";

interface RitualPillarCardProps {
  pillar: RitualPillar;
}

export function RitualPillarCard({ pillar }: RitualPillarCardProps) {
  const {
    getItemsForPillar,
    getSuggestionsForPillar,
    getAISuggestionsForPillar,
    addItem,
    updateItem,
    deleteItem,
    generateAISuggestions,
    aiLoading,
  } = useRitual();

  const [customText, setCustomText] = useState("");
  const [filters, setFilters] = useState<RitualFiltersState>({
    duration: 'all',
    complexity: 'all',
    format: 'all',
  });

  const items = getItemsForPillar(pillar.number);
  const presetSuggestions = getSuggestionsForPillar(pillar.number);

  const addedTexts = new Set(items.map((i) => i.item_text.toLowerCase()));
  const availablePresets = presetSuggestions.filter(
    (s) => !addedTexts.has(s.suggestion_text.toLowerCase())
  );
  
  const filteredPresets = availablePresets.filter((s) => {
    if (filters.duration !== 'all' && s.duration !== filters.duration) return false;
    if (filters.complexity !== 'all' && s.complexity !== filters.complexity) return false;
    if (filters.format !== 'all' && s.format !== filters.format) return false;
    return true;
  });

  const pillarAISuggestions = getAISuggestionsForPillar(pillar.number);
  const availableAISuggestions = pillarAISuggestions.filter(
    (s) => !addedTexts.has(s.toLowerCase())
  );

  const handleAddCustom = () => {
    if (customText.trim()) {
      addItem(pillar.number, customText.trim(), "custom");
      setCustomText("");
    }
  };

  const handleToggle = (text: string, isAI: boolean) => {
    if (addedTexts.has(text.toLowerCase())) {
      const item = items.find(i => i.item_text.toLowerCase() === text.toLowerCase());
      if (item) deleteItem(item.id);
    } else {
      addItem(pillar.number, text, isAI ? "ai" : "suggestion");
    }
  };

  // Build carousel items
  const aiCarouselItems = availableAISuggestions.map((s, i) => ({
    id: `ai-${i}`,
    text: s,
    isAI: true,
  }));

  const presetCarouselItems = filteredPresets.map(s => ({
    id: s.id,
    text: s.suggestion_text,
    isAI: false,
    duration: s.duration,
    complexity: s.complexity,
    format: s.format,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{pillar.icon}</span>
          <span>{pillar.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Sugestões da IA</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateAISuggestions(pillar.number)}
              disabled={aiLoading}
              className="border-purple-200 hover:border-purple-400"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Sugestões
            </Button>
          </div>
          {aiCarouselItems.length > 0 && (
            <RitualSuggestionCarousel
              items={aiCarouselItems}
              selectedTexts={addedTexts}
              onToggle={handleToggle}
              title=""
              pageSize={3}
            />
          )}
        </div>

        {/* Preset Suggestions */}
        {availablePresets.length > 0 && (
          <div className="space-y-3">
            <RitualFilters
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={availablePresets.length}
              filteredCount={filteredPresets.length}
            />
            <RitualSuggestionCarousel
              items={presetCarouselItems}
              selectedTexts={addedTexts}
              onToggle={handleToggle}
              title="Sugestões do Catálogo"
              pageSize={6}
            />
          </div>
        )}

        {/* Added Items as chips */}
        {items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Itens Adicionados ({items.length})
            </h4>
            <div className="grid gap-2">
              {items.map((item) => (
                <RitualItemRow
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Input */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Adicionar Item Personalizado</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Digite seu item..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            />
            <Button onClick={handleAddCustom} disabled={!customText.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
