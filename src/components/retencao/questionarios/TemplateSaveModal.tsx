import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface TemplateSaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
  defaultName?: string;
  isSaving?: boolean;
}

export function TemplateSaveModal({
  open,
  onOpenChange,
  onSave,
  defaultName = "",
  isSaving,
}: TemplateSaveModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim(), description.trim());
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar como Modelo
          </DialogTitle>
          <DialogDescription>
            Este modelo ficará disponível em "Meus Modelos" para uso futuro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Modelo *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pesquisa Mensal de Satisfação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando e como usar este modelo"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Salvando..." : "Salvar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
