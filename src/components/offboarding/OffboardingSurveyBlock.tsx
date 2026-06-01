import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Mail, RefreshCw, FileText } from "lucide-react";

import { getSurveyStatusLabel, getSurveyStatusColor, OffboardingSurveyStatus } from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";

interface OffboardingSurveyBlockProps {
  caseId: string;
  surveyStatus: string;
  employeeName: string;
  employeeEmail?: string;
  emailSentAt?: string;
  respondedAt?: string;
  onResendSurvey: () => Promise<void>;
  isResending?: boolean;
}

export const OffboardingSurveyBlock = ({
  caseId,
  surveyStatus,
  employeeName,
  employeeEmail,
  emailSentAt,
  respondedAt,
  onResendSurvey,
  isResending = false,
}: OffboardingSurveyBlockProps) => {
  const [localResending, setLocalResending] = useState(false);

  const handleResend = async () => {
    setLocalResending(true);
    try {
      await onResendSurvey();
    } finally {
      setLocalResending(false);
    }
  };

  const StatusIcon = () => {
    switch (surveyStatus) {
      case 'responded':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'sent':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Pesquisa de Desligamento</CardTitle>
              <CardDescription>
                Feedback confidencial do colaborador
              </CardDescription>
            </div>
          </div>
          <Badge className={getSurveyStatusColor(surveyStatus as OffboardingSurveyStatus)}>
            {getSurveyStatusLabel(surveyStatus as OffboardingSurveyStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Info */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <StatusIcon />
            <div className="flex-1">
              {surveyStatus === 'pending' && (
                <>
                  <p className="font-medium">Pesquisa ainda não enviada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Envie a pesquisa de desligamento para {employeeName} coletar feedback valioso sobre a experiência na empresa.
                  </p>
                </>
              )}
              {surveyStatus === 'sent' && (
                <>
                  <p className="font-medium">Aguardando resposta</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A pesquisa foi enviada para {employeeEmail || employeeName}. Aguardando o colaborador responder.
                  </p>
                  {emailSentAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Enviado em: {formatBRT(new Date(emailSentAt), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                </>
              )}
              {surveyStatus === 'responded' && (
                <>
                  <p className="font-medium">Pesquisa respondida</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {employeeName} respondeu a pesquisa de desligamento. Os dados estão disponíveis no dashboard.
                  </p>
                  {respondedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Respondido em: {formatBRT(new Date(respondedAt), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {surveyStatus === 'pending' && (
              <Button 
                onClick={handleResend}
                disabled={isResending || localResending || !employeeEmail}
                className="gap-2"
              >
                {(isResending || localResending) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Enviar Pesquisa
              </Button>
            )}
            {surveyStatus === 'sent' && (
              <Button 
                variant="outline"
                onClick={handleResend}
                disabled={isResending || localResending || !employeeEmail}
                className="gap-2"
              >
                {(isResending || localResending) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reenviar Pesquisa
              </Button>
            )}
            {surveyStatus === 'responded' && (
              <Button 
                variant="outline"
                onClick={() => window.open('/retencao/offboarding/dashboard', '_blank')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Dashboard
              </Button>
            )}
          </div>

          {!employeeEmail && surveyStatus !== 'responded' && (
            <p className="text-xs text-amber-600">
              ⚠️ Email do colaborador não informado. Adicione o email para enviar a pesquisa.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
