import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvent } from "@/contexts/EventContext";
import { EventPillar } from "@/types/event.types";
import { EventItemRow } from "./EventItemRow";
import { EventAISuggestion } from "./EventAISuggestion";
import { EventPresetSuggestion } from "./EventPresetSuggestion";
import { Plus, RefreshCw, Loader2 } from "lucide-react";

interface EventPillarCardProps {
  pillar: EventPillar;
}

export function EventPillarCard({ pillar }: EventPillarCardProps) {
  const { 
    getItemsForPillar, 
    getSuggestionsForPillar, 
    addItem, 
    updateItem, 
    deleteItem,
    aiLoading,
    aiSuggestions,
    generateAISuggestions
  } = useEvent();
  
  const [customText, setCustomText] = useState("");
  const items = getItemsForPillar(pillar.number);
  const presetSuggestions = getSuggestionsForPillar(pillar.number);

  const handleAddCustom = async () => {
    if (customText.trim()) {
      await addItem(pillar.number, customText.trim(), 'custom');
      setCustomText("");
    }
  };

  const handleAddAISuggestion = async (text: string) => {
    await addItem(pillar.number, text, 'ai');
  };

  const handleAddPreset = async (text: string) => {
    await addItem(pillar.number, text, 'suggestion');
  };

  const isPresetAdded = (text: string) => {
    return items.some(item => item.item_text === text);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{pillar.icon}</span>
          <div>
            <CardTitle>Pilar {pillar.number}: {pillar.title}</CardTitle>
            <CardDescription className="mt-1">{pillar.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Suggestions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              🤖 Sugestões da IA
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateAISuggestions(pillar.number)}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar Sugestões
                </>
              )}
            </Button>
          </div>
          
          {aiSuggestions.length > 0 ? (
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <EventAISuggestion
                  key={index}
                  text={suggestion}
                  onAdd={() => handleAddAISuggestion(suggestion)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              Clique em "Gerar Sugestões" para receber ideias personalizadas baseadas na cultura da sua empresa.
            </p>
          )}
        </div>

        {/* Preset Suggestions */}
        {presetSuggestions.length > 0 && (
          <div className="space-y-3">
            <span className="text-sm font-medium flex items-center gap-2">
              💡 Sugestões Pré-definidas
            </span>
            <div className="flex flex-wrap gap-2">
              {presetSuggestions.map((suggestion) => (
                <EventPresetSuggestion
                  key={suggestion.id}
                  text={suggestion.suggestion_text}
                  onAdd={() => handleAddPreset(suggestion.suggestion_text)}
                  disabled={isPresetAdded(suggestion.suggestion_text)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current Items */}
        <div className="space-y-3">
          <span className="text-sm font-medium">✍️ Suas escolhas ({items.length})</span>
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <EventItemRow
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              Nenhum item adicionado ainda. Use as sugestões ou adicione sua própria ideia abaixo.
            </p>
          )}
        </div>

        {/* Custom Input */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Adicionar ideia personalizada</span>
          <div className="flex gap-2">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Digite sua ideia..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
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
