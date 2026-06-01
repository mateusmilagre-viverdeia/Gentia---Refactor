import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Save, BookOpen, Sparkles, Copy, X } from 'lucide-react';
import { useSearchTemplates, type SearchTemplate } from '@/hooks/useSearchTemplates';

interface BooleanClause {
  id: string;
  field: string;
  operator: 'AND' | 'OR' | 'NOT';
  value: string;
}

interface BooleanSearchBuilderProps {
  onQueryGenerated: (query: string) => void;
  initialQuery?: string;
}

const FIELD_OPTIONS = [
  { value: 'title', label: 'Cargo' },
  { value: 'skills', label: 'Skills' },
  { value: 'company', label: 'Empresa' },
  { value: 'location', label: 'Localização' },
  { value: 'keyword', label: 'Palavra-chave' },
  { value: 'industry', label: 'Setor' },
];

const OPERATOR_OPTIONS = [
  { value: 'AND', label: 'E', color: 'bg-green-500/10 text-green-700' },
  { value: 'OR', label: 'OU', color: 'bg-blue-500/10 text-blue-700' },
  { value: 'NOT', label: 'NÃO', color: 'bg-red-500/10 text-red-700' },
];

const TEMPLATE_CATEGORIES = ['Backend', 'Frontend', 'Product', 'Design', 'Data', 'DevOps', 'Gestão', 'Outro'];

let clauseCounter = 0;
const generateId = () => `clause-${++clauseCounter}`;

export function BooleanSearchBuilder({ onQueryGenerated, initialQuery }: BooleanSearchBuilderProps) {
  const [clauses, setClauses] = useState<BooleanClause[]>([
    { id: generateId(), field: 'title', operator: 'AND', value: '' },
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateCategory, setSaveTemplateCategory] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const {
    templates,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    incrementUsage,
  } = useSearchTemplates();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Build boolean query string from clauses
  const generatedQuery = useMemo(() => {
    const validClauses = clauses.filter(c => c.value.trim());
    if (validClauses.length === 0) return '';

    return validClauses.map((clause, idx) => {
      const hasSpaces = clause.value.includes(' ');
      const quotedValue = hasSpaces ? `"${clause.value}"` : clause.value;
      const fieldPrefix = clause.field !== 'keyword' ? `${clause.field}:` : '';
      const term = `${fieldPrefix}${quotedValue}`;

      if (idx === 0) return term;
      return `${clause.operator} ${term}`;
    }).join(' ');
  }, [clauses]);

  // Sync query to parent
  useEffect(() => {
    if (generatedQuery) {
      onQueryGenerated(generatedQuery);
    }
  }, [generatedQuery, onQueryGenerated]);

  const addClause = () => {
    setClauses(prev => [
      ...prev,
      { id: generateId(), field: 'keyword', operator: 'AND', value: '' },
    ]);
  };

  const removeClause = (id: string) => {
    if (clauses.length <= 1) return;
    setClauses(prev => prev.filter(c => c.id !== id));
  };

  const updateClause = (id: string, updates: Partial<BooleanClause>) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const loadTemplate = (template: SearchTemplate) => {
    // Parse boolean query back into clauses (best-effort)
    const parts = template.boolean_query.split(/\s+(AND|OR|NOT)\s+/);
    const newClauses: BooleanClause[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part || ['AND', 'OR', 'NOT'].includes(part)) continue;

      const operator = i > 0 ? (parts[i - 1] as 'AND' | 'OR' | 'NOT') : 'AND';
      const colonIdx = part.indexOf(':');
      let field = 'keyword';
      let value = part;

      if (colonIdx > 0) {
        const fieldCandidate = part.substring(0, colonIdx);
        if (FIELD_OPTIONS.some(f => f.value === fieldCandidate)) {
          field = fieldCandidate;
          value = part.substring(colonIdx + 1);
        }
      }

      // Remove quotes
      value = value.replace(/^"(.*)"$/, '$1');

      newClauses.push({ id: generateId(), field, operator, value });
    }

    if (newClauses.length > 0) {
      setClauses(newClauses);
    }

    incrementUsage(template.id);
    setShowTemplates(false);
  };

  const handleSaveTemplate = async () => {
    if (!saveTemplateName.trim() || !generatedQuery) return;
    await createTemplate({
      name: saveTemplateName.trim(),
      category: saveTemplateCategory || undefined,
      boolean_query: generatedQuery,
    });
    setSaveTemplateName('');
    setSaveTemplateCategory('');
    setShowSaveForm(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedQuery);
  };

  return (
    <div className="space-y-4">
      {/* Header with template actions */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Construtor de Busca Booleana</Label>
        <div className="flex gap-1">
          <Popover open={showTemplates} onOpenChange={setShowTemplates}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <BookOpen className="h-3 w-3" />
                Templates ({templates.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <ScrollArea className="max-h-[200px]">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum template salvo
                  </p>
                ) : (
                  <div className="space-y-1">
                    {templates.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-accent group"
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => loadTemplate(t)}
                        >
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{t.boolean_query}</div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.category && (
                            <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteTemplate(t.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Clauses builder */}
      <div className="space-y-2">
        {clauses.map((clause, idx) => (
          <div key={clause.id} className="flex items-center gap-2">
            {idx === 0 ? (
              <div className="w-16 text-xs text-muted-foreground text-center">BUSCAR</div>
            ) : (
              <Select
                value={clause.operator}
                onValueChange={(val) => updateClause(clause.id, { operator: val as 'AND' | 'OR' | 'NOT' })}
              >
                <SelectTrigger className="w-16 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map(op => (
                    <SelectItem key={op.value} value={op.value} className="text-xs">
                      <Badge variant="outline" className={`text-[10px] ${op.color}`}>{op.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={clause.field}
              onValueChange={(val) => updateClause(clause.id, { field: val })}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={clause.value}
              onChange={(e) => updateClause(clause.id, { value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Ex: React, São Paulo..."
              className="h-8 text-xs flex-1"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeClause(clause.id)}
              disabled={clauses.length <= 1}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addClause} className="h-7 text-xs gap-1 w-full">
        <Plus className="h-3 w-3" />
        Adicionar condição
      </Button>

      {/* Preview */}
      {generatedQuery && (
        <div className="p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Query gerada</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard} title="Copiar">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <code className="text-xs font-mono break-all">{generatedQuery}</code>
        </div>
      )}

      {/* Save template */}
      {generatedQuery && (
        <div>
          {showSaveForm ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Nome do template"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  className="h-8 text-xs"
                />
              </div>
              <Select value={saveTemplateCategory} onValueChange={setSaveTemplateCategory}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" onClick={handleSaveTemplate} disabled={!saveTemplateName.trim()}>
                <Save className="h-3 w-3 mr-1" />
                Salvar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowSaveForm(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowSaveForm(true)}
            >
              <Save className="h-3 w-3" />
              Salvar como template
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
