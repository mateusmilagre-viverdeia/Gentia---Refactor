import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccount } from "@/hooks/useAccount";
import { Loader2 } from "lucide-react";

interface RequireCompanyProps {
  children: ReactNode;
}

export function RequireCompany({ children }: RequireCompanyProps) {
  const { account, loading } = useAccount();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Configure sua empresa primeiro</h2>
              <p className="text-muted-foreground">
                Para criar seu Código de Cultura, precisamos conhecer sua empresa. 
                Configure os dados básicos para continuar.
              </p>
            </div>

            <Button 
              onClick={() => navigate("/minha-empresa")}
              className="gap-2"
            >
              Configurar Minha Empresa
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
