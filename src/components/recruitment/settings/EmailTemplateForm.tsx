import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate, EmailTemplateType } from "@/hooks/useRecruitmentEmailTemplates";

interface EmailTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
  onSave: (data: {
    name: string;
    subject: string;
    body: string;
    type: EmailTemplateType;
    is_default: boolean;
  }) => void;
  isLoading?: boolean;
}

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  rejection: "Rejeição",
  interview_invite: "Convite para Entrevista",
  offer: "Proposta de Trabalho",
  workflow_advance: "Workflow: Aprovado - Próxima Etapa",
  workflow_complete: "Workflow: Processo Concluído",
  custom: "Personalizado",
};

const AVAILABLE_VARIABLES = [
  { variable: "{{candidate_name}}", description: "Nome do candidato" },
  { variable: "{{job_title}}", description: "Título da vaga" },
  { variable: "{{company_name}}", description: "Nome da empresa" },
  { variable: "{{custom_message}}", description: "Mensagem personalizada" },
];

export function EmailTemplateForm({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
}: EmailTemplateFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<EmailTemplateType>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setSubject(template.subject);
      setBody(template.body);
      setIsDefault(template.is_default);
    } else {
      setName("");
      setType("custom");
      setSubject("");
      setBody("");
      setIsDefault(false);
    }
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    onSave({
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      type,
      is_default: isDefault,
    });
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast({
      title: "Copiado!",
      description: `${variable} copiado para a área de transferência.`,
    });
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Criar Template de Email"}
          </DialogTitle>
          <DialogDescription>
            Configure o template de email para comunicação com candidatos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Follow-up após Entrevista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EmailTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Próximos passos - {{job_title}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Corpo do Email *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Digite o conteúdo do email..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Variáveis disponíveis (clique para inserir):
            </Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map(({ variable, description }) => (
                <Badge
                  key={variable}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 gap-1"
                  onClick={() => insertVariable(variable)}
                  title={description}
                >
                  {variable}
                  <Copy
                    className="h-3 w-3 ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyVariable(variable);
                    }}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clique na variável para inserir no corpo do email ou no ícone para copiar.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="is_default" className="text-sm font-normal">
              Definir como template padrão para este tipo
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
