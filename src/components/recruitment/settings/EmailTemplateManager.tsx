import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Pencil, Trash2, Star, Mail, Eye } from "lucide-react";
import { useRecruitmentEmailTemplates, type EmailTemplate, type EmailTemplateType, replaceTemplateVariables } from "@/hooks/useRecruitmentEmailTemplates";
import { EmailTemplateForm } from "./EmailTemplateForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  rejection: "Rejeição",
  interview_invite: "Convite para Entrevista",
  offer: "Proposta de Trabalho",
  workflow_advance: "Workflow: Aprovado - Próxima Etapa",
  workflow_complete: "Workflow: Processo Concluído",
  custom: "Personalizados",
};

const TYPE_ORDER: EmailTemplateType[] = ["rejection", "interview_invite", "offer", "workflow_advance", "workflow_complete", "custom"];

const PREVIEW_VARIABLES = {
  candidate_name: "João Silva",
  job_title: "Desenvolvedor Full Stack",
  company_name: "Sua Empresa",
  custom_message: "Mensagem personalizada aqui.",
};

export function EmailTemplateManager() {
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    initializeDefaultTemplates,
    isCreating,
    isUpdating,
    isDeleting,
  } = useRecruitmentEmailTemplates();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Initialize default templates if none exist
  useEffect(() => {
    if (!isLoading && templates.length === 0) {
      initializeDefaultTemplates();
    }
  }, [isLoading, templates.length, initializeDefaultTemplates]);

  const groupedTemplates = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = templates.filter((t) => t.type === type);
    return acc;
  }, {} as Record<EmailTemplateType, EmailTemplate[]>);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleDelete = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleSave = (data: {
    name: string;
    subject: string;
    body: string;
    type: EmailTemplateType;
    is_default: boolean;
  }) => {
    if (editingTemplate) {
      updateTemplate({
        templateId: editingTemplate.id,
        updates: data,
      });
    } else {
      createTemplate(data);
    }
    setFormOpen(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Templates de Email</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os templates de email para comunicação com candidatos.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {TYPE_ORDER.map((type) => {
        const typeTemplates = groupedTemplates[type];
        if (typeTemplates.length === 0 && type !== "custom") return null;

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {TYPE_LABELS[type]}
              </CardTitle>
              {type === "custom" && typeTemplates.length === 0 && (
                <CardDescription>
                  Nenhum template personalizado criado ainda.
                </CardDescription>
              )}
            </CardHeader>
            {typeTemplates.length > 0 && (
              <CardContent className="space-y-3">
                {typeTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {template.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="font-medium truncate">
                          {template.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        Assunto: {template.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(template)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      <EmailTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Template
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Assunto:
                </p>
                <p className="font-medium">
                  {replaceTemplateVariables(previewTemplate.subject, PREVIEW_VARIABLES)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Corpo:
                </p>
                <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap font-mono text-sm">
                  {replaceTemplateVariables(previewTemplate.body, PREVIEW_VARIABLES)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  Tipo: {TYPE_LABELS[previewTemplate.type]}
                </Badge>
                {previewTemplate.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    Template Padrão
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
