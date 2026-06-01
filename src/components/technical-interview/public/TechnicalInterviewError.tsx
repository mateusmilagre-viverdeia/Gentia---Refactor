import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Clock, 
  XCircle,
  RefreshCw,
  Mail
} from "lucide-react";

interface TechnicalInterviewErrorProps {
  type: "not_found" | "expired" | "cancelled" | "error" | "mic_denied";
  message?: string;
  companyName?: string;
  onRetry?: () => void;
}

export function TechnicalInterviewError({
  type,
  message,
  companyName,
  onRetry,
}: TechnicalInterviewErrorProps) {
  const getErrorConfig = () => {
    switch (type) {
      case "not_found":
        return {
          icon: XCircle,
          title: "Link Inválido",
          description: "Este link de entrevista não foi encontrado ou é inválido.",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
        };
      case "expired":
        return {
          icon: Clock,
          title: "Convite Expirado",
          description: "Este convite para entrevista técnica expirou. Por favor, solicite um novo link ao recrutador.",
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        };
      case "cancelled":
        return {
          icon: XCircle,
          title: "Sessão Cancelada",
          description: "Esta sessão de entrevista foi cancelada. Entre em contato com o recrutador para mais informações.",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
        };
      case "mic_denied":
        return {
          icon: AlertTriangle,
          title: "Acesso ao Microfone Negado",
          description: "Para realizar a entrevista por voz, precisamos de acesso ao seu microfone. Por favor, permita o acesso e tente novamente.",
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        };
      default:
        return {
          icon: AlertTriangle,
          title: "Erro Inesperado",
          description: message || "Ocorreu um erro ao carregar a entrevista. Por favor, tente novamente.",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
        };
    }
  };

  const config = getErrorConfig();
  const ErrorIcon = config.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className={`mx-auto w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}>
            <ErrorIcon className={`h-8 w-8 ${config.color}`} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="text-muted-foreground">
              {config.description}
            </p>
          </div>

          {companyName && (
            <p className="text-sm text-muted-foreground">
              Empresa: <strong>{companyName}</strong>
            </p>
          )}

          <div className="pt-4 space-y-3">
            {onRetry && (type === "error" || type === "mic_denied") && (
              <Button onClick={onRetry} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
            )}

            {(type === "expired" || type === "cancelled" || type === "not_found") && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  Precisa de ajuda?
                </p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato com o recrutador que enviou o convite para solicitar um novo link.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
