import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface Props {
  clientId: string;
}

export function ClientHistoryTab({ clientId }: Props) {
  // Timeline will be populated as interactions happen
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Histórico de Interações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          O histórico será preenchido automaticamente conforme vagas são abertas, shortlists enviadas e fees recebidos.
        </p>
      </CardContent>
    </Card>
  );
}
