import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateFee, FeeRow } from "@/hooks/useFeesGlobal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: FeeRow | null;
}

export function EditFeeDialog({ open, onOpenChange, fee }: Props) {
  const mutation = useUpdateFee();
  const [valor, setValor] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (fee) {
      setValor(String(fee.valor_fee ?? ""));
      setPrevisao(fee.data_previsao ? fee.data_previsao.slice(0, 10) : "");
      setObs(fee.observacoes || "");
    }
  }, [fee]);

  const handleSubmit = async () => {
    if (!fee) return;
    await mutation.mutateAsync({
      id: fee.id,
      valor_fee: Number(valor) || 0,
      data_previsao: previsao || undefined,
      observacoes: obs || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar fee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label>Data prevista de recebimento</Label>
            <Input type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
