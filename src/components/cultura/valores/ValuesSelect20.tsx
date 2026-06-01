import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ValueBadge } from './ValueBadge';
import { supabase } from '@/integrations/supabase/client';
import { useValues } from '@/contexts/ValuesContext';
import { ValuesCatalogItem, SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ValuesSelect20() {
  const { session, updateStage, saveSelections, getSelections } = useValues();
  const [catalog, setCatalog] = useState<ValuesCatalogItem[]>([]);
  const [selected, setSelected] = useState<SelectedValue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalog();
    loadExistingSelections();
  }, []);

  const loadCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('values_catalog')
        .select('*')
        .eq('active', true)
        .order('label');

      if (error) throw error;
      setCatalog(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast.error('Erro ao carregar valores');
    } finally {
      setLoading(false);
    }
  };


  const loadExistingSelections = async () => {
    const selections = await getSelections(1);
    setSelected(selections);
  };

  const toggleValue = (value: ValuesCatalogItem) => {
    const isSelected = selected.some(v => v.id === value.id);
    
    if (isSelected) {
      setSelected(selected.filter(v => v.id !== value.id));
    } else {
      if (selected.length >= 20) {
        toast.error('Você já selecionou 20 valores');
        return;
      }
      setSelected([...selected, { id: value.id, label: value.label }]);
    }
  };

  const handleNext = async () => {
    if (selected.length !== 20) {
      toast.error('Selecione exatamente 20 valores');
      return;
    }

    try {
      await saveSelections(1, selected);
      await updateStage(2);
      toast.success('Valores salvos!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleClear = () => {
    setSelected([]);
    toast.info('Seleção limpa');
  };

  const filteredCatalog = catalog.filter(value =>
    value.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Carregando valores...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-2">Selecione 20 Valores</h2>
        <p className="text-muted-foreground">
          Escolha 20 valores que você considera mais importantes para sua empresa. Pense nos valores que você realmente vive no dia a dia.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar valores..."
            className="pl-9"
          />
        </div>
        <span
          className={cn(
            "font-semibold text-lg whitespace-nowrap",
            selected.length > 0 ? "text-primary" : "text-muted-foreground"
          )}
        >
          Selecionados: {selected.length}/20
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredCatalog.map((value) => (
          <ValueBadge
            key={value.id}
            label={value.label}
            selected={selected.some(v => v.id === value.id)}
            onClick={() => toggleValue(value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" disabled>
          ← Voltar
        </Button>
        <Button variant="ghost" onClick={handleClear}>
          Limpar Seleção
        </Button>
        <Button onClick={handleNext} disabled={selected.length !== 20}>
          Avançar →
        </Button>
      </div>
    </div>
  );
}
