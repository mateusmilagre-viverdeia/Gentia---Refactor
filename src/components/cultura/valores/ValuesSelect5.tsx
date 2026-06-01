import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ValueBadge } from './ValueBadge';
import { useValues } from '@/contexts/ValuesContext';
import { SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

export function ValuesSelect5() {
  const { updateStage, saveSelections, getSelections } = useValues();
  const [previousValues, setPreviousValues] = useState<SelectedValue[]>([]);
  const [selected, setSelected] = useState<SelectedValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSelections();
  }, []);

  const loadSelections = async () => {
    try {
      const phase2 = await getSelections(2);
      setPreviousValues(phase2);

      const phase3 = await getSelections(3);
      if (phase3.length > 0) {
        // Validar que seleções da fase 3 existem na fase 2
        const validPhase3 = phase3.filter(p3 => 
          phase2.some(p2 => p2.id === p3.id)
        );
        setSelected(validPhase3);
      }
    } catch (error) {
      console.error('Error loading selections:', error);
      toast.error('Erro ao carregar valores');
    } finally {
      setLoading(false);
    }
  };

  const toggleValue = (value: SelectedValue) => {
    const isSelected = selected.some(v => v.id === value.id);
    
    if (isSelected) {
      setSelected(selected.filter(v => v.id !== value.id));
    } else {
      if (selected.length >= 5) {
        toast.error('Você já selecionou 5 valores');
        return;
      }
      setSelected([...selected, value]);
    }
  };

  const handleNext = async () => {
    if (selected.length < 3) {
      toast.error('Selecione pelo menos 3 valores');
      return;
    }

    try {
      await saveSelections(3, selected);
      await updateStage(4);
      toast.success('Valores finais selecionados!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleBack = async () => {
    // Limpar seleções da fase 3 ao voltar
    await saveSelections(3, []);
    await updateStage(2);
  };

  const handleClear = () => {
    setSelected([]);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolha até 5 Valores Finais</CardTitle>
        <CardDescription>
          Selecione de 3 a 5 valores que são absolutamente essenciais para sua organização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium">
          Selecionados: {selected.length} (mín. 3, máx. 5)
        </p>
        <div className="flex flex-wrap gap-2">
          {previousValues.map((value) => (
            <ValueBadge
              key={value.id}
              label={value.label}
              selected={selected.some(v => v.id === value.id)}
              onClick={() => toggleValue(value)}
            />
          ))}
        </div>

        {selected.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Valores Selecionados:</h4>
            <div className="flex flex-wrap gap-2">
              {selected.map((value) => (
                <ValueBadge
                  key={value.id}
                  label={value.label}
                  selected={true}
                />
              ))}
            </div>
          </div>
        )}
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
          disabled={selected.length < 3}
          className="flex-1"
        >
          Próximo
        </Button>
      </CardFooter>
    </Card>
  );
}
