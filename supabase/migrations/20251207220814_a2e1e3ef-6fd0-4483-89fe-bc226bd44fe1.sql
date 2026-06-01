-- Inserir sugestões para todos os 9 pilares do Evento de Cultura

-- ========================================
-- PILAR 1: HISTÓRIA (8 sugestões)
-- ========================================
INSERT INTO public.event_suggestions_catalog (pillar_number, suggestion_text, event_format, active) VALUES
(1, 'A Fundação e o Propósito Inicial - Contar o "porquê" nasceu a empresa e o que incomodava os fundadores', NULL, true),
(1, 'Desafio Quase Fatal - Crise, pandemia ou momento de caos e como a equipe reagiu com resiliência', NULL, true),
(1, 'Primeira Grande Conquista - O primeiro cliente importante ou meta batida que mostrou o potencial do time', NULL, true),
(1, 'O Erro que Virou Aprendizado Cultural - Uma falha marcante que gerou virada de comportamento', NULL, true),
(1, 'A Construção dos Valores - Como os valores foram definidos e o que inspirou cada um', NULL, true),
(1, 'O Case que Mudou Tudo - Cliente ou colaborador que viveu a cultura de forma transformadora', NULL, true),
(1, 'O Agora: O Recomeço Cultural - O evento como marco de uma nova fase na vivência da cultura', NULL, true),
(1, 'Marcos e Timeline da História - Linha do tempo visual com os principais marcos da empresa', NULL, true),

-- ========================================
-- PILAR 2: CONVIDADOS (6 sugestões)
-- ========================================
(2, 'Especialista/Palestrante sobre Cultura Organizacional - Consultor, autor ou professor que inspire com conhecimento técnico', NULL, true),
(2, 'Cliente Real Impactado pela Cultura - Alguém que conte como foi atendido e como a cultura impactou sua vida', NULL, true),
(2, 'Colaborador ou Líder que Vive os Valores - Alguém da equipe com história forte de transformação cultural', NULL, true),
(2, 'Fundador(a) ou Sócio com Visão do Propósito - Discurso emocional sobre a essência e o sonho da organização', NULL, true),
(2, 'Case de Outra Empresa Referência em Cultura - Benchmarking externo com rituais e aprendizados de outra organização', NULL, true),
(2, 'Artista Convidado (Poeta, Slammer, Ator) - Representar os valores através de arte, teatro ou música', NULL, true),

-- ========================================
-- PILAR 3: BRINDES E SORTEIOS (27 sugestões)
-- ========================================
-- Brindes para Todos
(3, 'Camiseta da Cultura - Camiseta oficial com os valores ou manifesto da empresa', 'presencial', true),
(3, 'Squeeze ou Garrafa Personalizada - Com frase ou valor da cultura', 'presencial', true),
(3, 'Manual da Cultura em Versão Premium - Livreto impresso com layout editorial refinado', 'presencial', true),
(3, 'QR Codes com Mensagens Personalizadas - Cada colaborador recebe mensagem única do líder', NULL, true),
(3, 'Pin ou Botton de Valor - Broche representando um valor específico', 'presencial', true),
(3, 'Certificado de Participação Cultural - Documento assinado pelos líderes', NULL, true),
(3, 'Sachê Aromático da Cultura - Aroma personalizado que remete à identidade da empresa', 'presencial', true),
(3, 'Kit Confidencial de Cultura - Envelope lacrado com itens surpresa representando os valores', 'presencial', true),
(3, 'Caneca Personalizada com Valores - Caneca com design exclusivo do evento', 'presencial', true),
(3, 'Foto Oficial Impressa - Registro do momento com moldura personalizada', 'presencial', true),
-- Sorteios
(3, 'Troféu Guardião da Cultura - Premiação simbólica para multiplicadores exemplares', NULL, true),
(3, 'Vale-Experiência Alinhada aos Valores - Experiência relacionada a um valor (ex: jantar em família)', NULL, true),
(3, 'Assinatura de Plataforma de Desenvolvimento - Curso, app ou ferramenta de crescimento pessoal', NULL, true),
(3, 'Vale-Presente para Uso Livre - Liberdade de escolha como símbolo de confiança', NULL, true),
(3, 'Kit de Liderança Cultural - Livros, caderno e materiais sobre cultura e propósito', NULL, true),
(3, 'Day Off Cultural - Dia de folga para atividade significativa', NULL, true),
(3, 'Caixa Surpresa de Valor - Cada caixa contém itens relacionados a um valor específico', NULL, true),
-- Ideias Criativas
(3, 'Kit Aromaterapia da Cultura - Óleos essenciais representando cada valor', 'presencial', true),
(3, 'Planner Cultural do Ano - Agenda com reflexões mensais sobre os valores', NULL, true),
(3, 'Chaveiro Simbólico - Objeto que representa a "chave" para a cultura', 'presencial', true),
(3, 'Livro Dedicado pelo CEO - Exemplar com dedicatória manuscrita', NULL, true),
(3, 'Caixa Lembrete de Valor - Item para mesa de trabalho com mensagem motivacional', 'presencial', true),
(3, 'Mouse Pad com Manifesto - Frase da cultura sempre visível no trabalho', 'presencial', true),
(3, 'Baralho de Valores - Cartas com situações e reflexões sobre cada valor', NULL, true),
(3, 'Kit Autocuidado - Itens de bem-estar alinhados ao valor de equilíbrio', 'presencial', true),
(3, 'Mini-Poster Emoldurado - Arte visual da cultura para decorar o ambiente', 'presencial', true),
(3, 'Caderno de Ideias Culturais - Espaço para registrar como viver os valores no dia a dia', NULL, true),

-- ========================================
-- PILAR 4: ARTEFATOS (26 sugestões)
-- ========================================
-- Visuais
(4, 'Backdrop Instagramável - Painel para fotos com elementos da cultura', 'presencial', true),
(4, 'Linha do Tempo Visual - Painel físico mostrando a evolução da empresa e cultura', 'presencial', true),
(4, 'Adesivagem Temática do Espaço - Paredes e ambientes transformados com a identidade cultural', 'presencial', true),
(4, 'Árvore da Cultura Interativa - Estrutura onde colaboradores penduram mensagens ou compromissos', 'presencial', true),
(4, 'Vídeo dos Bastidores da Cultura - Making of mostrando como a cultura é vivida no dia a dia', NULL, true),
-- Simbólicos
(4, 'Sino da Cultura - Tocado em momentos de celebração ou conquista cultural', 'presencial', true),
(4, 'Bússola ou Compasso Simbólico - Representando direção e propósito', 'presencial', true),
(4, 'Quadro dos Fundadores - Painel com fotos e história dos fundadores', 'presencial', true),
(4, 'Cápsulas de Valor - Objetos que representam fisicamente cada valor', 'presencial', true),
(4, 'Totem dos Valores - Estrutura vertical com os valores em destaque', 'presencial', true),
-- Textuais
(4, 'Manifesto Impresso em Grande Formato - Declaração cultural em tamanho poster', 'presencial', true),
(4, 'Cartões de Valor Individuais - Cada pessoa recebe cartão com seu valor destaque', NULL, true),
(4, 'Frases no Teto ou Piso - Mensagens culturais em locais inesperados', 'presencial', true),
(4, 'Mural de Histórias - Espaço para colaboradores compartilharem vivências da cultura', 'presencial', true),
(4, 'Livro de Ouro da Cultura - Registro de assinaturas e compromissos', 'presencial', true),
-- Vestuário
(4, 'Camisetas Temáticas por Valor - Cada time ou pessoa com cor/design do seu valor', 'presencial', true),
(4, 'Crachás Temáticos do Evento - Identificação personalizada com elementos culturais', 'presencial', true),
(4, 'Pins e Bottons Colecionáveis - Conjunto de broches representando cada valor', 'presencial', true),
(4, 'Faixas ou Lenços Simbólicos - Acessório que identifica multiplicadores ou times', 'presencial', true),
-- Interativos
(4, 'Jogo de Cartas da Cultura - Dinâmica com situações e reflexões sobre valores', NULL, true),
(4, 'QR Codes com Vídeos de Depoimentos - Escaneáveis espalhados pelo espaço', 'presencial', true),
(4, 'Painel de Votação ao Vivo - Colaboradores votam em tempo real sobre temas culturais', NULL, true),
(4, 'Caixa de Sugestões Culturais - Espaço para ideias sobre como fortalecer a cultura', 'presencial', true),
(4, 'Espelho com Mensagem - "Você está olhando para um guardião da cultura"', 'presencial', true),
(4, 'Mapa da Cultura - Representação visual de como os valores se conectam', NULL, true),
(4, 'Certificado de Compromisso Cultural - Documento formal de adesão aos valores', NULL, true),

-- ========================================
-- PILAR 5: EXPERIÊNCIA (34 sugestões)
-- ========================================
-- Auditiva
(5, 'Trilha Sonora Personalizada - Playlist criada especialmente para o evento', NULL, true),
(5, 'Juramento Coletivo da Cultura - Momento de declaração em conjunto dos valores', NULL, true),
(5, 'Sino ou Gongo Cerimonial - Som que marca momentos importantes do evento', 'presencial', true),
(5, 'Depoimentos em Áudio - Gravações de colaboradores sobre a cultura', NULL, true),
(5, 'Vídeo de Abertura Impactante - Produção audiovisual que abre o evento com emoção', NULL, true),
(5, 'Podcast ao Vivo sobre Cultura - Gravação de episódio especial durante o evento', NULL, true),
-- Visual
(5, 'Backdrop Instagramável para Fotos - Cenário especial para registros', 'presencial', true),
(5, 'Linha do Tempo Interativa - Painel onde pessoas podem adicionar suas memórias', 'presencial', true),
(5, 'Projeção Mapeada nos Ambientes - Imagens e vídeos projetados em superfícies do espaço', 'presencial', true),
(5, 'Galeria de Fotos Históricas - Exposição visual da trajetória da empresa', 'presencial', true),
-- Sinestésica
(5, 'Jogo de Cartas Interativo - Dinâmica com situações e dilemas culturais', NULL, true),
(5, 'Kit Confidencial Surpresa - Envelope lacrado com itens sensoriais da cultura', 'presencial', true),
(5, 'Pulseiras de Identificação por Valor - Cada cor representa um valor', 'presencial', true),
(5, 'Dinâmicas Físicas de Integração - Atividades que movimentam o corpo e conectam pessoas', 'presencial', true),
-- Olfativa
(5, 'Aroma Personalizado do Evento - Cheiro exclusivo que marca a memória', 'presencial', true),
(5, 'Sachês Aromáticos como Brinde - Cada pessoa leva o aroma para casa', 'presencial', true),
-- Paladar
(5, 'Welcome Coffee Temático - Recepção com comidas que remetem à cultura', 'presencial', true),
(5, 'Almoço ou Jantar Temático - Refeição com elementos visuais da cultura', 'presencial', true),
(5, 'Doces com Frases dos Valores - Bombons ou biscoitos personalizados', 'presencial', true),
(5, 'Drinks dos Valores - Cada bebida representa um valor específico', 'presencial', true),
(5, 'Bolo Comemorativo da Cultura - Sobremesa especial com design cultural', 'presencial', true),
-- Pós-Evento
(5, 'Mini-Livro de Memórias do Evento - Publicação com fotos e destaques', NULL, true),
(5, 'Foto Oficial Impressa para Todos - Registro profissional do momento', 'presencial', true),
(5, 'Certificado Digital de Participação - Comprovante compartilhável nas redes', NULL, true),
(5, 'Vídeo Melhores Momentos - Edição especial enviada após o evento', NULL, true),
(5, 'Mensagem Personalizada do CEO - Carta ou vídeo de agradecimento individual', NULL, true),
-- Criativas
(5, 'Experiência de Realidade Aumentada - Elementos virtuais sobrepostos ao evento', NULL, true),
(5, 'Photobooth com Props Culturais - Cabine de fotos com adereços temáticos', 'presencial', true),
(5, 'Pista de Dança Silenciosa - Fones de ouvido para festa sem som ambiente', 'presencial', true),
(5, 'Caminho dos Valores - Percurso físico passando por estações de cada valor', 'presencial', true),
(5, 'Totem de Depoimentos - Estação para gravar mensagens sobre a cultura', 'presencial', true),
(5, 'Carta para o Eu do Futuro - Mensagem que será entregue em 1 ano', NULL, true),
(5, 'Mural de Gratidão - Espaço para agradecimentos entre colegas', 'presencial', true),
(5, 'Quiz Cultural com Premiação - Perguntas sobre a história e valores da empresa', NULL, true),

-- ========================================
-- PILAR 6: DINÂMICAS DE ENERGIA (18 sugestões)
-- ========================================
-- Antes do Evento
(6, 'Kit Confidencial Enviado Previamente - Caixa surpresa para abrir no evento', 'presencial', true),
(6, 'Desafio no WhatsApp - Missões culturais antes do grande dia', NULL, true),
(6, 'Playlist Colaborativa - Cada um adiciona música que representa um valor', NULL, true),
(6, 'Sorteio Teaser - Revelar pequenos prêmios que aumentam expectativa', NULL, true),
(6, 'Quiz Cultural Pré-Evento - Perguntas sobre história e valores como aquecimento', NULL, true),
(6, 'Vídeo Contagem Regressiva - Série de teasers nos dias anteriores', NULL, true),
-- Durante o Evento
(6, 'Dinâmica Quebra-Gelo com Valores - Atividade inicial para conexão entre participantes', NULL, true),
(6, 'Desafio em Times por Valor - Competição saudável representando cada valor', NULL, true),
(6, 'Teatro da Cultura - Encenação de situações que representam os valores', NULL, true),
(6, 'Corrida ou Gincana Cultural - Atividade física com missões relacionadas à cultura', 'presencial', true),
(6, 'Entrega do Pin do Valor - Momento cerimonial de reconhecimento', NULL, true),
(6, 'Votação ao Vivo - Participantes escolhem temas ou multiplicadores em tempo real', NULL, true),
(6, 'Totem Humano dos Valores - Formação física representando os valores', 'presencial', true),
-- Depois do Evento
(6, 'Valor da Semana no Grupo - Cada semana focando em um valor específico', NULL, true),
(6, 'Canal de Reconhecimento Contínuo - Espaço para celebrar quem vive a cultura', NULL, true),
(6, 'Cápsula do Tempo - Mensagens para abrir em data futura', NULL, true),
(6, 'Vídeo Pós-Evento com Destaques - Compilação enviada para prolongar a emoção', NULL, true),
(6, 'Jogo da Cultura no Onboarding - Dinâmica para novos colaboradores conhecerem os valores', NULL, true),

-- ========================================
-- PILAR 7: LOCAL DO EVENTO (22 sugestões)
-- ========================================
-- Presencial
(7, 'Auditório ou Centro de Convenções - Espaço tradicional com estrutura completa', 'presencial', true),
(7, 'Hotel com Infraestrutura de Eventos - Ambiente profissional com serviços integrados', 'presencial', true),
(7, 'Sede da Empresa Transformada - Escritório decorado especialmente para o evento', 'presencial', true),
(7, 'Espaço Verde ou Sítio - Ambiente ao ar livre para conexão com a natureza', 'presencial', true),
(7, 'Espaço Cultural (Teatro, Museu) - Local com identidade artística e inspiradora', 'presencial', true),
(7, 'Rooftop ou Terraço - Vista panorâmica para momento especial', 'presencial', true),
(7, 'Lugar Histórico da Empresa - Local onde tudo começou ou marco importante', 'presencial', true),
(7, 'Espaço de Coworking Premium - Ambiente moderno e colaborativo', 'presencial', true),
(7, 'Ambiente Imersivo Temático - Espaço decorado especificamente para a cultura', 'presencial', true),
(7, 'Restaurante Privativo - Ambiente intimista para times menores', 'presencial', true),
-- Online
(7, 'Plataforma Gamificada de Eventos - Ambiente virtual interativo e envolvente', 'online', true),
(7, 'Kits Enviados para Casa - Materiais físicos para experiência sensorial remota', 'online', true),
(7, 'Intervalos com Dinâmicas Interativas - Pausas programadas com atividades online', 'online', true),
(7, 'Facilitador Digital Especializado - Profissional para manter engajamento virtual', 'online', true),
(7, 'Gravação Profissional para Replay - Produção de qualidade para acesso posterior', 'online', true),
(7, 'Salas de Breakout Temáticas - Grupos menores para discussões específicas', 'online', true),
(7, 'Backgrounds Virtuais da Cultura - Cenários personalizados para videochamadas', 'online', true),
-- Híbrido
(7, 'Ponto Âncora Físico + Transmissão - Local principal com streaming para remotos', 'hibrido', true),
(7, 'Sincronização de Momentos ao Vivo - Atividades simultâneas presencial e online', 'hibrido', true),
(7, 'Embaixadores Locais em Filiais - Multiplicadores conduzindo em cada localidade', 'hibrido', true),
(7, 'QR Codes Compartilhados - Experiências digitais acessíveis de qualquer lugar', 'hibrido', true),
(7, 'Mural Digital Colaborativo - Participação de todos independente da localização', 'hibrido', true),

-- ========================================
-- PILAR 8: MULTIPLICADORES (15 sugestões)
-- ========================================
-- Perfis de Multiplicadores
(8, 'Colaboradores que Vivem os Valores Naturalmente - Pessoas respeitadas pela equipe, com iniciativa e propósito', NULL, true),
(8, 'Líderes Operacionais (Coordenadores, Supervisores) - Quem influencia na rotina direta do time', NULL, true),
(8, 'Funcionários Antigos com Histórico Emocional - Veteranos que representam a memória viva da cultura', NULL, true),
(8, 'Novos Talentos Alinhados - Recém-chegados que já demonstram comportamento exemplar', NULL, true),
(8, 'Representante por Valor - Uma pessoa como "guardiã" de cada valor específico', NULL, true),
(8, 'Multiplicador por Área ou Unidade - Embaixadores locais em cada departamento ou filial', NULL, true),
-- Métodos de Seleção
(8, 'Votação Interna pelos Colegas - Time indica quem melhor representa cada valor', NULL, true),
(8, 'Análise de Desempenho Comportamental - Avaliação focada em atitudes, não só resultados', NULL, true),
(8, 'Observação e Indicação da Liderança - Gestores identificam quem influencia positivamente', NULL, true),
-- Ações no Evento
(8, 'Apresentar os Valores em Primeira Pessoa - Multiplicadores contam como vivem cada valor', NULL, true),
(8, 'Conduzir Dinâmicas de Valor - Facilitar atividades relacionadas aos valores que representam', NULL, true),
(8, 'Entregar Brindes ou Reconhecimentos - Ser o portador de premiações simbólicas', NULL, true),
(8, 'Dar Depoimentos Reais - Compartilhar histórias pessoais de vivência da cultura', NULL, true),
(8, 'Liderar o Juramento da Cultura - Conduzir o momento de compromisso coletivo', NULL, true),
(8, 'Ser os Primeiros a Receber o Pin do Valor - Inaugurar simbolicamente os artefatos', NULL, true),

-- ========================================
-- PILAR 9: FINAL EMOCIONAL (11 sugestões)
-- ========================================
(9, 'Vídeo Final com Narrativa Emocional - Produção audiovisual que resume e emociona', NULL, true),
(9, 'Juramento Coletivo da Cultura - Declaração em conjunto dos compromissos com os valores', NULL, true),
(9, 'Momento de Luz (Chama da Cultura) - Ritual com velas ou luzes representando união', 'presencial', true),
(9, 'Entrega de Brinde/Pin com Significado - Objeto simbólico entregue em momento especial', NULL, true),
(9, 'Fala Emocional dos Fundadores - Discurso de gratidão e visão de futuro', NULL, true),
(9, 'Foto Oficial com Aplauso Final - Registro coletivo celebrando o momento', NULL, true),
(9, 'Carta para o Futuro / Cápsula do Tempo - Mensagens para serem abertas posteriormente', NULL, true),
(9, 'Brinde Coletivo com Trilha Emocional - Celebração com bebida e música significativa', 'presencial', true),
(9, 'Trilha Sonora Final com Confetti ou Balões - Encerramento festivo e memorável', 'presencial', true),
(9, 'Kit Pós-Evento de Agradecimento - Presente final para levar a experiência para casa', NULL, true),
(9, 'Assinatura do Mural de Compromisso - Cada pessoa registra seu nome e compromisso', NULL, true);