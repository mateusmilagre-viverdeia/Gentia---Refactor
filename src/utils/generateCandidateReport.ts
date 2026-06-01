import jsPDF from "jspdf";
import { formatBRT } from "@/lib/datetime";


export interface CandidateReportData {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    source?: string;
    createdAt: string;
    avatarUrl?: string;
  };
  applications: {
    jobTitle: string;
    appliedAt: string;
    currentStage: string;
    status: string;
    score?: number;
  }[];
  assessments: {
    disc?: {
      primaryProfile: string;
      secondaryProfile?: string;
      scores: { d: number; i: number; s: number; c: number };
      completedAt: string;
    };
    cultural?: {
      matchingScore: number;
      alignedValues: string[];
      misalignedValues: string[];
      completedAt: string;
    };
    technical?: {
      score: number;
      topics: { name: string; score: number }[];
      completedAt: string;
    };
  };
  decisions: {
    type: string;
    decision: string;
    score?: number;
    threshold?: number;
    justification?: string;
    createdAt: string;
  }[];
  communications: {
    channel: string;
    type: string;
    status: string;
    sentAt: string;
  }[];
  organizationName: string;
  generatedAt: string;
}

interface CandidateReportConfig {
  sections: string[];
  includeCompanyLogo: boolean;
  logoUrl?: string;
}

export function generateCandidateReportPDF(data: CandidateReportData, config: CandidateReportConfig): void {
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
    d: [239, 68, 68] as [number, number, number],
    i: [234, 179, 8] as [number, number, number],
    s: [34, 197, 94] as [number, number, number],
    c: [59, 130, 246] as [number, number, number],
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
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório do Candidato", marginLeft, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(data.candidate.name, marginLeft, 34);

  doc.setFontSize(10);
  doc.text(data.organizationName, pageWidth - marginRight, 20, { align: "right" });
  doc.text(data.generatedAt, pageWidth - marginRight, 30, { align: "right" });

  yPos = 60;

  // Profile Section
  if (config.sections.includes("profile")) {
    drawSectionTitle("Perfil do Candidato");

    doc.setFillColor(...colors.background);
    doc.roundedRect(marginLeft, yPos, contentWidth, 40, 3, 3, "F");

    const col1 = marginLeft + 10;
    const col2 = marginLeft + contentWidth / 2 + 10;

    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text("Email", col1, yPos + 12);
    doc.text("Telefone", col2, yPos + 12);

    doc.setTextColor(...colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(data.candidate.email, col1, yPos + 22);
    doc.text(data.candidate.phone || "Não informado", col2, yPos + 22);

    doc.setTextColor(...colors.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Fonte de Origem", col1, yPos + 34);
    doc.text("Cadastrado em", col2, yPos + 34);

    doc.setTextColor(...colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(data.candidate.source || "Não informado", col1, yPos + 44);
    doc.text(formatBRT(new Date(data.candidate.createdAt), "dd/MM/yyyy"), col2, yPos + 44);

    yPos += 55;
  }

  // Applications History
  if (config.sections.includes("history") && data.applications.length > 0) {
    drawSectionTitle("Histórico de Aplicações");

    data.applications.forEach((app) => {
      checkPageBreak(30);

      doc.setFillColor(...colors.background);
      doc.roundedRect(marginLeft, yPos, contentWidth, 25, 3, 3, "F");

      doc.setTextColor(...colors.text);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(app.jobTitle, marginLeft + 10, yPos + 10);

      doc.setTextColor(...colors.muted);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Aplicou em: ${formatBRT(new Date(app.appliedAt), "dd/MM/yyyy")}`, marginLeft + 10, yPos + 20);

      const statusColor = app.status === "hired" ? colors.success 
        : app.status === "rejected" ? colors.danger 
        : colors.warning;

      doc.setTextColor(...statusColor);
      doc.setFont("helvetica", "bold");
      doc.text(app.status.toUpperCase(), pageWidth - marginRight - 10, yPos + 10, { align: "right" });

      doc.setTextColor(...colors.muted);
      doc.setFont("helvetica", "normal");
      doc.text(`Etapa: ${app.currentStage}`, pageWidth - marginRight - 10, yPos + 20, { align: "right" });

      yPos += 32;
    });

    yPos += 10;
  }

  // Assessments Section
  if (config.sections.includes("assessments")) {
    // DISC Assessment
    if (data.assessments.disc) {
      drawSectionTitle("Avaliação DISC");

      const disc = data.assessments.disc;
      const barWidth = 100;
      const barHeight = 15;
      const startX = marginLeft + 30;

      const profiles = [
        { label: "D - Dominância", value: disc.scores.d, color: colors.d },
        { label: "I - Influência", value: disc.scores.i, color: colors.i },
        { label: "S - Estabilidade", value: disc.scores.s, color: colors.s },
        { label: "C - Conformidade", value: disc.scores.c, color: colors.c },
      ];

      profiles.forEach((profile) => {
        checkPageBreak(25);

        doc.setTextColor(...colors.text);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(profile.label, marginLeft, yPos + 10);

        doc.setFillColor(...colors.background);
        doc.roundedRect(startX, yPos, barWidth, barHeight, 2, 2, "F");

        const fillWidth = (profile.value / 100) * barWidth;
        doc.setFillColor(...profile.color);
        doc.roundedRect(startX, yPos, fillWidth, barHeight, 2, 2, "F");

        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${profile.value}%`, startX + barWidth + 10, yPos + 11);

        yPos += barHeight + 8;
      });

      // Profile summary
      doc.setFillColor(...colors.background);
      doc.roundedRect(marginLeft, yPos, contentWidth, 25, 3, 3, "F");

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Perfil Principal:", marginLeft + 10, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.text(disc.primaryProfile, marginLeft + 60, yPos + 10);

      if (disc.secondaryProfile) {
        doc.setFont("helvetica", "bold");
        doc.text("Perfil Secundário:", marginLeft + 10, yPos + 20);
        doc.setFont("helvetica", "normal");
        doc.text(disc.secondaryProfile, marginLeft + 68, yPos + 20);
      }

      yPos += 35;
    }

    // Cultural Assessment
    if (data.assessments.cultural) {
      checkPageBreak(60);
      drawSectionTitle("Avaliação Cultural");

      const cultural = data.assessments.cultural;

      // Score circle
      const circleX = marginLeft + 30;
      const circleY = yPos + 20;
      const circleRadius = 18;

      const scoreColor = cultural.matchingScore >= 80 
        ? colors.success 
        : cultural.matchingScore >= 60 
          ? colors.warning 
          : colors.danger;

      doc.setDrawColor(...scoreColor);
      doc.setLineWidth(3);
      doc.circle(circleX, circleY, circleRadius, "S");

      doc.setTextColor(...scoreColor);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${cultural.matchingScore}%`, circleX, circleY + 5, { align: "center" });

      // Values
      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Valores Alinhados:", marginLeft + 70, yPos + 10);

      doc.setTextColor(...colors.success);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const alignedText = cultural.alignedValues.slice(0, 3).join(", ");
      doc.text(alignedText || "Nenhum", marginLeft + 70, yPos + 20);

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Valores Desalinhados:", marginLeft + 70, yPos + 32);

      doc.setTextColor(...colors.danger);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const misalignedText = cultural.misalignedValues.slice(0, 3).join(", ");
      doc.text(misalignedText || "Nenhum", marginLeft + 70, yPos + 42);

      yPos += 55;
    }

    // Technical Assessment
    if (data.assessments.technical) {
      checkPageBreak(50);
      drawSectionTitle("Avaliação Técnica");

      const technical = data.assessments.technical;

      doc.setFillColor(...colors.background);
      doc.roundedRect(marginLeft, yPos, 50, 35, 3, 3, "F");

      doc.setTextColor(...colors.muted);
      doc.setFontSize(9);
      doc.text("Score", marginLeft + 25, yPos + 10, { align: "center" });

      const techScoreColor = technical.score >= 70 
        ? colors.success 
        : technical.score >= 50 
          ? colors.warning 
          : colors.danger;

      doc.setTextColor(...techScoreColor);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`${technical.score}`, marginLeft + 25, yPos + 28, { align: "center" });

      // Topics
      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Por Tópico:", marginLeft + 60, yPos + 10);

      let topicY = yPos + 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      technical.topics.slice(0, 5).forEach((topic) => {
        doc.setTextColor(...colors.muted);
        doc.text(topic.name, marginLeft + 60, topicY);
        doc.setTextColor(...colors.text);
        doc.text(`${topic.score}%`, marginLeft + 140, topicY);
        topicY += 8;
      });

      yPos += 50;
    }
  }

  // Decisions Section
  if (config.sections.includes("decisions") && data.decisions.length > 0) {
    checkPageBreak(50);
    drawSectionTitle("Log de Decisões da IA");

    data.decisions.slice(0, 10).forEach((decision) => {
      checkPageBreak(30);

      const decisionColor = decision.decision === "approved" 
        ? colors.success 
        : decision.decision === "rejected" 
          ? colors.danger 
          : colors.warning;

      doc.setFillColor(...colors.background);
      doc.roundedRect(marginLeft, yPos, contentWidth, 25, 3, 3, "F");

      doc.setTextColor(...colors.muted);
      doc.setFontSize(8);
      doc.text(formatBRT(new Date(decision.createdAt), "dd/MM/yyyy HH:mm"), marginLeft + 5, yPos + 8);

      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(decision.type, marginLeft + 5, yPos + 18);

      doc.setTextColor(...decisionColor);
      doc.text(decision.decision.toUpperCase(), pageWidth - marginRight - 5, yPos + 12, { align: "right" });

      if (decision.score !== undefined && decision.threshold !== undefined) {
        doc.setTextColor(...colors.muted);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Score: ${decision.score} / Threshold: ${decision.threshold}`, pageWidth - marginRight - 5, yPos + 20, { align: "right" });
      }

      yPos += 30;
    });

    yPos += 10;
  }

  // Communications Section
  if (config.sections.includes("communications") && data.communications.length > 0) {
    checkPageBreak(50);
    drawSectionTitle("Histórico de Comunicações");

    // Table header
    doc.setFillColor(...colors.background);
    doc.rect(marginLeft, yPos, contentWidth, 10, "F");

    doc.setTextColor(...colors.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    doc.text("Canal", marginLeft + 5, yPos + 7);
    doc.text("Tipo", marginLeft + 40, yPos + 7);
    doc.text("Status", marginLeft + 100, yPos + 7);
    doc.text("Data", marginLeft + 140, yPos + 7);

    yPos += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    data.communications.slice(0, 15).forEach((comm, index) => {
      checkPageBreak(12);

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(marginLeft, yPos - 3, contentWidth, 10, "F");
      }

      doc.setTextColor(...colors.text);
      doc.text(comm.channel, marginLeft + 5, yPos + 4);
      doc.text(comm.type, marginLeft + 40, yPos + 4);

      const statusColor = comm.status === "sent" || comm.status === "delivered" 
        ? colors.success 
        : comm.status === "failed" 
          ? colors.danger 
          : colors.warning;

      doc.setTextColor(...statusColor);
      doc.text(comm.status, marginLeft + 100, yPos + 4);

      doc.setTextColor(...colors.muted);
      doc.text(formatBRT(new Date(comm.sentAt), "dd/MM HH:mm"), marginLeft + 140, yPos + 4);

      yPos += 10;
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
  const filename = `relatorio_candidato_${data.candidate.name.replace(/\s+/g, "_").toLowerCase()}_${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
