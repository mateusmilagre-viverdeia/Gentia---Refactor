import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';
import { QuestionItemRow } from './QuestionItemRow';

interface QuestionsStageCardProps {
  stageNumber: 1 | 2 | 4;
  title: string;
  description: string;
  icon: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
}

export function QuestionsStageCard({
  stageNumber,
  title,
  description,
  icon,
  onBack,
  onNext
}: QuestionsStageCardProps) {
  const { 
    getItemsForStage, 
    getCatalogForStage, 
    addItem, 
    updateItem, 
    deleteItem 
  } = useValuesQuestions();
  const navigate = useNavigate();
  
  const [customQuestion, setCustomQuestion] = useState('');

  const items = getItemsForStage(stageNumber);
  const catalogItems = getCatalogForStage(stageNumber);
  
  // Filter out already added questions
  const availableCatalog = catalogItems.filter(
    c => !items.some(i => i.question_text === c.question_text)
  );

  const handleAddFromCatalog = async (text: string) => {
    await addItem(stageNumber, text, 'catalog');
  };

  const handleAddCustom = async () => {
    if (!customQuestion.trim()) return;
    await addItem(stageNumber, customQuestion.trim(), 'custom');
    setCustomQuestion('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Catalog Suggestions */}
          {availableCatalog.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                💡 Sugestões Pré-definidas
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableCatalog.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    size="sm"
                    className="text-left h-auto py-2 px-3 whitespace-normal"
                    onClick={() => handleAddFromCatalog(item.question_text)}
                  >
                    <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="line-clamp-2">{item.question_text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

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
          {stageNumber === 1 && (
            <Button variant="ghost" onClick={() => navigate('/atracao-contratacao/contratacao')}>
              <Home className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
