import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const applyMonthYearMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

interface WorkHistory {
  position: string;
  company: string;
  responsibilities: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface AddWorkHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (work: WorkHistory) => void;
}

export function AddWorkHistoryDialog({ open, onOpenChange, onAdd }: AddWorkHistoryDialogProps) {
  const [work, setWork] = useState<WorkHistory>({
    position: "",
    company: "",
    responsibilities: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

  const handleSubmit = () => {
    if (!work.position || !work.company || !work.start_date) return;
    onAdd(work);
    setWork({
      position: "",
      company: "",
      responsibilities: "",
      start_date: "",
      end_date: "",
      is_current: false,
    });
    onOpenChange(false);
  };

  const isValid = work.position && work.company && work.start_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Experiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Cargo *</Label>
              <Input
                value={work.position}
                onChange={(e) => setWork({ ...work, position: e.target.value })}
                placeholder="Ex: Analista de TI"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Empresa *</Label>
              <Input
                value={work.company}
                onChange={(e) => setWork({ ...work, company: e.target.value })}
                placeholder="Ex: Empresa XYZ"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm">Responsabilidades</Label>
            <Textarea
              value={work.responsibilities}
              onChange={(e) => setWork({ ...work, responsibilities: e.target.value })}
              placeholder="Descreva suas principais responsabilidades..."
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Início *</Label>
              <Input
                value={work.start_date}
                onChange={(e) => setWork({ ...work, start_date: applyMonthYearMask(e.target.value) })}
                placeholder="MM/AAAA"
                maxLength={7}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Término</Label>
              <Input
                value={work.end_date}
                onChange={(e) => setWork({ ...work, end_date: applyMonthYearMask(e.target.value) })}
                placeholder="MM/AAAA"
                maxLength={7}
                disabled={work.is_current}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={work.is_current}
              onCheckedChange={(checked) => setWork({ 
                ...work, 
                is_current: checked,
                end_date: checked ? "" : work.end_date 
              })}
            />
            <Label className="text-sm font-normal">Trabalho atual</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
