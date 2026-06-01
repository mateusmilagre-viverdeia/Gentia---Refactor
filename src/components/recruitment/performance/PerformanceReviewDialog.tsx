import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface PerformanceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobId: string;
  applicationId?: string;
}

const PERIOD_LABELS: Record<string, string> = {
  "30_days": "30 dias",
  "90_days": "90 dias",
  "6_months": "6 meses",
  "12_months": "12 meses",
};

const RETENTION_LABELS: Record<string, string> = {
  active: "Ativo na empresa",
  voluntary_exit: "Saída voluntária",
  involuntary_exit: "Desligamento",
};

export function PerformanceReviewDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobId,
  applicationId,
}: PerformanceReviewDialogProps) {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<string>("");
  const [score, setScore] = useState<number>(7);
  const [retention, setRetention] = useState<string>("active");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentAccount?.id) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("hire_performance_reviews")
        .upsert({
          account_id: currentAccount.id,
          candidate_id: candidateId,
          job_id: jobId,
          application_id: applicationId || null,
          review_period: period as any,
          performance_score: score,
          retention_status: retention as any,
          reviewer_notes: notes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        }, {
          onConflict: "candidate_id,job_id,review_period",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação de performance registrada!");
      queryClient.invalidateQueries({ queryKey: ["performance-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["success-prediction"] });
      onOpenChange(false);
      setPeriod("");
      setScore(7);
      setRetention("active");
      setNotes("");
    },
    onError: (err) => {
      console.error("Error saving review:", err);
      toast.error("Erro ao salvar avaliação");
    },
  });

  const scoreColor = score >= 8 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : "text-red-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Avaliar Performance
          </DialogTitle>
          <DialogDescription>
            Registre a performance de <span className="font-medium text-foreground">{candidateName}</span> após a contratação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Período da avaliação</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Performance (1-10)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[score]}
                onValueChange={([v]) => setScore(v)}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
                {score}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              1 = muito abaixo do esperado · 5 = dentro do esperado · 10 = excepcional
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status de retenção</Label>
            <Select value={retention} onValueChange={setRetention}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RETENTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Destaques, pontos de melhoria, contexto..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!period || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
