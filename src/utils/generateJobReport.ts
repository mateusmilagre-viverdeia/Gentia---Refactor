import jsPDF from "jspdf";
import { formatBRT } from "@/lib/datetime";


export interface JobReportData {
  job: {
    id: string;
    title: string;
    department?: string;
    location?: string;
    workModality?: string;
    status: string;
    createdAt: string;
    closedAt?: string;
  };
  pipeline: {
    stageName: string;
    count: number;
    percentage: number;
  }[];
  candidates: {
    name: string;
    email: string;
    stage: string;
    score?: number;
    appliedAt: string;
    status: string;
  }[];
  scores: {
    averageScore: number;
    minScore: number;
    maxScore: number;
    distribution: { range: string; count: number }[];
  };
  timeline: {
    date: string;
    event: string;
    details?: string;
  }[];
  attractiveness?: {
    score: number;
    breakdown: Record<string, number>;
    suggestions: string[];
  };
  organizationName: string;
  generatedAt: string;
}

interface JobReportConfig {
  sections: string[];
  includeCompanyLogo: boolean;
  logoUrl?: string;
}

export function generateJobReportPDF(data: JobReportData, config: JobReportConfig): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = 20;

  const colors = {
    primary: [59, 130, 246] as [number, number, number],
    secondary: [100, 116, 139] as [number, number, number],
    success: [34, 197, 94] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    text: [15, 23, 42] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    background: [248, 250, 252] as [number, number, number],
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  const drawSectionTitle = (title: string) => {
    checkPageBreak(20);
    doc.setFillColor(...colors.primary);
    doc.rect(marginLeft, yPos, 4, 10, "F");
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, marginLeft + 10, yPos + 7);
    yPos += 18;
  };

  // Header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório da Vaga", marginLeft, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.job.title, marginLeft, 32);

  doc.setFontSize(10);
  doc.text(data.organizationName, pageWidth - marginRight, 20, { align: "right" });
  doc.text(data.generatedAt, pageWidth - marginRight, 30, { align: "right" });

  yPos = 55;

  // Overview Section
  if (config.sections.includes("overview")) {
    drawSectionTitle("Visão Geral");

    doc.setFillColor(...colors.background);
    doc.roundedRect(marginLeft, yPos, contentWidth, 45, 3, 3, "F");

    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const col1 = marginLeft + 10;
    const col2 = marginLeft + contentWidth / 3 + 10;
    const col3 = marginLeft + (contentWidth / 3) * 2 + 10;

    doc.text("Departamento", col1, yPos + 12);
    doc.text("Localização", col2, yPos + 12);
    doc.text("Modalidade", col3, yPos + 12);

    doc.setTextColor(...colors.text);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(data.job.department || "Não informado", col1, yPos + 22);
    doc.text(data.job.location || "Não informado", col2, yPos + 22);
    doc.text(data.job.workModality || "Não informado", col3, yPos + 22);

    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Status", col1, yPos + 34);
    doc.text("Criada em", col2, yPos + 34);
    doc.text("Fechada em", col3, yPos + 34);

    doc.setTextColor(...colors.text);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(data.job.status, col1, yPos + 44);
    doc.text(formatBRT(new Date(data.job.createdAt), "dd/MM/yyyy"), col2, yPos + 44);
    doc.text(data.job.closedAt ? formatBRT(new Date(data.job.closedAt), "dd/MM/yyyy") : "-", col3, yPos + 44);

    yPos += 55;
  }

  // Pipeline Section
  if (config.sections.includes("pipeline") && data.pipeline.length > 0) {
    drawSectionTitle("Pipeline Atual");

    const barHeight = 25;
    const maxWidth = contentWidth - 80;

    data.pipeline.forEach((stage) => {
      checkPageBreak(35);
      
      const barWidth = (stage.percentage / 100) * maxWidth;

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(stage.stageName, marginLeft, yPos + 8);

      doc.setFillColor(...colors.background);
      doc.roundedRect(marginLeft + 80, yPos, maxWidth, barHeight, 2, 2, "F");

      if (barWidth > 0) {
        doc.setFillColor(...colors.primary);
        doc.roundedRect(marginLeft + 80, yPos, barWidth, barHeight, 2, 2, "F");
      }

      doc.setTextColor(...colors.text);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${stage.count}`, marginLeft + 85 + maxWidth, yPos + 10);

      doc.setTextColor(...colors.muted);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${stage.percentage.toFixed(1)}%`, marginLeft + 85 + maxWidth, yPos + 20);

      yPos += barHeight + 8;
    });

    yPos += 10;
  }

  // Candidates Section
  if (config.sections.includes("candidates") && data.candidates.length > 0) {
    drawSectionTitle(`Candidatos (${data.candidates.length})`);

    // Table header
    doc.setFillColor(...colors.background);
    doc.rect(marginLeft, yPos, contentWidth, 10, "F");

    doc.setTextColor(...colors.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    const colWidths = [50, 55, 35, 20, 25];
    let xPos = marginLeft + 3;

    ["Nome", "Email", "Etapa", "Score", "Status"].forEach((header, i) => {
      doc.text(header, xPos, yPos + 7);
      xPos += colWidths[i];
    });

    yPos += 12;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    data.candidates.slice(0, 20).forEach((candidate, index) => {
      checkPageBreak(12);

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(marginLeft, yPos - 3, contentWidth, 10, "F");
      }

      doc.setTextColor(...colors.text);
      xPos = marginLeft + 3;

      const truncate = (str: string, max: number) => 
        str.length > max ? str.substring(0, max - 2) + ".." : str;

      doc.text(truncate(candidate.name, 20), xPos, yPos + 4);
      xPos += colWidths[0];

      doc.text(truncate(candidate.email, 25), xPos, yPos + 4);
      xPos += colWidths[1];

      doc.text(truncate(candidate.stage, 15), xPos, yPos + 4);
      xPos += colWidths[2];

      doc.text(candidate.score?.toFixed(1) || "-", xPos, yPos + 4);
      xPos += colWidths[3];

      doc.text(candidate.status, xPos, yPos + 4);

      yPos += 10;
    });

    if (data.candidates.length > 20) {
      doc.setTextColor(...colors.muted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`+ ${data.candidates.length - 20} candidatos não exibidos`, marginLeft, yPos + 5);
      yPos += 10;
    }

    yPos += 10;
  }

  // Scores Section
  if (config.sections.includes("scores") && data.scores) {
    drawSectionTitle("Scores e Avaliações");

    doc.setFillColor(...colors.background);
    doc.roundedRect(marginLeft, yPos, contentWidth, 35, 3, 3, "F");

    const scoreCol1 = marginLeft + contentWidth / 4;
    const scoreCol2 = marginLeft + contentWidth / 2;
    const scoreCol3 = marginLeft + (contentWidth / 4) * 3;

    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Média", scoreCol1, yPos + 10, { align: "center" });
    doc.text("Mínimo", scoreCol2, yPos + 10, { align: "center" });
    doc.text("Máximo", scoreCol3, yPos + 10, { align: "center" });

    doc.setTextColor(...colors.text);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(data.scores.averageScore.toFixed(1), scoreCol1, yPos + 26, { align: "center" });
    doc.text(data.scores.minScore.toFixed(1), scoreCol2, yPos + 26, { align: "center" });
    doc.text(data.scores.maxScore.toFixed(1), scoreCol3, yPos + 26, { align: "center" });

    yPos += 50;
  }

  // Attractiveness Section
  if (config.sections.includes("attractiveness") && data.attractiveness) {
    drawSectionTitle("Score de Atratividade");

    // Score circle
    const circleX = marginLeft + 30;
    const circleY = yPos + 25;
    const circleRadius = 20;

    const scoreColor = data.attractiveness.score >= 80 
      ? colors.success 
      : data.attractiveness.score >= 50 
        ? colors.warning 
        : colors.danger;

    doc.setDrawColor(...scoreColor);
    doc.setLineWidth(3);
    doc.circle(circleX, circleY, circleRadius, "S");

    doc.setTextColor(...scoreColor);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.attractiveness.score}`, circleX, circleY + 5, { align: "center" });

    // Breakdown
    doc.setTextColor(...colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento:", marginLeft + 70, yPos + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let breakdownY = yPos + 20;

    Object.entries(data.attractiveness.breakdown).forEach(([key, value]) => {
      doc.setTextColor(...colors.muted);
      doc.text(key, marginLeft + 70, breakdownY);
      doc.setTextColor(...colors.text);
      doc.text(`${value}/20`, marginLeft + 130, breakdownY);
      breakdownY += 8;
    });

    yPos += 60;

    // Suggestions
    if (data.attractiveness.suggestions.length > 0) {
      checkPageBreak(30);
      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Sugestões de Melhoria:", marginLeft, yPos);
      yPos += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      data.attractiveness.suggestions.forEach((suggestion) => {
        checkPageBreak(15);
        doc.setTextColor(...colors.muted);
        doc.text("•", marginLeft + 5, yPos);
        doc.setTextColor(...colors.text);
        const lines = doc.splitTextToSize(suggestion, contentWidth - 15);
        doc.text(lines, marginLeft + 12, yPos);
        yPos += lines.length * 5 + 5;
      });
    }
  }

  // Timeline Section
  if (config.sections.includes("timeline") && data.timeline.length > 0) {
    checkPageBreak(50);
    drawSectionTitle("Timeline de Atividades");

    data.timeline.slice(0, 10).forEach((event, index) => {
      checkPageBreak(20);

      // Timeline dot
      doc.setFillColor(...colors.primary);
      doc.circle(marginLeft + 5, yPos + 4, 3, "F");

      if (index < data.timeline.length - 1) {
        doc.setDrawColor(...colors.background);
        doc.setLineWidth(1);
        doc.line(marginLeft + 5, yPos + 8, marginLeft + 5, yPos + 20);
      }

      doc.setTextColor(...colors.muted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(event.date, marginLeft + 15, yPos + 3);

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(event.event, marginLeft + 15, yPos + 11);

      if (event.details) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text(event.details, marginLeft + 15, yPos + 18);
      }

      yPos += 25;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(...colors.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save
  const filename = `relatorio_vaga_${data.job.title.replace(/\s+/g, "_").toLowerCase()}_${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
