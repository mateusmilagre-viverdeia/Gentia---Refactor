import jsPDF from "jspdf";
import { formatBRT } from "@/lib/datetime";


// Brand colors
const COLORS = {
  primary: [99, 102, 241] as [number, number, number], // Indigo-500
  primaryDark: [79, 70, 229] as [number, number, number], // Indigo-600
  secondary: [139, 92, 246] as [number, number, number], // Violet-500
  white: [255, 255, 255] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number], // Slate-900
  gray: [100, 116, 139] as [number, number, number], // Slate-500
  lightGray: [241, 245, 249] as [number, number, number], // Slate-100
  success: [34, 197, 94] as [number, number, number], // Green-500
  danger: [239, 68, 68] as [number, number, number], // Red-500
  accent: [251, 191, 36] as [number, number, number], // Amber-400
};

export async function generateGentiaPitchDeck(): Promise<void> {
  const doc = new jsPDF({ 
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Helper functions
  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };
  
  const setFillColor = (color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };
  
  const addGradientBackground = () => {
    // Simulated gradient with rectangles
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(COLORS.primary[0] + (COLORS.secondary[0] - COLORS.primary[0]) * ratio);
      const g = Math.round(COLORS.primary[1] + (COLORS.secondary[1] - COLORS.primary[1]) * ratio);
      const b = Math.round(COLORS.primary[2] + (COLORS.secondary[2] - COLORS.primary[2]) * ratio);
      doc.setFillColor(r, g, b);
      doc.rect(0, (pageHeight / steps) * i, pageWidth, pageHeight / steps + 1, 'F');
    }
  };
  
  const addLightBackground = () => {
    setFillColor(COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Subtle accent bar at top
    setFillColor(COLORS.primary);
    doc.rect(0, 0, pageWidth, 3, 'F');
  };
  
  const addSlideNumber = (num: number) => {
    doc.setFontSize(10);
    setColor(COLORS.gray);
    doc.text(`${num}/12`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };
  
  const addSlideTitle = (title: string, y: number = 25) => {
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.dark);
    doc.text(title, margin, y);
    return y + 15;
  };
  
  const addSubtitle = (text: string, y: number) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    doc.text(text, margin, y);
    return y + 12;
  };
  
  const addBulletPoint = (text: string, y: number, indent: number = 0) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    const bulletX = margin + indent;
    doc.text('•', bulletX, y);
    
    const lines = doc.splitTextToSize(text, contentWidth - indent - 10);
    doc.text(lines, bulletX + 6, y);
    return y + (lines.length * 7);
  };
  
  const addScreenshotPlaceholder = (label: string, x: number, y: number, width: number, height: number) => {
    // Placeholder box
    setFillColor(COLORS.lightGray);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, height, 3, 3, 'S');
    
    // Label
    doc.setFontSize(12);
    setColor(COLORS.gray);
    doc.setFont('helvetica', 'italic');
    doc.text(`[Screenshot: ${label}]`, x + width/2, y + height/2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  };
  
  const addMetricBox = (value: string, label: string, x: number, y: number, width: number) => {
    const boxHeight = 45;
    
    // Box background
    setFillColor(COLORS.lightGray);
    doc.roundedRect(x, y, width, boxHeight, 3, 3, 'F');
    
    // Value
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.primary);
    doc.text(value, x + width/2, y + 20, { align: 'center' });
    
    // Label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    const labelLines = doc.splitTextToSize(label, width - 10);
    doc.text(labelLines, x + width/2, y + 32, { align: 'center' });
    
    return boxHeight;
  };
  
  // ============================================
  // SLIDE 1: Capa Impactante
  // ============================================
  addGradientBackground();
  
  // Logo placeholder
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  doc.text('GENT.IA', pageWidth / 2, 70, { align: 'center' });
  
  // Tagline
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência Artificial para Gestão de Pessoas', pageWidth / 2, 82, { align: 'center' });
  
  // Main headline
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Da atração à contratação.', pageWidth / 2, 115, { align: 'center' });
  doc.text('Em dias.', pageWidth / 2, 130, { align: 'center' });
  
  // Subheadline
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  const subline = 'A primeira plataforma de recrutamento com IA que elimina 80% do trabalho manual do RH';
  doc.text(subline, pageWidth / 2, 155, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.text(formatBRT(new Date(), "MMMM 'de' yyyy"), pageWidth / 2, pageHeight - 20, { align: 'center' });
  
  // ============================================
  // SLIDE 2: A Dor Insuportável
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(2);
  
  let y = addSlideTitle('Todo RH sofre com os mesmos problemas');
  y = addSubtitle('"Contratamos por Conhecimento, desligamos por Atitudes e Valores"', y);
  y += 10;
  
  // Pain stats box
  setFillColor([254, 242, 242]); // Red-50
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.danger);
  doc.text('O custo de uma contratação errada:', margin + 10, y + 15);
  doc.setFontSize(28);
  doc.text('ATÉ 15x O SALÁRIO', margin + 10, y + 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  setColor(COLORS.gray);
  doc.text('Fonte: Consultoria Bazz', contentWidth - 10, y + 28, { align: 'right' });
  
  y += 50;
  
  // Three pain points
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('As 3 dores que drenam seu RH:', margin, y);
  y += 12;
  
  const pains = [
    { icon: '❌', title: 'Dificuldade de atrair gente certa', desc: 'Você posta vagas, mas os candidatos qualificados não aparecem' },
    { icon: '❌', title: 'Processos lentos que afastam bons candidatos', desc: 'Enquanto você avalia, o talento aceita outra proposta' },
    { icon: '❌', title: 'Custos elevados com perfis desalinhados à cultura', desc: 'Contrata-se o currículo, demite-se a pessoa' }
  ];
  
  const painBoxWidth = (contentWidth - 20) / 3;
  pains.forEach((pain, i) => {
    const x = margin + (painBoxWidth + 10) * i;
    
    setFillColor(COLORS.lightGray);
    doc.roundedRect(x, y, painBoxWidth, 55, 3, 3, 'F');
    
    doc.setFontSize(24);
    doc.text(pain.icon, x + painBoxWidth/2, y + 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.dark);
    const titleLines = doc.splitTextToSize(pain.title, painBoxWidth - 10);
    doc.text(titleLines, x + painBoxWidth/2, y + 28, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    const descLines = doc.splitTextToSize(pain.desc, painBoxWidth - 10);
    doc.text(descLines, x + painBoxWidth/2, y + 42, { align: 'center' });
  });
  
  // ============================================
  // SLIDE 3: GENTIA - A Resposta
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(3);
  
  y = addSlideTitle('A nova geração do recrutamento');
  y += 5;
  
  // Main value prop
  setFillColor(COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  const valueProp = 'Entrevistador de IA por voz que avalia cultura primeiro, técnica depois —';
  const valueProp2 = 'e entrega o candidato final validado, ranqueado e pronto para contratar.';
  doc.text(valueProp, pageWidth/2, y + 12, { align: 'center' });
  doc.text(valueProp2, pageWidth/2, y + 22, { align: 'center' });
  
  y += 45;
  
  // 3 Steps
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Os 3 passos da revolução:', margin, y);
  y += 12;
  
  const steps = [
    { num: '1', title: 'Atração Inteligente', desc: 'IA cria anúncios, busca automaticamente em LinkedIn, GitHub e Instagram, engaja multicanal via WhatsApp e Email' },
    { num: '2', title: 'Seleção por Voz', desc: 'IA entrevista candidatos, avalia fit cultural com seus valores, avança para avaliação técnica em tempo real' },
    { num: '3', title: 'Decisão Baseada em Dados', desc: 'Shortlist ranqueada com scores objetivos, laudos comportamentais DISC e relatórios completos' }
  ];
  
  const stepBoxWidth = (contentWidth - 40) / 3;
  steps.forEach((step, i) => {
    const x = margin + (stepBoxWidth + 20) * i;
    
    // Number circle
    setFillColor(COLORS.primary);
    doc.circle(x + 15, y + 12, 10, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.white);
    doc.text(step.num, x + 15, y + 16, { align: 'center' });
    
    // Content
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.dark);
    doc.text(step.title, x + 30, y + 10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    const descLines = doc.splitTextToSize(step.desc, stepBoxWidth - 5);
    doc.text(descLines, x + 30, y + 20);
  });
  
  // Arrow connections
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  const arrowY = y + 12;
  doc.line(margin + stepBoxWidth + 10, arrowY, margin + stepBoxWidth + 18, arrowY);
  doc.line(margin + 2 * (stepBoxWidth + 20) - 10, arrowY, margin + 2 * (stepBoxWidth + 20) - 2, arrowY);
  
  // ============================================
  // SLIDE 4: Pilar Cultura
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(4);
  
  // Header with icon
  setFillColor(COLORS.secondary);
  doc.roundedRect(margin, 15, 8, 25, 2, 2, 'F');
  
  y = 25;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Cultura que sai do papel e vira prática', margin + 15, y);
  
  y = addSubtitle('Construa uma cultura organizacional que atrai e retém os talentos certos', y + 10);
  y += 5;
  
  // Left side: Features
  const featuresY = y;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Funcionalidades:', margin, y);
  y += 10;
  
  const cultureFeatures = [
    'Diagnóstico de Maturidade Cultural com 8 Pilares',
    'Construtor de Código de Cultura com IA Generativa',
    'Rituais organizacionais estruturados e rastreáveis',
    'Valores com DOs e DON\'Ts claros para cada comportamento',
    'Radar visual de aderência cultural por colaborador'
  ];
  
  cultureFeatures.forEach((feature) => {
    y = addBulletPoint(feature, y);
  });
  
  // Right side: Screenshot placeholder
  addScreenshotPlaceholder('Dashboard Pulse - Radar 8 Pilares', pageWidth/2 + 10, featuresY - 5, contentWidth/2 - 10, 85);
  
  // ============================================
  // SLIDE 5: Pilar Atração/Hunting
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(5);
  
  // Header with icon
  setFillColor(COLORS.success);
  doc.roundedRect(margin, 15, 8, 25, 2, 2, 'F');
  
  y = 25;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Sua IA trabalha 24/7 encontrando talentos', margin + 15, y);
  
  y = addSubtitle('Hunting automatizado com abordagem multicanal personalizada', y + 10);
  y += 5;
  
  // Screenshot on left
  const huntingScreenY = y;
  addScreenshotPlaceholder('Tela de Hunting - Busca Multicanal', margin, y, contentWidth/2 - 15, 85);
  
  // Features on right
  y = huntingScreenY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Funcionalidades:', pageWidth/2 + 10, y);
  y += 10;
  
  const huntingFeatures = [
    'Hunting automático em LinkedIn, GitHub e Instagram',
    'Abordagem via WhatsApp e Email com templates IA',
    'ATS completo com Kanban visual de pipeline',
    'Job descriptions criados por IA em segundos',
    'Agendamento automático de entrevistas'
  ];
  
  huntingFeatures.forEach((feature) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    doc.text('•', pageWidth/2 + 10, y);
    const lines = doc.splitTextToSize(feature, contentWidth/2 - 20);
    doc.text(lines, pageWidth/2 + 16, y);
    y += lines.length * 6 + 2;
  });
  
  // ============================================
  // SLIDE 6: Pilar Retenção/DISC
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(6);
  
  // Header with icon
  setFillColor(COLORS.accent);
  doc.roundedRect(margin, 15, 8, 25, 2, 2, 'F');
  
  y = 25;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('As pessoas certas nos lugares certos', margin + 15, y);
  
  y = addSubtitle('Retenção estratégica com análise comportamental DISC', y + 10);
  y += 5;
  
  // Features on left
  const discFeaturesY = y;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Funcionalidades:', margin, y);
  y += 10;
  
  const discFeatures = [
    'Avaliações comportamentais DISC para todo o time',
    'Match score automático entre candidato e ICP da vaga',
    'Reuniões 1:1 estruturadas com histórico completo',
    'Onboarding automatizado com checklist inteligente',
    'Alertas de risco de turnover baseados em dados'
  ];
  
  discFeatures.forEach((feature) => {
    y = addBulletPoint(feature, y);
  });
  
  // Screenshot on right
  addScreenshotPlaceholder('Dashboard DISC do Time - Radar Comportamental', pageWidth/2 + 10, discFeaturesY - 5, contentWidth/2 - 10, 85);
  
  // ============================================
  // SLIDE 7: Pilar Resultados/ROIP
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(7);
  
  // Header with icon
  setFillColor(COLORS.primary);
  doc.roundedRect(margin, 15, 8, 25, 2, 2, 'F');
  
  y = 25;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('RH como centro de lucro, não de custo', margin + 15, y);
  
  y = addSubtitle('Calculadora exclusiva ROIP™ - Return on Investment in People', y + 10);
  y += 5;
  
  // Screenshot on left
  const roipScreenY = y;
  addScreenshotPlaceholder('Calculadora ROIP - Ganhos Potenciais', margin, y, contentWidth/2 - 15, 85);
  
  // Features on right
  y = roipScreenY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.dark);
  doc.text('Funcionalidades:', pageWidth/2 + 10, y);
  y += 10;
  
  const roipFeatures = [
    'Calculadora ROIP™ exclusiva com métricas financeiras',
    'Dashboard de KPIs de RH em tempo real',
    'Análise detalhada de custos de turnover',
    'Cenários de economia: pessimista, realista, otimista',
    'Relatórios executivos prontos para C-Level'
  ];
  
  roipFeatures.forEach((feature) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    doc.text('•', pageWidth/2 + 10, y);
    const lines = doc.splitTextToSize(feature, contentWidth/2 - 20);
    doc.text(lines, pageWidth/2 + 16, y);
    y += lines.length * 6 + 2;
  });
  
  // ============================================
  // SLIDE 8: Resultados em Números
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(8);
  
  y = addSlideTitle('Métricas que comprovam a transformação');
  y = addSubtitle('Resultados reais de empresas que usam GENTIA', y);
  y += 10;
  
  // Main metrics grid
  const metricWidth = (contentWidth - 30) / 4;
  const metrics = [
    { value: '80%', label: 'Redução de trabalho manual' },
    { value: '58%', label: 'Menos tempo para contratar' },
    { value: '78%', label: 'Contratações no Top 10 ranqueados' },
    { value: '53%', label: 'Menos erros de contratação' }
  ];
  
  metrics.forEach((metric, i) => {
    const x = margin + (metricWidth + 10) * i;
    addMetricBox(metric.value, metric.label, x, y, metricWidth);
  });
  
  y += 60;
  
  // Highlight box
  setFillColor([236, 253, 245]); // Green-50
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.success);
  doc.text('Encontramos o candidato ideal em até', margin + contentWidth/2, y + 18, { align: 'center' });
  doc.setFontSize(32);
  doc.text('10 DIAS', margin + contentWidth/2, y + 34, { align: 'center' });
  
  // ============================================
  // SLIDE 9: Antes vs Depois
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(9);
  
  y = addSlideTitle('A Transformação GENTIA');
  y += 5;
  
  // Two columns
  const colWidth = (contentWidth - 20) / 2;
  
  // BEFORE column
  setFillColor([254, 242, 242]); // Red-50
  doc.roundedRect(margin, y, colWidth, 110, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.danger);
  doc.text('❌ ANTES', margin + colWidth/2, y + 15, { align: 'center' });
  
  const beforeItems = [
    'RH atolado em triagens manuais',
    'Contratações desalinhadas com cultura',
    'Processos longos e caros',
    'Decisões por "achismo"',
    'Turnover imprevisível e custoso'
  ];
  
  let beforeY = y + 28;
  beforeItems.forEach((item) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    doc.text('•  ' + item, margin + 10, beforeY);
    beforeY += 14;
  });
  
  // AFTER column
  setFillColor([236, 253, 245]); // Green-50
  doc.roundedRect(margin + colWidth + 20, y, colWidth, 110, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.success);
  doc.text('✓ COM GENTIA', margin + colWidth + 20 + colWidth/2, y + 15, { align: 'center' });
  
  const afterItems = [
    'Triagem automática por voz e IA',
    'Fit cultural validado antes da técnica',
    '70% mais rápido e eficiente',
    'Decisões baseadas em dados',
    'Retenção estratégica com previsibilidade'
  ];
  
  let afterY = y + 28;
  afterItems.forEach((item) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.dark);
    doc.text('✓  ' + item, margin + colWidth + 30, afterY);
    afterY += 14;
  });
  
  // Arrow in middle
  doc.setFontSize(28);
  setColor(COLORS.primary);
  doc.text('→', margin + colWidth + 10, y + 55, { align: 'center' });
  
  // ============================================
  // SLIDE 10: Diferenciais Competitivos
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(10);
  
  y = addSlideTitle('Por que GENTIA?');
  y = addSubtitle('Diferenciais que nenhum concorrente oferece', y);
  y += 10;
  
  const differentials = [
    { icon: '🎯', title: 'Única com Calculadora ROIP™', desc: 'Mensure o retorno financeiro de cada ação de RH' },
    { icon: '🎙️', title: 'Entrevistador de IA por Voz', desc: 'Entrevistas naturais e humanizadas, disponíveis 24/7' },
    { icon: '💜', title: 'Cultura antes da Técnica', desc: 'Elimina o "contratamos por skill, demitimos por fit"' },
    { icon: '🔗', title: 'Match Compartilhado (Em breve)', desc: 'Candidatos de outras empresas que fazem fit com você' },
    { icon: '🔒', title: '100% LGPD Compliant', desc: 'Segurança e privacidade em conformidade total' }
  ];
  
  const diffBoxWidth = (contentWidth - 10) / 2;
  differentials.forEach((diff, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (diffBoxWidth + 10);
    const boxY = y + row * 35;
    
    setFillColor(COLORS.lightGray);
    doc.roundedRect(x, boxY, diffBoxWidth, 30, 3, 3, 'F');
    
    doc.setFontSize(20);
    doc.text(diff.icon, x + 10, boxY + 18);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.dark);
    doc.text(diff.title, x + 25, boxY + 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    doc.text(diff.desc, x + 25, boxY + 22);
  });
  
  // ============================================
  // SLIDE 11: Modelo de Investimento
  // ============================================
  doc.addPage();
  addLightBackground();
  addSlideNumber(11);
  
  y = addSlideTitle('Sem mensalidade. Você paga pelo resultado.');
  y = addSubtitle('Modelo de investimento flexível e orientado a ROI', y);
  y += 10;
  
  const models = [
    { title: 'Pay-per-use', desc: 'Hunting + Searching por entrevista ou lead gerado', icon: '📊' },
    { title: 'Pay-per-approved', desc: 'Candidatos aprovados da base compartilhada', icon: '✅' },
    { title: 'Setup de Implantação', desc: 'Onboarding, configuração de valores e cultura', icon: '🚀' }
  ];
  
  const modelBoxWidth = (contentWidth - 20) / 3;
  models.forEach((model, i) => {
    const x = margin + (modelBoxWidth + 10) * i;
    
    setFillColor(COLORS.lightGray);
    doc.roundedRect(x, y, modelBoxWidth, 50, 3, 3, 'F');
    
    doc.setFontSize(24);
    doc.text(model.icon, x + modelBoxWidth/2, y + 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.dark);
    doc.text(model.title, x + modelBoxWidth/2, y + 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.gray);
    const descLines = doc.splitTextToSize(model.desc, modelBoxWidth - 10);
    doc.text(descLines, x + modelBoxWidth/2, y + 40, { align: 'center' });
  });
  
  y += 70;
  
  // ROI Guarantee
  setFillColor(COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  doc.text('💰 ROI Garantido:', margin + 15, y + 15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('"A economia no primeiro mês de uso paga o setup completo"', margin + 15, y + 27);
  
  // ============================================
  // SLIDE 12: CTA Final
  // ============================================
  doc.addPage();
  addGradientBackground();
  
  // Main CTA
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  doc.text('O futuro do recrutamento', pageWidth/2, 60, { align: 'center' });
  doc.text('já começou.', pageWidth/2, 78, { align: 'center' });
  
  // Urgency line
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('A cada mês sem GENTIA, sua empresa perde dinheiro', pageWidth/2, 100, { align: 'center' });
  doc.text('com contratações erradas.', pageWidth/2, 112, { align: 'center' });
  
  // CTA Button
  setFillColor(COLORS.white);
  doc.roundedRect(pageWidth/2 - 60, 125, 120, 20, 5, 5, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.primary);
  doc.text('Agendar Demonstração', pageWidth/2, 138, { align: 'center' });
  
  // Contact info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  setColor(COLORS.white);
  doc.text('🌐 gentia.com.br     📧 contato@gentia.com.br     📱 WhatsApp', pageWidth/2, 165, { align: 'center' });
  
  // Logo
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('GENT.IA', pageWidth/2, pageHeight - 25, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência Artificial para Gestão de Pessoas', pageWidth/2, pageHeight - 17, { align: 'center' });
  
  // Save the document
  const dateStr = formatBRT(new Date(), "yyyy-MM-dd");
  doc.save(`GENTIA-PitchDeck-${dateStr}.pdf`);
}
