import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DevelopmentBadge } from './DevelopmentBadge';
import { DevelopmentProgress } from './DevelopmentProgress';
import { useDevelopment } from '@/contexts/DevelopmentContext';
import { SelectedDevelopmentItem, DEVELOPMENT_CATEGORIES } from '@/types/development.types';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DevelopmentSelect10() {
  const { updateStage, saveSelections, getSelections } = useDevelopment();
  const [previousItems, setPreviousItems] = useState<SelectedDevelopmentItem[]>([]);
  const [selected, setSelected] = useState<SelectedDevelopmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSelections();
  }, []);

  const loadSelections = async () => {
    try {
      const phase1 = await getSelections(1);
      setPreviousItems(phase1);

      const phase2 = await getSelections(2);
      if (phase2.length > 0) {
        // Validar que seleções da fase 2 existem na fase 1
        const validPhase2 = phase2.filter(p2 => 
          phase1.some(p1 => p1.id === p2.id)
        );
        setSelected(validPhase2);
      }
    } catch (error) {
      console.error('Error loading selections:', error);
      toast.error('Erro ao carregar rituais');
    } finally {
      setLoading(false);
    }
  };

  const toggleValue = (item: SelectedDevelopmentItem) => {
    const isSelected = selected.some(v => v.id === item.id);
    
    if (isSelected) {
      setSelected(selected.filter(v => v.id !== item.id));
    } else {
      if (selected.length >= 10) {
        toast.error('Limite de 10 rituais atingido');
        return;
      }
      setSelected([...selected, item]);
    }
  };

  const handleNext = async () => {
    if (selected.length < 5) {
      toast.error('Selecione pelo menos 5 rituais');
      return;
    }

    setSaving(true);
    try {
      const result = await saveSelections(2, selected);
      if (!result.success) {
        toast.error(result.error || 'Erro ao salvar seleções');
        return;
      }
      await updateStage(3);
      toast.success('Rituais refinados!');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    await updateStage(1);
  };

  const handleClear = () => {
    setSelected([]);
  };

  const getCountByCategory = (categoryId: string) => {
    return selected.filter(s => s.category === categoryId).length;
  };

  // Group items by category
  const groupedItems = DEVELOPMENT_CATEGORIES.map(category => ({
    ...category,
    items: previousItems.filter(item => item.category === category.id),
  })).filter(group => group.items.length > 0);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <DevelopmentProgress currentStage={2} onStageClick={(s) => updateStage(s)} />
        <CardTitle className="text-2xl">Reduza para até 10 Rituais</CardTitle>
        <CardDescription>
          Dos rituais selecionados, escolha de 5 a 10 mais importantes para sua organização.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Selecionados:
          </p>
          <p className={cn(
            "text-lg font-bold",
            selected.length >= 5 ? "text-primary" : "text-muted-foreground"
          )}>
            {selected.length} (mín. 5, máx. 10)
          </p>
        </div>

        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  <span className="font-medium text-sm">{group.label}</span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  getCountByCategory(group.id) > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {getCountByCategory(group.id)}/{group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <DevelopmentBadge
                    key={item.id}
                    label={item.id.startsWith('custom_') ? `✨ ${item.label}` : item.label}
                    category={item.category}
                    selected={selected.some(v => v.id === item.id)}
                    onClick={() => toggleValue(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
        >
          Limpar Seleção
        </Button>
        <Button
          onClick={handleNext}
          disabled={selected.length < 5 || saving}
          className="flex-1"
        >
          {saving ? 'Salvando...' : 'Avançar'}
        </Button>
      </CardFooter>
    </Card>
  );
}
