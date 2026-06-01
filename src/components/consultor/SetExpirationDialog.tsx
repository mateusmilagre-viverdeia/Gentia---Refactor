import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLicenseExpiration } from "@/hooks/useLicenseExpiration";
import { CalendarIcon, X } from "lucide-react";
import { addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface SetExpirationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  moduleSlug: string;
  moduleName: string;
  currentExpiration?: string | null;
  onSaved: () => void;
}

export function SetExpirationDialog({
  open,
  onOpenChange,
  accountId,
  moduleSlug,
  moduleName,
  currentExpiration,
  onSaved,
}: SetExpirationDialogProps) {
  const { setLicenseExpiration } = useLicenseExpiration();
  const [saving, setSaving] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(!!currentExpiration);
  const [date, setDate] = useState<Date | undefined>(
    currentExpiration ? new Date(currentExpiration) : undefined
  );

  const handleSave = async () => {
    setSaving(true);
    
    const expirationDate = hasExpiration ? date || null : null;
    const success = await setLicenseExpiration(accountId, moduleSlug, expirationDate);
    
    setSaving(false);

    if (success) {
      toast.success(expirationDate 
        ? `Expiração definida para ${formatBRT(expirationDate, "dd/MM/yyyy")}`
        : "Expiração removida"
      );
      onSaved();
      onOpenChange(false);
    } else {
      toast.error("Erro ao salvar expiração");
    }
  };

  const quickDates = [
    { label: "1 mês", date: addMonths(new Date(), 1) },
    { label: "3 meses", date: addMonths(new Date(), 3) },
    { label: "6 meses", date: addMonths(new Date(), 6) },
    { label: "1 ano", date: addYears(new Date(), 1) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Expiração</DialogTitle>
          <DialogDescription>
            Defina uma data de expiração para o módulo "{moduleName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="has-expiration" className="flex flex-col gap-1">
              <span>Ativar expiração</span>
              <span className="text-xs text-muted-foreground font-normal">
                O acesso será revogado automaticamente na data definida
              </span>
            </Label>
            <Switch
              id="has-expiration"
              checked={hasExpiration}
              onCheckedChange={setHasExpiration}
            />
          </div>

          {hasExpiration && (
            <>
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatBRT(date, "PPP") : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Atalhos</Label>
                <div className="flex flex-wrap gap-2">
                  {quickDates.map((q) => (
                    <Button
                      key={q.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setDate(q.date)}
                      className={cn(
                        "text-xs",
                        date && date.toDateString() === q.date.toDateString() && 
                        "border-primary bg-primary/5"
                      )}
                    >
                      {q.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (hasExpiration && !date)}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
