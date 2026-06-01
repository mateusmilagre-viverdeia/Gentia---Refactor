import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLicenseTemplates, LicenseTemplate } from "@/hooks/useLicenseTemplates";
import { AccessLevel } from "@/hooks/useAccountLicensedModules";
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff,
  Star
} from "lucide-react";
import { toast } from "sonner";

const ACCESS_LEVEL_CONFIG: Record<AccessLevel, { label: string; icon: React.ReactNode; color: string }> = {
  full: { 
    label: 'Completo', 
    icon: <Check className="h-3 w-3" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  view_only: { 
    label: 'Visualização', 
    icon: <Eye className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  },
  disabled: { 
    label: 'Desabilitado', 
    icon: <EyeOff className="h-3 w-3" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
};

export function LicenseTemplateManager() {
  const { templates, loading, loadTemplates, deleteTemplate } = useLicenseTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<LicenseTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (id: string) => {
    const success = await deleteTemplate(id);
    if (success) {
      toast.success("Template excluído com sucesso");
    } else {
      toast.error("Erro ao excluir template");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Templates de Licenciamento
            </CardTitle>
            <CardDescription>
              Modelos pré-configurados para aplicar rapidamente a novos clientes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum template cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onView={() => setSelectedTemplate(template)}
                onDelete={() => handleDelete(template.id)}
              />
            ))}
          </div>
        )}

        {/* Template Details Dialog */}
        <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTemplate?.name}
                {selectedTemplate?.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Padrão
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate?.description || 'Sem descrição'}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Configuração de Módulos</h4>
                  <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                    {selectedTemplate.modules.map((m) => {
                      const config = ACCESS_LEVEL_CONFIG[m.accessLevel];
                      return (
                        <div 
                          key={m.moduleSlug}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <span className="text-sm font-medium">{m.moduleSlug}</span>
                          <Badge variant="outline" className={config.color}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="flex gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className={ACCESS_LEVEL_CONFIG.full.color}>
                      {selectedTemplate.modules.filter(m => m.accessLevel === 'full').length}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Completo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ACCESS_LEVEL_CONFIG.view_only.color}>
                      {selectedTemplate.modules.filter(m => m.accessLevel === 'view_only').length}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Visualização</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ACCESS_LEVEL_CONFIG.disabled.color}>
                      {selectedTemplate.modules.filter(m => m.accessLevel === 'disabled').length}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Desabilitado</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  template: LicenseTemplate;
  onView: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onView, onDelete }: TemplateCardProps) {
  const fullCount = template.modules.filter(m => m.accessLevel === 'full').length;
  const viewOnlyCount = template.modules.filter(m => m.accessLevel === 'view_only').length;
  const disabledCount = template.modules.filter(m => m.accessLevel === 'disabled').length;

  return (
    <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            {template.name}
            {template.isDefault && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description || 'Sem descrição'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Badge variant="outline" className={ACCESS_LEVEL_CONFIG.full.color}>
          {fullCount}
        </Badge>
        <Badge variant="outline" className={ACCESS_LEVEL_CONFIG.view_only.color}>
          {viewOnlyCount}
        </Badge>
        <Badge variant="outline" className={ACCESS_LEVEL_CONFIG.disabled.color}>
          {disabledCount}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </Button>
        
        {!template.isDefault && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o template "{template.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
