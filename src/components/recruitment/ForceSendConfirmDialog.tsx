import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ForceSendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
}

export function ForceSendConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: ForceSendConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Forçar envio?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              "Isso ignora o opt-out global e a janela anti-spam de 24h. Use apenas com autorização explícita e necessidade operacional."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            Forçar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
