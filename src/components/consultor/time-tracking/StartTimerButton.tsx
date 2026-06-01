import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";
import { useTimerStore } from "@/stores/useTimerStore";
import { useConsultantAssignments } from "@/hooks/useConsultantAssignments";
import { 
  TIME_CATEGORY_LABELS, 
  TIME_CATEGORIES,
  type TimeEntryCategory 
} from "@/types/time-tracking.types";

interface StartTimerButtonProps {
  defaultAccountId?: string;
  defaultAccountName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function StartTimerButton({ 
  defaultAccountId,
  defaultAccountName,
  variant = "default",
  size = "default",
}: StartTimerButtonProps) {
  const { isActive, startTimer } = useTimerStore();
  const { assignments } = useConsultantAssignments();
  
  const [open, setOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(defaultAccountId || "");
  const [category, setCategory] = useState<TimeEntryCategory>("other");
  const [description, setDescription] = useState("");

  const projects = assignments?.map((a) => ({
    id: a.account_id,
    name: a.account?.name || "Projeto",
  })) || [];

  const handleStart = () => {
    const account = projects.find(p => p.id === selectedAccount);
    if (!account) return;

    startTimer(account.id, account.name, category, description);
    setOpen(false);
    setDescription("");
  };

  if (isActive) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Play className="h-4 w-4 mr-2" />
          Iniciar Timer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar Timer</DialogTitle>
          <DialogDescription>
            Selecione o projeto e categoria para iniciar o cronômetro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TimeEntryCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {TIME_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="O que você vai fazer?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleStart} disabled={!selectedAccount}>
            <Play className="h-4 w-4 mr-2" />
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
