import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Target } from "lucide-react";
import { CreateGoalInput } from "@/hooks/useRecruitmentGoals";
import { startOfMonth, startOfQuarter, startOfYear, addMonths, addQuarters, addYears } from "date-fns";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateGoalInput) => Promise<unknown>;
  isSubmitting?: boolean;
}

export function CreateGoalDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreateGoalDialogProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [goalHires, setGoalHires] = useState<string>("");
  const [goalApplications, setGoalApplications] = useState<string>("");
  const [goalTimeToHire, setGoalTimeToHire] = useState<string>("");
  const [goalConversionRate, setGoalConversionRate] = useState<string>("");
  const [goalFillRate, setGoalFillRate] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState<string>("20");
  const [notes, setNotes] = useState<string>("");

  const getPeriodStart = () => {
    const now = new Date();
    switch (periodType) {
      case 'monthly':
        return startOfMonth(addMonths(now, periodOffset));
      case 'quarterly':
        return startOfQuarter(addQuarters(now, periodOffset));
      case 'yearly':
        return startOfYear(addYears(now, periodOffset));
    }
  };

  const getPeriodLabel = () => {
    const start = getPeriodStart();
    switch (periodType) {
      case 'monthly':
        return formatBRT(start, "MMMM yyyy");
      case 'quarterly':
        const quarter = Math.ceil((start.getMonth() + 1) / 3);
        return `${quarter}º Trimestre ${start.getFullYear()}`;
      case 'yearly':
        return `Ano ${start.getFullYear()}`;
    }
  };

  const handleSubmit = async () => {
    if (!goalHires && !goalApplications && !goalTimeToHire && !goalConversionRate && !goalFillRate) {
      toast.error("Defina pelo menos uma meta");
      return;
    }

    try {
      await onSubmit({
        period_type: periodType,
        period_start: formatBRT(getPeriodStart(), 'yyyy-MM-dd'),
        goal_hires: goalHires ? parseInt(goalHires) : null,
        goal_applications: goalApplications ? parseInt(goalApplications) : null,
        goal_time_to_hire: goalTimeToHire ? parseInt(goalTimeToHire) : null,
        goal_conversion_rate: goalConversionRate ? parseFloat(goalConversionRate) : null,
        goal_fill_rate: goalFillRate ? parseFloat(goalFillRate) : null,
        alert_deviation_threshold: parseInt(alertThreshold) || 20,
        notes: notes || undefined,
      });

      toast.success("Meta criada com sucesso!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Já existe uma meta para este período");
      } else {
        toast.error("Erro ao criar meta");
      }
    }
  };

  const resetForm = () => {
    setPeriodType('monthly');
    setPeriodOffset(0);
    setGoalHires("");
    setGoalApplications("");
    setGoalTimeToHire("");
    setGoalConversionRate("");
    setGoalFillRate("");
    setAlertThreshold("20");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Nova Meta de Recrutamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Period Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Período</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as typeof periodType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodOffset.toString()} onValueChange={(v) => setPeriodOffset(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Atual</SelectItem>
                    <SelectItem value="1">Próximo</SelectItem>
                    <SelectItem value="2">+2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Período selecionado: <span className="font-medium text-foreground">{getPeriodLabel()}</span>
            </p>
          </div>

          {/* Goals */}
          <div className="space-y-4">
            <Label className="text-base">Metas</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Contratações</Label>
                <Input
                  type="number"
                  placeholder="Ex: 10"
                  value={goalHires}
                  onChange={(e) => setGoalHires(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Candidaturas</Label>
                <Input
                  type="number"
                  placeholder="Ex: 200"
                  value={goalApplications}
                  onChange={(e) => setGoalApplications(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tempo Médio (dias)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 20"
                  value={goalTimeToHire}
                  onChange={(e) => setGoalTimeToHire(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Taxa de Conversão (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5"
                  value={goalConversionRate}
                  onChange={(e) => setGoalConversionRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Taxa de Preenchimento (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 80"
                  value={goalFillRate}
                  onChange={(e) => setGoalFillRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Alerta de Desvio (%)</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Observações (opcional)</Label>
            <Textarea
              placeholder="Contexto ou justificativa para as metas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
