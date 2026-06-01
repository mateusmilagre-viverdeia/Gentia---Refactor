import { useState, useRef, useEffect } from 'react';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AISuggestionPanel } from './AISuggestionPanel';
import type { WizardStep } from '@/types/job-description.types';

interface JobDescriptionStepProps {
  step: WizardStep;
  value: string | string[] | unknown;
  onChange: (value: string | string[]) => void;
  pendingSuggestions?: string[];
  onAcceptSuggestion?: (suggestion: string) => void;
  onSelectAllSuggestions?: (suggestions: string[]) => void;
  onDismissSuggestion?: (suggestion: string) => void;
  isLoadingSuggestions?: boolean;
}

export function JobDescriptionStep({ 
  step, 
  value, 
  onChange,
  pendingSuggestions = [],
  onAcceptSuggestion,
  onSelectAllSuggestions,
  onDismissSuggestion,
  isLoadingSuggestions,
}: JobDescriptionStepProps) {
  const [inputValue, setInputValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  if (step.type === 'text') {
    return (
      <Input
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={step.placeholder}
        className="text-lg"
      />
    );
  }

  if (step.type === 'textarea') {
    return (
      <div className="space-y-4">
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          rows={5}
          className="resize-none"
        />
        
        {/* AI Suggestions for textarea (mission, development) */}
        {pendingSuggestions.length > 0 && (
          <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
            <p className="text-sm text-primary font-medium mb-2">Sugestão da IA:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pendingSuggestions[0]}</p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onAcceptSuggestion?.(pendingSuggestions[0])}
              >
                Usar esta sugestão
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismissSuggestion?.(pendingSuggestions[0])}
              >
                Descartar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step.type === 'list') {
    const items = Array.isArray(value) ? value : [];
    const hasLimit = step.maxItems !== undefined;
    const canAdd = hasLimit ? items.length < step.maxItems! : true;

    const handleAdd = () => {
      if (inputValue.trim() && canAdd) {
        onChange([...items, inputValue.trim()]);
        setInputValue('');
      }
    };

    const handleRemove = (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    };

    const handleStartEdit = (index: number) => {
      setEditingIndex(index);
      setEditingValue(items[index]);
      setTimeout(() => editInputRef.current?.focus(), 0);
    };

    const handleSaveEdit = () => {
      if (editingIndex !== null && editingValue.trim()) {
        const updated = [...items];
        updated[editingIndex] = editingValue.trim();
        onChange(updated);
      }
      setEditingIndex(null);
      setEditingValue('');
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        setEditingIndex(null);
        setEditingValue('');
      }
    };

    const handleAcceptSuggestion = (suggestion: string) => {
      if (canAdd && onAcceptSuggestion) {
        onAcceptSuggestion(suggestion);
      }
    };

    return (
      <div className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            disabled={!canAdd}
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim() || !canAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Confirmed Items */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Suas escolhas
            </p>
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-muted rounded-lg group"
                onDoubleClick={() => handleStartEdit(index)}
              >
                {editingIndex === index ? (
                  <>
                    <Input
                      ref={editInputRef}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleSaveEdit}
                      className="flex-1 h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onMouseDown={(e) => { e.preventDefault(); handleSaveEdit(); }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEdit(index)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Suggestions Panel */}
        <AISuggestionPanel
          suggestions={pendingSuggestions}
          selectedItems={items}
          maxItems={step.maxItems}
          onSelect={handleAcceptSuggestion}
          onSelectAll={onSelectAllSuggestions}
          onDismiss={(s) => onDismissSuggestion?.(s)}
          isLoading={isLoadingSuggestions}
        />

        {/* Counter */}
        {step.maxItems && (
          <p className="text-sm text-muted-foreground">
            {items.length}/{step.maxItems} itens
          </p>
        )}
      </div>
    );
  }

  return null;
}
