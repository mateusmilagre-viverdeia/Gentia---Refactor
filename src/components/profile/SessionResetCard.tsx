import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQueryClient } from "@tanstack/react-query";

export const SessionResetCard = () => {
  const [resetting, setResetting] = useState(false);
  const { reloadOrganizations } = useOrganization();
  const queryClient = useQueryClient();

  const handleReset = async () => {
    try {
      setResetting(true);

      // Clear all localStorage items related to the app
      const keysToRemove = [
        'selected_organization_id',
        'assessment-storage',
        'roip_simulations',
        'celebration-storage',
        'cache_version',
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear all sessionStorage
      sessionStorage.clear();

      // Invalidate all React Query caches
      await queryClient.invalidateQueries();

      // Reload organizations
      await reloadOrganizations();

      toast({
        title: "Sessão resetada",
        description: "Cache limpo e dados recarregados com sucesso.",
      });

      // Reload page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error resetting session:", error);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar a sessão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Solução de Problemas
        </CardTitle>
        <CardDescription>
          Se você está tendo problemas para visualizar suas organizações ou dados desatualizados, 
          use esta opção para limpar o cache local e recarregar os dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          onClick={handleReset} 
          disabled={resetting}
        >
          {resetting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Resetar Sessão
        </Button>
      </CardContent>
    </Card>
  );
};
