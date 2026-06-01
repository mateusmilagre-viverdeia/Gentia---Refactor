import jsPDF from "jspdf";

import type { ReportData } from "@/hooks/useReportData";
import { formatBRT } from "@/lib/datetime";

const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // Blue
  secondary: [100, 116, 139] as [number, number, number], // Slate
  success: [34, 197, 94] as [number, number, number], // Green
  warning: [234, 179, 8] as [number, number, number], // Yellow
  danger: [239, 68, 68] as [number, number, number], // Red
  text: [15, 23, 42] as [number, number, number], // Slate 900
  muted: [100, 116, 139] as [number, number, number], // Slate 500
  border: [226, 232, 240] as [number, number, number], // Slate 200
  background: [248, 250, 252] as [number, number, number], // Slate 50
};

function drawHeader(doc: jsPDF, data: ReportData, pageWidth: number): number {
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("RELATÓRIO DE RECRUTAMENTO", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Organization name
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.primary);
  doc.text(data.organizationName, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Period and generation info
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Período: ${data.period}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text(`Gerado em: ${data.generatedAt}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return yPos;
}

function drawSummaryCards(doc: jsPDF, data: ReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 30;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("RESUMO EXECUTIVO", margin, yPos);
  yPos += 8;

  const cards = [
    { label: "Total Candidatos", value: data.funnel?.totalApplicants?.toString() || "0" },
    { label: "Contratados", value: data.funnel?.totalHired?.toString() || "0" },
    { label: "Taxa de Conversão", value: `${data.funnel?.overallConversionRate?.toFixed(1) || 0}%` },
    { label: "Tempo Médio", value: `${data.time?.overallAverageTime?.toFixed(0) || 0} dias` },
  ];

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + 5);

    // Card background
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "F");

    // Card border
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "S");

    // Value
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(card.value, x + cardWidth / 2, yPos + 12, { align: "center" });

    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(card.label, x + cardWidth / 2, yPos + 22, { align: "center" });
  });

  return yPos + cardHeight + 15;
}

function drawFunnelTable(doc: jsPDF, data: ReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("FUNIL DE RECRUTAMENTO", margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [tableWidth * 0.35, tableWidth * 0.2, tableWidth * 0.2, tableWidth * 0.25];
  const headers = ["Etapa", "Candidatos", "% do Total", "Taxa Conversão"];

  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, yPos, tableWidth, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  let xPos = margin + 3;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Table rows
  const stages = data.funnel?.stages || [];
  stages.forEach((stage, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const rowData = [
      stage.name,
      stage.count.toString(),
      `${stage.percentage.toFixed(1)}%`,
      stage.conversionRate ? `${stage.conversionRate.toFixed(1)}%` : "-",
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  // Table border
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, yPos - stages.length * 7 - 8, tableWidth, stages.length * 7 + 8, "S");

  return yPos + 10;
}

function drawTimeAnalysis(doc: jsPDF, data: ReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("TEMPO MÉDIO POR ETAPA", margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [tableWidth * 0.35, tableWidth * 0.2, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.15];
  const headers = ["Etapa", "Média (dias)", "Mín", "Máx", "Candidatos"];

  doc.setFillColor(...COLORS.secondary);
  doc.rect(margin, yPos, tableWidth, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  let xPos = margin + 3;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Table rows
  const stages = data.time?.stages || [];
  stages.forEach((stage, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const rowData = [
      stage.stageName,
      stage.averageDays.toFixed(1),
      stage.minDays.toString(),
      stage.maxDays.toString(),
      stage.candidateCount.toString(),
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  // Bottleneck warning
  const bottleneck = stages.find(s => s.isBottleneck);
  if (bottleneck) {
    yPos += 3;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.warning);
    doc.text(
      `⚠ Gargalo identificado: ${bottleneck.stageName} (${bottleneck.averageDays.toFixed(1)} dias em média)`,
      margin,
      yPos
    );
    yPos += 5;
  }

  return yPos + 10;
}

function drawSourceAnalysis(doc: jsPDF, data: ReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("ANÁLISE POR FONTE", margin, yPos);
  yPos += 8;

  const colWidths = [tableWidth * 0.4, tableWidth * 0.2, tableWidth * 0.2, tableWidth * 0.2];
  const headers = ["Fonte", "Candidatos", "Contratados", "Conversão"];

  doc.setFillColor(...COLORS.success);
  doc.rect(margin, yPos, tableWidth, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  let xPos = margin + 3;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  const sources = data.sources || [];
  sources.forEach((source, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const rowData = [
      source.sourceLabel,
      source.candidates.toString(),
      source.hired.toString(),
      `${source.conversionRate.toFixed(1)}%`,
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  return yPos + 10;
}

function drawJobComparison(doc: jsPDF, data: ReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("COMPARATIVO POR VAGA", margin, yPos);
  yPos += 8;

  const colWidths = [tableWidth * 0.35, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.2];
  const headers = ["Vaga", "Candidatos", "Contratados", "Conversão", "Nota Média"];

  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, yPos, tableWidth, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  let xPos = margin + 3;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  const jobs = (data.jobs || []).slice(0, 8); // Limit to 8 jobs for space
  jobs.forEach((job, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const jobTitle = job.jobTitle.length > 25 ? job.jobTitle.substring(0, 25) + "..." : job.jobTitle;
    const rowData = [
      jobTitle,
      job.totalCandidates.toString(),
      job.hired.toString(),
      `${job.conversionRate.toFixed(1)}%`,
      job.averageScore?.toFixed(1) || "-",
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  return yPos + 10;
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const yPos = pageHeight - 15;

  doc.setDrawColor(...COLORS.border);
  doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Documento gerado automaticamente pelo sistema Gentia.", pageWidth / 2, yPos, { align: "center" });
  doc.text(`© ${new Date().getFullYear()} - Todos os direitos reservados.`, pageWidth / 2, yPos + 4, { align: "center" });
}

export function generateRecruitmentPDF(data: ReportData, type: "full" | "summary" = "full"): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = drawHeader(doc, data, pageWidth);
  yPos = drawSummaryCards(doc, data, yPos, pageWidth);
  yPos = drawFunnelTable(doc, data, yPos, pageWidth);

  if (type === "full") {
    yPos = drawTimeAnalysis(doc, data, yPos, pageWidth);
    yPos = drawSourceAnalysis(doc, data, yPos, pageWidth);
    yPos = drawJobComparison(doc, data, yPos, pageWidth);
  }

  drawFooter(doc, pageWidth, pageHeight);

  const fileName = `relatorio-recrutamento-${type === "full" ? "completo" : "resumo"}-${formatBRT(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
  doc.save(fileName);
}
