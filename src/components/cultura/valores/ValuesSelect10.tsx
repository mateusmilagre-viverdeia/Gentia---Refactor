import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ValueBadge } from './ValueBadge';
import { useValues } from '@/contexts/ValuesContext';
import { SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

export function ValuesSelect10() {
  const { updateStage, saveSelections, getSelections } = useValues();
  const [previousValues, setPreviousValues] = useState<SelectedValue[]>([]);
  const [selected, setSelected] = useState<SelectedValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSelections();
  }, []);

  const loadSelections = async () => {
    try {
      const phase1 = await getSelections(1);
      setPreviousValues(phase1);

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
      if (selected.length >= 10) {
        toast.error('Você já selecionou 10 valores');
        return;
      }
      setSelected([...selected, value]);
    }
  };

  const handleNext = async () => {
    if (selected.length !== 10) {
      toast.error('Selecione exatamente 10 valores');
      return;
    }

    try {
      await saveSelections(2, selected);
      await updateStage(3);
      toast.success('Valores refinados!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleBack = async () => {
    // Limpar seleções das fases 2 e 3 ao voltar
    await saveSelections(2, []);
    await saveSelections(3, []);
    await updateStage(1);
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
        <CardTitle className="text-2xl">Reduza para 10 Valores</CardTitle>
        <CardDescription>
          Dos 20 valores selecionados, escolha os 10 mais importantes para sua organização.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Selecionados:
          </p>
          <p className="text-lg font-bold text-primary">
            {selected.length}/10
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {previousValues.map((value) => (
            <ValueBadge
              key={value.id}
              label={value.label}
              selected={selected.some(v => v.id === value.id)}
              onClick={() => toggleValue(value)}
              className="w-full justify-center py-3"
            />
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
          disabled={selected.length !== 10}
          className="flex-1"
        >
          Avançar
        </Button>
      </CardFooter>
    </Card>
  );
}
