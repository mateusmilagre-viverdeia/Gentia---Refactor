import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { UserCog, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  admin_rh: "Admin RH",
  leader: "Líder",
  member: "Membro",
  viewer: "Visualizador",
};

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, impersonatedMembership, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  const roleName = impersonatedMembership?.role 
    ? ROLE_LABELS[impersonatedMembership.role] || impersonatedMembership.role
    : "Usuário";

  const displayName = `${impersonatedUser.firstName} ${impersonatedUser.lastName}`.trim() || impersonatedUser.email;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4" />
        <span className="text-sm font-medium">
          Visualizando como: <strong>{displayName}</strong> ({roleName})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="h-7 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
      >
        <X className="h-4 w-4 mr-1" />
        Voltar ao meu perfil
      </Button>
    </div>
  );
}
