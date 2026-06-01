import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Building2, X } from "lucide-react";

export function EPModeBanner() {
  const { isEPOverride, epOverrideOrg, clearEPOverride } = useOrganization();

  if (!isEPOverride || !epOverrideOrg) return null;

  return (
    <div className="bg-violet-600 text-white px-4 py-2 flex items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">
          Modo Consultoria: <strong>{epOverrideOrg.name}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearEPOverride}
        className="h-7 text-white hover:bg-violet-700 hover:text-white"
      >
        <X className="h-4 w-4 mr-1" />
        Voltar ao meu perfil
      </Button>
    </div>
  );
}
