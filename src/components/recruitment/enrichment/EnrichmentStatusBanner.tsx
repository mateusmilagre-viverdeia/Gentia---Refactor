import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useEnrichCandidate } from "@/hooks/useEnrichCandidate";

interface EnrichmentStatusBannerProps {
  onConfigure?: () => void;
}

export function EnrichmentStatusBanner({ onConfigure }: EnrichmentStatusBannerProps) {
  const { checkConfiguration, configured } = useEnrichCandidate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      await checkConfiguration();
      setChecking(false);
    };
    check();
  }, [checkConfiguration]);

  if (checking) {
    return null;
  }

  if (configured === true) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Enriquecimento Ativo
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Enriquecimento automático de dados de candidatos está configurado e funcionando.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        Configure o Enriquecimento de Dados
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-2">
          Adicione sua chave de API do Apollo.io ou Clearbit para enriquecer automaticamente
          os dados dos candidatos com informações profissionais, empresa atual, redes sociais e mais.
        </p>
        {onConfigure && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            Configurar Agora
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
