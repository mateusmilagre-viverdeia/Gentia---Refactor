import { Eye, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ViewOnlyBannerProps {
  moduleName?: string;
  className?: string;
}

export function ViewOnlyBanner({ moduleName, className = "" }: ViewOnlyBannerProps) {
  return (
    <Alert className={`border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <Eye className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Modo Visualização
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        {moduleName 
          ? `O módulo "${moduleName}" está em modo visualização. Você pode ver os dados, mas não pode editar.`
          : "Este módulo está em modo visualização. Você pode ver os dados, mas não pode editar."
        }
        {" "}Entre em contato com seu consultor para liberar acesso completo.
      </AlertDescription>
    </Alert>
  );
}

interface ModuleDisabledBannerProps {
  moduleName?: string;
  className?: string;
}

export function ModuleDisabledBanner({ moduleName, className = "" }: ModuleDisabledBannerProps) {
  return (
    <Alert className={`border-red-500/50 bg-red-50 dark:bg-red-950/20 ${className}`}>
      <Lock className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-200">
        Módulo Não Disponível
      </AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300">
        {moduleName 
          ? `O módulo "${moduleName}" não está incluído no seu plano atual.`
          : "Este módulo não está incluído no seu plano atual."
        }
        {" "}Entre em contato com seu consultor para mais informações.
      </AlertDescription>
    </Alert>
  );
}
