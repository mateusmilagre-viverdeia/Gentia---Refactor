import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectedValue } from '@/types/values.types';
import { toast } from 'sonner';
import { ChevronLeft, Sparkles, Pencil, Check, X, Plus } from 'lucide-react';

interface BehaviorOption {
  value: string;
  dos: string[];
  donts: string[];
}

export function ValuesBehaviors() {
  const { session, updateStage, getSelections } = useValues();
  const [values, setValues] = useState<SelectedValue[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorOption[]>([]);
  const [selections, setSelections] = useState<{ [key: string]: { dos: string[], donts: string[] } }>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Edit state
  const [editingItem, setEditingItem] = useState<{ value: string; type: 'do' | 'dont'; index: number } | null>(null);
  const [editText, setEditText] = useState('');

  // Add state
  const [addingItem, setAddingItem] = useState<{ value: string; type: 'do' | 'dont' } | null>(null);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!session) return;

    try {
      const phase3Values = await getSelections(3);
      setValues(phase3Values);

      const { data: existingBehaviors } = await supabase
        .from('values_behaviors_options')
        .select('*')
        .eq('session_id', session.id);

      if (existingBehaviors && existingBehaviors.length > 0) {
        const phase3Labels = phase3Values.map(v => v.label).sort();
        const existingLabels = existingBehaviors.map((b: any) => b.value_label).sort();

        const valuesMatch = 
          phase3Labels.length === existingLabels.length &&
          phase3Labels.every((label, i) => label === existingLabels[i]);

        if (!valuesMatch) {
          console.log('Values changed, regenerating behaviors...');
          console.log('Phase 3 values:', phase3Labels);
          console.log('Existing behaviors:', existingLabels);

          await supabase
            .from('values_behaviors_options')
            .delete()
            .eq('session_id', session.id);

          await supabase
            .from('values_behaviors_selections')
            .delete()
            .eq('session_id', session.id);

          await generateBehaviors(phase3Values);
        } else {
          const behaviorsData = existingBehaviors.map((b: any) => ({
            value: b.value_label,
            dos: b.dos,
            donts: b.donts
          }));
          setBehaviors(behaviorsData);

          const { data: existingSelections } = await supabase
            .from('values_behaviors_selections')
            .select('*')
            .eq('session_id', session.id);

          if (existingSelections) {
            const selectionsMap: { [key: string]: { dos: string[], donts: string[] } } = {};
            existingSelections.forEach((s: any) => {
              selectionsMap[s.value_label] = {
                dos: s.do_selected,
                donts: s.dont_selected
              };
            });
            setSelections(selectionsMap);
          }
        }
      } else {
        await generateBehaviors(phase3Values);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const generateBehaviors = async (valuesToUse: SelectedValue[]) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-behaviors', {
        body: { values: valuesToUse.map(v => v.label) }
      });

      if (error) throw error;

      const behaviorsData = data.items;
      setBehaviors(behaviorsData);

      for (const behavior of behaviorsData) {
        await supabase
          .from('values_behaviors_options')
          .insert({
            session_id: session!.id,
            value_label: behavior.value,
            dos: behavior.dos,
            donts: behavior.donts
          });
      }

      toast.success('Comportamentos gerados com sucesso!');
    } catch (error: any) {
      console.error('Error generating behaviors:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error('Limite de requisições atingido. Aguarde um momento e tente novamente.');
      } else if (error.message?.includes('Payment')) {
        toast.error('Créditos insuficientes. Adicione créditos ao seu workspace.');
      } else {
        toast.error('Erro ao gerar comportamentos');
      }
    } finally {
      setGenerating(false);
    }
  };

  const persistBehaviorOptions = async (valueLabel: string, dos: string[], donts: string[]) => {
    if (!session) return;
    await supabase
      .from('values_behaviors_options')
      .update({ dos, donts })
      .eq('session_id', session.id)
      .eq('value_label', valueLabel);
  };

  const toggleDo = (valueLabel: string, doItem: string) => {
    const current = selections[valueLabel]?.dos || [];
    const newDos = current.includes(doItem)
      ? current.filter(d => d !== doItem)
      : [...current, doItem].slice(0, 3);

    setSelections({
      ...selections,
      [valueLabel]: {
        ...selections[valueLabel],
        dos: newDos,
        donts: selections[valueLabel]?.donts || []
      }
    });
  };

  const toggleDont = (valueLabel: string, dontItem: string) => {
    const current = selections[valueLabel]?.donts || [];
    const newDonts = current.includes(dontItem)
      ? current.filter(d => d !== dontItem)
      : [...current, dontItem].slice(0, 3);

    setSelections({
      ...selections,
      [valueLabel]: {
        ...selections[valueLabel],
        donts: newDonts,
        dos: selections[valueLabel]?.dos || []
      }
    });
  };

  // Edit handlers
  const startEdit = (value: string, type: 'do' | 'dont', index: number, currentText: string) => {
    setEditingItem({ value, type, index });
    setEditText(currentText);
  };

  const confirmEdit = async () => {
    if (!editingItem || !editText.trim()) return;
    const { value, type, index } = editingItem;
    const behavior = behaviors.find(b => b.value === value);
    if (!behavior) return;

    const list = type === 'do' ? [...behavior.dos] : [...behavior.donts];
    const oldText = list[index];
    list[index] = editText.trim();

    const updatedBehaviors = behaviors.map(b =>
      b.value === value
        ? { ...b, [type === 'do' ? 'dos' : 'donts']: list }
        : b
    );
    setBehaviors(updatedBehaviors);

    // Update selections if the edited item was selected
    const selKey = type === 'do' ? 'dos' : 'donts';
    const currentSel = selections[value]?.[selKey] || [];
    if (currentSel.includes(oldText)) {
      setSelections({
        ...selections,
        [value]: {
          ...selections[value],
          [selKey]: currentSel.map(s => s === oldText ? editText.trim() : s)
        }
      });
    }

    await persistBehaviorOptions(
      value,
      type === 'do' ? list : behavior.dos,
      type === 'dont' ? list : behavior.donts
    );

    setEditingItem(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditText('');
  };

  // Add handlers
  const startAdd = (value: string, type: 'do' | 'dont') => {
    setAddingItem({ value, type });
    setNewItemText('');
  };

  const confirmAdd = async () => {
    if (!addingItem || !newItemText.trim()) return;
    const { value, type } = addingItem;
    const behavior = behaviors.find(b => b.value === value);
    if (!behavior) return;

    const newDos = type === 'do' ? [...behavior.dos, newItemText.trim()] : behavior.dos;
    const newDonts = type === 'dont' ? [...behavior.donts, newItemText.trim()] : behavior.donts;

    const updatedBehaviors = behaviors.map(b =>
      b.value === value ? { ...b, dos: newDos, donts: newDonts } : b
    );
    setBehaviors(updatedBehaviors);

    await persistBehaviorOptions(value, newDos, newDonts);

    setAddingItem(null);
    setNewItemText('');
    toast.success('Comportamento adicionado!');
  };

  const cancelAdd = () => {
    setAddingItem(null);
    setNewItemText('');
  };

  const handleNext = async () => {
    const allSelected = behaviors.every(b => 
      selections[b.value]?.dos?.length === 3 && 
      selections[b.value]?.donts?.length === 3
    );

    if (!allSelected) {
      toast.error('Selecione 3 itens de "Como vivemos" e 3 de "Como não vivemos" para cada valor');
      return;
    }

    try {
      // Delete existing selections for this session first
      const { error: deleteError } = await supabase
        .from('values_behaviors_selections')
        .delete()
        .eq('session_id', session!.id);

      if (deleteError) throw deleteError;

      // Insert new selections
      const selectionsData = behaviors.map(b => ({
        session_id: session!.id,
        value_label: b.value,
        do_selected: selections[b.value].dos,
        dont_selected: selections[b.value].donts
      }));

      const { error } = await supabase
        .from('values_behaviors_selections')
        .insert(selectionsData);

      if (error) throw error;

      await updateStage(9);
      toast.success('Comportamentos salvos!');
    } catch (error) {
      console.error('Error saving behaviors:', error);
      toast.error('Erro ao salvar comportamentos. Tente novamente.');
    }
  };

  const handleBack = async () => {
    await updateStage(7);
  };

  if (loading || generating) {
    return (
      <div className="text-center py-8">
        <Sparkles className="w-8 h-8 mx-auto mb-4 animate-pulse" />
        <p>{generating ? 'Gerando comportamentos com IA...' : 'Carregando...'}</p>
      </div>
    );
  }

  const renderBehaviorItem = (
    item: string,
    index: number,
    behaviorValue: string,
    type: 'do' | 'dont',
    isSelected: boolean,
    isDisabled: boolean,
    onToggle: () => void
  ) => {
    const isEditing =
      editingItem?.value === behaviorValue &&
      editingItem?.type === type &&
      editingItem?.index === index;

    if (isEditing) {
      return (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={confirmEdit}>
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      );
    }

    return (
      <div key={index} className="flex items-start gap-2 group">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          disabled={isDisabled}
        />
        <span className="text-sm flex-1">{item}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => startEdit(behaviorValue, type, index, item)}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  const renderAddButton = (behaviorValue: string, type: 'do' | 'dont') => {
    const isAdding = addingItem?.value === behaviorValue && addingItem?.type === type;

    if (isAdding) {
      return (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAdd();
              if (e.key === 'Escape') cancelAdd();
            }}
            placeholder="Descreva o comportamento..."
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={confirmAdd}>
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelAdd}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => startAdd(behaviorValue, type)}
      >
        <Plus className="h-3 w-3 mr-1" />
        Adicionar comportamento
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamentos dos Valores</CardTitle>
        <CardDescription>
          Selecione 3 itens de "Como vivemos" e 3 de "Como não vivemos" para cada valor. Você pode editar ou adicionar novos comportamentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {behaviors.map((behavior) => {
          const selected = selections[behavior.value] || { dos: [], donts: [] };

          return (
            <div key={behavior.value} className="space-y-4">
              <h3 className="text-lg font-semibold">{behavior.value}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600 dark:text-green-400">
                    ✓ COMO VIVEMOS ({selected.dos.length}/3)
                  </h4>
                  {behavior.dos.map((doItem, idx) =>
                    renderBehaviorItem(
                      doItem, idx, behavior.value, 'do',
                      selected.dos.includes(doItem),
                      selected.dos.length >= 3 && !selected.dos.includes(doItem),
                      () => toggleDo(behavior.value, doItem)
                    )
                  )}
                  {renderAddButton(behavior.value, 'do')}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-600 dark:text-red-400">
                    ✗ COMO NÃO VIVEMOS ({selected.donts.length}/3)
                  </h4>
                  {behavior.donts.map((dontItem, idx) =>
                    renderBehaviorItem(
                      dontItem, idx, behavior.value, 'dont',
                      selected.donts.includes(dontItem),
                      selected.donts.length >= 3 && !selected.donts.includes(dontItem),
                      () => toggleDont(behavior.value, dontItem)
                    )
                  )}
                  {renderAddButton(behavior.value, 'dont')}
                </div>
              </div>
            </div>
          );
        })}
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
          onClick={handleNext}
          className="flex-1"
        >
          Próximo
        </Button>
      </CardFooter>
    </Card>
  );
}
