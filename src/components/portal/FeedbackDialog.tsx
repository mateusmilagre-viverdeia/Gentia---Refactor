import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface FeedbackDialogProps {
  open: boolean;
  candidateName: string;
  onClose: () => void;
  onSubmit: (motivo: string) => void;
}

export function FeedbackDialog({ open, candidateName, onClose, onSubmit }: FeedbackDialogProps) {
  const [motivo, setMotivo] = useState("");

  const handleSubmit = () => {
    onSubmit(motivo);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback sobre {candidateName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="motivo">Pode nos dizer por quê? (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Experiência insuficiente na área, pretensão salarial acima do orçamento..."
              rows={4}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit}>Confirmar recusa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
