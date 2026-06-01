import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useSalesDemo } from "./SalesDemoProvider";
import { NEXT_STEP_OPTIONS, PAIN_OPTIONS } from "./salesDemoConfig";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, "0");
  const s = Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SalesDemoCloseModal({ open, onOpenChange }: Props) {
  const demo = useSalesDemo();
  const { account } = useAccount();
  const [saving, setSaving] = useState(false);
  const elapsed = demo.startedAt ? Math.floor((Date.now() - demo.startedAt) / 1000) : 0;

  const save = async (alsoGenerateProposal: boolean) => {
    if (!account?.id) {
      toast.error("Conta não identificada");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const { error } = await supabase.from("sales_demo_logs").insert({
        account_id: account.id,
        conducted_by: userId,
        prospect_name: demo.prospectName || null,
        prospect_company: demo.prospectCompany || null,
        prospect_pain: demo.selectedPain ? [demo.selectedPain] : null,
        duration_seconds: elapsed,
        blocks_completed: [],
        blocks_skipped: [],
        notes: demo.notes || null,
        next_step: demo.nextStep || null,
        outcome: demo.nextStep || null,
      });
      if (error) throw error;
      toast.success("Demo registrada!");
      demo.reset();
      onOpenChange(false);
      if (alsoGenerateProposal) {
        window.location.href = "/atracao-contratacao/recrutamento/financeiro";
      }
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[10000] max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar demo</DialogTitle>
          <DialogDescription>
            Duração: {formatTime(elapsed)}. Registre o resultado para acompanhar conversão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Nome do prospect"
              value={demo.prospectName}
              onChange={(e) => demo.setProspectName(e.target.value)}
            />
            <Input
              placeholder="Empresa"
              value={demo.prospectCompany}
              onChange={(e) => demo.setProspectCompany(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Principal dor
            </label>
            <Select
              value={demo.selectedPain ?? ""}
              onValueChange={(v) => demo.setSelectedPain(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a dor identificada" />
              </SelectTrigger>
              <SelectContent>
                {PAIN_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Observações
            </label>
            <Textarea
              value={demo.notes}
              onChange={(e) => demo.setNotes(e.target.value)}
              rows={3}
              placeholder="Contexto, perguntas e sinais do prospect…"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Próximo passo
            </label>
            <Select value={demo.nextStep} onValueChange={demo.setNextStep}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {NEXT_STEP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 pt-2">
            <Button onClick={() => save(false)} disabled={saving} className="gap-2">
              <Check className="h-4 w-4" />
              {saving ? "Salvando…" : "Salvar e encerrar"}
            </Button>
            <Button variant="outline" onClick={() => save(true)} disabled={saving}>
              Salvar e gerar proposta agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
