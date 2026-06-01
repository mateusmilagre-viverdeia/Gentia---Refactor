import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

export function ValuesFinalCheck() {
  const { session, updateStage } = useValues();
  const [percentResolved, setPercentResolved] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('values_final_check')
        .select('*')
        .eq('session_id', session.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPercentResolved(data.percent_resolved);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      const passed = percentResolved >= 80;

      await supabase
        .from('values_final_check')
        .upsert({
          session_id: session!.id,
          percent_resolved: percentResolved,
          passed
        });

      await updateStage(7);
      toast.success('Verificação concluída!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleBack = async () => {
    await updateStage(5);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação Final</CardTitle>
        <CardDescription>
          Que percentual dos problemas de pessoas da sua organização seria resolvido se todos vivessem esses valores?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-5xl font-bold text-primary">{percentResolved}%</span>
          </div>
          
          <Slider
            value={[percentResolved]}
            onValueChange={(values) => setPercentResolved(values[0])}
            max={100}
            step={5}
            className="w-full"
          />

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          {percentResolved >= 80 ? (
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Excelente! Esses valores têm grande potencial de impacto positivo na sua organização.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠ Considere revisar seus valores se acha que eles não resolveriam a maioria dos problemas.
              </p>
            </div>
          )}
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
          onClick={handleNext}
          className="flex-1"
        >
          Próximo
        </Button>
      </CardFooter>
    </Card>
  );
}
