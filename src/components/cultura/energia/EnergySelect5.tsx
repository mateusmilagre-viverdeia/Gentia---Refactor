import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnergy } from '@/contexts/EnergyContext';
import { ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { EnergyBadge } from './EnergyBadge';
import { EnergyProgress } from './EnergyProgress';
import { CustomRitualInput } from './CustomRitualInput';
import { useToast } from '@/hooks/use-toast';

export function EnergySelect5() {
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
      const phase2Selections = await getSelections(2);
      setAvailable(phase2Selections);
      
      const phase3Selections = await getSelections(3);
      if (phase3Selections.length > 0 && phase3Selections.length <= 8) {
        const validPhase3 = phase3Selections.filter(p3 => 
          phase2Selections.some(p2 => p2.id === p3.id)
        );
        setSelected(validPhase3);
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
    } else if (selected.length < 8) {
      setSelected(prev => [...prev, item]);
    } else {
      toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 8 rituais. Remova algum para adicionar outro.", variant: "destructive" });
    }
  };

  const handleAddCustom = (item: SelectedEnergyItem) => {
    setAvailable(prev => [...prev, item]);
    if (selected.length < 8) {
      setSelected(prev => [...prev, item]);
    }
    toast({ title: "Ritual adicionado!", description: item.label });
  };

  const handleNext = async () => {
    if (selected.length < 5 || selected.length > 8) {
      toast({ title: "Seleção necessária", description: "Selecione de 5 a 8 rituais para continuar.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const result = await saveSelections(3, selected);
      if (!result.success) {
        toast({ title: "Erro ao salvar", description: result.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      await updateStage(4);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    await updateStage(2);
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
        <EnergyProgress currentStage={3} onStageClick={(stage) => updateStage(stage)} />
        <CardTitle className="text-xl">Escolha de 5 a 8 Rituais Finais</CardTitle>
        <CardDescription>
          Selecione de 5 a 8 rituais de energia mais essenciais para sua organização
        </CardDescription>
        <span className={`text-sm font-semibold ${selected.length >= 5 && selected.length <= 8 ? 'text-primary' : selected.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          Selecionados: {selected.length} (mín. 5, máx. 8)
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
        <Button onClick={handleNext} disabled={selected.length < 5 || selected.length > 8 || saving}>
          {saving ? 'Salvando...' : 'Avançar →'}
        </Button>
      </CardFooter>
    </Card>
  );
}
