import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table, Eye, Loader2, Settings2 } from "lucide-react";
import { useReportData } from "@/hooks/useReportData";
import { generateRecruitmentPDF } from "@/utils/generateRecruitmentReport";
import { generateRecruitmentCSV } from "@/utils/exportToExcel";
import { ReportPreviewDialog } from "./ReportPreviewDialog";
import { ReportBuilderDialog, type ReportConfig } from "./ReportBuilderDialog";
import { ExportDataDialog, type ExportConfig } from "./ExportDataDialog";
import { toast } from "sonner";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface ReportExportButtonProps {
  period: DashboardPeriod;
}

export function ReportExportButton({ period }: ReportExportButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, isReady } = useReportData(period);

  const handleExportPDF = async (type: "full" | "summary") => {
    if (!isReady) {
      toast.error("Aguarde o carregamento dos dados");
      return;
    }

    setIsExporting(true);
    try {
      generateRecruitmentPDF(data, type);
      toast.success(`Relatório PDF ${type === "full" ? "completo" : "resumido"} gerado com sucesso!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!isReady) {
      toast.error("Aguarde o carregamento dos dados");
      return;
    }

    setIsExporting(true);
    try {
      generateRecruitmentCSV(data);
      toast.success("Arquivos CSV gerados com sucesso!");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Erro ao gerar arquivos CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = () => {
    if (!isReady) {
      toast.error("Aguarde o carregamento dos dados");
      return;
    }
    setPreviewOpen(true);
  };

  const handleCustomReport = async (config: ReportConfig) => {
    // For now, generate the standard report based on type
    // In a full implementation, this would use the config to build a custom report
    console.log("Generating custom report with config:", config);
    
    if (config.type === "general") {
      generateRecruitmentPDF(data, config.sections.length > 4 ? "full" : "summary");
    }
    // Additional report types would be handled here
  };

  const handleDataExport = async (config: ExportConfig) => {
    // In a full implementation, this would query the database and export
    console.log("Exporting data with config:", config);
    
    // For now, use the existing CSV export
    if (config.dataType === "candidates" || config.dataType === "applications") {
      generateRecruitmentCSV(data);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isLoading || isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Relatório
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleExportPDF("full")}>
            <FileText className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>PDF Completo</span>
              <span className="text-xs text-muted-foreground">
                Relatório detalhado
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportPDF("summary")}>
            <FileText className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>PDF Resumido</span>
              <span className="text-xs text-muted-foreground">
                Métricas principais
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportCSV}>
            <Table className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Excel (CSV)</span>
              <span className="text-xs text-muted-foreground">
                Dados em planilha
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Pré-visualizar</span>
              <span className="text-xs text-muted-foreground">
                Ver antes de exportar
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setBuilderOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Relatório Personalizado</span>
              <span className="text-xs text-muted-foreground">
                Escolha seções e formato
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
            <Table className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Exportar Dados</span>
              <span className="text-xs text-muted-foreground">
                Selecione colunas e filtros
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={data}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
      />

      <ReportBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onGenerate={handleCustomReport}
      />

      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleDataExport}
      />
    </>
  );
}
