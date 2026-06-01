import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Rocket, AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { DISCResult, DISCSession, DISC_DIMENSIONS } from '@/types/disc.types';
import { useDISCEvolutionIntegration, DISCCompetencyToCreate } from '@/hooks/useDISCEvolutionIntegration';
import { cn } from '@/lib/utils';

interface CreateEvolutionFromDISCProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: DISCSession;
  result: DISCResult;
}

export function CreateEvolutionFromDISC({
  open,
  onOpenChange,
  session,
  result,
}: CreateEvolutionFromDISCProps) {
  const navigate = useNavigate();
  const {
    getCompetenciesToCreate,
    findActiveEvolutionCycle,
    createDISCCompetencies,
    isCreating,
  } = useDISCEvolutionIntegration();

  const [competencies, setCompetencies] = useState<DISCCompetencyToCreate[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [isLoadingCycle, setIsLoadingCycle] = useState(true);
  const [createdSuccessfully, setCreatedSuccessfully] = useState(false);

  useEffect(() => {
    if (open && result) {
      // Get competencies to create
      const comps = getCompetenciesToCreate(result);
      setCompetencies(comps);

      // Find active evolution cycle
      const loadCycle = async () => {
        setIsLoadingCycle(true);
        // Use user_id from session as collaborator reference
        const id = await findActiveEvolutionCycle(session.user_id);
        setCycleId(id);
        setIsLoadingCycle(false);
      };
      loadCycle();
    }
  }, [open, result, session.user_id]);

  const handleCreate = async () => {
    if (!cycleId) return;

    const success = await createDISCCompetencies(cycleId, result, session.id);
    if (success) {
      setCreatedSuccessfully(true);
    }
  };

  const handleViewCycle = () => {
    onOpenChange(false);
    navigate(`/retencao/evolucao`);
  };

  const handleClose = () => {
    setCreatedSuccessfully(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Criar Plano de Desenvolvimento
          </DialogTitle>
          <DialogDescription>
            Baseado no perfil DISC do colaborador, identificamos áreas de desenvolvimento.
          </DialogDescription>
        </DialogHeader>

        {createdSuccessfully ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Competências Criadas!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As competências foram adicionadas ao ciclo de evolução do colaborador.
              </p>
            </div>
            <Button onClick={handleViewCycle} className="w-full">
              Ver Ciclo de Evolução
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {isLoadingCycle ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !cycleId ? (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Nenhum ciclo de evolução ativo
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          O colaborador precisa ter um ciclo de evolução ativo para adicionar competências.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : competencies.length === 0 ? (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-800">
                          Perfil equilibrado
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Não foram identificadas áreas críticas de desenvolvimento baseadas no DISC.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    As seguintes competências serão adicionadas ao PDI:
                  </p>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {competencies.map(({ mapping, score, condition }) => {
                      const dimInfo = DISC_DIMENSIONS[mapping.dimension];
                      return (
                        <Card key={`${mapping.dimension}-${condition}`}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0',
                                  dimInfo.bgColor
                                )}
                              >
                                {mapping.dimension}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {mapping.competency_name}
                                  </span>
                                  <Badge
                                    variant={condition === 'low' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {condition === 'low' ? (
                                      <><TrendingDown className="h-3 w-3 mr-1" /> Desenvolver</>
                                    ) : (
                                      <><TrendingUp className="h-3 w-3 mr-1" /> Equilibrar</>
                                    )}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {dimInfo.name}: {score.toFixed(1)}%
                                </p>
                                <p className="text-sm mt-2">
                                  {mapping.expected_impact}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!cycleId || competencies.length === 0 || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Criar Competências no PDI
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
