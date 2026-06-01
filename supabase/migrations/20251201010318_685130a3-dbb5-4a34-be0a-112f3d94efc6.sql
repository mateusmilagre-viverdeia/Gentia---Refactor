-- Create behaviors_reference table to store behavior examples for each value
CREATE TABLE behaviors_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value_label TEXT NOT NULL,
  value_aliases TEXT[],
  dos TEXT[] NOT NULL,
  donts TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE behaviors_reference ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active behavior references
CREATE POLICY "Anyone can read active behavior references"
ON behaviors_reference
FOR SELECT
USING (active = true);

-- Insert all behavior references provided by the user

-- Senso de dono / Comprometimento / Compromisso / Responsabilidade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Senso de dono',
  ARRAY['Comprometimento', 'Compromisso', 'Responsabilidade'],
  ARRAY[
    'Sendo pontual e zelando pelo tempo do cliente interno ou externos',
    'Tendo iniciativa para executar suas responsabilidades antes de ser solicitado ou cobrado',
    'Sendo comprometido com seus horarios, prazos e tarefas',
    'Focando no seu e não no que os outros estão fazendo',
    'Cumprindo o que promete',
    'Avaliar melhor preços antes de compras',
    'Usando veículos da casa antes de agregados',
    'Adquirindo para o estoque somente o necessário',
    'Tomar decisão como se a empresa fosse sua e qual decisão tomaria',
    'Fazer pela empresa como se fosse pra mim',
    'Buscar sempre o melhor custo beneficio',
    'ATENÇÃO E CUIDADO AOS DETALHES',
    'Sempre cuidando e prezando por um ambiente limpo e organizado',
    'Agimos de acordo com o que é melhor para a empresa, equipe e indivíduo. Nesta ordem.',
    'Assumimos a responsabilidade.',
    'Cuidando do patrimonio da empresa como se fosse meu',
    'Tendo Iniciativa e proatividade',
    'Tendo brilho nos olhos e fazendo a diferença',
    'Olhando para a empresa como um todo',
    'Fazendo até dar certo',
    'Assumindo as responsabilidades',
    'Tratando as ações do dia a dia como se fosse o dono',
    'Resolvendo sempre as questões',
    'Tendo iniciativa',
    'Tendo senso de dono',
    'Assumindo riscos',
    'Assumindo o compromisso',
    'Falando "Se prometemos que vamos fazer, vamos fazer"',
    'Fazendo o que precisa ser feito, a hora que for preciso e sem ter que ser cobrado',
    'Sendo consistente em suas ações, mantendo a palavra e cumprindo os compromissos assumidos.'
  ],
  ARRAY[
    'Assumindo compromisso com alguem e não cumprindo ou entregando de qualquer jeito.',
    'Culpar fatores externos e terceiros pelas não entregas e compromissos.',
    'FICAR DANDO DESCULPAS E SE JUSTIFICANDO',
    'Achando que pode tudo e nao tem compromisso com horarios, reunioes, supervisao do lider e entrega de resultados',
    'Prolongando os problemas',
    'Comprando coisas sem cotações',
    'Deixando a frota parada e rodar com agregados',
    'Comprando itens que não vai utilizar',
    'Não tomando decisão sem a certeza de que é o melhor para a empresa ("Pensamento BORA")',
    'Cumprindo a missão rápida sem eficiência (custo, burlando processos)',
    'Fazendo de qualquer jeito',
    'Falta de comprometimento com o negócio, time e clientes.',
    'Fazendo apenas aquilo que foi pedido',
    'Tendo preguiça',
    'Falta de ambição',
    'Prolongando os problemas',
    'Ser mais um, em mais um dia normal de trabalho',
    'Olhando para o proprio umbigo',
    'Dizendo "Não é da minha responsabilidade"',
    'Não se importando com os resultados',
    'Não estando presente',
    'Não tendo proatividade e iniciativa em resolver as coisas',
    'Não cumprindo com o que promete',
    'Não honrando seus compromissos e não assumindo as consequências de suas ações',
    'Na zona de conforto',
    'Não tomar iniciativa e Esperar a direção ou que alguem peça para fazer'
  ]
);

-- Melhoria continua / Mentalidade de crescimento / Desenvolvimento
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Melhoria continua',
  ARRAY['Mentalidade de crescimento', 'Desenvolvimento'],
  ARRAY[
    'Nos abrimos a novos conhecimentos e novas formas de fazer',
    'Quando inovamos com solucoes simples',
    'Quando usamos a criatividade natural',
    'Melhorar com ser humano',
    'Evoluir onde são nossas fraquezas',
    'Melhorando a empresa dia apos dia',
    'Buscando ser melhor todos os dias',
    'Fazendo mais com menos',
    'Qualidade e inovação',
    'Buscando constantemente a evolução na vida pessoal e profissional',
    'Sendo aberto ao receber feedback',
    'Se abrindo a novos conhecimentos e novas formas de fazer',
    'Evoluindo onde são as nossas fraquezas',
    'BUSCAR ESTUDAR',
    'Sempre faremos melhor do que fizemos antes.',
    'SENDO obsessivos em sermos  O MELHOR',
    'Aprendendo de forma contínua o que for necessário e ir executando',
    'Buscando aprender com as melhores referências'
  ],
  ARRAY[
    'Falando "eu sempre fiz assim"',
    'Não se abrindo a novos aprendizados',
    'Resistindo à mudanças propostas',
    'Não querer buscar coisas novas e novos conhecimentos',
    'Ficar dando desculpas para não se desenvolver',
    'Trabalhando apenas para fazer a empresa funcionar e não melhorar',
    'Fazendo apenas o básico',
    'Procrastinando a busca de novos conhecimento',
    'Não se atualizando e ficando parado no tempo',
    'Achando que sabe tudo e não querendo aprender coisas novas',
    'Se acomodando',
    'Não reconhecendo os erros',
    'Reclamando sem dar soluções',
    'Fazendo apenas o básico',
    'PESSOAS QUE NÃO BUSCAM APRIMORAR E APRENDER',
    'SER A MESMA PESSOA TODOS OS DIAS E NÃO ACEITAR MUDAR',
    'Se acomodando e não querendo treinar, achando que já domina tudo',
    'Não buscando novas estratégias em prol do resultado',
    'Sendo reativo ao receber feedbacks'
  ]
);

-- Satisfacao do cliente
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Satisfacao do cliente',
  ARRAY['Cliente primeiro', 'Foco no cliente'],
  ARRAY[
    'Na dúvida, priorizamos o cliente (Cliente primeiro)',
    'Nosso foco é o cliente, do ponto de vista DO cliente, e não do nosso',
    'Querendo sempre entregar o melhor para os clientes internos e externos',
    'Se antecipando e sendo rápido quando o assunto é cliente interno ou externo',
    'Ouvindo mais e falando menos com o cliente / Ouvir o cliente com atenção',
    'Não sabendo fazer, procuro quem sabe',
    'SENDO TRANSPARENTE COM O CLIENTE',
    'SER ACOLHEDOR COM O CLIENTE',
    'MENTALIDADE DE QUERER AJUDAR O CLIENTE E ENTENDER SUAS NECESSIDADES',
    'CUMPRINDO OS ACORDOS COM O CLIENTE',
    'Entregando a melhor experiencia ao cliente',
    'Priorizando sempre o cliente',
    'Comunicar em reuniões periodicas, tudo para os clientes',
    'Entender do negócio BORA para encontrar a solução do cliente',
    'Se preocupar com o resultado do cliente'
  ],
  ARRAY[
    'Desconectando do cliente sem ter resolvido seu problema',
    'Fazendo de qualquer jeito e não nos importando com a experiência do cliente',
    'Demorando em dar o retorno ao cliente',
    'NÃO TENDO EMPATIA E NÃO SE COLOCAR NO LUGAR DO CLIENTE',
    'DEMORAR PARA ATENDER O CLIENTE',
    'SENDO INDIFERENTE OU FICAR DE MAL HUMOR AO INTERAGIR COM O CLIENTE',
    'Oferencendo produtos que não atender as necessidades do cliente',
    'Deixando cliente sem informação ou solução',
    'Discutindo com o cliente',
    'Faltando com o retorno sobre as pautas anteriores dos clientes',
    'Sendo reativo com o cliente'
  ]
);

-- Integridade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Integridade',
  ARRAY['Ética', 'Honestidade'],
  ARRAY[
    'Não passando por cima de valores éticos e morais',
    'Respeitando ao proximo',
    'Assumindo nossos erros',
    'NÃO ACEITANDO ALGO QUE DISTORÇA COM NOSSOS VALORES',
    'Fazer o que é certo do ponto de vista ético e moral, e não o que é fácil',
    'Sendo honesto, ético e justo com o próximo',
    'Entendendo os lados para não praticar injustiça',
    'Respeitando o próximo como ele é',
    'Entregando ao cliente o que lhe foi prometido',
    'RESPEITANDO AO PROXIMO',
    'Valorizando aquilo que é abencoado e fruto do meu trabalho',
    'Sendo transparente e honesto com seus pares e dos acontecimentos',
    'Não tirando vantagem do próximo',
    'Sendo integro, ético e honesto em todas as nossas ações',
    'Denunciando o que não é correto ou atitudes suspeitas',
    'Agindo com integridade em todas as áreas de sua vida, de acordo com seus princípios morais e valores.',
    'Fazendo o que é certo, mesmo quando ninguém está observando.',
    'Sendo justo em todas as situações'
  ],
  ARRAY[
    'Resultado a qualquer custo',
    'Omitindo dados e informações',
    'Ser machista, homofóbico, sexista, racista ou qualquer outra discriminação/preconceito',
    'Agir de má fé',
    'Transferindo sua responsabilidade para outra pessoa',
    'Falando mentira da empresa ou de outros colaboradores',
    'Exigindo que o outro cumpra a parte dele sem você cumprir a sua',
    'Praticando injustiça, enganando, burlando ou escondendo algo',
    'Promovendo e fomentando fofocas',
    'Vazando informações sigilosas',
    'Sendo desleal ou Prejudicando alguem ou o négocio em benefício próprio',
    'Promovendo declinio do ambiente para auto promoção, ganhos pessoais ou prejudicar o colega',
    'Vendendo algo que não faz sentido para o cliente',
    'OMITINDO, MENTINDO E ENGANANDO COISAS E PESSOAS',
    'BURLANDO REGRAS',
    'DESRESPEITANDO O PROXIMO',
    'Vendo as pessoas fazer algo errado ou desonesto e não fazer nada',
    'Vendo oportunidade de lesar a empresa',
    'Apresentando comportamentos desonestos, como mentir, enganar, ocultar informações ou agir de maneira manipuladora.',
    'Buscando vantagens pessoais em detrimento da verdade e dos princípios morais.',
    'Agindo de forma discriminatória, desrespeitosa, preconceituosa, intimidadora ou abusiva em relação às outras pessoas.'
  ]
);

-- Resultado
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Resultado',
  ARRAY['Foco em resultado', 'Meta'],
  ARRAY[
    'TRAZER COISAS NOVAS PARA ALCANÇAR RESULTADOS',
    'PENSANDO, SABENDO E BUSCANDO SEMPRE A META',
    'LUTANDO ATÉ O ULTIMO DIA PELA META',
    'TER SANGUE NO OLHO E SE COMPROMETER A ENTREGAR O QUE DÁ RESULTADO',
    'NÃO SE CONTENTAR EM SÓ ATINGIR METAS, SEMPRE BUSCAR SUPERÁ-LAS',
    'SABER DE SUAS METAS DIÁRIAS, SEMANAIS E MENSAIS',
    'ENTREGAR RESULTADO E COM EXCELENCIA E SEM PERDER A QUALIDADE',
    'OS MEMBROS DA EQUIPE FAZEM AS COISAS NO PRAZO E ATENDEM UM ALTO PADRÃO DE EXCELENTE',
    'SER O MELHOR EM TUDO QUE FAZEMOS',
    'GASTAMOS ENERGIA SÓ COM COISAS QUE DAO RESULTADOS E NOS APROXIMAM DA META',
    'Tomamos decisões baseadas em dados. Trabalhamos com indicadores e metas claras.',
    'Sabendo a situação dos principais indicadores da empresa. O tempo todo',
    'Primeiro resultado, depois equilibrio',
    'Priorizando sempre por aquilo que dá resultado e vai te levar em direção à meta',
    'Valorizando resultado e dados, não horas trabalhadas e hierarquia.'
  ],
  ARRAY[
    'Não se importando em não ter batido as metas',
    'FALANDO "não vai dar…"',
    'CULPANDO fatores externos  pelo nosso fracasso',
    'Tendo atitudes pessimistas e céticas sobre os resultados',
    'Não traçando estratégias para o cumprimento das metas',
    'SEGURANDO VENDAS PARA BATER METAS',
    'NÃO SE AUTO AVALIAR',
    'NÃO SE AUTO MOTIVAR EM PROL DOS RESULTADOS',
    'DESCONHECER SUAS METAS',
    'DESISTINDO DE UMA META ANTES DO MÊS TERMINAR',
    'NÃO CUMPRINDO OS PRAZOS E ACORDOS',
    'NÃO SE INCOMODAR QUANDO NÃO BATER METAS',
    'Culpar fatores externos ou dar desculpas pelo não alcance das metas',
    'Não ficar incomodado se não bater a meta e ficar apenas justificando fracasso todos os dias.',
    'Não entregando suas metas e não tendo estratégias para o cumprimento delas.'
  ]
);

-- O Cliente é REI
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'O Cliente é REI',
  ARRAY['Cliente rei'],
  ARRAY[
    'Na dúvida, priorizamos o cliente (Cliente primeiro)',
    'Nosso foco é o cliente, do ponto de vista DO cliente, e não do nosso',
    'Querendo sempre entregar o melhor para os clientes internos e externos',
    'Se antecipando e sendo rápido quando o assunto é cliente interno ou externo'
  ],
  ARRAY[
    'Focando sempre pelo ponto de vista financeiro e não pelo ponto do cliente',
    'Fazendo de qualquer jeito e não nos importando com a experiência do cliente',
    'Não se importando com o resultado dos nossos clientes internos e externos'
  ]
);

-- Gratidão
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Gratidão',
  ARRAY['Gratidao'],
  ARRAY[
    'Sendo positivo, otimista inclusive diante de problemas e desafios',
    'Tendo a mentalidade que temos muito mais coisas para agradecer do que para reclamar',
    'Buscando solução para os problemas, ao invés de reclamar dos problemas'
  ],
  ARRAY[
    'Reclamando de tudo, da comida, do dinheiro, do trânsito',
    'Sempre de mal humor',
    'Sempre com mimimi',
    'Nunca está bom',
    'Só trazendo problemas'
  ]
);

-- Transparencia com Respeito
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Transparencia com Respeito',
  ARRAY['Transparência', 'Respeito'],
  ARRAY[
    'Falando sobre as pessoas com quem trabalha o que falaria diretamente para elas, com intuito construtivo.',
    'Compartilhar abertamente as próprias vulnerabilidades, erros, pedidos de ajuda',
    'Você sempre compartilha informações relevantes internamente, mesmo que se sinta desconfortável',
    'Você admite seus erros e compartilha o que aprendeu'
  ],
  ARRAY[
    'Atacando ou ferindo alguém',
    'Não questionando algo que acredita ser errado, por medo de represália',
    'Quando fofocamos ao invés de dar feedback e expressar nossas opiniões',
    'Dedo demais para falar',
    'Sendo reativo ao receber feedbacks'
  ]
);

-- Resultado e equilibrio, nesta ordem
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Resultado e equilibrio, nesta ordem',
  ARRAY['Resultado e equilíbrio'],
  ARRAY[
    'Sabendo a situação dos principais indicadores da empresa. O tempo todo',
    'Primeiro resultado, depois equilibrio',
    'Priorizando sempre por aquilo que dá resultado e vai te levar em direção à meta',
    'Valorizando resultado e dados, não horas trabalhadas e hierarquia.',
    'Tomar decisão rápido, olhando para dados'
  ],
  ARRAY[
    'Primeiro equilibrio, depois resultado',
    'Ser Workaholic, Ter uma vida sedentária e não cuidar da saúde',
    'Culpar fatores externos ou dar desculpas pelo não alcance das metas',
    'Não ficar incomodado se não bater a meta e ficar apenas justificando fracasso todos os dias.',
    'Não entregando suas metas e não tendo estratégias para o cumprimento delas.'
  ]
);

-- Liberdade com responsabilidade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Liberdade com responsabilidade',
  ARRAY['Liberdade', 'Autonomia'],
  ARRAY[
    'Missão aceita é missão cumprida! Nossa palavra é sagrada.',
    'Fazendo o que tem que ser feito e o que é certo e esperado, sem ter que ser cobrado',
    'Fazendo o que é melhor para a empresa, times e individuo, nesta ordem',
    'Sendo livre para fazer o que quiser, na hora que quiser, no lugar que quiser, desde que tenha responsabilidade e entrega resultado',
    'Confiando um no outro para executar as ações sem aprovação prévia.'
  ],
  ARRAY[
    'Não alinhando sua autonomia com o trabalho colaborativo e comunicação com a equipe',
    'Achando que pode tudo e nao tem compromisso com horarios, reunioes, supervisao do lider e entrega de resultados',
    'Assumindo compromisso com alguem e não cumprindo ou entregando de qualquer jeito.',
    'Culpar fatores externos e terceiros pelas não entregas e compromissos.',
    'Tomando ações que julga correta que nao estão alinhadas com nossa cultura e estratégia acordada.'
  ]
);

-- Mentalidade de Crescimento
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Mentalidade de Crescimento',
  ARRAY['Growth mindset'],
  ARRAY[
    'Tendo a mentalidade que tudo pode ser feito melhor, mais rapido e mais barato.',
    'Mentalidade que sempre dá para melhorar',
    'Testando rápido, errando rápido e corrigindo rápido.',
    'Trabalhando para fazer a empresa melhorar'
  ],
  ARRAY[
    'Fazer apenas o básico',
    'Não buscar evolução na vida pessoal, intelectual e profissional',
    'Ser a mesma pessoa todos os dias e não querer mudar para melhor',
    'Esperando as coisas cairem no colo',
    'Trabalhando para fazer a empresa apenas funcionar'
  ]
);

-- Segurança (SSMA)
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Segurança',
  ARRAY['SSMA', 'Segurança no trabalho'],
  ARRAY[
    'Respeitando as normas SSMA e seu plano de emergência',
    'Manipulando produtos quimicos de acordo com as regras do "CÓDIGO S".',
    'Estando atento às mudanças de cenário, vazamentos, odores e ruídos em seu ambiente de trabalho',
    'Tendo a mentalidade que segurança e prevenção nunca são demais',
    'Notificando toda e qualquer ocorrencia de acidente/incidente ou melhorias'
  ],
  ARRAY[
    'Operando equipamentos que não tenha sido treinado',
    'Não seguindo os procedimentos de segurança',
    'Tendo atos inseguros e colocando voce ou outros em risco',
    'Vendo situações inseguras e não atuar ou comunicar',
    'Não zelando ou comunicando uso dos kits coletivos de segurança e emergência'
  ]
);

-- Excelência
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Excelência',
  ARRAY['Excelencia'],
  ARRAY[
    'Tendo a mentalidade que tudo pode ser feito melhor, mais rápido e mais barato',
    'Se antecipando aos problemas e criando tratativas e soluções',
    'Levando sempre a melhor experiencia aos clientes internos e externos',
    'Buscando sempre formas de simplificar e melhorar as coisas',
    'Buscando sempre os mais altos padrões'
  ],
  ARRAY[
    'Sendo uma pessoa com cabeça e mentalidade fechada',
    'Fazendo de qualquer jeito',
    'Entregando no prazo porém sem qualidade',
    'Comunicando tardiamente ou de forma errada',
    'Repetindo erros do passado'
  ]
);

-- Colaboração
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Colaboração',
  ARRAY['Trabalho em equipe', 'Time'],
  ARRAY[
    'Cuidando das pessoas para além das relações profissionais',
    'Pensando sempre no que vai ser bom para a empresa, antes de pensar no que é melhor para os times e individuos',
    'Se preocupando com o time e o coletivo',
    'Trabalhando em equipe e suportando os que necessitam',
    'Sendo receptivo a feedbacks, reconhecimentos, orientações, criticas e sugestões',
    'Acolhendo o novo colaborador e buscando que se adapte e faça parte da empresa o mais rápido possível',
    'Dando oportunidades para desenvolver o próximo sem medo de perder meu lugar ou cargo',
    'Estando disponível aos colegas',
    'Compartilhando conhecimento'
  ],
  ARRAY[
    'Não se importando ou sendo indiferente com as pessoas',
    'Pensando apenas no seu trabalho e se colocando sempre em primeiro lugar',
    'Não pensando no impacto do seu trabalho, no trabalho dos outros',
    'Sendo reativo à feedbacks',
    'Sendo pouco prestativo, colaborativos, crítico ou negativo em demasia',
    'Abandonando o time nas horas difíceis',
    'Centralizando ou dificultando informações',
    'Criticando sem o objetivo de melhorar'
  ]
);

-- SE DIVERTIR
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Se divertir',
  ARRAY['Diversão', 'Leveza'],
  ARRAY[
    'Sendo responsável porém com leveza',
    'Ser positivo no pensar e agir',
    'Levar a sério mas não ser carrasco',
    'Estar focado no trabalho de forma leve'
  ],
  ARRAY[
    'Reclamando',
    'Não estar engajado',
    'Quando somos negativos a ponto de intoxicarmos as pessoas com o nosso pessimismo',
    'Levando as cobranças para o lado pessoal'
  ]
);

-- ENTUSIAMOS EM SERVIR
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Entusiasmo em servir',
  ARRAY['Servir', 'Propósito'],
  ARRAY[
    'Proposito para o trabalho desenvolvido',
    'Olhar humano',
    'Ajudar pessoas',
    'Ter paixão por fazer o seu melhor em favor do outro',
    'Estar disposto a se sacrificar para que o outro se sinta acolhido e amado'
  ],
  ARRAY[
    'Estar ali só pelo dinheiro',
    'Não gostar de pessoas',
    'Pessoa desrespeitosa',
    'Fazendo por obrigação',
    'Fazendo por que alguem pediu e não pelo prazer em servir',
    'Não entregando o seu melhor'
  ]
);

-- Inovação / Criatividade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Inovação',
  ARRAY['Criatividade', 'Inovar'],
  ARRAY[
    'Se atualizando com o que há de mais novo no mercado',
    'Sugerindo melhorias em qualquer coisas ou setores',
    'Entregando aos clientes o que há de mais tecnológico',
    'Sendo criativo para tornar suas atividades, tarefas e processos sempre o mais simples possível',
    'Buscando resultados diferentes fazendo sempre diferente',
    'Buscando novas formas de fazer melhor as coisas',
    'Saindo da zona de conforto',
    'Pensando sempre fora da caixa'
  ],
  ARRAY[
    'Não sugerindo melhorias por que vai gerar mudanças ou por ser resistente à mudanças',
    'Não entregando aos clientes às tecnologias mais atuais',
    'Querendo resultados diferentes fazendo as mesmas coisas',
    'Pensando "sempre funcionou assim"',
    'Copiando o concorrente: Se ele estiver uma boa ideia primeiro, falhamos',
    'Tocando sempre os mesmos processos sem pensar em melhorias'
  ]
);

-- RESILIENCIA
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Resiliência',
  ARRAY['Resiliencia', 'Persistência'],
  ARRAY[
    'Se adaptar às mudanças e lidar com situações imprevistas de forma flexível.',
    'Ajustar suas estratégias, pensamentos e comportamentos quando enfrenta obstáculos ou desafios.',
    'Acreditar que é capaz de lidar com as adversidades que surgem em seu caminho.',
    'Vendo os desafios como oportunidades de crescimento e aprendizado',
    'Compartilhando nossas preocupações e buscando ajuda com colegas, pares, superiores e nossos sistemas',
    'Mesmo quando enfrenta dificuldades, ela continua avançando, procurando soluções alternativas e aprendendo com os erros.'
  ],
  ARRAY[
    'Desiste facilmente e não encontrar maneiras de superar os obstáculos.',
    'Não confiar em suas habilidades e capacidades para superar os desafios.',
    'Falar "Não dá para fazer" antes mesmo de tentar',
    'Tendo resistência a novos desafios'
  ]
);

-- ETICA
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Ética',
  ARRAY['Etica'],
  ARRAY[
    'Agindo com integridade em todas as áreas de sua vida, de acordo com seus princípios morais e valores.',
    'Fazendo o que é certo, mesmo quando ninguém está observando.',
    'Sendo justo em todas as situações'
  ],
  ARRAY[
    'Apresentando comportamentos desonestos, como mentir, enganar, ocultar informações ou agir de maneira manipuladora.',
    'Buscando vantagens pessoais em detrimento da verdade e dos princípios morais.',
    'Agindo de forma discriminatória, desrespeitosa, preconceituosa, intimidadora ou abusiva em relação às outras pessoas.'
  ]
);

-- Iniciativa
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Iniciativa',
  ARRAY['Proatividade'],
  ARRAY[
    'Contribuindo com novas ideias',
    'Sendo o primeiro a realizar as tarefas',
    'Estando disponível para novos desafios',
    '"Se comprometeu a fazer, faça! "',
    'Focando na solução e não nos problemas'
  ],
  ARRAY[
    'Ser reclamão ou informal',
    'Ficar parado esperando cair do céu',
    'Criticando ideias dos outros',
    'Alinhar prazos ou expectativas e não cumprir',
    'Falando que "não deu" ao inves de "Não vai dar"'
  ]
);

-- Honestidade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Honestidade',
  ARRAY['Sinceridade'],
  ARRAY[
    'Valorizando aquilo que é abencoado e fruto do meu trabalho',
    'Sendo transparente e honesto com seus pares',
    'Não tirando vantagem do próximo',
    'Sendo integro em todas as nossas ações',
    'Denunciando o que não é correto ou atitudes suspeitas'
  ],
  ARRAY[
    'Vendo as pessoas fazer algo errado ou desonesto e não fazer nada',
    'Mentindo',
    'Vendo oportunidade de lesar a empresa',
    'Omitindo informações'
  ]
);

-- Parceria (interna e externa)
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Parceria',
  ARRAY['Parcerias'],
  ARRAY[
    'Buscando novas e melhores parcerias',
    'Ajudando a desenvolver conhecimento nos parceiros',
    'Pensando sempre no ganha-ganha',
    'Sendo companheiro em todas as horas',
    'Sempre visando o longo prazo',
    'Investindo em conjunto com parceiros internos ou externos'
  ],
  ARRAY[
    'Se contentando com as parcerias já firmadas',
    'Guardando conhecimentos só para si',
    'Tentando levar vantagem (ganha-perde)',
    'Visão de curto prazo',
    'Não acreditando no projeto do parceiro'
  ]
);

-- Persistencia
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Persistência',
  ARRAY['Persistir'],
  ARRAY[
    'Fazendo o que tem que ser feito com disciplina e Consistência',
    'Sendo incansável até atingir',
    'Brilho nos olhos / (Muita Vontade)',
    'Determinação'
  ],
  ARRAY[
    'Sendo preguicoso',
    'Não tendo brilho nos olhos e vontade',
    'Não comemorar as conquistas',
    'Tendo pressa, sem acreditar no processo'
  ]
);

-- Humildade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Humildade',
  ARRAY['Ser humilde'],
  ARRAY[
    'Reconhecendo os erros',
    'Sabendo pedir ajuda',
    'Reconhecendo que não sabe tudo',
    'Sabendo ouvir criticas construtivas'
  ],
  ARRAY[
    'Não aceitar que errou',
    'Não aceitar que precisa evoluir e se qualificar',
    'Não aceitar ouvir críticas',
    'Achando que sabe de tudo'
  ]
);

-- Lealdade
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Lealdade',
  ARRAY['Ser leal'],
  ARRAY[
    'Sendo leal a marca, buscando o bem dela como um todo',
    'Respeitando as regras da empresa'
  ],
  ARRAY[
    'Criando inimizades e picuinhas',
    'Traindo e mentindo para clientes, parceiros e colegas',
    'Arrumando esquemas para se dar bem, em cima do mal de alguem',
    'Passar por cima das pessoas, clientes e empresa'
  ]
);

-- Sabedoria
INSERT INTO behaviors_reference (value_label, value_aliases, dos, donts) VALUES (
  'Sabedoria',
  ARRAY['Conhecimento'],
  ARRAY[
    'Vivendo o que prega',
    'Experimentando e validando ações e consequentemente sendo guia',
    'Buscando conhecimentos em diferentes áreas',
    'Buscando passar o conhecimento adiante',
    'Se desenvolvendo e o inovando naquilo que já sabe ou que já tem habilidade',
    'Melhorando o que já existe'
  ],
  ARRAY[
    'Se acomodando com aquilo que já sabe',
    'Guardando o conhecimento só para si',
    'Paralisando achando que já sabe o suficiente',
    'Repetindo os erros cometidos',
    'Seguindo a manada, fazendo o que todo mundo faz'
  ]
);