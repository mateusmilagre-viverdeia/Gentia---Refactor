
import type { ReportData } from "@/hooks/useReportData";
import { formatBRT } from "@/lib/datetime";

interface ExportSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

function convertToCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCsvValue = (value: string | number): string => {
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));

  return [headerLine, ...dataLines].join("\n");
}

function downloadCSV(content: string, filename: string): void {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadAllAsZip(sheets: ExportSheet[], baseFilename: string): void {
  // Since we don't have a zip library, we'll download each file with a small delay
  sheets.forEach((sheet, index) => {
    setTimeout(() => {
      const csv = convertToCSV(sheet.headers, sheet.rows);
      downloadCSV(csv, `${baseFilename}_${sheet.name}.csv`);
    }, index * 300);
  });
}

export function generateRecruitmentCSV(data: ReportData): void {
  const sheets: ExportSheet[] = [];
  const timestamp = formatBRT(new Date(), "yyyy-MM-dd");

  // Sheet 1: Resumo
  sheets.push({
    name: "resumo",
    headers: ["Métrica", "Valor"],
    rows: [
      ["Período", data.period],
      ["Organização", data.organizationName],
      ["Data de Geração", data.generatedAt],
      ["", ""],
      ["Total de Candidatos", data.funnel?.totalApplicants || 0],
      ["Contratados", data.funnel?.totalHired || 0],
      ["Rejeitados", data.funnel?.totalRejected || 0],
      ["Taxa de Conversão (%)", data.funnel?.overallConversionRate?.toFixed(2) || "0"],
      ["Taxa de Rejeição (%)", data.funnel?.rejectionRate?.toFixed(2) || "0"],
      ["Tempo Médio para Contratação (dias)", data.time?.overallAverageTime?.toFixed(1) || "0"],
      ["Menor Tempo de Contratação (dias)", data.time?.fastestHire || "N/A"],
      ["Maior Tempo de Contratação (dias)", data.time?.slowestHire || "N/A"],
    ],
  });

  // Sheet 2: Funil
  if (data.funnel?.stages) {
    sheets.push({
      name: "funil",
      headers: ["Etapa", "Candidatos", "Porcentagem (%)", "Taxa de Conversão (%)"],
      rows: data.funnel.stages.map((stage) => [
        stage.name,
        stage.count,
        stage.percentage.toFixed(2),
        stage.conversionRate?.toFixed(2) || "-",
      ]),
    });
  }

  // Sheet 3: Tempo por Etapa
  if (data.time?.stages) {
    sheets.push({
      name: "tempo_por_etapa",
      headers: ["Etapa", "Média (dias)", "Mínimo (dias)", "Máximo (dias)", "Candidatos"],
      rows: data.time.stages.map((stage) => [
        stage.stageName,
        stage.averageDays.toFixed(1),
        stage.minDays,
        stage.maxDays,
        stage.candidateCount,
      ]),
    });
  }

  // Sheet 4: Análise de Fontes
  if (data.sources) {
    sheets.push({
      name: "fontes",
      headers: ["Fonte", "Candidatos", "Contratados", "Rejeitados", "Taxa de Conversão (%)"],
      rows: data.sources.map((source) => [
        source.sourceLabel,
        source.candidates,
        source.hired,
        source.rejected,
        source.conversionRate.toFixed(2),
      ]),
    });
  }

  // Sheet 5: Comparativo por Vaga
  if (data.jobs) {
    sheets.push({
      name: "vagas",
      headers: ["Vaga", "Candidatos", "Contratados", "Rejeitados", "Em Progresso", "Taxa de Conversão (%)", "Nota Média"],
      rows: data.jobs.map((job) => [
        job.jobTitle,
        job.totalCandidates,
        job.hired,
        job.rejected,
        job.inProgress,
        job.conversionRate.toFixed(2),
        job.averageScore?.toFixed(1) || "N/A",
      ]),
    });
  }

  // Sheet 6: Eficiência
  if (data.efficiency) {
    const efficiencyRows: (string | number)[][] = [
      ["Tempo Médio para Contratação (dias)", data.efficiency.timeToHire || "N/A"],
      ["Taxa de Conversão Geral (%)", data.efficiency.conversionRate?.toFixed(2) || "0"],
      ["Score de Eficiência Geral", data.efficiency.overallEfficiencyScore?.toFixed(0) || "0"],
      ["", ""],
      ["Gargalos Identificados", ""],
    ];

    if (data.efficiency.bottlenecks) {
      data.efficiency.bottlenecks.forEach((bottleneck) => {
        efficiencyRows.push(["  - " + bottleneck, ""]);
      });
    }

    efficiencyRows.push(["", ""]);
    efficiencyRows.push(["Recomendações", ""]);

    if (data.efficiency.recommendations) {
      data.efficiency.recommendations.forEach((rec) => {
        efficiencyRows.push(["  - " + rec, ""]);
      });
    }

    sheets.push({
      name: "eficiencia",
      headers: ["Métrica", "Valor"],
      rows: efficiencyRows,
    });

    // Stage efficiency details
    if (data.efficiency.stageEfficiency) {
      sheets.push({
        name: "eficiencia_etapas",
        headers: ["Etapa", "Candidatos", "Taxa de Dropoff (%)"],
        rows: data.efficiency.stageEfficiency.map((stage) => [
          stage.stageName,
          stage.candidates,
          stage.dropoffRate.toFixed(2),
        ]),
      });
    }
  }

  // Download all sheets
  const baseFilename = `recrutamento_${timestamp}`;
  downloadAllAsZip(sheets, baseFilename);
}

export function generateSingleCSV(data: ReportData): void {
  const timestamp = formatBRT(new Date(), "yyyy-MM-dd");
  
  const allRows: (string | number)[][] = [
    ["RELATÓRIO DE RECRUTAMENTO"],
    ["Período", data.period],
    ["Organização", data.organizationName],
    ["Data de Geração", data.generatedAt],
    [""],
    ["RESUMO"],
    ["Total de Candidatos", data.funnel?.totalApplicants || 0],
    ["Contratados", data.funnel?.totalHired || 0],
    ["Taxa de Conversão (%)", data.funnel?.overallConversionRate?.toFixed(2) || "0"],
    ["Tempo Médio (dias)", data.time?.overallAverageTime?.toFixed(1) || "0"],
    [""],
    ["FUNIL DE RECRUTAMENTO"],
    ["Etapa", "Candidatos", "Porcentagem (%)", "Conversão (%)"],
  ];

  if (data.funnel?.stages) {
    data.funnel.stages.forEach((stage) => {
      allRows.push([
        stage.name,
        stage.count,
        stage.percentage.toFixed(2),
        stage.conversionRate?.toFixed(2) || "-",
      ]);
    });
  }

  allRows.push([""], ["FONTES"], ["Fonte", "Candidatos", "Contratados", "Conversão (%)"]);

  if (data.sources) {
    data.sources.forEach((source) => {
      allRows.push([source.sourceLabel, source.candidates, source.hired, source.conversionRate.toFixed(2)]);
    });
  }

  const csv = convertToCSV(["A", "B", "C", "D"], allRows);
  downloadCSV(csv, `recrutamento_resumo_${timestamp}.csv`);
}
