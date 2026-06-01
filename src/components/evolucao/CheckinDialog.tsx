import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useEvolutionCheckins } from "@/hooks/useEvolutionCheckins";

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
}

export function CheckinDialog({ open, onOpenChange, cycleId }: CheckinDialogProps) {
  const { createCheckin } = useEvolutionCheckins(cycleId);
  const [formData, setFormData] = useState({
    planned_vs_executed: "",
    perceived_evolution: "",
    real_evidence: "",
    blockers: "",
    next_steps: "",
    overall_progress: 50,
  });

  const handleSubmit = async () => {
    await createCheckin.mutateAsync({
      cycle_id: cycleId,
      ...formData,
    });
    onOpenChange(false);
    setFormData({
      planned_vs_executed: "",
      perceived_evolution: "",
      real_evidence: "",
      blockers: "",
      next_steps: "",
      overall_progress: 50,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Check-in</DialogTitle>
          <DialogDescription>
            Responda de forma objetiva para acompanhar a evolução
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progresso Geral */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Progresso Geral Percebido</Label>
              <span className="text-sm font-medium">{formData.overall_progress}%</span>
            </div>
            <Slider
              value={[formData.overall_progress]}
              onValueChange={([value]) => setFormData((p) => ({ ...p, overall_progress: value }))}
              max={100}
              step={5}
            />
          </div>

          {/* Planejado vs Executado */}
          <div className="space-y-2">
            <Label htmlFor="planned_vs_executed">O que foi planejado vs o que foi executado?</Label>
            <Textarea
              id="planned_vs_executed"
              placeholder="Descreva a diferença entre o planejado e o realizado..."
              value={formData.planned_vs_executed}
              onChange={(e) => setFormData((p) => ({ ...p, planned_vs_executed: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Evolução Percebida */}
          <div className="space-y-2">
            <Label htmlFor="perceived_evolution">Qual evolução você percebe?</Label>
            <Textarea
              id="perceived_evolution"
              placeholder="Descreva mudanças observadas no comportamento ou resultados..."
              value={formData.perceived_evolution}
              onChange={(e) => setFormData((p) => ({ ...p, perceived_evolution: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Evidências */}
          <div className="space-y-2">
            <Label htmlFor="real_evidence">Evidências concretas</Label>
            <Textarea
              id="real_evidence"
              placeholder="Liste fatos e exemplos que comprovam a evolução..."
              value={formData.real_evidence}
              onChange={(e) => setFormData((p) => ({ ...p, real_evidence: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Bloqueios */}
          <div className="space-y-2">
            <Label htmlFor="blockers">Bloqueios ou dificuldades</Label>
            <Textarea
              id="blockers"
              placeholder="O que está impedindo ou dificultando o progresso?"
              value={formData.blockers}
              onChange={(e) => setFormData((p) => ({ ...p, blockers: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Próximos Passos */}
          <div className="space-y-2">
            <Label htmlFor="next_steps">Próximos passos</Label>
            <Textarea
              id="next_steps"
              placeholder="O que será feito até o próximo check-in?"
              value={formData.next_steps}
              onChange={(e) => setFormData((p) => ({ ...p, next_steps: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createCheckin.isPending}>
            {createCheckin.isPending ? "Salvando..." : "Registrar Check-in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
