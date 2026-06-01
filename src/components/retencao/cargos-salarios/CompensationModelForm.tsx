import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompensationModel, CreateCompensationModelInput, StrategyType } from "@/types/compensation.types";

interface CompensationModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: CompensationModel;
  onSubmit: (data: CreateCompensationModelInput) => void;
  isLoading?: boolean;
}

const STRATEGY_OPTIONS: { value: StrategyType; label: string; description: string }[] = [
  { value: "growth", label: "Crescimento", description: "Foco em atrair e reter talentos para expansão" },
  { value: "efficiency", label: "Eficiência", description: "Otimização de custos mantendo competitividade" },
  { value: "turnaround", label: "Turnaround", description: "Reestruturação e ajuste de estrutura" },
];

export const CompensationModelForm = ({
  open,
  onOpenChange,
  model,
  onSubmit,
  isLoading,
}: CompensationModelFormProps) => {
  const [name, setName] = useState(model?.name || "");
  const [description, setDescription] = useState(model?.description || "");
  const [strategyType, setStrategyType] = useState<StrategyType>(model?.strategy_type || "growth");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      strategy_type: strategyType,
    });
  };

  const isEditing = !!model;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Modelo" : "Novo Modelo de Cargos e Salários"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Modelo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plano de Cargos 2025"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste modelo..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy">Estratégia</Label>
            <Select value={strategyType} onValueChange={(v) => setStrategyType(v as StrategyType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
