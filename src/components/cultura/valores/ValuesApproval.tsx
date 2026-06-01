import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ValueBadge } from './ValueBadge';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { ChevronLeft, RefreshCw, Check } from 'lucide-react';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useAchievementChecker } from '@/hooks/useAchievementChecker';

interface ValuesApprovalProps {
  skipBehaviors?: boolean;
}

export function ValuesApproval({ skipBehaviors = false }: ValuesApprovalProps = {}) {
  const { session, updateStage, resetSession, getSelections } = useValues();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const [values, setValues] = useState<SelectedValue[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [percentResolved, setPercentResolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasCheckedAchievements = useRef(false);

  // Refetch journey progress and check achievements when approval mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('valores');
    }
  }, [refetch, checkStepCompletion]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!session) return;

    try {
      const phase3Values = await getSelections(3);
      setValues(phase3Values);

      const { data: companyData } = await supabase
        .from('values_company_info')
        .select('company_name')
        .eq('session_id', session.id)
        .single();

      if (companyData) {
        setCompanyName(companyData.company_name);
      }

      const { data: checkData } = await supabase
        .from('values_final_check')
        .select('percent_resolved')
        .eq('session_id', session.id)
        .single();

      if (checkData) {
        setPercentResolved(checkData.percent_resolved);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await updateStage(skipBehaviors ? 9 : 8);
      toast.success(
        skipBehaviors ? 'Valores aprovados!' : 'Valores aprovados! Gerando comportamentos...'
      );
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Erro ao aprovar');
    }
  };

  const handleRestart = async () => {
    try {
      await resetSession();
      toast.success('Processo reiniciado');
    } catch (error) {
      console.error('Error restarting:', error);
      toast.error('Erro ao reiniciar');
    }
  };

  const handleBack = async () => {
    await updateStage(6);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovação dos Valores</CardTitle>
        <CardDescription>
          Revise seus valores organizacionais antes de prosseguir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Empresa:</h3>
          <p className="text-lg">{companyName}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Valores Organizacionais:</h3>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <ValueBadge
                key={value.id}
                label={value.label}
                selected={true}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Potencial de Impacto:</h3>
          <p className="text-2xl font-bold text-primary">{percentResolved}%</p>
          <p className="text-sm text-muted-foreground">
            dos problemas de pessoas seriam resolvidos com esses valores
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            Você está satisfeito com esses valores? Eles representam o que sua organização é ou deveria ser?
          </p>
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
          variant="destructive"
          onClick={handleRestart}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Reiniciar
        </Button>
        <Button
          onClick={handleApprove}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-1" />
          Aprovar e Continuar
        </Button>
      </CardFooter>
    </Card>
  );
}
