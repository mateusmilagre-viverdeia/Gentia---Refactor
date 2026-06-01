import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, ExternalLink, Loader2 } from "lucide-react";
import { useROIReportForJob, useGenerateROIReport } from "@/hooks/useROIReport";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRTRelative } from "@/lib/datetime";

interface Props {
  jobId: string;
  accountId: string;
}

export function JobROIReportButton({ jobId, accountId }: Props) {
  const { user } = useAuth();
  const { data: existing } = useROIReportForJob(jobId);
  const generate = useGenerateROIReport(jobId, accountId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: jobRoi } = useQuery({
    queryKey: ["job-roi-status", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("roi_report_scheduled_at, data_contratacao")
        .eq("id", jobId)
        .maybeSingle();
      return data;
    },
  });

  const handleClick = () => {
    if (existing?.id) {
      setConfirmOpen(true);
    } else if (user?.id) {
      generate.mutate(user.id);
    }
  };

  const lastViewed = existing?.last_viewed_at
    ? `última vez ${formatBRTRelative(parseISO(existing.last_viewed_at))}`
    : "ainda não visualizado";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={generate.isPending}
          className="h-8 text-xs"
        >
          {generate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5 mr-1" />
          )}
          {existing?.id ? "Gerar novo relatório de ROI" : "Gerar relatório de ROI"}
        </Button>
        {existing?.id && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1"
            onClick={() => window.open(`/report/${existing.public_token}`, "_blank")}
          >
            <Eye className="h-3 w-3" />
            Relatório disponível
            <ExternalLink className="h-3 w-3" />
          </Badge>
        )}
        {!existing?.id && jobRoi?.roi_report_scheduled_at && (
          <Badge variant="outline" className="gap-1">
            ROI agendado
          </Badge>
        )}
      </div>
      {existing?.id && (
        <p className="text-xs text-muted-foreground">
          Visualizado {existing.views || 0} vezes — {lastViewed}
        </p>
      )}
      {!existing?.id && jobRoi?.roi_report_scheduled_at && (
        <p className="text-xs text-muted-foreground">
          Geração automática {formatBRTRelative(parseISO(jobRoi.roi_report_scheduled_at))}
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar novo relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um relatório de ROI para esta vaga. Você pode abrir o relatório existente ou gerar um novo (consome créditos).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                window.open(`/report/${existing!.public_token}`, "_blank");
                setConfirmOpen(false);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver existente
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (user?.id) generate.mutate(user.id);
                setConfirmOpen(false);
              }}
            >
              Gerar novo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
