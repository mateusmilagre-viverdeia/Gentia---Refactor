import { useEffect, useMemo, useState } from "react";

import { Eye, Plus, Pencil, Trash2, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  replaceMessageTemplateVariables,
  useRecruitmentMessageTemplates,
  type RecruitmentMessageTemplate,
  type MessageType,
  type MessageChannel,
} from "@/hooks/useRecruitmentMessageTemplates";
import { MessageTemplateForm } from "./MessageTemplateForm";

const PREVIEW_VARIABLES = {
  candidate_name: "João Silva",
  job_title: "Desenvolvedor Full Stack",
  company_name: "Sua Empresa",
  assessment_url: "https://example.com/assessment/disc/abc123",
};

function labelForChannel(c: MessageChannel) {
  return c === "email" ? "Email" : "WhatsApp";
}

function labelForMessageType(t: MessageType, reminderDay: number | null) {
  if (t === "disc_invite") return "DISC: Convite";
  if (t === "disc_reminder") return `DISC: Lembrete${reminderDay ? ` D+${reminderDay}` : ""}`;
  if (t === "workflow_advance") return "Workflow: Aprovado";
  if (t === "workflow_complete") return "Workflow: Concluído";
  if (t === "talent_pool_entry") return "Banco de Talentos";
  return t;
}

export function MessageTemplateManager() {
  const {
    templates,
    isLoading,
    initializeDefaults,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useRecruitmentMessageTemplates();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecruitmentMessageTemplate | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<RecruitmentMessageTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<RecruitmentMessageTemplate | null>(null);

  useEffect(() => {
    if (!isLoading && templates.length === 0) {
      initializeDefaults();
    }
  }, [isLoading, templates.length, initializeDefaults]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecruitmentMessageTemplate[]>();
    for (const t of templates) {
      const key = `${t.message_type}::${t.reminder_day ?? "_"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key,
        label: labelForMessageType(list[0].message_type, list[0].reminder_day),
        items: list.sort((a, b) => a.channel.localeCompare(b.channel)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [templates]);

  const handleSave = (data: {
    name: string;
    channel: MessageChannel;
    message_type: MessageType;
    reminder_day: number | null;
    subject: string | null;
    body: string;
    is_default: boolean;
    is_active: boolean;
  }) => {
    if (editing) {
      updateTemplate({ templateId: editing.id, updates: data });
    } else {
      createTemplate(data as any);
    }
    setFormOpen(false);
    setEditing(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-36" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-medium">Templates de Comunicação</h3>
          <p className="text-sm text-muted-foreground">WhatsApp e Email para convites e lembretes DISC.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum template encontrado.
        </div>
      ) : (
        grouped.map((group) => (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{labelForChannel(t.channel)}</Badge>
                      {t.is_default ? <Badge variant="secondary">padrão</Badge> : null}
                      {!t.is_active ? <Badge variant="destructive">inativo</Badge> : null}
                    </div>
                    <div className="font-medium truncate mt-1">{t.name}</div>
                    {t.channel === "email" && t.subject ? (
                      <div className="text-xs text-muted-foreground truncate mt-1">Assunto: {t.subject}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPreviewTemplate(t);
                        setPreviewOpen(true);
                      }}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setToDelete(t);
                        setDeleteOpen(true);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <MessageTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{toDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteTemplate(toDelete.id);
                setDeleteOpen(false);
                setToDelete(null);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{labelForChannel(previewTemplate.channel)}</Badge>
                <Badge variant="outline">
                  {labelForMessageType(previewTemplate.message_type, previewTemplate.reminder_day)}
                </Badge>
              </div>

              {previewTemplate.channel === "email" ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Assunto</p>
                    <p className="font-medium">
                      {replaceMessageTemplateVariables(previewTemplate.subject || "", PREVIEW_VARIABLES)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Corpo</p>
                    <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                      {replaceMessageTemplateVariables(previewTemplate.body, PREVIEW_VARIABLES)}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Mensagem</p>
                  <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                    {replaceMessageTemplateVariables(previewTemplate.body, PREVIEW_VARIABLES)}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
