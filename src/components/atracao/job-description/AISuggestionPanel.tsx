import { Sparkles, Plus, X, Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AISuggestionPanelProps {
  suggestions: string[];
  selectedItems: string[];
  maxItems?: number;
  onSelect: (suggestion: string) => void;
  onSelectAll?: (suggestions: string[]) => void;
  onDismiss: (suggestion: string) => void;
  isLoading?: boolean;
}

export function AISuggestionPanel({
  suggestions,
  selectedItems,
  maxItems,
  onSelect,
  onSelectAll,
  onDismiss,
  isLoading,
}: AISuggestionPanelProps) {
  const hasLimit = maxItems !== undefined;
  const remainingSlots = hasLimit ? maxItems - selectedItems.length : Infinity;
  const canAdd = remainingSlots > 0;
  
  // Calcular sugestões disponíveis (não selecionadas)
  const availableSuggestions = suggestions.filter(s => !selectedItems.includes(s));
  const availableCount = availableSuggestions.length;

  if (isLoading) {
    return (
      <div className="mt-4 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Gerando sugestões com IA...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Sugestões da IA</span>
        
        {/* Botão Incluir Todas */}
        {onSelectAll && availableCount > 1 && canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectAll(availableSuggestions)}
            className="ml-auto h-7 text-xs gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Incluir Todas ({availableCount})
          </Button>
        )}
        
        <span className={cn("text-xs text-muted-foreground", onSelectAll && availableCount > 1 && canAdd ? "" : "ml-auto")}>
          Clique para adicionar
        </span>
      </div>

      {/* Suggestions Grid */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const isAlreadySelected = selectedItems.includes(suggestion);
          const isDisabled = !canAdd || isAlreadySelected;

          return (
            <div
              key={index}
              className={cn(
                "group relative flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-dashed transition-all",
                isDisabled
                  ? "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed"
                  : "border-primary/40 bg-background hover:border-primary hover:bg-primary/10 cursor-pointer"
              )}
            >
              <button
                type="button"
                onClick={() => !isDisabled && onSelect(suggestion)}
                disabled={isDisabled}
                className="flex items-center gap-1.5 text-sm"
              >
                <Plus className={cn(
                  "h-3.5 w-3.5",
                  isDisabled ? "text-muted-foreground" : "text-primary"
                )} />
                <span>{suggestion}</span>
              </button>
              
              {/* Dismiss button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(suggestion);
                }}
                className="ml-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Counter - only show when there's a limit */}
      {hasLimit && (
        <p className="text-xs text-muted-foreground">
          {canAdd ? (
            <>
              Você pode adicionar mais <strong>{remainingSlots}</strong> {remainingSlots === 1 ? 'item' : 'itens'} ({selectedItems.length}/{maxItems})
            </>
          ) : (
            <span className="text-amber-600">Limite atingido ({maxItems}/{maxItems})</span>
          )}
        </p>
      )}
    </div>
  );
}
