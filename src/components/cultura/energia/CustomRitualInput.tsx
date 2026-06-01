import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ENERGY_CATEGORIES, SelectedEnergyItem } from '@/types/energy.types';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomRitualInputProps {
  onAdd: (item: SelectedEnergyItem) => void;
  disabled?: boolean;
}

export function CustomRitualInput({ onAdd, disabled }: CustomRitualInputProps) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      toast({ title: "Nome obrigatório", description: "Digite o nome do ritual.", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Categoria obrigatória", description: "Selecione uma categoria.", variant: "destructive" });
      return;
    }

    const cat = ENERGY_CATEGORIES.find(c => c.id === category);
    const item: SelectedEnergyItem = {
      id: `custom_${Date.now()}`,
      label: trimmed,
      category,
      category_label: cat?.label || category,
    };

    onAdd(item);
    setLabel('');
    setCategory('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-4 bg-muted/50 rounded-lg border border-dashed border-border">
      <Input
        placeholder="Nome do ritual customizado..."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1"
        disabled={disabled}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <Select value={category} onValueChange={setCategory} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {ENERGY_CATEGORIES.map(cat => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.icon} {cat.label.split(' ').slice(0, 3).join(' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleAdd} disabled={disabled || !label.trim() || !category} size="sm" className="shrink-0">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar
      </Button>
    </div>
  );
}
