import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useEnergy } from '@/contexts/EnergyContext';
import { EnergyCatalogItem, ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { EnergyBadge } from './EnergyBadge';
import { EnergyProgress } from './EnergyProgress';
import { CustomRitualInput } from './CustomRitualInput';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EnergySelect20() {
  const { updateStage, saveSelections, getSelections } = useEnergy();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<EnergyCatalogItem[]>([]);
  const [selected, setSelected] = useState<SelectedEnergyItem[]>([]);
  const [customItems, setCustomItems] = useState<SelectedEnergyItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('energy_catalog')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('label');

      if (error) throw error;
      setCatalog(data as EnergyCatalogItem[]);

      const savedSelections = await getSelections(1);
      const customs = savedSelections.filter(s => s.id.startsWith('custom_'));
      setCustomItems(customs);
      setSelected(savedSelections);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item: EnergyCatalogItem | SelectedEnergyItem) => {
    const isSelected = selected.some(s => s.id === item.id);
    
    if (isSelected) {
      setSelected(prev => prev.filter(s => s.id !== item.id));
    } else if (selected.length < 20) {
      setSelected(prev => [...prev, {
        id: item.id,
        label: item.label,
        category: item.category,
        category_label: item.category_label,
      }]);
    } else {
      toast({
        title: "Limite atingido",
        description: "Você já selecionou 20 rituais. Remova algum para adicionar outro.",
        variant: "destructive",
      });
    }
  };

  const handleAddCustom = (item: SelectedEnergyItem) => {
    if (selected.length >= 20) {
      toast({ title: "Limite atingido", description: "Remova algum ritual antes de adicionar.", variant: "destructive" });
      return;
    }
    setCustomItems(prev => [...prev, item]);
    setSelected(prev => [...prev, item]);
    toast({ title: "Ritual adicionado!", description: item.label });
  };

  const handleNext = async () => {
    if (selected.length < 10) {
      toast({ title: "Seleção insuficiente", description: "Selecione pelo menos 10 rituais para continuar.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const result1 = await saveSelections(1, selected);
      if (!result1.success) {
        toast({ title: "Erro ao salvar", description: result1.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      const result2 = await saveSelections(2, selected);
      if (!result2.success) {
        toast({ title: "Erro ao salvar", description: result2.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      await updateStage(2);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => setSelected([]);

  const filteredCatalog = catalog.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustom = customItems.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCatalog = ENERGY_CATEGORIES.map(cat => ({
    ...cat,
    items: [
      ...filteredCatalog.filter(item => item.category === cat.id),
      ...filteredCustom.filter(item => item.category === cat.id),
    ],
  }));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando catálogo...</div>;
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <EnergyProgress currentStage={1} onStageClick={(stage) => updateStage(stage)} />
        <CardTitle className="text-xl">Selecione até 20 Rituais de Energia</CardTitle>
        <CardDescription>
          Escolha os rituais que mais representam a energia que você deseja cultivar na sua organização
        </CardDescription>
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar rituais..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className={`text-sm font-semibold ${selected.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            Selecionados: {selected.length}/20
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <CustomRitualInput onAdd={handleAddCustom} disabled={selected.length >= 20} />
        
        {groupedCatalog.map(category => (
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
        <div />
        <Button variant="outline" onClick={handleClear}>Limpar Seleção</Button>
        <Button onClick={handleNext} disabled={selected.length < 10 || saving}>
          {saving ? 'Salvando...' : 'Avançar →'}
        </Button>
      </CardFooter>
    </Card>
  );
}
