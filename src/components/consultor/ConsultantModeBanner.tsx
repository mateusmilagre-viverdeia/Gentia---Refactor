import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Building2, X } from "lucide-react";

export function ConsultantModeBanner() {
  const { isConsultantMode, currentOrganization, clearConsultantProject } = useOrganization();

  if (!isConsultantMode || !currentOrganization) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">
          Modo Consultoria: <strong>{currentOrganization.name}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearConsultantProject}
        className="h-7 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Voltar ao meu perfil
      </Button>
    </div>
  );
}
