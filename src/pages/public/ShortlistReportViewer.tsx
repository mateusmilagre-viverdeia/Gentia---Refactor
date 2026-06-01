import { useParams } from "react-router-dom";
import { usePublicReport } from "@/hooks/useShortlistReports";
import { ReportCoverPage } from "@/components/recruitment/shortlist/ReportCoverPage";
import { ReportCandidateSection } from "@/components/recruitment/shortlist/ReportCandidateSection";
import { ReportFeedbackButtons } from "@/components/recruitment/shortlist/ReportFeedbackButtons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { useRef, useState } from "react";

const ShortlistReportViewer = () => {
  const { token } = useParams();
  const { data: report, isLoading, error } = usePublicReport(token);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`${conteudo?.vaga?.titulo || "shortlist"}-report.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Relatório não encontrado</h1>
          <p className="text-sm text-muted-foreground">Este link pode ter expirado ou ser inválido.</p>
        </div>
      </div>
    );
  }

  const conteudo = report.conteudo_json as any;
  if (!conteudo) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{report.titulo || "Relatório de Shortlist"}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={exporting}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {exporting ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      <div ref={reportRef} className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <ReportCoverPage
          empresa={conteudo.empresa}
          vaga={conteudo.vaga}
          mensagemAbertura={conteudo.mensagem_abertura}
          generatedAt={conteudo.generated_at}
          totalCandidatos={conteudo.candidatos?.length || 0}
        />

        {conteudo.candidatos?.map((candidate: any, index: number) => (
          <div key={candidate.id} className="space-y-3">
            <ReportCandidateSection
              candidate={candidate}
              rank={index + 1}
              showScores={conteudo.show_scores !== false}
              showContact={conteudo.show_contact === true}
              showTranscripts={conteudo.show_transcripts === true}
            />
            <div className="flex justify-end px-2">
              <ReportFeedbackButtons
                candidateId={candidate.id}
                candidateName={candidate.nome}
                accountId={report.account_id}
                jobId={report.vaga_id || ""}
                clienteId={report.cliente_id}
              />
            </div>
          </div>
        ))}

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          <p>Relatório gerado por GENTIA • {report.visualizacoes || 0} visualizações</p>
        </div>
      </div>
    </div>
  );
};

export default ShortlistReportViewer;
