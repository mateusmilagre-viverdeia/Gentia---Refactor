import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalQuestionBankManager } from "@/components/recruitment/TechnicalQuestionBankManager";
import { Info, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TechnicalAgentBankTabProps {
  accountId: string;
  agentId: string;
}

export const TechnicalAgentBankTab = ({ accountId, agentId }: TechnicalAgentBankTabProps) => {
  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" />
            Banco de Perguntas Opcional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Este banco de perguntas é <strong>complementar</strong> às perguntas geradas automaticamente 
            a partir do Job Description. Use-o para:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
            <li>Adicionar perguntas padrão que devem ser feitas em todas as entrevistas</li>
            <li>Incluir questões específicas da sua empresa ou stack</li>
            <li>Garantir que certos tópicos sempre sejam abordados</li>
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Perguntas marcadas como <strong>"Obrigatória"</strong> serão sempre incluídas na entrevista, 
          independente das skills do Job Description.
        </AlertDescription>
      </Alert>

      {/* Question Bank Manager */}
      <TechnicalQuestionBankManager accountId={accountId} agentId={agentId} />
    </div>
  );
};
