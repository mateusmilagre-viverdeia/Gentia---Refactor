import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Users } from "lucide-react";
import { useCandidateComparison } from "@/hooks/useCandidateComparison";
import { ComparisonTableView } from "./ComparisonTableView";
import { ComparisonRadarChart } from "./ComparisonRadarChart";
import { ComparisonPDFExport } from "./ComparisonPDFExport";

interface CandidateComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationIds: string[];
}

export function CandidateComparisonDialog({
  open,
  onOpenChange,
  applicationIds,
}: CandidateComparisonDialogProps) {
  const { data: comparison, isLoading, error } = useCandidateComparison({
    applicationIds,
    enabled: open && applicationIds.length >= 2,
  });

  const validSelection = applicationIds.length >= 2 && applicationIds.length <= 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comparar Candidatos
            </DialogTitle>
            {comparison && <ComparisonPDFExport comparison={comparison} />}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4 space-y-6">
            {!validSelection ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Seleção Inválida</h3>
                <p className="text-muted-foreground mt-2">
                  Selecione entre 2 e 4 candidatos para comparar.
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[350px] w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="font-medium text-lg">Erro ao carregar dados</h3>
                <p className="text-muted-foreground mt-2">
                  Não foi possível carregar os dados dos candidatos.
                </p>
              </div>
            ) : comparison ? (
              <>
                {/* Summary header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {comparison.candidates.length} candidatos para {comparison.jobTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Comparação lado a lado de scores e perfis
                    </p>
                  </div>
                </div>

                {/* Comparison table */}
                <ComparisonTableView
                  candidates={comparison.candidates}
                  criteria={comparison.criteria}
                />

                {/* DISC Radar Chart */}
                <ComparisonRadarChart candidates={comparison.candidates} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Nenhum dado encontrado</h3>
                <p className="text-muted-foreground mt-2">
                  Não foi possível encontrar dados para os candidatos selecionados.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
