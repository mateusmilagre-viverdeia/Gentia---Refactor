import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalJobNextStepCardProps {
  status: "shortlist_ready" | "in_progress" | "sla_warning" | "filled" | string;
  shortlistCount?: number;
  estimatedDate?: string | null;
  slaPercentRemaining?: number;
  onViewShortlist?: () => void;
}

export function PortalJobNextStepCard({
  status,
  shortlistCount = 0,
  estimatedDate,
  onViewShortlist,
}: PortalJobNextStepCardProps) {
  const variants = {
    shortlist_ready: {
      icon: Trophy,
      bg: "bg-amber-500/10 border-amber-500/40",
      iconColor: "text-amber-600",
      title: "Sua shortlist está pronta",
      description: `${shortlistCount} candidato${shortlistCount === 1 ? "" : "s"} qualificado${shortlistCount === 1 ? "" : "s"} aguardam seu feedback.`,
      cta: "Ver candidatos e dar feedback →",
    },
    in_progress: {
      icon: Clock,
      bg: "bg-blue-500/10 border-blue-500/40",
      iconColor: "text-blue-600",
      title: "Processo em andamento",
      description: estimatedDate
        ? `Nossos agentes estão avaliando os candidatos. Previsão de shortlist: ${estimatedDate}`
        : "Nossos agentes estão avaliando os candidatos. Você receberá uma mensagem quando estiver pronta.",
      cta: null,
    },
    sla_warning: {
      icon: Clock,
      bg: "bg-amber-50 border-l-4 border-amber-500",
      iconColor: "text-amber-600",
      title: "Prazo se aproximando",
      description: "Estamos priorizando este processo para cumprir o prazo acordado. Se precisar de algo, entre em contato.",
      cta: null,
    },
    filled: {
      icon: CheckCircle2,
      bg: "bg-green-500/10 border-green-500/40",
      iconColor: "text-green-600",
      title: "Vaga preenchida",
      description: "Esta vaga foi concluída com sucesso.",
      cta: null,
    },
  } as const;

  const variant = (variants as any)[status] || variants.in_progress;
  const Icon = variant.icon;

  return (
    <Card className={cn("p-4 border-2", variant.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn("rounded-full p-2 bg-background", variant.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-sm">{variant.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{variant.description}</p>
          {variant.cta && onViewShortlist && (
            <Button size="sm" onClick={onViewShortlist} className="mt-2">
              {variant.cta}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
