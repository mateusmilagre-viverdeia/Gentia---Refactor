import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  ThumbsUp,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

interface TechnicalInterviewCompleteProps {
  companyName: string;
  jobTitle: string;
  isProcessing: boolean;
  score: number | null;
  recommendation: string | null;
  returnUrl?: string | null;
}

export function TechnicalInterviewComplete({
  companyName,
  jobTitle,
  isProcessing,
  score,
  recommendation,
  returnUrl,
}: TechnicalInterviewCompleteProps) {
  useEffect(() => {
    if (!isProcessing && returnUrl) {
      const t = setTimeout(() => {
        window.location.href = returnUrl;
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [isProcessing, returnUrl]);
  const getRecommendationConfig = (rec: string | null) => {
    switch (rec) {
      case "recommended":
        return { 
          icon: ThumbsUp, 
          label: "Recomendado", 
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20"
        };
      case "conditional":
        return { 
          icon: AlertTriangle, 
          label: "Com Ressalvas", 
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20"
        };
      case "not_recommended":
        return { 
          icon: XCircle, 
          label: "Não Recomendado", 
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20"
        };
      default:
        return { 
          icon: Clock, 
          label: "Aguardando Análise", 
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-border"
        };
    }
  };

  const config = getRecommendationConfig(recommendation);
  const RecommendationIcon = config.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {isProcessing ? (
              <>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Processando...</h2>
                  <p className="text-muted-foreground">
                    Estamos analisando sua entrevista. Isso pode levar alguns segundos.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Entrevista Concluída!</h2>
                  <p className="text-muted-foreground">
                    Obrigado por participar da entrevista técnica para a vaga de {jobTitle} na {companyName}.
                  </p>
                </div>

                {/* Score display */}
                {score !== null && (
                  <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
                    <div className="flex items-center justify-center gap-3">
                      <RecommendationIcon className={`h-6 w-6 ${config.color}`} />
                      <div className="text-left">
                        <p className="text-sm font-medium">Resultado</p>
                        <p className={`text-lg font-bold ${config.color}`}>
                          {config.label}
                        </p>
                      </div>
                      {score > 0 && (
                        <div className="ml-4 text-right">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="text-2xl font-bold">{score}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Análise enviada para o RH
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Nossa equipe analisará seu desempenho e entrará em contato sobre os próximos passos.
                  </p>
                </div>

                {returnUrl ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() => { window.location.href = returnUrl; }}
                      className="gap-2"
                    >
                      Voltar para sua candidatura
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Redirecionando automaticamente em instantes...
                    </p>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => window.close()}>
                    Fechar página
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
