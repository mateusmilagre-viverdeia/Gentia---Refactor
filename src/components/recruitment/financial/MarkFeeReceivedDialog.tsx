import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarkFeeReceivedDetailed } from "@/hooks/useFeesGlobal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeId: string;
}

export function MarkFeeReceivedDialog({ open, onOpenChange, feeId }: Props) {
  const mutation = useMarkFeeReceivedDetailed();
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState("pix");
  const [nf, setNf] = useState("");

  const handleSubmit = async () => {
    await mutation.mutateAsync({
      id: feeId,
      data_recebimento: data,
      forma_recebimento: forma,
      numero_nota_fiscal: nf || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar fee como recebido</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Data de recebimento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Forma de recebimento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nota fiscal (opcional)</Label>
            <Input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Ex: 12345" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
