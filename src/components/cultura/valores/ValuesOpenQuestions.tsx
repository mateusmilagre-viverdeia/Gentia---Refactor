import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

export function ValuesOpenQuestions() {
  const { session, updateStage } = useValues();
  const [intolerable, setIntolerable] = useState('');
  const [expectations, setExpectations] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnswers();
  }, []);

  const loadAnswers = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('values_open_answers')
        .select('*')
        .eq('session_id', session.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setIntolerable(data.intolerable || '');
        setExpectations(data.expectations || '');
      }
    } catch (error) {
      console.error('Error loading answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!intolerable.trim() || !expectations.trim()) {
      toast.error('Responda ambas as perguntas');
      return;
    }

    try {
      await supabase
        .from('values_open_answers')
        .upsert({
          session_id: session!.id,
          intolerable,
          expectations
        });

      await updateStage(5);
      toast.success('Respostas salvas!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleBack = async () => {
    await updateStage(3);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perguntas Abertas</CardTitle>
        <CardDescription>
          Ajude-nos a entender melhor seus valores respondendo estas questões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="intolerable">
            Quais são os 3 comportamentos mais intoleráveis na sua organização?
          </Label>
          <Textarea
            id="intolerable"
            value={intolerable}
            onChange={(e) => setIntolerable(e.target.value)}
            placeholder="Descreva os comportamentos que não podem ser aceitos..."
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectations">
            O que você espera dos colaboradores em relação aos valores organizacionais?
          </Label>
          <Textarea
            id="expectations"
            value={expectations}
            onChange={(e) => setExpectations(e.target.value)}
            placeholder="Descreva suas expectativas..."
            rows={5}
          />
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
          disabled={!intolerable.trim() || !expectations.trim()}
          className="flex-1"
        >
          Próximo
        </Button>
      </CardFooter>
    </Card>
  );
}
