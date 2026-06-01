import { useState, useEffect } from "react";
import { formatBRT } from "@/lib/datetime";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bell, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BulkReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (reminder: ReminderData) => Promise<void>;
  isLoading?: boolean;
}

export interface ReminderData {
  dueDate: Date;
  message: string;
  priority: "low" | "medium" | "high";
}

const QUICK_OPTIONS = [
  { label: "Amanhã", days: 1 },
  { label: "Em 3 dias", days: 3 },
  { label: "Em 1 semana", days: 7 },
  { label: "Em 2 semanas", days: 14 },
];

const MESSAGE_TEMPLATES = [
  "Follow-up pendente - verificar status",
  "Agendar entrevista com candidato",
  "Aguardando retorno de documentação",
  "Verificar disponibilidade para próxima etapa",
  "Revisar avaliação e tomar decisão",
];

export function BulkReminderDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading = false,
}: BulkReminderDialogProps) {
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDueDate(addDays(new Date(), 1));
      setMessage("");
      setPriority("medium");
    }
  }, [open]);

  const handleQuickDate = (days: number) => {
    setDueDate(addDays(new Date(), days));
  };

  const handleTemplateSelect = (template: string) => {
    setMessage(template);
  };

  const handleConfirm = async () => {
    if (!dueDate || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        dueDate,
        message: message.trim(),
        priority,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Agendar Lembrete
          </DialogTitle>
          <DialogDescription>
            Crie um lembrete para {selectedCount} candidato(s) selecionado(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Due Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data do Lembrete</Label>

            {/* Quick options */}
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) => (
                <Button
                  key={option.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDate(option.days)}
                  className={cn(
                    dueDate &&
                      formatBRT(dueDate, "yyyy-MM-dd") ===
                        formatBRT(addDays(new Date(), option.days), "yyyy-MM-dd") &&
                      "border-primary bg-primary/5"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Calendar picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? (
                    formatBRT(dueDate, "PPP")
                  ) : (
                    "Selecionar data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Baixa
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Média
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Alta
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mensagem</Label>
            
            {/* Quick templates */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MESSAGE_TEMPLATES.map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => handleTemplateSelect(template)}
                >
                  {template.length > 30 ? template.slice(0, 30) + "..." : template}
                </Button>
              ))}
            </div>

            <Textarea
              placeholder="Descreva o lembrete..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!dueDate || !message.trim() || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Agendar Lembrete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
