import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { QAResult, QASession, QA_DIMENSIONS, QADimension } from '@/types/qa.types';
import { useQAEvolutionIntegration } from '@/hooks/useQAEvolutionIntegration';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QAAddToPDIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: QAResult;
  session: QASession;
}

export function QAAddToPDIDialog({ open, onOpenChange, result, session }: QAAddToPDIDialogProps) {
  const navigate = useNavigate();
  const { getCompetenciesToCreate, findActiveEvolutionCycle, createQACompetencies } = useQAEvolutionIntegration();
  
  const [step, setStep] = useState<'loading' | 'no-cycle' | 'preview' | 'success'>('loading');
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [competencies, setCompetencies] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      checkCycleAndCompetencies();
    }
  }, [open]);

  const checkCycleAndCompetencies = async () => {
    setStep('loading');
    try {
      // Busca ciclo ativo do participante (user_id da sessão)
      const cycle = await findActiveEvolutionCycle(session.user_id);
      
      if (!cycle) {
        setStep('no-cycle');
        return;
      }

      setActiveCycle(cycle);
      const comps = getCompetenciesToCreate(result);
      setCompetencies(comps);
      
      if (comps.length === 0) {
        // Colaborador tem bons scores, não precisa de gaps
        setStep('no-cycle'); // Reutiliza para mostrar mensagem
      } else {
        setStep('preview');
      }
    } catch (error) {
      console.error('Error checking cycle:', error);
      setStep('no-cycle');
    }
  };

  const handleConfirm = async () => {
    if (!activeCycle) return;
    
    await createQACompetencies.mutateAsync({
      cycleId: activeCycle.id,
      qaResult: result,
      qaSessionId: session.id
    });
    
    setStep('success');
  };

  const handleGoToEvolution = () => {
    onOpenChange(false);
    navigate(`/retencao/evolucao/${activeCycle?.id}`);
  };

  const handleCreateCycle = () => {
    onOpenChange(false);
    navigate('/retencao/evolucao/novo');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Adicionar ao PDI
          </DialogTitle>
          <DialogDescription>
            Crie automaticamente competências comportamentais baseadas no resultado do Teste QA.
          </DialogDescription>
        </DialogHeader>

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando ciclo de evolução...</p>
          </div>
        )}

        {step === 'no-cycle' && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div className="text-center space-y-2">
              <p className="font-medium">Nenhum ciclo de evolução ativo</p>
              <p className="text-sm text-muted-foreground">
                {competencies.length === 0 
                  ? 'O colaborador tem bons scores em todas as dimensões. Não há gaps para criar.'
                  : 'É necessário ter um ciclo de evolução ativo para adicionar competências do QA.'}
              </p>
            </div>
            {competencies.length > 0 && (
              <Button onClick={handleCreateCycle} className="mt-2">
                Criar Novo Ciclo
              </Button>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">Ciclo ativo:</span>{' '}
                {new Date(activeCycle.start_date).toLocaleDateString('pt-BR')} -{' '}
                {new Date(activeCycle.end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Competências a adicionar ({competencies.length})
              </h4>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-3 pr-4">
                  {competencies.map((comp) => {
                    const dimensionScores: Record<QADimension, number> = {
                      C: result.c_score,
                      R: result.r_score,
                      A: result.a_score,
                      D: result.d_score
                    };
                    return (
                      <div key={comp.dimension} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{comp.competency_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {QA_DIMENSIONS[comp.dimension].name}: {dimensionScores[comp.dimension]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{comp.strategic_justification}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lightbulb className="h-3 w-3" />
                          {comp.actions.length} ações sugeridas
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center space-y-2">
              <p className="font-medium">Competências adicionadas!</p>
              <p className="text-sm text-muted-foreground">
                {competencies.length} competências e {competencies.length * 3} ações foram criadas no PDI.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={createQACompetencies.isPending}
              >
                {createQACompetencies.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </>
          )}
          {step === 'success' && (
            <Button onClick={handleGoToEvolution}>
              Ver Ciclo de Evolução
            </Button>
          )}
          {step === 'no-cycle' && competencies.length === 0 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
