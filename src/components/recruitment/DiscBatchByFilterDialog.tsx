import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

type DiscBatchAction = "invite" | "reminder";
type ReminderDay = 1 | 3 | 5;

export interface DiscBatchByFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  filters: {
    status: string;
    search: string;
  };
}

export function DiscBatchByFilterDialog({
  open,
  onOpenChange,
  accountId,
  filters,
}: DiscBatchByFilterDialogProps) {
  const [action, setAction] = useState<DiscBatchAction>("invite");
  const [reminderDay, setReminderDay] = useState<ReminderDay>(1);
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{ matched: number; targets: number } | null>(null);

  const normalizedFilters = useMemo(
    () => ({
      status: filters.status,
      search: filters.search?.trim() ?? "",
    }),
    [filters.search, filters.status]
  );

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setAction("invite");
      setReminderDay(1);
      setForce(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setIsLoading(true);
      const { data, error } = await invokeAuthenticatedFunction<{
        matched: number;
        targets: number;
      }>("send-disc-batch", {
        accountId,
        action,
        reminder_day: action === "reminder" ? reminderDay : null,
        force,
        dry_run: true,
        filters: {
          status: normalizedFilters.status,
          search: normalizedFilters.search,
        },
      });

      setIsLoading(false);
      if (error) {
        setPreview(null);
        return;
      }
      setPreview({ matched: data?.matched ?? 0, targets: data?.targets ?? 0 });
    };

    void run();
  }, [open, accountId, action, reminderDay, force, normalizedFilters.search, normalizedFilters.status]);

  const handleRun = async () => {
    setIsLoading(true);
    const { data, error } = await invokeAuthenticatedFunction<{
      batchId: string;
      matched: number;
      targets: number;
      ok: number;
      fail: number;
    }>("send-disc-batch", {
      accountId,
      action,
      reminder_day: action === "reminder" ? reminderDay : null,
      force,
      dry_run: false,
      filters: {
        status: normalizedFilters.status,
        search: normalizedFilters.search,
      },
    });
    setIsLoading(false);

    if (error) {
      if (error === "too_many_targets") {
        toast.error("Muitos candidatos no filtro. Refine os filtros e tente novamente.");
      }
      return;
    }

    toast.success(
      `Lote executado: ${data?.ok ?? 0} enviado(s), ${data?.fail ?? 0} falha(s).`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>DISC por filtro</DialogTitle>
          <DialogDescription>
            Envie convites/lembretes DISC para todos os candidatos que batem com os filtros atuais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ação</Label>
            <Select value={action} onValueChange={(v) => setAction(v as DiscBatchAction)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">Reenviar convite DISC</SelectItem>
                <SelectItem value="reminder">Reenviar lembrete DISC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "reminder" && (
            <div className="space-y-2">
              <Label>Dia do lembrete</Label>
              <Select value={String(reminderDay)} onValueChange={(v) => setReminderDay(Number(v) as ReminderDay)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">D+1</SelectItem>
                  <SelectItem value="3">D+3</SelectItem>
                  <SelectItem value="5">D+5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Forçar envio</div>
              <div className="text-sm text-muted-foreground">
                Ignora opt-out e janela de 24h.
              </div>
            </div>
            <Switch checked={force} onCheckedChange={setForce} />
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Aplicações no filtro</span>
              <span className="font-medium">{preview?.matched ?? (isLoading ? "…" : "-")}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Alvos válidos</span>
              <span className="font-medium">{preview?.targets ?? (isLoading ? "…" : "-")}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={() => void handleRun()} disabled={isLoading || (preview?.targets ?? 0) === 0}>
            Executar lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
