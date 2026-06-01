import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import type {
  MessageChannel,
  MessageType,
  RecruitmentMessageTemplate,
} from "@/hooks/useRecruitmentMessageTemplates";

interface MessageTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecruitmentMessageTemplate | null;
  onSave: (data: {
    name: string;
    channel: MessageChannel;
    message_type: MessageType;
    reminder_day: number | null;
    subject: string | null;
    body: string;
    is_default: boolean;
    is_active: boolean;
  }) => void;
  isLoading?: boolean;
}

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  disc_invite: "DISC: Convite",
  disc_reminder: "DISC: Lembrete",
  workflow_advance: "Workflow: Aprovado",
  workflow_complete: "Workflow: Concluído",
  talent_pool_entry: "Banco de Talentos",
};

export function MessageTemplateForm({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
}: MessageTemplateFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [messageType, setMessageType] = useState<MessageType>("disc_invite");
  const [reminderDay, setReminderDay] = useState<number | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setChannel(template.channel);
      setMessageType(template.message_type);
      setReminderDay(template.reminder_day);
      setSubject(template.subject || "");
      setBody(template.body);
      setIsDefault(template.is_default);
      setIsActive(template.is_active);
    } else {
      setName("");
      setChannel("email");
      setMessageType("disc_invite");
      setReminderDay(null);
      setSubject("");
      setBody("");
      setIsDefault(false);
      setIsActive(true);
    }
  }, [open, template]);

  const requiresSubject = channel === "email";
  const showReminderDay = messageType === "disc_reminder";

  const reminderDayOptions = useMemo(() => [1, 3, 5], []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe um nome para o template.", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Corpo obrigatório", description: "Informe o conteúdo da mensagem.", variant: "destructive" });
      return;
    }
    if (requiresSubject && !subject.trim()) {
      toast({ title: "Assunto obrigatório", description: "Informe o assunto do email.", variant: "destructive" });
      return;
    }
    if (showReminderDay && ![1, 3, 5].includes(Number(reminderDay))) {
      toast({ title: "D+ inválido", description: "Selecione D+1, D+3 ou D+5.", variant: "destructive" });
      return;
    }

    onSave({
      name: name.trim(),
      channel,
      message_type: messageType,
      reminder_day: showReminderDay ? Number(reminderDay) : null,
      subject: requiresSubject ? subject.trim() : null,
      body,
      is_default: isDefault,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Convite DISC (Email)" />
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={messageType} onValueChange={(v) => setMessageType(v as MessageType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MESSAGE_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>D+ (somente lembretes)</Label>
              <Select
                value={reminderDay === null ? "" : String(reminderDay)}
                onValueChange={(v) => setReminderDay(v ? Number(v) : null)}
                disabled={!showReminderDay}
              >
                <SelectTrigger>
                  <SelectValue placeholder={showReminderDay ? "Selecione" : "N/A"} />
                </SelectTrigger>
                <SelectContent>
                  {reminderDayOptions.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      D+{d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiresSubject ? (
            <div className="space-y-2">
              <Label>Assunto (Email)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex.: Avaliação DISC - {{company_name}} - {{job_title}}"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Corpo</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[240px] font-mono"
              placeholder={
                channel === "whatsapp"
                  ? "Use {{candidate_name}}, {{job_title}}, {{company_name}}, {{assessment_url}}"
                  : "HTML ou texto. Use {{candidate_name}}, {{job_title}}, {{company_name}}, {{assessment_url}}"
              }
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: <code>{"{{candidate_name}}"}</code>, <code>{"{{job_title}}"}</code>,{" "}
              <code>{"{{company_name}}"}</code>, <code>{"{{assessment_url}}"}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
              Padrão
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
              Ativo
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!!isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
