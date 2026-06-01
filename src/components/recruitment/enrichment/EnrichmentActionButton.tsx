import { useState } from "react";
import { Loader2, Sparkles, RefreshCw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEnrichCandidate } from "@/hooks/useEnrichCandidate";
import { useCredits } from "@/hooks/useCredits";

const ENRICHMENT_FEATURE_KEY = 'profile_enrich';

interface EnrichmentActionButtonProps {
  candidateId: string;
  hasEnrichedData?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  onSuccess?: () => void;
}

export function EnrichmentActionButton({
  candidateId,
  hasEnrichedData = false,
  variant = "outline",
  size = "sm",
  onSuccess,
}: EnrichmentActionButtonProps) {
  const { enrichProfile, configured } = useEnrichCandidate();
  const { hasCredits, getCost } = useCredits();
  const [loading, setLoading] = useState(false);

  const cost = getCost(ENRICHMENT_FEATURE_KEY);
  const canAfford = hasCredits(ENRICHMENT_FEATURE_KEY);
  const isDisabled = configured === false || !canAfford;

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const result = await enrichProfile(candidateId, hasEnrichedData);
      if (result.success && onSuccess) {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const getTooltipMessage = () => {
    if (configured === false) {
      return "Configure Apollo.io ou Clearbit nas configurações para ativar";
    }
    if (!canAfford) {
      return `Créditos insuficientes. Necessário: ${cost?.credits_per_use || 3} créditos de Enriquecimento`;
    }
    return `Custo: ${cost?.credits_per_use || 3} créditos`;
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleEnrich}
      disabled={loading || isDisabled}
      className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Enriquecendo...
        </>
      ) : hasEnrichedData ? (
        <>
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar Dados
          {cost && <span className="ml-1 text-xs opacity-70">({cost.credits_per_use})</span>}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-1" />
          Enriquecer Dados
          {cost && <span className="ml-1 text-xs opacity-70">({cost.credits_per_use})</span>}
        </>
      )}
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {getTooltipMessage()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
