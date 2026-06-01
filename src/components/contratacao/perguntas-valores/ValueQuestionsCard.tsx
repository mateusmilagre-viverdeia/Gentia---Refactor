import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ArrowLeft, ArrowRight, Sparkles, Loader2, Target, Home } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';
import { QuestionItemRow } from './QuestionItemRow';
import { findCatalogValueLabel } from '@/types/values-questions.types';

interface ValueQuestionsCardProps {
  valueLabel: string;
  valueIndex: number;
  totalValues: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function ValueQuestionsCard({
  valueLabel,
  valueIndex,
  totalValues,
  onBack,
  onNext,
  onSkip
}: ValueQuestionsCardProps) {
  const { 
    getItemsForValue, 
    getCatalogForValue, 
    addItem, 
    updateItem, 
    deleteItem,
    generateAISuggestions,
    clearAISuggestions,
    aiLoading,
    aiSuggestions
  } = useValuesQuestions();
  const navigate = useNavigate();
  
  const [customQuestion, setCustomQuestion] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const hasInitialized = useRef(false);

  const items = getItemsForValue(valueLabel);
  const catalogItems = getCatalogForValue(valueLabel);
  
  // Check if value exists in catalog
  const catalogLabel = findCatalogValueLabel(valueLabel);
  const hasNoCatalogQuestions = catalogItems.length === 0;

  // Initialize when value changes
  useEffect(() => {
    hasInitialized.current = false;
    setInitialLoading(true);
    clearAISuggestions();
    
    const initialize = async () => {
      if (hasNoCatalogQuestions) {
        await generateAISuggestions(valueLabel);
      }
      setInitialLoading(false);
      hasInitialized.current = true;
    };

    initialize();
  }, [valueLabel]); // Only trigger on value change

  const availableCatalog = catalogItems.filter(
    c => !items.some(i => i.question_text === c.question_text)
  );

  const availableAI = aiSuggestions.filter(
    q => !items.some(i => i.question_text === q)
  );

  const handleAddFromCatalog = async (text: string) => {
    await addItem(3, text, 'catalog', valueLabel);
  };

  const handleAddFromAI = async (text: string) => {
    await addItem(3, text, 'ai', valueLabel);
  };

  const handleAddCustom = async () => {
    if (!customQuestion.trim()) return;
    await addItem(3, customQuestion.trim(), 'custom', valueLabel);
    setCustomQuestion('');
  };

  const handleGenerateMore = async () => {
    await generateAISuggestions(valueLabel);
  };

  if (initialLoading && hasNoCatalogQuestions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Perguntas para: {valueLabel}
            </CardTitle>
            <CardDescription>
              Valor {valueIndex + 1} de {totalValues}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Gerando perguntas com IA...</span>
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Perguntas para: {valueLabel}
          </CardTitle>
          <CardDescription>
            Valor {valueIndex + 1} de {totalValues}
            {!catalogLabel && (
              <span className="ml-2 text-purple-600">
                (Valor personalizado - perguntas geradas por IA)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Suggestions (if no catalog or user requested) */}
          {availableAI.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-purple-600 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Sugestões da IA
                </h4>
              </div>
              <div className="space-y-2">
                {availableAI.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full text-left h-auto py-3 px-4 justify-start whitespace-normal border-purple-200 hover:bg-purple-50"
                    onClick={() => handleAddFromAI(question)}
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0 text-purple-600" />
                    <span>{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Suggestions */}
          {availableCatalog.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                💡 Sugestões do Catálogo
              </h4>
              <div className="space-y-2">
                {availableCatalog.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="w-full text-left h-auto py-3 px-4 justify-start whitespace-normal"
                    onClick={() => handleAddFromCatalog(item.question_text)}
                  >
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{item.question_text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Generate More Button */}
          <Button 
            variant="outline" 
            onClick={handleGenerateMore}
            disabled={aiLoading}
            className="w-full border-dashed"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar mais sugestões com IA
              </>
            )}
          </Button>

          {/* Selected Items */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                ✍️ Suas escolhas ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <QuestionItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Input */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              ✏️ Adicionar pergunta personalizada
            </h4>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Digite sua pergunta..."
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <Button onClick={handleAddCustom} disabled={!customQuestion.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/atracao-contratacao/contratacao')}>
            <Home className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {valueIndex === 0 ? 'Voltar' : 'Valor Anterior'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Pular Valor
          </Button>
          <Button onClick={onNext}>
            {valueIndex === totalValues - 1 ? 'Próximo' : 'Próximo Valor'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
