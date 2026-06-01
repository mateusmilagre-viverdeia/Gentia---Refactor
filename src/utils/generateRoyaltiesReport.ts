import jsPDF from 'jspdf';

import type { PartnerRoyalty } from '@/types/partner.types';
import type { DirectSale } from '@/hooks/useAdminRoyalties';
import type { MonthlyFinancialData, FinancialSummary, PartnerDirectSale } from '@/hooks/useEPPartnerFinancials';
import { formatBRT } from "@/lib/datetime";

interface ReportOptions {
  title: string;
  period?: string;
  partnerName?: string;
  generatedAt?: Date;
}

interface RoyaltyReportData {
  royalties: PartnerRoyalty[];
  totals: {
    total: number;
    pending: number;
    paid: number;
  };
}

interface SalesReportData {
  sales: DirectSale[];
  totals: {
    totalAmount: number;
    partnerShare: number;
    epShare: number;
  };
}

interface FinancialReportData {
  monthlyData: MonthlyFinancialData[];
  summary: FinancialSummary;
  royalties: PartnerRoyalty[];
  directSales: PartnerDirectSale[];
}

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Generate royalties PDF report
export function generateRoyaltiesReportPDF(
  data: RoyaltyReportData,
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'RELATÓRIO DE ROYALTIES', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  if (options.partnerName) {
    doc.text(`Sócio: ${options.partnerName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }
  
  if (options.period) {
    doc.text(`Período: ${options.period}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }

  const generatedAt = options.generatedAt || new Date();
  doc.text(
    `Gerado em: ${formatBRT(generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 15;

  // Summary cards
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO', margin, yPos);
  yPos += 8;

  const cardWidth = (pageWidth - margin * 2 - 10) / 3;
  const cardHeight = 20;

  // Total card
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Total', margin + 5, yPos + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totals.total), margin + 5, yPos + 16);

  // Pending card
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(margin + cardWidth + 5, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pendente', margin + cardWidth + 10, yPos + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 120, 0);
  doc.text(formatCurrency(data.totals.pending), margin + cardWidth + 10, yPos + 16);

  // Paid card
  doc.setTextColor(0);
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pago', margin + (cardWidth + 5) * 2 + 5, yPos + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text(formatCurrency(data.totals.paid), margin + (cardWidth + 5) * 2 + 5, yPos + 16);

  yPos += cardHeight + 15;

  // Table header
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHAMENTO', margin, yPos);
  yPos += 10;

  // Table
  const colWidths = [50, 45, 35, 35];
  const tableHeaders = ['Cliente', 'Período', 'Base', 'Royalty'];

  // Header row
  doc.setFillColor(70, 70, 70);
  doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  let xPos = margin + 3;
  tableHeaders.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Data rows
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  
  data.royalties.forEach((royalty, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const bgColor = index % 2 === 0 ? 250 : 240;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');

    xPos = margin + 3;
    
    // Company name (truncate if too long)
    const companyName = royalty.company?.name || 'Empresa';
    const truncatedName = companyName.length > 25 ? companyName.substring(0, 22) + '...' : companyName;
    doc.text(truncatedName, xPos, yPos + 5);
    xPos += colWidths[0];

    // Period
    doc.text(formatBRT(new Date(royalty.period_start), 'MMM/yyyy'), xPos, yPos + 5);
    xPos += colWidths[1];

    // Base amount
    doc.text(formatCurrency(royalty.total_client_amount), xPos, yPos + 5);
    xPos += colWidths[2];

    // Royalty amount
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(royalty.royalty_amount), xPos, yPos + 5);
    doc.setFont('helvetica', 'normal');

    yPos += 7;
  });

  // Footer
  yPos += 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Documento gerado automaticamente pelo sistema Gentia.', margin, yPos);

  // Save
  const fileName = `royalties-${formatBRT(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}

// Generate sales PDF report
export function generateSalesReportPDF(
  data: SalesReportData,
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'RELATÓRIO DE VENDAS DIRETAS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  if (options.partnerName) {
    doc.text(`Sócio: ${options.partnerName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }

  const generatedAt = options.generatedAt || new Date();
  doc.text(
    `Gerado em: ${formatBRT(generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 15;

  // Summary
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total de Vendas: ${formatCurrency(data.totals.totalAmount)}`, margin, yPos);
  yPos += 6;
  doc.text(`Comissão Sócio (85%): ${formatCurrency(data.totals.partnerShare)}`, margin, yPos);
  yPos += 6;
  doc.text(`Receita EP (15%): ${formatCurrency(data.totals.epShare)}`, margin, yPos);
  yPos += 15;

  // Table header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDAS', margin, yPos);
  yPos += 10;

  const colWidths = [30, 60, 35, 35];
  const tableHeaders = ['Data', 'Descrição', 'Total', 'Comissão'];

  // Header row
  doc.setFillColor(70, 70, 70);
  doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  
  let xPos = margin + 3;
  tableHeaders.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Data rows
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  
  data.sales.forEach((sale, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const bgColor = index % 2 === 0 ? 250 : 240;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');

    xPos = margin + 3;
    
    // Date
    doc.text(formatBRT(new Date(sale.sale_date), 'dd/MM/yy'), xPos, yPos + 5);
    xPos += colWidths[0];

    // Description
    const desc = sale.description || '-';
    const truncatedDesc = desc.length > 30 ? desc.substring(0, 27) + '...' : desc;
    doc.text(truncatedDesc, xPos, yPos + 5);
    xPos += colWidths[1];

    // Total
    doc.text(formatCurrency(sale.total_amount), xPos, yPos + 5);
    xPos += colWidths[2];

    // Commission
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(sale.partner_share_amount), xPos, yPos + 5);
    doc.setFont('helvetica', 'normal');

    yPos += 7;
  });

  // Save
  const fileName = `vendas-diretas-${formatBRT(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}

// Generate financial report PDF (encontro de contas)
export function generateFinancialReportPDF(
  data: FinancialReportData,
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'RELATÓRIO FINANCEIRO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  if (options.partnerName) {
    doc.text(`Sócio: ${options.partnerName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }

  const generatedAt = options.generatedAt || new Date();
  doc.text(
    `Gerado em: ${formatBRT(generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 15;

  // Summary section
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO - ENCONTRO DE CONTAS', margin, yPos);
  yPos += 10;

  const cardWidth = (pageWidth - margin * 2 - 10) / 3;
  const cardHeight = 25;

  // A Pagar (Royalties)
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('A PAGAR (ROYALTIES)', margin + 5, yPos + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 120, 0);
  doc.text(formatCurrency(data.summary.royaltiesPending), margin + 5, yPos + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Total: ${formatCurrency(data.summary.totalRoyalties)}`, margin + 5, yPos + 21);

  // A Receber (Comissões)
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(margin + cardWidth + 5, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('A RECEBER (COMISSÕES)', margin + cardWidth + 10, yPos + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text(formatCurrency(data.summary.commissionsPending), margin + cardWidth + 10, yPos + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Total: ${formatCurrency(data.summary.totalCommissions)}`, margin + cardWidth + 10, yPos + 21);

  // Saldo Líquido
  const netBalance = data.summary.netBalance;
  const isDebit = netBalance > 0;
  doc.setFillColor(isDebit ? 254 : 209, isDebit ? 226 : 250, isDebit ? 226 : 229);
  doc.roundedRect(margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('SALDO LÍQUIDO', margin + (cardWidth + 5) * 2 + 5, yPos + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isDebit ? 180 : 0, isDebit ? 120 : 128, isDebit ? 0 : 0);
  doc.text(formatCurrency(Math.abs(netBalance)), margin + (cardWidth + 5) * 2 + 5, yPos + 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(isDebit ? 'Você deve' : netBalance < 0 ? 'A receber' : 'Equilibrado', margin + (cardWidth + 5) * 2 + 5, yPos + 21);

  yPos += cardHeight + 15;

  // Monthly table
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTÓRICO MENSAL', margin, yPos);
  yPos += 10;

  const colWidths = [35, 40, 40, 40, 25];
  const tableHeaders = ['Período', 'Royalties', 'Comissões', 'Saldo', 'Status'];

  // Header row
  doc.setFillColor(70, 70, 70);
  doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  let xPos = margin + 3;
  tableHeaders.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Data rows
  doc.setFont('helvetica', 'normal');
  
  data.monthlyData.slice(0, 12).forEach((row, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const bgColor = index % 2 === 0 ? 250 : 240;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');

    xPos = margin + 3;
    doc.setTextColor(0);
    
    // Period
    doc.text(row.periodLabel, xPos, yPos + 5);
    xPos += colWidths[0];

    // Royalties
    doc.setTextColor(180, 120, 0);
    doc.text(row.royalties > 0 ? formatCurrency(row.royalties) : '-', xPos, yPos + 5);
    xPos += colWidths[1];

    // Commissions
    doc.setTextColor(0, 128, 0);
    doc.text(row.commissions > 0 ? formatCurrency(row.commissions) : '-', xPos, yPos + 5);
    xPos += colWidths[2];

    // Net Balance
    const isRowDebit = row.netBalance > 0;
    doc.setTextColor(isRowDebit ? 180 : 0, isRowDebit ? 120 : 128, isRowDebit ? 0 : 0);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(Math.abs(row.netBalance)), xPos, yPos + 5);
    xPos += colWidths[3];

    // Status
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(isRowDebit ? 'Déb.' : row.netBalance < 0 ? 'Créd.' : '-', xPos, yPos + 5);

    yPos += 7;
  });

  // Footer
  yPos += 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Documento gerado automaticamente pelo sistema Gentia.', margin, yPos);

  // Save
  const fileName = `financeiro-encontro-contas-${formatBRT(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}
