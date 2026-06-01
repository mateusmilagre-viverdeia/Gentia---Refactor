import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, Edit } from "lucide-react";
import {
  useRecruitmentEmailTemplates,
  replaceTemplateVariables,
  EmailTemplateType,
} from "@/hooks/useRecruitmentEmailTemplates";
import { useBulkActions } from "@/hooks/useBulkActions";
import { useOrganization } from "@/contexts/OrganizationContext";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationIds: string[];
  templateType?: EmailTemplateType;
  onSuccess?: () => void;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  applicationIds,
  templateType,
  onSuccess,
}: SendEmailDialogProps) {
  const { currentAccount } = useOrganization();
  const { templates, isLoading: isLoadingTemplates, initializeDefaultTemplates } = useRecruitmentEmailTemplates();
  const { sendBulkEmail, isSendingEmail } = useBulkActions();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Initialize default templates on mount
  useEffect(() => {
    if (open && templates.length === 0) {
      initializeDefaultTemplates();
    }
  }, [open, templates.length, initializeDefaultTemplates]);

  // Filter templates by type if specified
  const filteredTemplates = useMemo(() => {
    if (!templateType) return templates;
    return templates.filter((t) => t.type === templateType);
  }, [templates, templateType]);

  // Auto-select first template
  useEffect(() => {
    if (filteredTemplates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = filteredTemplates.find((t) => t.is_default);
      setSelectedTemplateId(defaultTemplate?.id || filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedTemplateId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const previewContent = useMemo(() => {
    if (!selectedTemplate) return { subject: "", body: "" };

    const variables = {
      candidate_name: "[Nome do Candidato]",
      job_title: "[Título da Vaga]",
      company_name: currentAccount?.name || "[Nome da Empresa]",
      custom_message: customMessage || "[Mensagem personalizada]",
    };

    return {
      subject: replaceTemplateVariables(selectedTemplate.subject, variables),
      body: replaceTemplateVariables(selectedTemplate.body, variables),
    };
  }, [selectedTemplate, customMessage, currentAccount?.name]);

  const handleSend = () => {
    if (!selectedTemplateId) return;

    sendBulkEmail(
      {
        candidateIds: applicationIds,
        templateId: selectedTemplateId,
        customMessage: customMessage || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCustomMessage("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Email</DialogTitle>
          <DialogDescription>
            Envie um email para {applicationIds.length} candidato
            {applicationIds.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Nenhum template disponível
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for edit/preview */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-3 w-3" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-message">Mensagem personalizada (opcional)</Label>
                <Textarea
                  id="custom-message"
                  placeholder="Adicione uma mensagem personalizada que será incluída no email..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{custom_message}}"} no template para incluir esta mensagem.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Assunto:</p>
                  <p className="text-sm font-medium">{previewContent.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Corpo:</p>
                  <ScrollArea className="h-[150px]">
                    <p className="text-sm whitespace-pre-wrap">{previewContent.body}</p>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSendingEmail}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedTemplateId || isSendingEmail}
          >
            {isSendingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
