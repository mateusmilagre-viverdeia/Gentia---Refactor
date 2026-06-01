import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobFamily, CreateJobFamilyInput, CareerTrack } from "@/types/compensation.types";

interface JobFamilyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  family?: JobFamily;
  onSubmit: (data: CreateJobFamilyInput) => void;
  isLoading?: boolean;
}

const TRACK_OPTIONS: { value: CareerTrack; label: string; description: string }[] = [
  { value: "technical", label: "Técnico", description: "Trilha de contribuição individual técnica" },
  { value: "leadership", label: "Liderança", description: "Trilha de gestão de pessoas e times" },
  { value: "specialist", label: "Especialista", description: "Trilha de expertise profunda" },
];

export const JobFamilyForm = ({
  open,
  onOpenChange,
  modelId,
  family,
  onSubmit,
  isLoading,
}: JobFamilyFormProps) => {
  const [name, setName] = useState(family?.name || "");
  const [description, setDescription] = useState(family?.description || "");
  const [careerTrack, setCareerTrack] = useState<CareerTrack>(family?.career_track || "technical");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      model_id: modelId,
      name,
      description: description || undefined,
      career_track: careerTrack,
    });
  };

  const isEditing = !!family;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Família" : "Nova Família de Cargos"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Família *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Engenharia, Comercial, Operações"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o escopo desta família de cargos..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="track">Trilha de Carreira</Label>
            <Select value={careerTrack} onValueChange={(v) => setCareerTrack(v as CareerTrack)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACK_OPTIONS.map((option) => (
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
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Criar Família"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
