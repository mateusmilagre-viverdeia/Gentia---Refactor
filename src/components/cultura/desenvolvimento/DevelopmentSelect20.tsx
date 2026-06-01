import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DevelopmentBadge } from './DevelopmentBadge';
import { DevelopmentProgress } from './DevelopmentProgress';
import { useDevelopment } from '@/contexts/DevelopmentContext';
import { supabase } from '@/integrations/supabase/client';
import { DevelopmentCatalogItem, SelectedDevelopmentItem, DEVELOPMENT_CATEGORIES } from '@/types/development.types';
import { toast } from 'sonner';
import { ChevronDown, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DevelopmentSelect20() {
  const { updateStage, saveSelections, getSelections } = useDevelopment();
  const [catalog, setCatalog] = useState<DevelopmentCatalogItem[]>([]);
  const [selected, setSelected] = useState<SelectedDevelopmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(DEVELOPMENT_CATEGORIES.map(c => c.id));
  
  // Estado para ritual customizado
  const [customRitual, setCustomRitual] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(DEVELOPMENT_CATEGORIES[0]?.id || 'crescimento');

  useEffect(() => {
    loadCatalog();
    loadExistingSelections();
  }, []);

  const loadCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('development_catalog')
        .select('*')
        .eq('active', true)
        .order('label');

      if (error) throw error;
      setCatalog(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSelections = async () => {
    try {
      const selections = await getSelections(1);
      if (selections.length > 0) {
        setSelected(selections);
      }
    } catch (error) {
      console.error('Error loading existing selections:', error);
    }
  };

  const toggleValue = (item: DevelopmentCatalogItem | SelectedDevelopmentItem) => {
    const isSelected = selected.some(v => v.id === item.id);
    
    if (isSelected) {
      setSelected(selected.filter(v => v.id !== item.id));
    } else {
      if (selected.length >= 20) {
        toast.error('Limite de 20 rituais atingido');
        return;
      }
      setSelected([...selected, {
        id: item.id,
        label: item.label,
        category: item.category,
        category_label: item.category_label,
      }]);
    }
  };

  const handleAddCustomRitual = () => {
    if (!customRitual.trim()) return;
    if (selected.length >= 20) {
      toast.error('Limite de 20 rituais atingido');
      return;
    }
    
    const category = DEVELOPMENT_CATEGORIES.find(c => c.id === selectedCategory);
    
    const newItem: SelectedDevelopmentItem = {
      id: `custom_${Date.now()}`,
      label: customRitual.trim(),
      category: selectedCategory,
      category_label: category?.label || '',
    };
    
    setSelected([...selected, newItem]);
    setCustomRitual('');
    toast.success('Ritual personalizado adicionado!');
  };

  const handleNext = async () => {
    if (selected.length < 5) {
      toast.error('Selecione pelo menos 5 rituais');
      return;
    }

    setSaving(true);
    try {
      const result = await saveSelections(1, selected);
      if (!result.success) {
        toast.error(result.error || 'Erro ao salvar seleções');
        return;
      }
      await updateStage(2);
      toast.success('Rituais selecionados!');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setSelected([]);
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCountByCategory = (categoryId: string) => {
    return selected.filter(s => s.category === categoryId).length;
  };

  const filteredCatalog = catalog.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Incluir rituais customizados na visualização por categoria
  const customItems = selected.filter(s => s.id.startsWith('custom_'));

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <DevelopmentProgress currentStage={1} onStageClick={(s) => updateStage(s)} />
        <CardTitle className="text-2xl">Selecione até 20 Rituais de Desenvolvimento</CardTitle>
        <CardDescription>
          Escolha os rituais que mais fazem sentido para sua organização (mínimo 5).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rituais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Campo para criar ritual personalizado */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Criar Ritual Personalizado</span>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {DEVELOPMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Nome do novo ritual..."
              value={customRitual}
              onChange={(e) => setCustomRitual(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomRitual();
                }
              }}
            />
            
            <Button 
              variant="outline" 
              onClick={handleAddCustomRitual}
              disabled={!customRitual.trim() || selected.length >= 20}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Selecionados:
          </p>
          <p className={cn(
            "text-lg font-bold",
            selected.length >= 5 ? "text-primary" : "text-muted-foreground"
          )}>
            {selected.length} (mín. 5, máx. 20)
          </p>
        </div>

        <div className="space-y-4">
          {DEVELOPMENT_CATEGORIES.map((category) => {
            const categoryItems = filteredCatalog.filter(item => item.category === category.id);
            const customCategoryItems = customItems.filter(item => item.category === category.id);
            const categoryCount = getCountByCategory(category.id);
            const isOpen = openCategories.includes(category.id);

            if (categoryItems.length === 0 && customCategoryItems.length === 0) return null;

            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium">{category.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-sm font-medium px-2 py-0.5 rounded",
                      categoryCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {categoryCount}
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Rituais customizados primeiro */}
                    {customCategoryItems.map((item) => (
                      <DevelopmentBadge
                        key={item.id}
                        label={`✨ ${item.label}`}
                        category={item.category}
                        selected={true}
                        onClick={() => toggleValue(item)}
                      />
                    ))}
                    {/* Rituais do catálogo */}
                    {categoryItems.map((item) => (
                      <DevelopmentBadge
                        key={item.id}
                        label={item.label}
                        category={item.category}
                        selected={selected.some(v => v.id === item.id)}
                        onClick={() => toggleValue(item)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleClear}
        >
          Limpar Seleção
        </Button>
        <Button
          onClick={handleNext}
          disabled={selected.length < 5 || saving}
          className="flex-1"
        >
          {saving ? 'Salvando...' : 'Avançar'}
        </Button>
      </CardFooter>
    </Card>
  );
}
