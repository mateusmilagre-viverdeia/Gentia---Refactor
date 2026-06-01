import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DevelopmentBadge } from './DevelopmentBadge';
import { DevelopmentProgress } from './DevelopmentProgress';
import { useDevelopment } from '@/contexts/DevelopmentContext';
import { SelectedDevelopmentItem, DEVELOPMENT_CATEGORIES } from '@/types/development.types';
import { toast } from 'sonner';
import { ChevronLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DevelopmentApproval() {
  const { updateStage, resetSession, getSelections } = useDevelopment();
  const [selected, setSelected] = useState<SelectedDevelopmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const phase3 = await getSelections(3);
      setSelected(phase3);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await updateStage(5);
      toast.success('Rituais aprovados!');
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Erro ao aprovar');
    }
  };

  const handleBack = async () => {
    await updateStage(3);
  };

  const handleRestart = async () => {
    setIsResetting(true);
    try {
      await resetSession();
      toast.success('Processo reiniciado. Um backup foi salvo automaticamente.');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  // Group items by category
  const groupedItems = DEVELOPMENT_CATEGORIES.map(category => ({
    ...category,
    items: selected.filter(item => item.category === category.id),
  })).filter(group => group.items.length > 0);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <DevelopmentProgress currentStage={4} onStageClick={(s) => updateStage(s)} />
          <CardTitle className="text-2xl">Aprovação dos Rituais</CardTitle>
          <CardDescription>
            Revise os 5 rituais de desenvolvimento selecionados antes de finalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">5 Rituais Selecionados</span>
            </div>

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <DevelopmentBadge
                        key={item.id}
                        label={item.label}
                        category={item.category}
                        selected
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg bg-background">
            <p className="text-sm text-muted-foreground mb-2">
              Estes rituais serão utilizados para fortalecer o desenvolvimento
              organizacional da sua empresa.
            </p>
            <p className="text-sm font-medium">
              Confirme para prosseguir ao resumo final.
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
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Recomeçar
          </Button>
          <Button
            onClick={handleApprove}
            className="flex-1"
          >
            Aprovar e Finalizar
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recomeçar processo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá reiniciar todo o processo de seleção de rituais de desenvolvimento. 
              Um backup será salvo automaticamente antes de reiniciar, mas suas seleções atuais serão arquivadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} disabled={isResetting}>
              {isResetting ? 'Reiniciando...' : 'Confirmar e Reiniciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
