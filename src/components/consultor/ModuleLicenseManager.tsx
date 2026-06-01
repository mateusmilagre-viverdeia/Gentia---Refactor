import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccountLicensedModules, AccessLevel, ModuleCategory, LicensedModule } from "@/hooks/useAccountLicensedModules";
import { useLicenseHistory } from "@/hooks/useLicenseHistory";
import { useLicenseExpiration } from "@/hooks/useLicenseExpiration";
import { Check, Eye, EyeOff, RotateCcw, Save, Shield, FileText, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";
import { SetExpirationDialog } from "./SetExpirationDialog";

interface ModuleLicenseManagerProps {
  accountId: string;
}

const ACCESS_LEVEL_CONFIG: Record<AccessLevel, { label: string; icon: React.ReactNode; color: string }> = {
  full: { 
    label: 'Acesso Completo', 
    icon: <Check className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  view_only: { 
    label: 'Apenas Visualização', 
    icon: <Eye className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  },
  disabled: { 
    label: 'Desabilitado', 
    icon: <EyeOff className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
};

export function ModuleLicenseManager({ accountId }: ModuleLicenseManagerProps) {
  const { 
    loading, 
    licenses,
    licensesGrouped, 
    loadLicenses, 
    updateModuleLicense, 
    updateCategoryLicense,
    resetToDefault 
  } = useAccountLicensedModules();
  const { logBatchChanges } = useLicenseHistory();
  const { getExpirationStatus } = useLicenseExpiration();
  
  const [pendingChanges, setPendingChanges] = useState<Map<string, AccessLevel>>(new Map());
  const [saving, setSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [expirationModule, setExpirationModule] = useState<LicensedModule | null>(null);

  useEffect(() => {
    if (accountId) {
      loadLicenses(accountId);
    }
  }, [accountId, loadLicenses]);

  const handleModuleChange = (moduleSlug: string, accessLevel: AccessLevel) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(moduleSlug, accessLevel);
      return newMap;
    });
  };

  const handleCategoryChange = async (category: string, accessLevel: AccessLevel) => {
    setSaving(true);
    const success = await updateCategoryLicense(accountId, category, accessLevel);
    setSaving(false);
    
    if (success) {
      toast.success(`Categoria "${category}" atualizada para ${ACCESS_LEVEL_CONFIG[accessLevel].label}`);
      setPendingChanges(new Map());
    } else {
      toast.error("Erro ao atualizar categoria");
    }
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    let hasError = false;
    const changes: Array<{ moduleSlug: string; previousLevel: AccessLevel | null; newLevel: AccessLevel }> = [];

    for (const [moduleSlug, accessLevel] of pendingChanges) {
      const currentModule = licenses.find(l => l.moduleSlug === moduleSlug);
      const previousLevel = currentModule?.accessLevel || 'full';
      
      const success = await updateModuleLicense(accountId, moduleSlug, accessLevel);
      if (!success) {
        hasError = true;
      } else {
        changes.push({ moduleSlug, previousLevel, newLevel: accessLevel });
      }
    }

    // Log all changes
    if (changes.length > 0) {
      await logBatchChanges(accountId, changes, 'update');
    }

    setSaving(false);
    setPendingChanges(new Map());

    if (hasError) {
      toast.error("Algumas alterações não foram salvas");
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
  };

  const handleReset = async () => {
    setSaving(true);
    const success = await resetToDefault(accountId);
    setSaving(false);

    if (success) {
      toast.success("Configurações restauradas para o padrão");
      setPendingChanges(new Map());
    } else {
      toast.error("Erro ao restaurar configurações");
    }
  };

  const getEffectiveAccessLevel = (moduleSlug: string, currentLevel: AccessLevel): AccessLevel => {
    return pendingChanges.get(moduleSlug) || currentLevel;
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
            <Skeleton key={i} className="h-32 w-full" />
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
              <Shield className="h-5 w-5 text-primary" />
              Módulos Contratados
            </CardTitle>
            <CardDescription>
              Configure o acesso do cliente aos módulos da plataforma
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
              disabled={saving}
            >
              <FileText className="h-4 w-4 mr-2" />
              Aplicar Template
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            {pendingChanges.size > 0 && (
              <Button 
                size="sm"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar ({pendingChanges.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <ApplyTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        accountId={accountId}
        currentLicenses={licenses}
        onApplied={() => loadLicenses(accountId)}
      />
      
      {expirationModule && (
        <SetExpirationDialog
          open={!!expirationModule}
          onOpenChange={(open) => !open && setExpirationModule(null)}
          accountId={accountId}
          moduleSlug={expirationModule.moduleSlug}
          moduleName={expirationModule.moduleName}
          onSaved={() => loadLicenses(accountId)}
        />
      )}
      <CardContent className="space-y-6">
        {licensesGrouped.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum módulo encontrado para configurar.
          </p>
        ) : (
          licensesGrouped.map((group) => (
            <CategoryCard
              key={group.category}
              group={group}
              pendingChanges={pendingChanges}
              onModuleChange={handleModuleChange}
              onCategoryChange={handleCategoryChange}
              getEffectiveAccessLevel={getEffectiveAccessLevel}
              saving={saving}
              onSetExpiration={setExpirationModule}
              getExpirationStatus={getExpirationStatus}
            />
          ))
        )}

        {/* Legend */}
        <div className="border-t pt-4 mt-6">
          <p className="text-sm font-medium mb-3">Legenda:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ACCESS_LEVEL_CONFIG).map(([level, config]) => (
              <div key={level} className="flex items-center gap-2">
                <Badge variant="outline" className={config.color}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryCardProps {
  group: ModuleCategory;
  pendingChanges: Map<string, AccessLevel>;
  onModuleChange: (moduleSlug: string, accessLevel: AccessLevel) => void;
  onCategoryChange: (category: string, accessLevel: AccessLevel) => void;
  getEffectiveAccessLevel: (moduleSlug: string, currentLevel: AccessLevel) => AccessLevel;
  saving: boolean;
  onSetExpiration: (module: LicensedModule) => void;
  getExpirationStatus: (expiresAt: string | null) => 'none' | 'warning' | 'critical' | 'expired';
}

function CategoryCard({ 
  group, 
  pendingChanges,
  onModuleChange, 
  onCategoryChange,
  getEffectiveAccessLevel,
  saving,
  onSetExpiration,
  getExpirationStatus
}: CategoryCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{group.icon}</span>
          <h3 className="font-semibold text-lg uppercase tracking-wide">
            {group.label}
          </h3>
          <Badge variant="secondary" className="ml-2">
            {group.modules.length} módulos
          </Badge>
        </div>
        <Select
          onValueChange={(value) => onCategoryChange(group.category, value as AccessLevel)}
          disabled={saving}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Aplicar a todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Todos: Completo
              </div>
            </SelectItem>
            <SelectItem value="view_only">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-600" />
                Todos: Visualização
              </div>
            </SelectItem>
            <SelectItem value="disabled">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-red-600" />
                Todos: Desabilitado
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {group.modules.map((module) => {
          const effectiveLevel = getEffectiveAccessLevel(module.moduleSlug, module.accessLevel);
          const hasChange = pendingChanges.has(module.moduleSlug);
          
          return (
            <div 
              key={module.moduleSlug} 
              className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                hasChange ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={ACCESS_LEVEL_CONFIG[effectiveLevel].color}
                >
                  {ACCESS_LEVEL_CONFIG[effectiveLevel].icon}
                </Badge>
                <span className="font-medium">{module.moduleName}</span>
                {hasChange && (
                  <Badge variant="outline" className="text-xs">
                    Alterado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSetExpiration(module)}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Configurar expiração</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              
              <Select
                value={effectiveLevel}
                onValueChange={(value) => onModuleChange(module.moduleSlug, value as AccessLevel)}
                disabled={saving}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Completo
                    </div>
                  </SelectItem>
                  <SelectItem value="view_only">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-600" />
                      Visualização
                    </div>
                  </SelectItem>
                  <SelectItem value="disabled">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-red-600" />
                      Desabilitado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
