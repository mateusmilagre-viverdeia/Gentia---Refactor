import jsPDF from "jspdf";

import { formatBRT } from "@/lib/datetime";
import type { 
  ProjectProgressReport, 
  PortfolioSummary, 
  ConsultantPerformance, 
  AtRiskProject 
} from "@/types/consulting-reports.types";

const COLORS = {
  primary: [99, 102, 241] as [number, number, number], // Indigo
  secondary: [100, 116, 139] as [number, number, number], // Slate
  success: [34, 197, 94] as [number, number, number], // Green
  warning: [234, 179, 8] as [number, number, number], // Yellow
  danger: [239, 68, 68] as [number, number, number], // Red
  text: [15, 23, 42] as [number, number, number], // Slate 900
  muted: [100, 116, 139] as [number, number, number], // Slate 500
  border: [226, 232, 240] as [number, number, number], // Slate 200
  background: [248, 250, 252] as [number, number, number], // Slate 50
};

// ============= PROJECT REPORT =============

function drawProjectHeader(doc: jsPDF, data: ProjectProgressReport, pageWidth: number): number {
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("RELATÓRIO DE PROGRESSO", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Project name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(data.projectName, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Consultants
  if (data.consultants.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Consultores: ${data.consultants.join(", ")}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }

  // Generation info
  doc.setFontSize(10);
  doc.text(`Gerado em: ${formatBRT(new Date(data.generatedAt), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return yPos;
}

function drawHealthSummary(doc: jsPDF, data: ProjectProgressReport, yPos: number, pageWidth: number): number {
  const margin = 20;
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 35;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("RESUMO DO PROJETO", margin, yPos);
  yPos += 8;

  const healthScore = data.healthScore?.health_score ?? 0;
  const healthStatus = data.healthScore?.health_status ?? 'unknown';
  const statusLabel = healthStatus === 'healthy' ? 'Saudável' : 
                      healthStatus === 'at_risk' ? 'Atenção' : 
                      healthStatus === 'critical' ? 'Crítico' : 'N/A';

  const cards = [
    { label: "Progresso Geral", value: `${data.overallProgress}%`, color: COLORS.primary },
    { label: "Health Score", value: `${healthScore.toFixed(0)}`, color: healthStatus === 'healthy' ? COLORS.success : healthStatus === 'at_risk' ? COLORS.warning : COLORS.danger },
    { label: "Status", value: statusLabel, color: COLORS.secondary },
    { label: "Idade do Projeto", value: `${data.timeline.projectAge} dias`, color: COLORS.secondary },
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
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.value, x + cardWidth / 2, yPos + 15, { align: "center" });

    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(card.label, x + cardWidth / 2, yPos + 26, { align: "center" });
  });

  return yPos + cardHeight + 15;
}

function drawPillarProgress(doc: jsPDF, data: ProjectProgressReport, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("PROGRESSO POR PILAR", margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [tableWidth * 0.35, tableWidth * 0.2, tableWidth * 0.25, tableWidth * 0.2];
  const headers = ["Pilar", "Estágio", "Progresso", "Status"];

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
  data.pillarProgress.forEach((pillar, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const statusLabel = pillar.status === 'completed' ? 'Concluído' : 
                        pillar.status === 'in_progress' ? 'Em andamento' : 'Não iniciado';
    const rowData = [
      pillar.label,
      `${pillar.currentStage}/${pillar.maxStage}`,
      `${pillar.percentage}%`,
      statusLabel,
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  // Table border
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, yPos - data.pillarProgress.length * 7 - 8, tableWidth, data.pillarProgress.length * 7 + 8, "S");

  return yPos + 10;
}

function drawMilestonesSummary(doc: jsPDF, data: ProjectProgressReport, yPos: number, pageWidth: number): number {
  const margin = 20;
  const colWidth = (pageWidth - margin * 2 - 10) / 3;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("MARCOS DO PROJETO", margin, yPos);
  yPos += 8;

  const ms = data.milestonesSummary;
  const items = [
    { label: "Total", value: ms.total.toString(), color: COLORS.secondary },
    { label: "Concluídos", value: ms.completed.toString(), color: COLORS.success },
    { label: "Em Andamento", value: ms.inProgress.toString(), color: COLORS.primary },
    { label: "Pendentes", value: ms.pending.toString(), color: COLORS.muted },
    { label: "Bloqueados", value: ms.blocked.toString(), color: COLORS.danger },
    { label: "Atrasados", value: ms.overdue.toString(), color: COLORS.warning },
  ];

  items.forEach((item, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + col * (colWidth + 5);
    const y = yPos + row * 12;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...item.color);
    doc.text(item.value, x, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(` ${item.label}`, x + 10, y);
  });

  return yPos + 30;
}

function drawActionsSummary(doc: jsPDF, data: ProjectProgressReport, yPos: number, pageWidth: number): number {
  const margin = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("AÇÕES DE CHECKPOINT", margin, yPos);
  yPos += 10;

  const as = data.actionsSummary;

  // Completion rate bar
  const barWidth = 100;
  const barHeight = 8;
  const barX = margin;

  doc.setFillColor(...COLORS.border);
  doc.roundedRect(barX, yPos, barWidth, barHeight, 2, 2, "F");

  doc.setFillColor(...COLORS.success);
  doc.roundedRect(barX, yPos, barWidth * (as.completionRate / 100), barHeight, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(`${as.completionRate.toFixed(0)}% concluídas`, barX + barWidth + 5, yPos + 6);
  yPos += 15;

  // Stats
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Total: ${as.total} | Concluídas: ${as.completed} | Pendentes: ${as.pending} | Atrasadas: ${as.overdue}`, margin, yPos);

  return yPos + 15;
}

function drawTimelineMetrics(doc: jsPDF, data: ProjectProgressReport, yPos: number, pageWidth: number): number {
  const margin = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("MÉTRICAS DE TEMPO", margin, yPos);
  yPos += 10;

  const tl = data.timeline;
  const velocityLabel = tl.velocityTrend === 'accelerating' ? '↑ Acelerando' :
                        tl.velocityTrend === 'decelerating' ? '↓ Desacelerando' : '→ Estável';

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  const startDate = formatBRT(new Date(tl.projectStartDate), "dd/MM/yyyy");
  doc.text(`Início: ${startDate}`, margin, yPos);
  doc.text(`Idade: ${tl.projectAge} dias`, margin + 70, yPos);
  yPos += 7;

  doc.text(`Velocidade: ${tl.velocity.toFixed(1)} pontos/semana`, margin, yPos);
  doc.setTextColor(...(tl.velocityTrend === 'accelerating' ? COLORS.success : tl.velocityTrend === 'decelerating' ? COLORS.warning : COLORS.muted));
  doc.text(velocityLabel, margin + 80, yPos);

  if (tl.estimatedCompletion) {
    yPos += 7;
    doc.setTextColor(...COLORS.text);
    const estCompletion = formatBRT(new Date(tl.estimatedCompletion), "dd/MM/yyyy");
    doc.text(`Previsão de conclusão: ${estCompletion}`, margin, yPos);
  }

  return yPos + 15;
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const yPos = pageHeight - 15;

  doc.setDrawColor(...COLORS.border);
  doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Documento gerado automaticamente pelo sistema Gentia.", pageWidth / 2, yPos, { align: "center" });
  doc.text(`© ${new Date().getFullYear()} - EP Partners. Todos os direitos reservados.`, pageWidth / 2, yPos + 4, { align: "center" });
}

export function generateProjectReportPDF(data: ProjectProgressReport, type: "full" | "summary" = "full"): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = drawProjectHeader(doc, data, pageWidth);
  yPos = drawHealthSummary(doc, data, yPos, pageWidth);
  yPos = drawPillarProgress(doc, data, yPos, pageWidth);

  if (type === "full") {
    yPos = drawMilestonesSummary(doc, data, yPos, pageWidth);
    yPos = drawActionsSummary(doc, data, yPos, pageWidth);
    yPos = drawTimelineMetrics(doc, data, yPos, pageWidth);
  }

  drawFooter(doc, pageWidth, pageHeight);

  const projectSlug = data.projectSlug || data.projectId.slice(0, 8);
  const fileName = `relatorio-projeto-${projectSlug}-${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

// ============= PORTFOLIO REPORT =============

interface PortfolioReportData {
  summary: PortfolioSummary;
  consultantPerformance: ConsultantPerformance[];
  atRiskProjects: AtRiskProject[];
  period: string;
  generatedAt: string;
}

function drawPortfolioHeader(doc: jsPDF, data: PortfolioReportData, pageWidth: number): number {
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("RELATÓRIO DO PORTFOLIO", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.primary);
  doc.text("EP Partners - Consultoria", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Período: ${data.period}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text(`Gerado em: ${formatBRT(new Date(data.generatedAt), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return yPos;
}

function drawPortfolioSummary(doc: jsPDF, data: PortfolioReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 35;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("VISÃO GERAL", margin, yPos);
  yPos += 8;

  const s = data.summary;
  const cards = [
    { label: "Total Projetos", value: s.totalProjects.toString(), color: COLORS.primary },
    { label: "Health Score Médio", value: s.avgHealthScore.toFixed(0), color: COLORS.success },
    { label: "Progresso Médio", value: `${s.avgProgress.toFixed(0)}%`, color: COLORS.secondary },
    { label: "Ações Pendentes", value: s.pendingActions.toString(), color: s.overdueActions > 0 ? COLORS.warning : COLORS.muted },
  ];

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + 5);

    doc.setFillColor(...COLORS.background);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "F");

    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "S");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.value, x + cardWidth / 2, yPos + 15, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(card.label, x + cardWidth / 2, yPos + 26, { align: "center" });
  });

  return yPos + cardHeight + 15;
}

function drawProjectsDistribution(doc: jsPDF, data: PortfolioReportData, yPos: number, pageWidth: number): number {
  const margin = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("DISTRIBUIÇÃO POR STATUS", margin, yPos);
  yPos += 10;

  const ps = data.summary.projectsByStatus;
  const items = [
    { label: "Saudável", value: ps.healthy, color: COLORS.success },
    { label: "Atenção", value: ps.at_risk, color: COLORS.warning },
    { label: "Crítico", value: ps.critical, color: COLORS.danger },
    { label: "Sem dados", value: ps.unknown, color: COLORS.muted },
  ];

  items.forEach((item, index) => {
    const x = margin + index * 45;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...item.color);
    doc.text(item.value.toString(), x, yPos);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, x, yPos + 5);
  });

  return yPos + 20;
}

function drawAtRiskTable(doc: jsPDF, data: PortfolioReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  if (data.atRiskProjects.length === 0) {
    return yPos;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("PROJETOS EM RISCO", margin, yPos);
  yPos += 8;

  const colWidths = [tableWidth * 0.35, tableWidth * 0.15, tableWidth * 0.2, tableWidth * 0.15, tableWidth * 0.15];
  const headers = ["Projeto", "Score", "Status", "Dias Inativo", "Ações Atrasadas"];

  doc.setFillColor(...COLORS.danger);
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

  const projects = data.atRiskProjects.slice(0, 6);
  projects.forEach((project, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const statusLabel = project.healthStatus === 'at_risk' ? 'Atenção' : 'Crítico';
    const projectName = project.projectName.length > 25 ? project.projectName.substring(0, 25) + "..." : project.projectName;
    const rowData = [
      projectName,
      project.healthScore.toString(),
      statusLabel,
      project.daysSinceLastActivity.toString(),
      project.overdueActions.toString(),
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  return yPos + 10;
}

function drawConsultantPerformance(doc: jsPDF, data: PortfolioReportData, yPos: number, pageWidth: number): number {
  const margin = 20;
  const tableWidth = pageWidth - margin * 2;

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("PERFORMANCE DOS CONSULTORES", margin, yPos);
  yPos += 8;

  const colWidths = [tableWidth * 0.3, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.25];
  const headers = ["Consultor", "Projetos", "Score Médio", "Progresso", "Taxa Conclusão"];

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

  const consultants = data.consultantPerformance.slice(0, 10);
  consultants.forEach((consultant, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos, tableWidth, 7, "F");
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    xPos = margin + 3;
    const name = consultant.consultantName.length > 20 ? consultant.consultantName.substring(0, 20) + "..." : consultant.consultantName;
    const rowData = [
      name,
      consultant.projectCount.toString(),
      consultant.avgHealthScore.toFixed(0),
      `${consultant.avgProgress.toFixed(0)}%`,
      `${consultant.completionRate.toFixed(0)}%`,
    ];

    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  return yPos + 10;
}

export function generatePortfolioReportPDF(
  summary: PortfolioSummary,
  consultantPerformance: ConsultantPerformance[],
  atRiskProjects: AtRiskProject[],
  type: "executive" | "detailed" = "executive"
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const data: PortfolioReportData = {
    summary,
    consultantPerformance,
    atRiskProjects,
    period: "Últimos 30 dias",
    generatedAt: new Date().toISOString(),
  };

  let yPos = drawPortfolioHeader(doc, data, pageWidth);
  yPos = drawPortfolioSummary(doc, data, yPos, pageWidth);
  yPos = drawProjectsDistribution(doc, data, yPos, pageWidth);
  yPos = drawAtRiskTable(doc, data, yPos, pageWidth);

  if (type === "detailed") {
    yPos = drawConsultantPerformance(doc, data, yPos, pageWidth);
  }

  drawFooter(doc, pageWidth, pageHeight);

  const fileName = `relatorio-portfolio-${type === "executive" ? "executivo" : "detalhado"}-${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
