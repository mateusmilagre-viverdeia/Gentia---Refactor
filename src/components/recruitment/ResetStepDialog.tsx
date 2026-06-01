import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useResetCandidateStep, type ResetStepType } from "@/hooks/useResetCandidateStep";

interface ResetStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobId: string;
  applicationId: string;
}

const STEP_OPTIONS: { value: ResetStepType; label: string; description: string }[] = [
  { value: "cultural", label: "Fit Cultural", description: "Remove a entrevista cultural e permite que o candidato refaça." },
  { value: "disc", label: "Fit Comportamental (DISC)", description: "Remove o assessment DISC (sessão, respostas e resultados)." },
  { value: "technical", label: "Fit Técnico", description: "Remove a entrevista técnica (sessão e respostas)." },
];

export function ResetStepDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobId,
  applicationId,
}: ResetStepDialogProps) {
  const [selectedStep, setSelectedStep] = useState<ResetStepType | "">("");
  const { mutate: resetStep, isPending } = useResetCandidateStep();

  const selectedOption = STEP_OPTIONS.find((o) => o.value === selectedStep);

  const handleConfirm = () => {
    if (!selectedStep) return;
    resetStep(
      { candidateId, jobId, applicationId, stepType: selectedStep },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedStep("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Liberar para Refazer Etapa
          </DialogTitle>
          <DialogDescription>
            Escolha a etapa que <strong>{candidateName}</strong> poderá refazer. Os dados da avaliação anterior serão excluídos permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Select value={selectedStep} onValueChange={(v) => setSelectedStep(v as ResetStepType)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a etapa..." />
            </SelectTrigger>
            <SelectContent>
              {STEP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedOption && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{selectedOption.description}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedStep || isPending}
          >
            {isPending ? "Resetando..." : "Confirmar Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
