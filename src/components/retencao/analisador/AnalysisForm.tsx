import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

interface AnalysisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, values: { label: string }[]) => void;
}

interface ValueOption {
  label: string;
  selected: boolean;
}

export function AnalysisForm({ open, onOpenChange, onSubmit }: AnalysisFormProps) {
  const { account } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [values, setValues] = useState<ValueOption[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Load company values from phase 3
  useEffect(() => {
    if (!open || !account?.id) return;

    const loadValues = async () => {
      setLoading(true);
      try {
        // Get values session for the account
        const { data: session } = await supabase
          .from('values_sessions')
          .select('id')
          .eq('account_id', account.id)
          .single();

        if (!session) {
          setValues([]);
          setLoading(false);
          return;
        }

        // Get phase 3 selections (final 3-5 values)
        const { data: selections } = await supabase
          .from('values_selections')
          .select('value_id')
          .eq('session_id', session.id)
          .eq('phase', 3);

        if (!selections || selections.length === 0) {
          setValues([]);
          setLoading(false);
          return;
        }

        // Get value labels from catalog
        const valueIds = selections.map(s => s.value_id).filter(Boolean);
        const { data: catalogValues } = await supabase
          .from('values_catalog')
          .select('id, label')
          .in('id', valueIds);

        if (catalogValues) {
          setValues(catalogValues.map(v => ({ label: v.label, selected: true })));
        }
      } catch (error) {
        console.error('Error loading values:', error);
      } finally {
        setLoading(false);
      }
    };

    loadValues();
  }, [open, account?.id]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    const selectedValues = values
      .filter(v => v.selected)
      .map(v => ({ label: v.label }));
    
    onSubmit(name.trim(), description.trim(), selectedValues);
    
    // Reset form
    setName("");
    setDescription("");
    setCustomValue("");
    onOpenChange(false);
  };

  const toggleValue = (index: number) => {
    setValues(prev => prev.map((v, i) => 
      i === index ? { ...v, selected: !v.selected } : v
    ));
  };

  const addCustomValue = () => {
    if (!customValue.trim()) return;
    setValues(prev => [...prev, { label: customValue.trim(), selected: true }]);
    setCustomValue("");
  };

  const removeValue = (index: number) => {
    setValues(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Análise de Pessoas</DialogTitle>
          <DialogDescription>
            Crie uma nova análise para avaliar o alinhamento cultural da equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Análise *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Avaliação Q4 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional da análise"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Valores para Avaliar</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando valores...</p>
            ) : values.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum valor encontrado. Adicione valores manualmente ou complete a seção de Valores na Criação de Cultura.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {values.map((value, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`value-${index}`}
                        checked={value.selected}
                        onCheckedChange={() => toggleValue(index)}
                      />
                      <label htmlFor={`value-${index}`} className="text-sm">
                        {value.label}
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeValue(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Adicionar valor personalizado"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomValue())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomValue}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || values.filter(v => v.selected).length === 0}
          >
            Criar Análise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
