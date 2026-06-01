import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { EnergyBadge } from './EnergyBadge';
import { EnergyProgress } from './EnergyProgress';
import { CustomRitualInput } from './CustomRitualInput';
import { useToast } from '@/hooks/use-toast';

export function EnergySelect10() {
  const { updateStage, saveSelections, getSelections } = useEnergy();
  const { toast } = useToast();
  const [available, setAvailable] = useState<SelectedEnergyItem[]>([]);
  const [selected, setSelected] = useState<SelectedEnergyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const phase1Selections = await getSelections(1);
      setAvailable(phase1Selections);
      
      const phase2Selections = await getSelections(2);
      if (phase2Selections.length > 0 && phase2Selections.length <= 10) {
        const validPhase2 = phase2Selections.filter(p2 => 
          phase1Selections.some(p1 => p1.id === p2.id)
        );
        setSelected(validPhase2);
      } else {
        setSelected([]);
      }
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item: SelectedEnergyItem) => {
    const isSelected = selected.some(s => s.id === item.id);
    
    if (isSelected) {
      setSelected(prev => prev.filter(s => s.id !== item.id));
    } else if (selected.length < 10) {
      setSelected(prev => [...prev, item]);
    } else {
      toast({ title: "Limite atingido", description: "Você só pode selecionar 10 rituais. Remova algum para adicionar outro.", variant: "destructive" });
    }
  };

  const handleAddCustom = (item: SelectedEnergyItem) => {
    if (available.length >= 20) {
      toast({ title: "Limite atingido", description: "Remova algum ritual antes de adicionar.", variant: "destructive" });
      return;
    }
    setAvailable(prev => [...prev, item]);
    if (selected.length < 10) {
      setSelected(prev => [...prev, item]);
    }
    toast({ title: "Ritual adicionado!", description: item.label });
  };

  const handleNext = async () => {
    if (selected.length < 5) {
      toast({ title: "Seleção insuficiente", description: "Selecione pelo menos 5 rituais para continuar.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const result1 = await saveSelections(2, selected);
      if (!result1.success) {
        toast({ title: "Erro ao salvar", description: result1.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      const result2 = await saveSelections(3, selected);
      if (!result2.success) {
        toast({ title: "Erro ao salvar", description: result2.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      await updateStage(3);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    await updateStage(1);
  };

  const groupedItems = ENERGY_CATEGORIES.map(cat => ({
    ...cat,
    items: available.filter(item => item.category === cat.id),
  }));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <EnergyProgress currentStage={2} onStageClick={(stage) => updateStage(stage)} />
        <CardTitle className="text-xl">Refine para 10 Rituais</CardTitle>
        <CardDescription>
          Dos rituais que você selecionou, escolha os 10 mais importantes
        </CardDescription>
        <span className={`text-sm font-semibold ${selected.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
          Selecionados: {selected.length}/10
        </span>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <CustomRitualInput onAdd={handleAddCustom} />

        {groupedItems.map(category => (
          category.items.length > 0 && (
            <div key={category.id}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>{category.icon}</span>
                {category.label}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {category.items.map(item => (
                  <EnergyBadge
                    key={item.id}
                    label={item.label}
                    category={item.category}
                    selected={selected.some(s => s.id === item.id)}
                    isCustom={item.id.startsWith('custom_')}
                    onClick={() => toggleSelection(item)}
                  />
                ))}
              </div>
            </div>
          )
        ))}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>← Voltar</Button>
        <div />
        <Button onClick={handleNext} disabled={selected.length < 5 || saving}>
          {saving ? 'Salvando...' : 'Avançar →'}
        </Button>
      </CardFooter>
    </Card>
  );
}
