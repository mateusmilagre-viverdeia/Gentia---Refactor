import { useNpsByClient } from "@/hooks/useNps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Meh, Frown, MessageSquare } from "lucide-react";

interface Props {
  clientId: string;
}

export function ClientNpsCard({ clientId }: Props) {
  const { data: records = [], isLoading } = useNpsByClient(clientId);

  if (isLoading || records.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> NPS de Candidatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : "Sem respostas de NPS ainda."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const promoters = records.filter((r: any) => r.category === "promoter").length;
  const neutrals = records.filter((r: any) => r.category === "neutral").length;
  const detractors = records.filter((r: any) => r.category === "detractor").length;
  const total = records.length;
  const score = Math.round(((promoters - detractors) / total) * 100);

  const scoreColor = score >= 50 ? "text-green-600" : score >= 0 ? "text-yellow-600" : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> NPS de Candidatos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 mb-4">
          <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
          <span className="text-xs text-muted-foreground mb-1.5">de {total} respostas</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-2">
            <Smile className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">{promoters}</p>
            <p className="text-[10px] text-muted-foreground">Promotores</p>
          </div>
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2">
            <Meh className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{neutrals}</p>
            <p className="text-[10px] text-muted-foreground">Neutros</p>
          </div>
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-2">
            <Frown className="h-4 w-4 mx-auto text-red-600 mb-1" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{detractors}</p>
            <p className="text-[10px] text-muted-foreground">Detratores</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
