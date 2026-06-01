import { Building2, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrganizationMatch {
  id: string;
  name: string;
}

interface EmailDomainOrganizationAlertProps {
  organizations: OrganizationMatch[];
  onRequestAccess: (orgId: string) => void;
  onContinueWithout: () => void;
  loading?: boolean;
}

export function EmailDomainOrganizationAlert({
  organizations,
  onRequestAccess,
  onContinueWithout,
  loading = false,
}: EmailDomainOrganizationAlertProps) {
  if (organizations.length === 0) return null;

  const domain = "este domínio";

  return (
    <Alert className="border-amber-500/50 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Empresa(s) encontrada(s) com {domain}:
          </p>
          
          <div className="space-y-2">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-2 bg-background/50 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{org.name}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRequestAccess(org.id)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Solicitar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Se você pertence a uma dessas empresas, solicite acesso ao invés de criar uma conta separada.
          </p>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onContinueWithout}
            className="text-xs text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            Continuar sem vincular a empresa
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
