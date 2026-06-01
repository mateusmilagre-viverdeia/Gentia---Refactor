import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, DollarSign, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface HireFinancialData {
  hiredAt: string;
  salary: number;
  feeValue: number;
  feeDueDate: string | null;
  feeNotes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  accountId: string;
  applicationId?: string;
  onConfirmed?: (data: HireFinancialData) => Promise<void> | void;
}

interface ClientFeeInfo {
  cliente_id: string | null;
  modelo_fee: string | null;
  fee_percentual: number | null;
  fee_fixo: number | null;
  prazo_garantia_dias: number | null;
}

export function ConfirmHireDialog({
  open, onOpenChange, candidateName, jobId, jobTitle, onConfirmed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientFeeInfo | null>(null);
  const [dataContratacao, setDataContratacao] = useState(new Date().toISOString().slice(0, 10));
  const [salario, setSalario] = useState<string>("");
  const [valorFee, setValorFee] = useState<string>("0");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Load client fee config from job
  useEffect(() => {
    if (!open || !jobId) return;
    (async () => {
      const { data: job } = await supabase
        .from("recruitment_jobs")
        .select("cliente_id, fee_acordado, clientes_consultoria:cliente_id(modelo_fee, fee_percentual, fee_fixo, prazo_garantia_dias)")
        .eq("id", jobId)
        .single();
      const cli = (job as any)?.clientes_consultoria;
      setClientInfo({
        cliente_id: (job as any)?.cliente_id || null,
        modelo_fee: cli?.modelo_fee || "fixo",
        fee_percentual: cli?.fee_percentual || null,
        fee_fixo: cli?.fee_fixo || (job as any)?.fee_acordado || null,
        prazo_garantia_dias: cli?.prazo_garantia_dias || 90,
      });
      // default previsao = +30 days
      const prev = new Date();
      prev.setDate(prev.getDate() + 30);
      setDataPrevisao(prev.toISOString().slice(0, 10));
    })();
  }, [open, jobId]);

  // Recalculate fee when salary or model changes
  useEffect(() => {
    if (!clientInfo) return;
    const sal = parseFloat(salario);
    if (clientInfo.modelo_fee === "percentual" && clientInfo.fee_percentual && !isNaN(sal)) {
      setValorFee((sal * 12 * (clientInfo.fee_percentual / 100)).toFixed(2));
    } else if (clientInfo.modelo_fee === "fixo" && clientInfo.fee_fixo) {
      setValorFee(clientInfo.fee_fixo.toFixed(2));
    } else if (clientInfo.modelo_fee === "hibrido" && clientInfo.fee_fixo) {
      setValorFee(clientInfo.fee_fixo.toFixed(2));
    }
  }, [salario, clientInfo]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const sal = parseFloat(salario) || 0;
      const fee = parseFloat(valorFee) || 0;

      await onConfirmed?.({
        hiredAt: dataContratacao,
        salary: sal,
        feeValue: fee,
        feeDueDate: dataPrevisao || null,
        feeNotes: observacoes || null,
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Error confirming hire financial data:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Confirmar contratação e registrar fee
          </DialogTitle>
          <DialogDescription>
            <strong>{candidateName}</strong> para <strong>{jobTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data-contratacao">Data de contratação</Label>
              <Input id="data-contratacao" type="date" value={dataContratacao} onChange={(e) => setDataContratacao(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="salario">Salário combinado (R$)</Label>
              <Input id="salario" type="number" step="0.01" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Ex: 8000" />
            </div>
          </div>

          {clientInfo && (
            <Alert className="bg-primary/5 border-primary/20">
              <DollarSign className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Modelo: <strong>{clientInfo.modelo_fee || "—"}</strong>
                {clientInfo.modelo_fee === "percentual" && clientInfo.fee_percentual && ` (${clientInfo.fee_percentual}% × salário anual)`}
                {clientInfo.modelo_fee === "fixo" && clientInfo.fee_fixo && ` (R$ ${clientInfo.fee_fixo.toLocaleString("pt-BR")} fixo)`}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="valor-fee">Fee calculado (R$)</Label>
              <Input id="valor-fee" type="number" step="0.01" value={valorFee} onChange={(e) => setValorFee(e.target.value)} className="font-semibold" />
            </div>
            <div>
              <Label htmlFor="data-previsao">Previsão de recebimento</Label>
              <Input id="data-previsao" type="date" value={dataPrevisao} onChange={(e) => setDataPrevisao(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>

          {clientInfo && clientInfo.prazo_garantia_dias && clientInfo.prazo_garantia_dias > 0 && (
            <Alert className="bg-blue-500/5 border-blue-500/20">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs">
                Garantia de <strong>{clientInfo.prazo_garantia_dias} dias</strong> será ativada automaticamente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || !salario}>
            {loading ? "Salvando..." : "Confirmar contratação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
