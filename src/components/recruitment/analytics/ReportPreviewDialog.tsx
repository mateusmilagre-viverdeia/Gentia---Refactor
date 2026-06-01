import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Table } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { ReportData } from "@/hooks/useReportData";

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReportData;
  onExportPDF: (type: "full" | "summary") => void;
  onExportCSV: () => void;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  data,
  onExportPDF,
  onExportCSV,
}: ReportPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pré-visualização do Relatório
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">RELATÓRIO DE RECRUTAMENTO</h2>
              <p className="text-primary font-medium">{data.organizationName}</p>
              <p className="text-sm text-muted-foreground">
                Período: {data.period}
              </p>
              <p className="text-xs text-muted-foreground">
                Gerado em: {data.generatedAt}
              </p>
            </div>

            {/* Summary Cards */}
            <div>
              <h3 className="font-semibold mb-3">Resumo Executivo</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {data.funnel?.totalApplicants || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Candidatos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {data.funnel?.totalHired || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Contratados</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {data.funnel?.overallConversionRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {data.time?.overallAverageTime?.toFixed(0) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Tempo Médio (dias)</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Funnel Table */}
            <div>
              <h3 className="font-semibold mb-3">Funil de Recrutamento</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="text-left p-2">Etapa</th>
                      <th className="text-center p-2">Candidatos</th>
                      <th className="text-center p-2">% do Total</th>
                      <th className="text-center p-2">Taxa Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.funnel?.stages?.map((stage, index) => (
                      <tr key={stage.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="p-2">{stage.name}</td>
                        <td className="text-center p-2">{stage.count}</td>
                        <td className="text-center p-2">{stage.percentage.toFixed(1)}%</td>
                        <td className="text-center p-2">
                          {stage.conversionRate ? `${stage.conversionRate.toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Time Analysis */}
            <div>
              <h3 className="font-semibold mb-3">Tempo Médio por Etapa</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="text-left p-2">Etapa</th>
                      <th className="text-center p-2">Média (dias)</th>
                      <th className="text-center p-2">Mín</th>
                      <th className="text-center p-2">Máx</th>
                      <th className="text-center p-2">Candidatos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.time?.stages?.map((stage, index) => (
                      <tr key={stage.stageId} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="p-2">{stage.stageName}</td>
                        <td className="text-center p-2">{stage.averageDays.toFixed(1)}</td>
                        <td className="text-center p-2">{stage.minDays}</td>
                        <td className="text-center p-2">{stage.maxDays}</td>
                        <td className="text-center p-2">{stage.candidateCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.time?.stages?.some(s => s.isBottleneck) && (
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-500">
                  ⚠️ Gargalo identificado: {data.time.stages.find(s => s.isBottleneck)?.stageName} (
                  {data.time.stages.find(s => s.isBottleneck)?.averageDays.toFixed(1)} dias em média)
                </p>
              )}
            </div>

            <Separator />

            {/* Sources */}
            <div>
              <h3 className="font-semibold mb-3">Análise por Fonte</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="text-left p-2">Fonte</th>
                      <th className="text-center p-2">Candidatos</th>
                      <th className="text-center p-2">Contratados</th>
                      <th className="text-center p-2">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources?.map((source, index) => (
                      <tr key={source.source} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="p-2">{source.sourceLabel}</td>
                        <td className="text-center p-2">{source.candidates}</td>
                        <td className="text-center p-2">{source.hired}</td>
                        <td className="text-center p-2">{source.conversionRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline" onClick={onExportCSV}>
            <Table className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => onExportPDF("summary")}>
            <FileText className="h-4 w-4 mr-2" />
            PDF Resumido
          </Button>
          <Button onClick={() => onExportPDF("full")}>
            <Download className="h-4 w-4 mr-2" />
            PDF Completo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
