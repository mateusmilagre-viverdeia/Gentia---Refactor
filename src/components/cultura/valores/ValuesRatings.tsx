import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

interface Rating {
  value_id: string;
  score: number;
  valid: boolean;
}

export function ValuesRatings() {
  const { session, updateStage, getSelections } = useValues();
  const [values, setValues] = useState<SelectedValue[]>([]);
  const [ratings, setRatings] = useState<{ [key: string]: Rating }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const phase3Values = await getSelections(3);
      setValues(phase3Values);

      if (!session) return;

      const { data, error } = await supabase
        .from('values_ratings')
        .select('*')
        .eq('session_id', session.id);

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const ratingsMap: { [key: string]: Rating } = {};
        data.forEach((rating: any) => {
          ratingsMap[rating.value_id] = {
            value_id: rating.value_id,
            score: rating.score,
            valid: rating.valid
          };
        });
        setRatings(ratingsMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (valueId: string, score: number) => {
    setRatings({
      ...ratings,
      [valueId]: {
        value_id: valueId,
        score,
        valid: score >= 9
      }
    });
  };

  const handleNext = async () => {
    const allRated = values.every(v => ratings[v.id]);
    if (!allRated) {
      toast.error('Avalie todos os valores');
      return;
    }

    const invalidValues = values.filter(v => !ratings[v.id]?.valid);
    if (invalidValues.length > 0) {
      toast.error(`Os seguintes valores receberam nota abaixo de 9: ${invalidValues.map(v => v.label).join(', ')}. Você precisará ajustar suas escolhas.`);
      return;
    }

    try {
      const ratingsData = values.map(v => ({
        session_id: session!.id,
        value_id: v.id,
        score: ratings[v.id].score,
        valid: ratings[v.id].valid
      }));

      await supabase
        .from('values_ratings')
        .upsert(ratingsData);

      await updateStage(6);
      toast.success('Avaliações salvas!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleBack = async () => {
    await updateStage(4);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avalie os Valores</CardTitle>
        <CardDescription>
          Dê uma nota de 0 a 10 para cada valor (mínimo 9 para validar)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {values.map((value) => {
          const rating = ratings[value.id];
          const score = rating?.score ?? 5;
          const isValid = rating?.valid ?? false;

          return (
            <div key={value.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{value.label}</span>
                <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {score}/10
                </span>
              </div>
              <Slider
                value={[score]}
                onValueChange={(values) => handleRatingChange(value.id, values[0])}
                max={10}
                step={1}
                className="w-full"
              />
              {rating && !isValid && (
                <p className="text-sm text-destructive">
                  Nota abaixo de 9 - este valor pode precisar ser substituído
                </p>
              )}
            </div>
          );
        })}
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
          onClick={handleNext}
          disabled={!values.every(v => ratings[v.id])}
          className="flex-1"
        >
          Próximo
        </Button>
      </CardFooter>
    </Card>
  );
}
