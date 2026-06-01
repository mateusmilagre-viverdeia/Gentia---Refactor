import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLicenseTemplates, LicenseTemplate } from "@/hooks/useLicenseTemplates";
import { useLicenseHistory } from "@/hooks/useLicenseHistory";
import { useAccountLicensedModules, AccessLevel, LicensedModule } from "@/hooks/useAccountLicensedModules";
import { 
  FileText, 
  Check, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertTriangle,
  Star
} from "lucide-react";
import { toast } from "sonner";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  currentLicenses: LicensedModule[];
  onApplied: () => void;
}

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

export function ApplyTemplateDialog({ 
  open, 
  onOpenChange, 
  accountId,
  currentLicenses,
  onApplied 
}: ApplyTemplateDialogProps) {
  const { templates, loading: templatesLoading, loadTemplates } = useLicenseTemplates();
  const { logBatchChanges } = useLicenseHistory();
  const { updateModuleLicense } = useAccountLicensedModules();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedTemplateId("");
    }
  }, [open, loadTemplates]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Calculate changes that would be made
  const calculateChanges = () => {
    if (!selectedTemplate) return [];

    const currentMap = new Map<string, AccessLevel>();
    currentLicenses.forEach(l => {
      currentMap.set(l.moduleSlug, l.accessLevel);
    });

    return selectedTemplate.modules
      .filter(m => {
        const current = currentMap.get(m.moduleSlug) || 'full';
        return current !== m.accessLevel;
      })
      .map(m => ({
        moduleSlug: m.moduleSlug,
        previousLevel: currentMap.get(m.moduleSlug) || 'full',
        newLevel: m.accessLevel,
      }));
  };

  const changes = calculateChanges();

  const handleApply = async () => {
    if (!selectedTemplate) return;

    setApplying(true);
    try {
      // Apply all changes
      let hasError = false;
      for (const module of selectedTemplate.modules) {
        const success = await updateModuleLicense(accountId, module.moduleSlug, module.accessLevel);
        if (!success) {
          hasError = true;
        }
      }

      // Log changes
      if (changes.length > 0) {
        await logBatchChanges(
          accountId,
          changes.map(c => ({
            moduleSlug: c.moduleSlug,
            previousLevel: c.previousLevel,
            newLevel: c.newLevel,
          })),
          'template_applied',
          `Template "${selectedTemplate.name}" aplicado`
        );
      }

      if (hasError) {
        toast.error("Algumas alterações não foram aplicadas");
      } else {
        toast.success(`Template "${selectedTemplate.name}" aplicado com sucesso!`);
        onApplied();
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Error applying template:', err);
      toast.error("Erro ao aplicar template");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aplicar Template
          </DialogTitle>
          <DialogDescription>
            Selecione um template para aplicar as configurações de licenciamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            {templatesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview Changes */}
          {selectedTemplate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Preview das Alterações</h4>
                {changes.length > 0 ? (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {changes.length} alterações
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Nenhuma alteração necessária
                  </Badge>
                )}
              </div>

              {changes.length > 0 && (
                <ScrollArea className="h-[300px] border rounded-md p-3">
                  <div className="space-y-2">
                    {changes.map((change) => {
                      const prevConfig = ACCESS_LEVEL_CONFIG[change.previousLevel];
                      const newConfig = ACCESS_LEVEL_CONFIG[change.newLevel];
                      
                      return (
                        <div 
                          key={change.moduleSlug}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <span className="text-sm font-medium">{change.moduleSlug}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={prevConfig.color}>
                              {prevConfig.icon}
                              <span className="ml-1">{prevConfig.label}</span>
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className={newConfig.color}>
                              {newConfig.icon}
                              <span className="ml-1">{newConfig.label}</span>
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Template Summary */}
              <div className="flex gap-4 pt-2 border-t">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!selectedTemplate || applying}
          >
            {applying ? 'Aplicando...' : 'Aplicar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
