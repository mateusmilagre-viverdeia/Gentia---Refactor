import jsPDF from "jspdf";
import { formatBRT } from "@/lib/datetime";


export async function generateGentiaPDF(): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [240, 240, 240];

  // Helper functions
  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const addPageNumber = (pageNum: number, totalPages: number) => {
    doc.setFontSize(9);
    setColor(grayColor);
    doc.text(
      `Página ${pageNum} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text("GENT.IA - Inteligência Artificial para Gestão de Pessoas", margin, pageHeight - 10);
  };

  const addSectionTitle = (title: string, y: number): number => {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor(primaryColor);
    doc.text(title, margin, y);
    
    // Underline
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, margin + doc.getTextWidth(title), y + 2);
    
    return y + 12;
  };

  const addSubtitle = (text: string, y: number): number => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(darkColor);
    doc.text(text, margin, y);
    return y + 8;
  };

  const addParagraph = (text: string, y: number, maxWidth?: number): number => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(darkColor);
    const lines = doc.splitTextToSize(text, maxWidth || contentWidth);
    doc.text(lines, margin, y);
    return y + lines.length * 5 + 3;
  };

  const addBulletList = (items: string[], y: number, bulletChar = "•"): number => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(darkColor);
    
    let currentY = y;
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, contentWidth - 10);
      doc.text(`${bulletChar} ${lines[0]}`, margin + 5, currentY);
      for (let i = 1; i < lines.length; i++) {
        currentY += 5;
        doc.text(`   ${lines[i]}`, margin + 5, currentY);
      }
      currentY += 6;
    });
    
    return currentY;
  };

  const addHighlightBox = (text: string, y: number): number => {
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    const lines = doc.splitTextToSize(text, contentWidth - 20);
    const boxHeight = lines.length * 5 + 10;
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    setColor(darkColor);
    doc.text(lines, margin + 10, y + 8);
    
    return y + boxHeight + 8;
  };

  // ============================================
  // PAGE 1 - COVER
  // ============================================
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 80, "F");

  doc.setFontSize(42);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("GENT.IA", pageWidth / 2, 45, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Inteligência Artificial para Gestão de Pessoas", pageWidth / 2, 60, { align: "center" });

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  setColor(darkColor);
  doc.text("Apresentação do Produto", pageWidth / 2, 110, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  setColor(grayColor);
  doc.text("Transforme a Gestão de Pessoas em Vantagem Competitiva", pageWidth / 2, 125, { align: "center" });

  // Tagline box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(30, 145, pageWidth - 60, 40, 5, 5, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  setColor(primaryColor);
  const tagline = "\"O único ecossistema que une Cultura, Recrutamento Inteligente, Retenção e ROI mensurável em uma única plataforma.\"";
  const taglineLines = doc.splitTextToSize(tagline, pageWidth - 80);
  doc.text(taglineLines, pageWidth / 2, 162, { align: "center" });

  // Footer info
  doc.setFontSize(10);
  setColor(grayColor);
  doc.text(`Gerado em ${formatBRT(new Date(), "dd 'de' MMMM 'de' yyyy")}`, pageWidth / 2, 220, { align: "center" });

  doc.setFontSize(9);
  doc.text("www.gentia.com.br", pageWidth / 2, 270, { align: "center" });

  // ============================================
  // PAGE 2 - O QUE É + PARA QUE SERVE
  // ============================================
  doc.addPage();
  let y = margin;

  y = addSectionTitle("1. O QUE É A GENTIA?", y);

  y = addParagraph(
    "A GENTIA é um ecossistema estratégico de gestão de pessoas que transforma a forma como empresas constroem cultura, atraem talentos, desenvolvem colaboradores e mensuram resultados.",
    y
  );

  y = addHighlightBox(
    "Não é apenas um software de RH. É uma plataforma de inteligência organizacional que conecta os 4 pilares fundamentais da gestão de pessoas moderna.",
    y
  );

  y = addSubtitle("Os 4 Pilares Estratégicos:", y);
  y = addBulletList([
    "CULTURA: Construção e operacionalização do código de cultura organizacional",
    "ATRAÇÃO: Hunting inteligente com IA e outreach automatizado multicanal",
    "RETENÇÃO: Avaliações comportamentais, 1:1s estruturados e desenvolvimento contínuo",
    "RESULTADOS: Métricas de RH e Calculadora ROIP™ (Retorno sobre Investimento em Pessoas)"
  ], y);

  y += 10;
  y = addSectionTitle("2. PARA QUE SERVE", y);

  const purposes = [
    "Construir uma cultura organizacional forte e operacionalizável, não apenas um documento bonito que fica na gaveta",
    "Atrair os talentos certos de forma inteligente, usando IA para encontrar candidatos em LinkedIn, GitHub e Instagram",
    "Desenvolver e reter colaboradores através de avaliações DISC, feedbacks estruturados e planos de desenvolvimento",
    "Medir o ROI real das iniciativas de pessoas, transformando RH em centro de resultados ao invés de centro de custos",
    "Automatizar processos repetitivos liberando o time de RH para ações estratégicas",
    "Unificar dados de pessoas em uma única plataforma com visão 360° do colaborador"
  ];
  y = addBulletList(purposes, y);

  addPageNumber(2, 8);

  // ============================================
  // PAGE 3 - IMPORTÂNCIA + BENEFÍCIOS
  // ============================================
  doc.addPage();
  y = margin;

  y = addSectionTitle("3. POR QUE É IMPORTANTE", y);

  y = addSubtitle("O Custo Invisível que Destrói Resultados", y);
  y = addParagraph(
    "Segundo a Gallup, empresas com cultura forte têm 72% menos turnover. O custo de substituir um colaborador varia de 50% a 200% do salário anual. Uma empresa com 100 funcionários e 20% de turnover pode estar perdendo R$ 2 milhões por ano sem perceber.",
    y
  );

  y = addHighlightBox(
    "A maioria das empresas não consegue responder: \"Qual o retorno do investimento no último treinamento?\" ou \"Quanto custou o turnover este trimestre?\". A GENTIA responde.",
    y
  );

  y = addSubtitle("O Cenário Atual do RH:", y);
  y = addBulletList([
    "67% dos profissionais de RH gastam mais de 50% do tempo em tarefas operacionais",
    "Apenas 23% das empresas conseguem medir o ROI de suas iniciativas de pessoas",
    "O tempo médio para preencher uma vaga no Brasil é de 45 dias"
  ], y);

  y += 5;
  y = addSectionTitle("4. BENEFÍCIOS", y);

  y = addSubtitle("Resultados Tangíveis:", y);
  const benefits = [
    "Redução de 60% no tempo de contratação com hunting automatizado",
    "Aumento de 40% na retenção com cultura operacionalizada",
    "ROI mensurável em cada iniciativa de pessoas com a Calculadora ROIP™",
    "Economia de 20+ horas/semana em tarefas operacionais de RH",
    "Decisões baseadas em dados, não em achismos"
  ];
  y = addBulletList(benefits, y);

  y = addSubtitle("Resultados Intangíveis:", y);
  const intangibleBenefits = [
    "Employer branding fortalecido com página de carreiras profissional",
    "Cultura viva e praticada, não apenas documentada",
    "Time de RH estratégico e valorizado pela organização",
    "Experiência do candidato e do colaborador diferenciada"
  ];
  y = addBulletList(intangibleBenefits, y);

  addPageNumber(3, 8);

  // ============================================
  // PAGE 4 - FUNCIONALIDADES (Parte 1)
  // ============================================
  doc.addPage();
  y = margin;

  y = addSectionTitle("5. FUNCIONALIDADES", y);

  // Module 1: Cultura
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 1: CULTURA", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const culturaFeatures = [
    "Diagnóstico de Maturidade Cultural com 8 pilares avaliados",
    "Construtor de Código de Cultura com IA generativa",
    "Definição de Valores, Comportamentos Esperados (DOs e DON'Ts)",
    "Rituais organizacionais estruturados e monitorados",
    "Exportação em PDF profissional para compartilhamento"
  ];
  y = addBulletList(culturaFeatures, y);

  y += 5;

  // Module 2: Atração
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 2: ATRAÇÃO (RECRUTAMENTO)", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const atracaoFeatures = [
    "Criação de vagas com IA (job description + ICP automáticos)",
    "Hunting inteligente em LinkedIn, GitHub e Instagram",
    "Outreach automatizado via WhatsApp (Z-API) e Email",
    "ATS completo com Kanban de candidatos e pipeline visual",
    "Entrevistas de fit cultural com IA (áudio + transcrição)",
    "Avaliação DISC para candidatos com match score automático",
    "Página de carreiras personalizável (careers page)",
    "Talent Pool automático para candidatos não selecionados"
  ];
  y = addBulletList(atracaoFeatures, y);

  y += 5;

  // Module 3: Retenção
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 3: RETENÇÃO E DESENVOLVIMENTO", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const retencaoFeatures = [
    "Avaliações DISC para colaboradores existentes",
    "1:1s estruturados com templates e histórico",
    "Onboarding automatizado com checklists personalizáveis",
    "Offboarding estruturado com entrevistas de saída",
    "Gestão de férias e ausências integrada"
  ];
  y = addBulletList(retencaoFeatures, y);

  addPageNumber(4, 8);

  // ============================================
  // PAGE 5 - FUNCIONALIDADES (Parte 2)
  // ============================================
  doc.addPage();
  y = margin;

  // Module 4: Resultados
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 4: RESULTADOS E MÉTRICAS", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const resultadosFeatures = [
    "Calculadora ROIP™ (Retorno sobre Investimento em Pessoas)",
    "Dashboard de métricas de RH em tempo real",
    "Análise de turnover com custos detalhados",
    "Relatórios executivos para C-Level",
    "Benchmarks de mercado para comparação"
  ];
  y = addBulletList(resultadosFeatures, y);

  y += 5;

  // Module 5: Consultoria
  doc.setFillColor(139, 92, 246);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 5: CONSULTORIA (Para Consultorias)", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const consultoriaFeatures = [
    "Gestão multi-tenant para múltiplos clientes",
    "Dashboard do consultor com visão consolidada",
    "Projetos com checkpoints e ações rastreáveis",
    "Time entries para controle de horas",
    "Relatórios de progresso por cliente"
  ];
  y = addBulletList(consultoriaFeatures, y);

  y += 5;

  // Module 6: Engagement
  doc.setFillColor(6, 182, 212);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MÓDULO 6: ENGAGEMENT E GAMIFICAÇÃO", margin + 5, y + 6);
  y += 15;

  setColor(darkColor);
  const engagementFeatures = [
    "Sistema de pontos e badges (GENTIA XP)",
    "Mural de reconhecimentos e celebrações",
    "Calendário de aniversários automatizado",
    "Comunicados internos centralizados",
    "Portal do colaborador personalizado"
  ];
  y = addBulletList(engagementFeatures, y);

  y += 10;
  y = addHighlightBox(
    "Todos os módulos são integrados e compartilham dados, eliminando silos de informação e proporcionando uma visão 360° de cada colaborador.",
    y
  );

  addPageNumber(5, 8);

  // ============================================
  // PAGE 6 - DORES QUE RESOLVE
  // ============================================
  doc.addPage();
  y = margin;

  y = addSectionTitle("6. DORES QUE A GENTIA RESOLVE", y);

  y = addParagraph(
    "Identificamos as principais dores que impedem empresas de ter uma gestão de pessoas efetiva e estratégica:",
    y
  );

  y += 5;

  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth / 2 - 2, 10, "F");
  doc.rect(margin + contentWidth / 2 + 2, y, contentWidth / 2 - 2, 10, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ANTES (Sem GENTIA)", margin + 5, y + 7);
  doc.text("DEPOIS (Com GENTIA)", margin + contentWidth / 2 + 7, y + 7);
  y += 15;

  // Table rows
  const painPoints = [
    ["Turnover alto e imprevisível", "Retenção estratégica com dados preditivos"],
    ["Recrutamento lento e caro", "Hunting automatizado em múltiplas fontes"],
    ["Cultura só existe no papel", "Cultura operacionalizada com rituais"],
    ["RH sem dados para decisões", "Métricas e ROIP™ em tempo real"],
    ["Processos manuais repetitivos", "Automação de onboarding e outreach"],
    ["Candidatos inadequados", "Match cultural + técnico com IA"],
    ["Ferramentas desconectadas", "Ecossistema unificado 360°"],
    ["Employer branding fraco", "Página de carreiras profissional"]
  ];

  doc.setFont("helvetica", "normal");
  setColor(darkColor);
  
  painPoints.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, contentWidth, 12, "F");
    }
    
    doc.setFontSize(9);
    doc.setTextColor(239, 68, 68); // Red for pain
    doc.text(`✗ ${row[0]}`, margin + 3, y + 3);
    
    doc.setTextColor(16, 185, 129); // Green for solution
    doc.text(`✓ ${row[1]}`, margin + contentWidth / 2 + 5, y + 3);
    
    y += 12;
  });

  y += 10;
  setColor(darkColor);
  y = addHighlightBox(
    "Cada dor resolvida representa economia de tempo, redução de custos e aumento de produtividade. A GENTIA transforma problemas em oportunidades de crescimento.",
    y
  );

  addPageNumber(6, 8);

  // ============================================
  // PAGE 7 - DIFERENCIAIS + FAQ
  // ============================================
  doc.addPage();
  y = margin;

  y = addSectionTitle("7. DIFERENCIAIS COMPETITIVOS", y);

  const diferenciais = [
    "Única plataforma com Calculadora ROIP™ - mensure o retorno de cada iniciativa",
    "IA Generativa em todo o fluxo - job descriptions, entrevistas, análises automáticas",
    "Hunting multicanal - LinkedIn, GitHub e Instagram em uma única busca",
    "Outreach automatizado - WhatsApp e Email com personalização por IA",
    "100% LGPD Compliant - dados protegidos e consentimento rastreado",
    "Multi-tenant nativo - ideal para consultorias e grupos empresariais",
    "API aberta para integrações - conecte com seu ERP, folha de pagamento, etc.",
    "Suporte em português - time brasileiro entendendo a realidade local"
  ];
  y = addBulletList(diferenciais, y, "★");

  y += 10;
  y = addSectionTitle("8. PERGUNTAS FREQUENTES", y);

  const faqs = [
    {
      q: "Quanto tempo leva para implementar?",
      a: "O onboarding completo leva de 2 a 4 semanas, dependendo do tamanho da empresa e módulos contratados."
    },
    {
      q: "Preciso trocar minhas ferramentas atuais?",
      a: "Não necessariamente. A GENTIA se integra com as principais ferramentas de mercado e pode complementar seu stack atual."
    },
    {
      q: "A plataforma é segura?",
      a: "Sim. Utilizamos criptografia de ponta, servidores com certificação SOC 2 e somos 100% compliance com a LGPD."
    },
    {
      q: "Funciona para empresas pequenas?",
      a: "Sim! Temos planos desde 10 colaboradores até enterprises com milhares de funcionários."
    },
    {
      q: "O hunting consome créditos do LinkedIn?",
      a: "Não. Utilizamos técnicas de web scraping ético e APIs públicas, sem impactar sua conta do LinkedIn."
    },
    {
      q: "Posso testar antes de contratar?",
      a: "Sim! Oferecemos demonstração guiada e período de teste para você validar o fit com sua empresa."
    }
  ];

  faqs.forEach((faq) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(primaryColor);
    doc.text(`Q: ${faq.q}`, margin, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    setColor(darkColor);
    const answerLines = doc.splitTextToSize(`A: ${faq.a}`, contentWidth - 5);
    doc.text(answerLines, margin, y);
    y += answerLines.length * 5 + 5;
  });

  addPageNumber(7, 8);

  // ============================================
  // PAGE 8 - CTA / CONTATO
  // ============================================
  doc.addPage();
  y = 50;

  // Header banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, y, contentWidth, 50, 5, 5, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Pronto para Transformar", pageWidth / 2, y + 20, { align: "center" });
  doc.text("sua Gestão de Pessoas?", pageWidth / 2, y + 35, { align: "center" });

  y += 70;

  setColor(darkColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const ctaText = "A GENTIA está pronta para ajudar sua empresa a construir uma cultura forte, atrair os melhores talentos, reter colaboradores-chave e provar o valor de cada iniciativa de pessoas.";
  const ctaLines = doc.splitTextToSize(ctaText, contentWidth);
  doc.text(ctaLines, pageWidth / 2, y, { align: "center" });

  y += 35;

  // Contact boxes
  const contactBoxWidth = (contentWidth - 20) / 3;
  const boxY = y;
  
  // Website
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, boxY, contactBoxWidth, 40, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(primaryColor);
  doc.text("Website", margin + contactBoxWidth / 2, boxY + 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  setColor(darkColor);
  doc.text("www.gentia.com.br", margin + contactBoxWidth / 2, boxY + 28, { align: "center" });

  // Email
  doc.roundedRect(margin + contactBoxWidth + 10, boxY, contactBoxWidth, 40, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  setColor(primaryColor);
  doc.text("Email", margin + contactBoxWidth + 10 + contactBoxWidth / 2, boxY + 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  setColor(darkColor);
  doc.text("contato@gentia.com.br", margin + contactBoxWidth + 10 + contactBoxWidth / 2, boxY + 28, { align: "center" });

  // WhatsApp
  doc.roundedRect(margin + (contactBoxWidth + 10) * 2, boxY, contactBoxWidth, 40, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  setColor(primaryColor);
  doc.text("WhatsApp", margin + (contactBoxWidth + 10) * 2 + contactBoxWidth / 2, boxY + 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  setColor(darkColor);
  doc.text("(11) 99999-9999", margin + (contactBoxWidth + 10) * 2 + contactBoxWidth / 2, boxY + 28, { align: "center" });

  y = boxY + 60;

  // CTA Button style
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth / 2 - 50, y, 100, 15, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Agendar Demonstração", pageWidth / 2, y + 10, { align: "center" });

  y += 40;

  // Footer
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  setColor(primaryColor);
  doc.text("GENT.IA", pageWidth / 2, y, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(grayColor);
  doc.text("Inteligência Artificial para Gestão de Pessoas", pageWidth / 2, y + 10, { align: "center" });

  y += 30;

  doc.setFontSize(9);
  doc.text("© 2025 GENTIA. Todos os direitos reservados.", pageWidth / 2, y, { align: "center" });

  addPageNumber(8, 8);

  // Save the PDF
  const fileName = `GENTIA-Apresentacao-Produto-${formatBRT(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
