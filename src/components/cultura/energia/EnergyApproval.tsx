import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { EnergyBadge } from './EnergyBadge';
import { EnergyProgress } from './EnergyProgress';
import { CustomRitualInput } from './CustomRitualInput';
import { useToast } from '@/hooks/use-toast';
import logoGentia from '@/assets/logo-gentia.png';
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

export function EnergyApproval() {
  const { updateStage, getSelections, saveSelections, resetSession, updateSelectionLabel } = useEnergy();
  const { toast } = useToast();
  const [selected, setSelected] = useState<SelectedEnergyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const selections = await getSelections(3);
      setSelected(selections);
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (itemId: string, newLabel: string) => {
    const success = await updateSelectionLabel(3, itemId, newLabel);
    if (success) {
      setSelected(prev => prev.map(s => s.id === itemId ? { ...s, label: newLabel } : s));
      toast({ title: "Ritual atualizado!" });
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleAddCustom = async (item: SelectedEnergyItem) => {
    const updated = [...selected, item];
    setSelected(updated);
    const result = await saveSelections(3, updated);
    if (!result.success) {
      setSelected(selected);
      toast({ title: "Erro ao salvar", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Ritual adicionado!", description: item.label });
    }
  };

  const handleApprove = async () => {
    await updateStage(5);
    toast({ title: "Rituais aprovados!", description: "Seus rituais de energia foram salvos com sucesso." });
  };

  const handleBack = async () => {
    await updateStage(3);
  };

  const handleRestart = async () => {
    setIsResetting(true);
    try {
      await resetSession();
      toast({ title: "Processo reiniciado", description: "Um backup foi salvo antes de reiniciar." });
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const groupedItems = ENERGY_CATEGORIES.map(cat => ({
    ...cat,
    items: selected.filter(item => item.category === cat.id),
  })).filter(cat => cat.items.length > 0);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mx-auto mb-4" />
          <EnergyProgress currentStage={4} onStageClick={(stage) => updateStage(stage)} />
          <CardTitle className="text-xl">Aprovar Rituais de Energia</CardTitle>
          <CardDescription>
            Revise seus rituais selecionados antes de finalizar. Você pode editar os nomes clicando no ícone de lápis.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {groupedItems.map(category => (
            <div key={category.id}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>{category.icon}</span>
                {category.label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {category.items.map(item => (
                  <EnergyBadge
                    key={item.id}
                    label={item.label}
                    category={item.category}
                    selected={true}
                    isCustom={item.id.startsWith('custom_')}
                    onEdit={(newLabel) => handleEdit(item.id, newLabel)}
                  />
                ))}
              </div>
            </div>
          ))}

          <CustomRitualInput onAdd={handleAddCustom} />
          
          <p className="text-sm text-muted-foreground text-center pt-4">
            Estes rituais representam a energia que você deseja cultivar na sua organização.
          </p>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>← Voltar</Button>
          <Button variant="ghost" onClick={() => setShowResetConfirm(true)}>Recomeçar</Button>
          <Button onClick={handleApprove}>Aprovar e Finalizar</Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recomeçar processo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá reiniciar todo o processo de seleção de rituais de energia. 
              Um backup será salvo automaticamente antes de reiniciar.
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
