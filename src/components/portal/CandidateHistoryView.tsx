import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface CandidateHistoryViewProps {
  candidateName: string;
  applications: any[];
  feedbacks: any[];
  onBack: () => void;
}

export function CandidateHistoryView({ candidateName, applications, feedbacks, onBack }: CandidateHistoryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">{candidateName}</h2>
      </div>

      <div className="space-y-4">
        {applications.map((app: any) => {
          const feedback = feedbacks.find((f: any) => f.candidato_id === app.recruitment_candidates?.id && f.vaga_id === app.job_id);
          return (
            <Card key={app.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{app.jobTitle}</CardTitle>
                  <Badge variant="outline" className="capitalize">{app.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>Apresentado em {app.created_at ? formatBRT(parseISO(app.created_at), "dd/MM/yyyy") : "—"}</span>
                  {feedback ? (
                    <span className="flex items-center gap-1">
                      {feedback.decisao === "aprovado" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {feedback.decisao === "aprovado" ? "Aprovado pelo cliente" : "Recusado pelo cliente"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Aguardando decisão
                    </span>
                  )}
                </div>
                {feedback?.motivo && (
                  <p className="mt-2 text-sm text-muted-foreground italic">"{feedback.motivo}"</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
