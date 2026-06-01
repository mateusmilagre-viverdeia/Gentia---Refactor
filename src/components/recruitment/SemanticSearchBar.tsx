import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SemanticSearchBarProps {
  onSearch: (query: string) => Promise<void>;
  isSearching: boolean;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
  onClear?: () => void;
}

const EXAMPLE_QUERIES = [
  'desenvolvedor python com experiência em machine learning',
  'analista financeiro com conhecimento em Excel avançado',
  'designer UX/UI com experiência em Figma',
  'gerente de projetos com certificação PMP',
  'engenheiro de dados com AWS e Spark',
];

export function SemanticSearchBar({
  onSearch,
  isSearching,
  placeholder = 'Busque candidatos por habilidades, experiência ou descrição...',
  className,
  suggestions = [],
  onClear,
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 500);

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery.length >= 10 && !hasSearched) {
      handleSearch();
    }
  }, [debouncedQuery]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 5) return;
    setShowSuggestions(false);
    setHasSearched(true);
    await onSearch(query);
  }, [query, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
    setHasSearched(true);
  };

  const allSuggestions = suggestions.length > 0 ? suggestions : EXAMPLE_QUERIES;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHasSearched(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => !hasSearched && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pl-14 pr-24 h-12 text-base"
          disabled={isSearching}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
              disabled={isSearching}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || query.length < 5}
            className="h-8"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Buscando
              </>
            ) : (
              'Buscar'
            )}
          </Button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 p-2">
          <p className="text-xs text-muted-foreground mb-2 px-2">
            Exemplos de busca semântica:
          </p>
          <div className="space-y-1">
            {allSuggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors flex items-center gap-2"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI indicator */}
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Busca por IA
        </Badge>
        <span className="text-xs text-muted-foreground">
          Descreva o perfil ideal em linguagem natural
        </span>
      </div>
    </div>
  );
}
