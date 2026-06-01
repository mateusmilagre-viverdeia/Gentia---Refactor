import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Calendar, AlertTriangle, Edit3 } from "lucide-react";
import { parseISO, differenceInBusinessDays, isAfter } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import { JobSlaBadge } from "./JobSlaBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  jobId: string;
  dataAbertura: string | null;
  prazoEntregaDias: number | null;
  dataLimiteEntrega: string | null;
}

export function JobSlaCard({ jobId, dataAbertura, prazoEntregaDias, dataLimiteEntrega }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState(dataLimiteEntrega ? dataLimiteEntrega.slice(0, 10) : "");
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);

  if (!dataLimiteEntrega) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> SLA</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Prazo não definido</p>
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setOpen(true)}>
            <Edit3 className="h-3 w-3 mr-1" /> Definir prazo
          </Button>
          <PrazoDialog open={open} onOpenChange={setOpen} jobId={jobId} novoPrazo={novoPrazo} setNovoPrazo={setNovoPrazo}
            justificativa={justificativa} setJustificativa={setJustificativa} saving={saving} setSaving={setSaving} qc={qc} />
        </CardContent>
      </Card>
    );
  }

  const limite = parseISO(dataLimiteEntrega);
  const abertura = dataAbertura ? parseISO(dataAbertura) : null;
  const now = new Date();
  const overdueOrRemaining = isAfter(now, limite) ? -differenceInBusinessDays(now, limite) : differenceInBusinessDays(limite, now);

  // Progress: 0% no início, 100% no vencimento
  let progress = 0;
  if (abertura) {
    const total = differenceInBusinessDays(limite, abertura);
    const used = differenceInBusinessDays(now, abertura);
    progress = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  }

  const progressColor = overdueOrRemaining < 0 ? "bg-destructive" : overdueOrRemaining <= 3 ? "bg-yellow-500" : "bg-green-500";

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> Prazo de entrega (SLA)
        </CardTitle>
        <JobSlaBadge deadline={dataLimiteEntrega} />
      </CardHeader>
      <CardContent className="space-y-3">
        {abertura && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Abertura:</span>
            <span>{formatBRT(abertura, "dd/MM/yyyy")}</span>
          </div>
        )}
        {prazoEntregaDias && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Prazo:</span>
            <span>{prazoEntregaDias} dias úteis</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Limite:</span>
          <span className="font-medium">{formatBRT(limite, "dd/MM/yyyy")}</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {overdueOrRemaining < 0 ? <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {Math.abs(overdueOrRemaining)}d atrasado</span>
                : `${overdueOrRemaining}d restantes`}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <Edit3 className="h-3 w-3 mr-1" /> Ajustar prazo
        </Button>

        <PrazoDialog open={open} onOpenChange={setOpen} jobId={jobId} novoPrazo={novoPrazo} setNovoPrazo={setNovoPrazo}
          justificativa={justificativa} setJustificativa={setJustificativa} saving={saving} setSaving={setSaving} qc={qc} />
      </CardContent>
    </Card>
  );
}

function PrazoDialog({ open, onOpenChange, jobId, novoPrazo, setNovoPrazo, justificativa, setJustificativa, saving, setSaving, qc }: any) {
  const handleSave = async () => {
    if (!novoPrazo || !justificativa.trim()) {
      toast.error("Informe o novo prazo e a justificativa");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recruitment_jobs")
        .update({ data_limite_entrega: novoPrazo })
        .eq("id", jobId);
      if (error) throw error;
      toast.success("Prazo ajustado");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["sla-overview"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajustar prazo de entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Novo prazo</Label>
            <Input type="date" value={novoPrazo} onChange={(e) => setNovoPrazo(e.target.value)} />
          </div>
          <div>
            <Label>Justificativa <span className="text-destructive">*</span></Label>
            <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex: Cliente solicitou alargamento devido a aprovação interna" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
