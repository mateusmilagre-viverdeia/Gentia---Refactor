import jsPDF from "jspdf";

import type { TimeEntryWithRelations, TimeEntrySummary } from "@/types/time-tracking.types";
import { TIME_CATEGORY_LABELS, formatDuration } from "@/types/time-tracking.types";
import { formatBRT } from "@/lib/datetime";

interface TimeReportOptions {
  entries: TimeEntryWithRelations[];
  summary: TimeEntrySummary;
  consultantName: string;
  startDate: Date;
  endDate: Date;
  title?: string;
}

export function generateTimeReport({
  entries,
  summary,
  consultantName,
  startDate,
  endDate,
  title = "Relatório de Horas",
}: TimeReportOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, yPos);
  yPos += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `${formatBRT(startDate, "dd/MM/yyyy")} - ${formatBRT(endDate, "dd/MM/yyyy")}`,
    margin,
    yPos
  );
  yPos += 8;
  doc.text(`Consultor: ${consultantName}`, margin, yPos);
  yPos += 15;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Resumo", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Summary Grid
  const summaryData = [
    ["Total de Horas:", formatDuration(summary.totalMinutes)],
    ["Horas Faturáveis:", formatDuration(summary.billableMinutes)],
    ["Horas Não Faturáveis:", formatDuration(summary.nonBillableMinutes)],
    ["Projetos:", summary.byProject.length.toString()],
  ];

  summaryData.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 60, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Distribution by Category
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribuição por Categoria", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  Object.entries(summary.byCategory)
    .filter(([_, minutes]) => minutes > 0)
    .forEach(([category, minutes]) => {
      const label = TIME_CATEGORY_LABELS[category as keyof typeof TIME_CATEGORY_LABELS] || category;
      const percentage = Math.round((minutes / summary.totalMinutes) * 100);
      doc.text(`${label}: ${formatDuration(minutes)} (${percentage}%)`, margin, yPos);
      yPos += 6;
    });

  yPos += 10;

  // Distribution by Project
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribuição por Projeto", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  summary.byProject.forEach((project) => {
    const percentage = Math.round((project.minutes / summary.totalMinutes) * 100);
    doc.text(`${project.name}: ${formatDuration(project.minutes)} (${percentage}%)`, margin, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Detailed Entries Table
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Registros Detalhados", margin, yPos);
  yPos += 8;

  // Table Header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, "F");
  doc.text("Data", margin + 2, yPos);
  doc.text("Projeto", margin + 30, yPos);
  doc.text("Categoria", margin + 90, yPos);
  doc.text("Duração", margin + 130, yPos);
  doc.text("Descrição", margin + 155, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");

  entries.forEach((entry) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const entryDate = formatBRT(new Date(entry.entry_date), "dd/MM");
    const projectName = entry.account?.name?.substring(0, 20) || "—";
    const category = TIME_CATEGORY_LABELS[entry.category] || entry.category;
    const duration = formatDuration(entry.duration_minutes);
    const description = (entry.description || "—").substring(0, 25);

    doc.text(entryDate, margin + 2, yPos);
    doc.text(projectName, margin + 30, yPos);
    doc.text(category, margin + 90, yPos);
    doc.text(duration, margin + 130, yPos);
    doc.text(description, margin + 155, yPos);
    yPos += 6;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Gerado em ${formatBRT(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      margin,
      285
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, 285);
  }

  // Download
  const filename = `relatorio-horas-${formatBRT(startDate, "yyyy-MM-dd")}-${formatBRT(endDate, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}

// Simplified export interface for Head CS reports
interface HeadCSReportData {
  entries: {
    id: string;
    date: string;
    projectName: string;
    category: string;
    duration: number;
    description: string | null;
    billable: boolean;
  }[];
  summary: TimeEntrySummary;
  period: {
    start: string;
    end: string;
  };
}

export function generateTimeReportPDF(data: HeadCSReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Alocação de Tempo", margin, yPos);
  yPos += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Período: ${formatBRT(new Date(data.period.start), "dd/MM/yyyy")} - ${formatBRT(new Date(data.period.end), "dd/MM/yyyy")}`,
    margin,
    yPos
  );
  yPos += 15;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Resumo", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const summaryData = [
    ["Total de Horas:", formatDuration(data.summary.totalMinutes)],
    ["Horas Faturáveis:", formatDuration(data.summary.billableMinutes)],
    ["Horas Não Faturáveis:", formatDuration(data.summary.nonBillableMinutes)],
    ["Projetos:", data.summary.byProject.length.toString()],
  ];

  summaryData.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 60, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Detailed Entries Table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Registros Detalhados", margin, yPos);
  yPos += 8;

  // Table Header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, "F");
  doc.text("Data", margin + 2, yPos);
  doc.text("Projeto", margin + 30, yPos);
  doc.text("Categoria", margin + 90, yPos);
  doc.text("Duração", margin + 130, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");

  data.entries.forEach((entry) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const entryDate = formatBRT(new Date(entry.date), "dd/MM");
    const projectName = entry.projectName.substring(0, 25);
    const category = TIME_CATEGORY_LABELS[entry.category as keyof typeof TIME_CATEGORY_LABELS] || entry.category;
    const duration = formatDuration(entry.duration);

    doc.text(entryDate, margin + 2, yPos);
    doc.text(projectName, margin + 30, yPos);
    doc.text(category, margin + 90, yPos);
    doc.text(duration, margin + 130, yPos);
    yPos += 6;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Gerado em ${formatBRT(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      margin,
      285
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, 285);
  }

  const filename = `relatorio-alocacao-${data.period.start}-${data.period.end}.pdf`;
  doc.save(filename);
}

export function generateTimeReportCSV(data: HeadCSReportData): void {
  const headers = ["Data", "Projeto", "Categoria", "Duração (min)", "Faturável", "Descrição"];
  
  const rows = data.entries.map((entry) => [
    entry.date,
    entry.projectName,
    TIME_CATEGORY_LABELS[entry.category as keyof typeof TIME_CATEGORY_LABELS] || entry.category,
    entry.duration.toString(),
    entry.billable ? "Sim" : "Não",
    entry.description || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `alocacao-${data.period.start}-${data.period.end}.csv`;
  link.click();
}

// Legacy function for consultant-specific reports
export function generateConsultantTimeReportCSV(
  entries: TimeEntryWithRelations[],
  consultantName: string
): void {
  const headers = ["Data", "Projeto", "Categoria", "Duração (min)", "Faturável", "Descrição"];
  
  const rows = entries.map((entry) => [
    formatBRT(new Date(entry.entry_date), "yyyy-MM-dd"),
    entry.account?.name || "",
    TIME_CATEGORY_LABELS[entry.category] || entry.category,
    entry.duration_minutes.toString(),
    entry.billable ? "Sim" : "Não",
    entry.description || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `horas-${consultantName.toLowerCase().replace(/\s+/g, "-")}-${formatBRT(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
}
