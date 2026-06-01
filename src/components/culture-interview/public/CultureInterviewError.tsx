import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Mic,
  RefreshCw
} from "lucide-react";

interface CultureInterviewErrorProps {
  type: "not_found" | "expired" | "cancelled" | "error" | "mic_denied";
  message?: string;
  onRetry?: () => void;
}

export function CultureInterviewError({ type, message, onRetry }: CultureInterviewErrorProps) {
  const content = {
    not_found: {
      icon: XCircle,
      iconClass: "text-destructive",
      bgClass: "bg-destructive/10",
      title: "Link Inválido",
      description: "Este link de entrevista não foi encontrado ou já foi utilizado.",
    },
    expired: {
      icon: Clock,
      iconClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
      title: "Convite Expirado",
      description: "Este convite de entrevista expirou. Por favor, solicite um novo link ao recrutador.",
    },
    cancelled: {
      icon: XCircle,
      iconClass: "text-muted-foreground",
      bgClass: "bg-muted",
      title: "Entrevista Cancelada",
      description: "Esta entrevista foi cancelada. Entre em contato com o recrutador para mais informações.",
    },
    mic_denied: {
      icon: Mic,
      iconClass: "text-destructive",
      bgClass: "bg-destructive/10",
      title: "Microfone Necessário",
      description: "Esta entrevista requer acesso ao microfone. Por favor, permita o acesso e tente novamente.",
    },
    error: {
      icon: AlertTriangle,
      iconClass: "text-destructive",
      bgClass: "bg-destructive/10",
      title: "Erro Inesperado",
      description: message || "Ocorreu um erro ao carregar a entrevista. Por favor, tente novamente.",
    },
  };

  const { icon: Icon, iconClass, bgClass, title, description } = content[type];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${bgClass}`}>
            <Icon className={`h-8 w-8 ${iconClass}`} />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          
          {(type === "mic_denied" || type === "error") && onRetry && (
            <Button onClick={onRetry} className="gap-2 mt-4">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
