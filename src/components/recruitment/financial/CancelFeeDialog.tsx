import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpdateFee } from "@/hooks/useFeesGlobal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeId: string | null;
}

export function CancelFeeDialog({ open, onOpenChange, feeId }: Props) {
  const mutation = useUpdateFee();
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!feeId) return;
    await mutation.mutateAsync({
      id: feeId,
      status: "cancelado",
      observacoes: reason || undefined,
    });
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este fee?</AlertDialogTitle>
          <AlertDialogDescription>
            O fee deixará de aparecer no pipeline e não poderá ser marcado como recebido até ser reativado manualmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs">Motivo (opcional)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: vaga cancelada pelo cliente" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={mutation.isPending}>Cancelar fee</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
