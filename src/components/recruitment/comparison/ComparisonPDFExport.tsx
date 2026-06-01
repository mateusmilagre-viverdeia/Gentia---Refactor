import { useState } from "react";

import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { CandidateComparison, CandidateComparisonData } from "@/types/candidate-comparison.types";
import { getNestedValue } from "@/hooks/useCandidateComparison";
import { formatBRT } from "@/lib/datetime";

interface ComparisonPDFExportProps {
  comparison: CandidateComparison;
}

export function ComparisonPDFExport({ comparison }: ComparisonPDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Comparativo de Candidatos", margin, y);
      y += 10;

      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Vaga: ${comparison.jobTitle}`, margin, y);
      y += 6;
      doc.text(
        `Gerado em: ${formatBRT(new Date(comparison.generatedAt), "dd/MM/yyyy 'às' HH:mm")}`,
        margin,
        y
      );
      y += 15;

      // Reset color
      doc.setTextColor(0);

      // Candidates summary
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Candidatos Comparados", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      comparison.candidates.forEach((candidate, idx) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. ${candidate.name}`, margin, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text(`   Email: ${candidate.email}`, margin, y);
        y += 5;
        doc.text(`   Etapa: ${getStageLabel(candidate.currentStage)}`, margin, y);
        y += 5;
        doc.text(`   Score Geral: ${candidate.scores.overall}%`, margin, y);
        y += 8;
      });

      y += 5;

      // Scores comparison table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Comparação de Scores", margin, y);
      y += 10;

      // Table header
      const colWidth = (pageWidth - margin * 2) / (comparison.candidates.length + 1);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
      
      doc.text("Critério", margin + 2, y);
      comparison.candidates.forEach((candidate, idx) => {
        const xPos = margin + colWidth * (idx + 1) + 2;
        const shortName = candidate.name.split(" ")[0];
        doc.text(shortName, xPos, y);
      });
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      comparison.criteria.forEach((criterion) => {
        // Alternate row colors
        if (comparison.criteria.indexOf(criterion) % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 7, "F");
        }

        doc.text(criterion.label, margin + 2, y);
        
        comparison.candidates.forEach((candidate, idx) => {
          const value = getNestedValue(candidate, criterion.key);
          const displayValue = value !== null && value !== undefined
            ? criterion.type === "score" ? `${value}%` : String(value)
            : "—";
          const xPos = margin + colWidth * (idx + 1) + 2;
          doc.text(displayValue, xPos, y);
        });
        y += 7;
      });

      y += 10;

      // DISC profiles (if any)
      const candidatesWithDisc = comparison.candidates.filter((c) => c.scores.disc);
      if (candidatesWithDisc.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Perfis DISC", margin, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        candidatesWithDisc.forEach((candidate) => {
          const disc = candidate.scores.disc!;
          doc.setFont("helvetica", "bold");
          doc.text(candidate.name, margin, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          doc.text(
            `   Perfil: ${disc.primary}${disc.secondary ? ` / ${disc.secondary}` : ""}`,
            margin,
            y
          );
          y += 5;
          doc.text(
            `   D: ${disc.d}% | I: ${disc.i}% | S: ${disc.s}% | C: ${disc.c}%`,
            margin,
            y
          );
          y += 5;
          if (disc.matchScore !== null) {
            doc.text(`   Match Score: ${disc.matchScore}%`, margin, y);
            y += 5;
          }
          y += 3;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${totalPages} | Gerado por Gentia`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save
      const fileName = `comparativo-candidatos-${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Exportar PDF
    </Button>
  );
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    applied: "Aplicado",
    screening: "Triagem",
    cultural_fit: "Fit Cultural",
    disc: "DISC",
    technical_fit: "Fit Técnico",
    final_evaluation: "Avaliação Final",
    references: "Referências",
    offer: "Proposta",
    hired: "Contratado",
    rejected: "Rejeitado",
    interview: "Entrevista",
    evaluation: "Avaliação",
  };
  return labels[stage] || stage;
}
