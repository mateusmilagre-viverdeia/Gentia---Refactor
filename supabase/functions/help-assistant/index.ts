import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createLogger } from '../_shared/logger.ts';
import { requireCaller } from '../_shared/require-caller.ts';

const log = createLogger('help-assistant');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KNOWLEDGE_BASE = `
# Plataforma EP Partners - Base de Conhecimento Completa

## Visão Geral
A plataforma EP Partners é um sistema completo de gestão de pessoas e cultura organizacional. Ajuda empresas a construir e manter uma cultura forte através de jornadas estruturadas, ferramentas de diagnóstico, atração, contratação, retenção e desenvolvimento de pessoas.

---

## GUIAS PASSO-A-PASSO DETALHADOS

### Como adicionar um novo assento (seat) para membros
**Requisitos:** Ser Dono ou Admin da conta

**Passo a Passo:**
1. No menu lateral, clique em **Configurações** (ícone de engrenagem ⚙️)
2. Vá para a aba **Equipe**
3. No topo da página, localize o card **"Assentos"** que mostra quantos você tem disponíveis
4. Clique no botão **"Adicionar Assentos"**
5. Selecione a quantidade de assentos que deseja adicionar
6. Revise o valor total (R$ 19,90 por assento adicional/mês)
7. Clique em **"Confirmar Compra"**
8. Após confirmação, os assentos estarão disponíveis imediatamente para convidar novos membros

**Navegação:** [ACTION:navigate:Ir para Equipe:/settings/members]

---

### Como convidar um novo membro para a equipe
**Requisitos:** Ter assentos disponíveis

**Passo a Passo:**
1. Acesse **Configurações > Equipe** [ACTION:navigate:Ir para Equipe:/settings/members]
2. Clique na aba **"Convidar"**
3. Digite o **email** do colaborador que deseja convidar
4. Selecione o **tipo de acesso**:
   - **Admin:** Acesso total (exceto billing) - ideal para RH e gestores
   - **Líder:** Dashboard de equipe + Pulse - ideal para gestores diretos
   - **Colaborador:** Pulse diário + perfil pessoal - ideal para toda a equipe
5. Clique em **"Enviar Convite"**
6. O colaborador receberá um email com link para criar a conta
7. Após aceitar, ele aparecerá na lista de membros

**Navegação:** [ACTION:navigate:Convidar Membro:/settings/members]

---

### Como criar a Missão da empresa
**O que é:** A Missão é o propósito fundamental da empresa - responde "Por que existimos?"

**Passo a Passo:**
1. No menu lateral, clique em **Cultura**
2. Selecione **Criação de Cultura**
3. Clique na aba **Missão** [ACTION:navigate:Começar Missão:/cultura/criacao?tab=missao]
4. Siga as **9 etapas** de reflexão guiada:
   - Etapa 1: O que sua empresa faz de diferente?
   - Etapa 2: Quem são seus clientes ideais?
   - Etapa 3: Que problema você resolve?
   - Etapa 4: Qual impacto você gera?
   - ... (continue respondendo cada pergunta)
5. A IA vai analisar suas respostas e sugerir **palavras-chave**
6. Revise as sugestões e selecione as que mais combinam
7. No final, edite e aprove sua missão final
8. Clique em **"Salvar Missão"**

**Dica:** Reserve uns 30-45 minutos para fazer com calma. Você pode salvar e continuar depois!

**Navegação:** [ACTION:navigate:Começar Missão:/cultura/criacao?tab=missao]

---

### Como criar a Visão da empresa
**O que é:** A Visão é o futuro desejado em 5-10 anos - responde "Onde queremos chegar?"

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Visão** [ACTION:navigate:Começar Visão:/cultura/criacao?tab=visao]
2. Siga as **13 etapas** do exercício "Monte Everest":
   - Imagine sua empresa daqui a 5-10 anos
   - Visualize o cenário ideal de sucesso
   - Descreva como será o dia a dia
3. Responda cada pergunta de reflexão
4. A IA vai compilar suas respostas em uma declaração inspiradora
5. Edite e personalize a visão final
6. Clique em **"Salvar Visão"**

**Navegação:** [ACTION:navigate:Começar Visão:/cultura/criacao?tab=visao]

---

### Como definir os Valores da empresa
**O que é:** Valores são as crenças fundamentais que guiam comportamentos no dia a dia

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Valores** [ACTION:navigate:Definir Valores:/cultura/criacao?tab=valores]
2. Siga as **4 etapas** de definição:
   - Etapa 1: Brainstorm de valores importantes
   - Etapa 2: Seleção dos 3-6 valores principais
   - Etapa 3: Definição de cada valor
   - Etapa 4: Comportamentos observáveis
3. Para cada valor, defina:
   - **O que FAZER:** Comportamentos positivos esperados
   - **O que NÃO FAZER:** Comportamentos a evitar
4. A IA ajuda a sugerir comportamentos baseados no valor
5. Clique em **"Salvar Valores"**

**Dica:** Recomendamos entre 3 e 6 valores. Menos é mais!

**Navegação:** [ACTION:navigate:Definir Valores:/cultura/criacao?tab=valores]

---

### Como definir Indicadores Estratégicos
**O que é:** Métricas que mostram se a empresa está no caminho certo para alcançar a visão

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Indicadores** [ACTION:navigate:Definir Indicadores:/cultura/criacao?tab=indicadores]
2. Siga as **3 etapas** de configuração:
   - Etapa 1: Identificar áreas-chave do negócio
   - Etapa 2: Definir métricas mensuráveis
   - Etapa 3: Estabelecer metas e prazos
3. Use os **templates** sugeridos por área:
   - Financeiro: Faturamento, Lucro, ROI
   - Pessoas: Turnover, Engajamento, NPS
   - Operacional: Produtividade, Qualidade
4. Defina **responsáveis** para cada indicador
5. Clique em **"Salvar Indicadores"**

**Navegação:** [ACTION:navigate:Definir Indicadores:/cultura/criacao?tab=indicadores]

---

### Como criar Projetos Estratégicos
**O que é:** Iniciativas-chave que vão ajudar a alcançar a visão da empresa

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Projetos** [ACTION:navigate:Criar Projetos:/cultura/criacao?tab=projetos]
2. Clique em **"Novo Projeto"**
3. Preencha os dados do projeto:
   - Nome do projeto
   - Descrição e objetivos
   - Responsável principal
   - Prazo de conclusão
4. Vincule o projeto a um **indicador estratégico** (opcional)
5. Adicione **marcos/milestones** importantes
6. Clique em **"Salvar Projeto"**
7. Acompanhe o progresso pelo painel

**Navegação:** [ACTION:navigate:Criar Projetos:/cultura/criacao?tab=projetos]

---

### Como configurar Rituais de Energia
**O que é:** Práticas diárias que energizam e conectam a equipe

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Energia** [ACTION:navigate:Rituais de Energia:/cultura/criacao?tab=energia]
2. Siga as **5 etapas** de seleção:
   - Etapa 1: Entenda o conceito de rituais de energia
   - Etapa 2: Explore as categorias disponíveis
   - Etapa 3: Selecione os rituais mais adequados
   - Etapa 4: Personalize cada ritual
   - Etapa 5: Defina frequência e responsáveis
3. Escolha rituais de 4 categorias:
   - 🧠 **Mindset:** Práticas de foco mental
   - 🏃 **Corpo:** Exercícios e movimento
   - 🤝 **Conexão:** Interação entre pessoas
   - 🎉 **Celebração:** Reconhecimento e comemoração
4. Selecione até **5 rituais** no total
5. Clique em **"Salvar Rituais"**

**Dica:** Comece com 2-3 rituais e vá adicionando conforme a equipe se adapta!

**Navegação:** [ACTION:navigate:Rituais de Energia:/cultura/criacao?tab=energia]

---

### Como configurar Rituais de Desenvolvimento
**O que é:** Práticas de crescimento contínuo e aprendizado da equipe

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Desenvolvimento** [ACTION:navigate:Rituais de Desenvolvimento:/cultura/criacao?tab=desenvolvimento]
2. Siga as **3 etapas** de configuração:
   - Etapa 1: Diagnóstico das necessidades de desenvolvimento
   - Etapa 2: Seleção de rituais de aprendizado
   - Etapa 3: Planejamento de implementação
3. Escolha rituais como:
   - **1:1s:** Reuniões individuais entre líder e liderado
   - **Feedback contínuo:** Cultura de feedback estruturado
   - **PDI:** Plano de Desenvolvimento Individual
   - **Mentoria:** Programa de mentoria interna
4. Defina frequência e responsáveis
5. Clique em **"Salvar Rituais de Desenvolvimento"**

**Navegação:** [ACTION:navigate:Rituais de Desenvolvimento:/cultura/criacao?tab=desenvolvimento]

---

### Como definir o Framework de Decisão
**O que é:** Define como a empresa toma decisões e quem tem autonomia para quê

**Passo a Passo:**
1. Acesse **Cultura > Criação de Cultura > Aba Decisão** [ACTION:navigate:Framework de Decisão:/cultura/criacao?tab=decisao]
2. Responda as **9 perguntas** sobre o processo decisório:
   - Como decisões importantes são tomadas?
   - Quem participa das decisões?
   - Qual o nível de autonomia de cada cargo?
   - Como escalar decisões?
3. Defina os **níveis de autonomia**:
   - Nível 1: Colaborador pode decidir sozinho
   - Nível 2: Precisa informar o líder
   - Nível 3: Precisa aprovar com líder
   - Nível 4: Precisa subir para diretoria
4. Documente o **processo de escalação**
5. Clique em **"Salvar Framework"**

**Navegação:** [ACTION:navigate:Framework de Decisão:/cultura/criacao?tab=decisao]

---

### Como responder o Assessment ROIP
**O que é:** Diagnóstico completo de maturidade em gestão de pessoas com base em 4 pilares

**Passo a Passo:**
1. Acesse **Diagnóstico > Assessment ROIP** [ACTION:navigate:Iniciar ROIP:/app/assessment/roip]
2. Leia as instruções iniciais e clique em **"Começar Assessment"**
3. Responda às perguntas de cada pilar:
   - **Cultura:** 10 perguntas sobre propósito e valores
   - **Atração:** 10 perguntas sobre recrutamento
   - **Retenção:** 10 perguntas sobre engajamento
   - **Resultados:** 10 perguntas sobre performance
4. Use a escala de 1 a 5 para cada pergunta
5. Ao finalizar, clique em **"Ver Resultados"**
6. Analise os gráficos e recomendações por pilar
7. Exporte o relatório em PDF se desejar

**Tempo estimado:** 30-45 minutos
**Dica:** Responda com base na realidade atual, não no ideal!

**Navegação:** [ACTION:navigate:Iniciar ROIP:/app/assessment/roip]

---

### Como usar a Calculadora ROIP
**O que é:** Ferramenta para simular custos de rotatividade e impacto financeiro

**Passo a Passo:**
1. Acesse **Diagnóstico > Calculadora ROIP** [ACTION:navigate:Calculadora ROIP:/diagnostico]
2. Preencha os dados da empresa:
   - Número de funcionários
   - Salário médio
   - Taxa de turnover atual (%)
3. Adicione custos estimados:
   - Custo de recrutamento por vaga
   - Tempo de onboarding (meses)
   - Perda de produtividade estimada
4. Clique em **"Calcular"**
5. Veja o impacto financeiro:
   - Custo anual de rotatividade
   - Economia com redução de X%
   - ROI de investir em cultura

**Navegação:** [ACTION:navigate:Ver Diagnóstico:/diagnostico]

---

### Como aplicar o DISC para a equipe
**O que é:** DISC é um mapeamento de perfis comportamentais (Dominância, Influência, Estabilidade, Conformidade)

**Passo a Passo:**
1. Acesse **Retenção > DISC** [ACTION:navigate:Abrir DISC:/retencao/disc]
2. Clique no botão **"Convidar Usuários"**
3. Selecione os colaboradores que devem responder
4. Clique em **"Enviar Convites"**
5. Cada pessoa receberá uma notificação/email
6. O questionário tem ~70 perguntas e leva ~10 minutos
7. Quando responderem, os resultados aparecem automaticamente no dashboard
8. Clique em cada pessoa para ver o perfil detalhado

**Navegação:** [ACTION:navigate:Abrir DISC:/retencao/disc]

---

### Como aplicar o Q&A (Fit Cultural)
**O que é:** Avaliação de alinhamento do colaborador aos valores da empresa

**Passo a Passo:**
1. Acesse **Retenção > Q&A** [ACTION:navigate:Abrir Q&A:/retencao/qa]
2. Verifique se os **Valores** da empresa já estão definidos
3. Clique em **"Convidar para Avaliação"**
4. Selecione os colaboradores
5. Eles receberão perguntas baseadas nos valores da empresa
6. Veja o resultado com análise de alinhamento por valor
7. Identifique pontos de força e desenvolvimento

**Navegação:** [ACTION:navigate:Abrir Q&A:/retencao/qa]

---

### Como avaliar a Maturidade do Time
**O que é:** Diagnóstico do estágio de desenvolvimento da equipe baseado no modelo Tuckman

**Passo a Passo:**
1. Acesse **Retenção > Maturidade do Time** [ACTION:navigate:Maturidade do Time:/retencao/maturidade-time]
2. Responda as perguntas sobre dinâmica da equipe
3. O sistema identifica o estágio atual:
   - **Formação:** Time novo, conhecendo-se
   - **Conflito:** Divergências e ajustes
   - **Normatização:** Regras estabelecidas
   - **Desempenho:** Alta performance
   - **Renovação:** Mudanças e adaptações
4. Veja recomendações específicas para o estágio
5. Crie plano de ação para evolução

**Navegação:** [ACTION:navigate:Maturidade do Time:/retencao/maturidade-time]

---

### Como descobrir a Habilidade Única
**O que é:** Ferramenta para identificar o talento especial de cada pessoa

**Passo a Passo:**
1. Acesse **Retenção > Habilidade Única** [ACTION:navigate:Habilidade Única:/retencao/habilidade-unica]
2. Convide colaboradores para responder
3. O questionário analisa 3 dimensões:
   - O que a pessoa **faz bem** (competências)
   - O que a pessoa **ama fazer** (paixões)
   - O que **gera resultados** (impacto)
4. A intersecção revela a **Habilidade Única**
5. Use para alocar pessoas nas funções certas
6. Desenvolva planos de carreira baseados nisso

**Navegação:** [ACTION:navigate:Habilidade Única:/retencao/habilidade-unica]

---

### Como usar o Analisador de Pessoas
**O que é:** Matriz de análise que cruza performance com alinhamento aos valores

**Passo a Passo:**
1. Acesse **Retenção > Analisador de Pessoas** [ACTION:navigate:Analisador de Pessoas:/retencao/analisador-pessoas]
2. Selecione os colaboradores a analisar
3. Avalie cada pessoa em duas dimensões:
   - **Performance:** Resultados entregues (1-10)
   - **Valores:** Alinhamento cultural (1-10)
4. O sistema posiciona na matriz:
   - **Estrela:** Alta performance + Alto alinhamento ⭐
   - **Diamante Bruto:** Baixa performance + Alto alinhamento 💎
   - **Mercenário:** Alta performance + Baixo alinhamento 💰
   - **Problema:** Baixa performance + Baixo alinhamento ⚠️
5. Veja recomendações de ação por quadrante

**Navegação:** [ACTION:navigate:Analisador de Pessoas:/retencao/analisador-pessoas]

---

### Como criar Avaliação de Desempenho
**O que é:** Ciclo estruturado de avaliação de performance e feedback

**Passo a Passo:**
1. Acesse **Retenção > Avaliação de Desempenho** [ACTION:navigate:Avaliação de Desempenho:/retencao/avaliacao-desempenho]
2. Clique em **"Novo Ciclo de Avaliação"**
3. Configure o ciclo:
   - Período de avaliação (trimestral, semestral, anual)
   - Participantes (toda empresa ou times específicos)
   - Tipo de avaliação (90º, 180º ou 360º)
4. Defina os **critérios** de avaliação:
   - Metas individuais
   - Competências técnicas
   - Alinhamento a valores
5. Abra o período de avaliação
6. Acompanhe o progresso de preenchimento
7. Gere relatórios consolidados

**Navegação:** [ACTION:navigate:Avaliação de Desempenho:/retencao/avaliacao-desempenho]

---

### Como criar um processo de Onboarding
**O que é:** Jornada estruturada de integração para novos colaboradores

**Passo a Passo:**
1. Acesse **Retenção > Onboarding** [ACTION:navigate:Abrir Onboarding:/retencao/onboarding]
2. Clique em **"Novo Onboarding"**
3. Selecione o **colaborador** que está sendo integrado
4. Escolha o **template** de onboarding ou crie do zero
5. Defina as **tarefas** por período:
   - **Pré-boarding:** Antes do 1º dia
   - **Semana 1:** Primeiros dias
   - **Mês 1:** 30 dias
   - **Mês 2-3:** 60-90 dias
6. Atribua **responsáveis** (RH, Líder, TI, Buddy)
7. Configure os **checkpoints** (7, 30, 60, 90 dias)
8. Clique em **"Iniciar Onboarding"**
9. Acompanhe o progresso no painel

**Dica:** Use o template padrão e personalize conforme o cargo!

**Navegação:** [ACTION:navigate:Novo Onboarding:/retencao/onboarding]

---

### Como configurar o Pulse (pesquisa de engajamento)
**O que é:** Sistema de pesquisa diária para medir clima organizacional

**Passo a Passo:**
1. Acesse **Retenção > Pulse > Admin** [ACTION:navigate:Configurar Pulse:/retencao/pulse/admin]
2. Configure os **Pilares** de engajamento (categorias gerais)
3. Configure os **Drivers** dentro de cada pilar:
   - Liderança, Reconhecimento, Crescimento, Bem-estar, etc.
4. Configure as **Perguntas** para cada driver
5. Ative a pesquisa diária
6. Os colaboradores começam a receber 2-3 perguntas por dia

**Navegação:** [ACTION:navigate:Configurar Pulse:/retencao/pulse/admin]

---

### Como gerenciar Drivers de Engajamento
**O que é:** Os drivers são os fatores que influenciam o engajamento (ex: Liderança, Crescimento)

**Passo a Passo:**
1. Acesse **Retenção > Pulse > Admin > Drivers** [ACTION:navigate:Gerenciar Drivers:/retencao/pulse/admin/drivers]
2. Veja os drivers existentes
3. Para criar novo driver:
   - Clique em **"Novo Driver"**
   - Defina o nome (ex: "Autonomia")
   - Associe a um pilar
   - Adicione descrição
4. Para editar um driver existente, clique nele
5. Ordene os drivers por prioridade
6. Clique em **"Salvar"**

**Navegação:** [ACTION:navigate:Gerenciar Drivers:/retencao/pulse/admin/drivers]

---

### Como criar Perguntas do Pulse
**O que é:** As perguntas que os colaboradores respondem diariamente

**Passo a Passo:**
1. Acesse **Retenção > Pulse > Admin > Perguntas** [ACTION:navigate:Gerenciar Perguntas:/retencao/pulse/admin/questions]
2. Clique em **"Nova Pergunta"**
3. Preencha os campos:
   - Texto da pergunta
   - Driver associado
   - Tipo de resposta (emoji 1-5)
   - Peso da pergunta
4. Ative ou desative perguntas
5. Defina a frequência de rotação
6. Clique em **"Salvar Pergunta"**

**Dica:** Use perguntas curtas e diretas. Máximo 2-3 por dia!

**Navegação:** [ACTION:navigate:Gerenciar Perguntas:/retencao/pulse/admin/questions]

---

### Como responder ao Pulse diário (para colaboradores)
**Passo a Passo:**
1. Acesse **Retenção > Pulse > Pulse Diário** [ACTION:navigate:Responder Pulse:/retencao/pulse/daily]
2. Veja a pergunta do dia
3. Clique no emoji que representa sua resposta:
   - 😊 Muito satisfeito
   - 🙂 Satisfeito
   - 😐 Neutro
   - 😕 Insatisfeito
   - 😢 Muito insatisfeito
4. Opcionalmente, adicione um comentário (anônimo)
5. Clique em **"Enviar"**
6. Pronto! Resposta enviada anonimamente

**Dica:** Mantenha seu Streak respondendo todos os dias!

**Navegação:** [ACTION:navigate:Responder Pulse:/retencao/pulse/daily]

---

### Como ver o histórico de respostas do Pulse
**O que é:** Consultar suas respostas anteriores no Pulse

**Passo a Passo:**
1. Acesse **Retenção > Pulse > Histórico** [ACTION:navigate:Ver Histórico:/retencao/pulse/historico]
2. Veja suas respostas dos últimos 30 dias
3. Filtre por período ou driver
4. Acompanhe seu **Streak** atual
5. Veja sua média de satisfação

**Navegação:** [ACTION:navigate:Ver Histórico:/retencao/pulse/historico]

---

### Como ver o dashboard de líder (métricas da equipe)
**Requisitos:** Ser Líder, Admin ou Dono

**Passo a Passo:**
1. Acesse **Retenção > Pulse > Dashboard** [ACTION:navigate:Ver Dashboard:/retencao/pulse/dashboard]
2. Veja as métricas consolidadas da sua equipe:
   - Média de engajamento por driver
   - Tendências ao longo do tempo
   - Drivers com maior/menor satisfação
3. Clique em cada driver para ver detalhes
4. Crie planos de ação para drivers problemáticos

**Navegação:** [ACTION:navigate:Ver Dashboard:/retencao/pulse/dashboard]

---

### Como criar um evento de cultura
**O que é:** Momentos especiais para apresentar ou reforçar a cultura da empresa

**Passo a Passo:**
1. Acesse **Cultura > Evento de Cultura** [ACTION:navigate:Criar Evento:/cultura/evento-de-cultura]
2. Clique em **"Novo Evento"**
3. Defina as configurações iniciais:
   - Formato: Presencial ou Híbrido
   - Duração estimada
   - Data do evento
4. Preencha as **11 etapas** de planejamento:
   - Objetivos do evento
   - Público-alvo
   - Atividades desejadas
   - Recursos necessários
5. A IA vai gerar um **roteiro completo** personalizado
6. Revise e ajuste conforme necessário
7. Exporte o roteiro ou compartilhe com a equipe

**Navegação:** [ACTION:navigate:Criar Evento:/cultura/evento-de-cultura]

---

### Como configurar Rituais de Cultura recorrentes
**O que é:** Práticas que acontecem regularmente para reforçar a cultura

**Passo a Passo:**
1. Acesse **Cultura > Rituais de Cultura** [ACTION:navigate:Rituais de Cultura:/cultura/rituais-de-cultura]
2. Veja os rituais sugeridos por categoria:
   - Rituais Semanais (ex: Weekly)
   - Rituais Mensais (ex: All-Hands)
   - Rituais Trimestrais (ex: Retrospectiva)
3. Clique em **"Adicionar Ritual"**
4. Configure:
   - Nome do ritual
   - Frequência (diário, semanal, mensal)
   - Responsável
   - Participantes
5. Adicione o ritual ao calendário
6. Configure lembretes automáticos

**Navegação:** [ACTION:navigate:Rituais de Cultura:/cultura/rituais-de-cultura]

---

### Como criar o Culture Code (documento visual)
**O que é:** Documento visual que comunica toda a cultura da empresa

**Passo a Passo:**
1. Acesse **Cultura > Criador de Culture Code** [ACTION:navigate:Criar Culture Code:/cultura/criador-culture-code]
2. A ferramenta usa os dados já cadastrados (Missão, Visão, Valores)
3. Selecione o **template** de design desejado
4. Personalize as **cores** e **fontes**
5. Adicione a **história da empresa** (opcional)
6. Revise cada slide/seção
7. Clique em **"Exportar PDF"** para baixar
8. Compartilhe com toda a equipe!

**Navegação:** [ACTION:navigate:Criar Culture Code:/cultura/criador-culture-code]

---

### Como configurar "Vendendo a Empresa" (EVP)
**O que é:** Conteúdo de Proposta de Valor ao Colaborador para atrair talentos

**Passo a Passo:**
1. Acesse **Atração > Vendendo a Empresa** [ACTION:navigate:Vendendo a Empresa:/atracao-contratacao/atracao?tab=vendendo]
2. Complete o wizard gamificado em **3 etapas**:
   - **Etapa 1:** Preencha informações sobre a empresa (história, números, marcos)
   - **Etapa 2:** Revise e refine o conteúdo gerado pela IA
   - **Etapa 3:** Aprove e exporte
3. O sistema gera automaticamente **7 blocos de conteúdo**:
   - Quem Somos
   - Onde Estamos (momento atual)
   - O Que É Trabalhar Aqui
   - O Lado Difícil (transparência)
   - Nosso Santo Vai Bater Se...
   - O Que Você Encontra Aqui (benefícios)
   - CTA (chamada para ação)
4. Refine cada bloco individualmente se necessário
5. Exporte em PDF ou copie para usar nas vagas

**Navegação:** [ACTION:navigate:Vendendo a Empresa:/atracao-contratacao/atracao?tab=vendendo]

---

### Como criar Job Description com IA
**O que é:** Gerador de descrições de vagas otimizadas

**Passo a Passo:**
1. Acesse **Atração > Job Description** [ACTION:navigate:Criar Job Description:/atracao-contratacao/job-description]
2. Preencha os dados básicos da vaga:
   - Título do cargo
   - Departamento/área
   - Nível (Júnior, Pleno, Sênior)
   - Modelo de trabalho (Presencial, Híbrido, Remoto)
3. Descreva brevemente as responsabilidades
4. A IA gera uma **descrição completa** com:
   - Resumo da posição
   - Responsabilidades detalhadas
   - Requisitos obrigatórios
   - Diferenciais desejados
   - Benefícios
5. Edite e personalize conforme necessário
6. Copie para publicar nas plataformas de emprego

**Navegação:** [ACTION:navigate:Criar Job Description:/atracao-contratacao/job-description]

---

### Como gerar Perguntas de Valores para Entrevista
**O que é:** Banco de perguntas STAR baseadas nos valores da empresa

**Passo a Passo:**
1. Acesse **Atração > Perguntas de Valores** [ACTION:navigate:Perguntas de Valores:/atracao-contratacao/perguntas-valores]
2. Verifique se os **Valores** da empresa estão definidos
3. Clique em **"Gerar Perguntas"**
4. A IA gera perguntas usando técnica **STAR**:
   - **S**ituação: Descreva uma situação...
   - **T**arefa: Qual era sua responsabilidade...
   - **A**ção: O que você fez...
   - **R**esultado: Qual foi o resultado...
5. Veja 2-3 perguntas por valor
6. Exporte as perguntas para usar nas entrevistas
7. Use como roteiro de entrevista de fit cultural

**Navegação:** [ACTION:navigate:Perguntas de Valores:/atracao-contratacao/perguntas-valores]

---

### Como criar e editar o Organograma
**O que é:** Representação visual da estrutura hierárquica da empresa

**Passo a Passo:**
1. Acesse **Atração > Organograma** [ACTION:navigate:Abrir Organograma:/atracao-contratacao/organograma]
2. Clique em **"Novo Organograma"** ou edite o existente
3. Adicione os níveis hierárquicos:
   - Diretoria
   - Gerência
   - Coordenação
   - Operacional
4. Para adicionar uma pessoa:
   - Clique no nó pai
   - Selecione **"Adicionar subordinado"**
   - Preencha nome, cargo, email
5. Arraste e solte para reorganizar
6. Use cores diferentes por departamento
7. Clique em **"Salvar Organograma"**

**Navegação:** [ACTION:navigate:Abrir Organograma:/atracao-contratacao/organograma]

---

### Como publicar uma vaga de emprego
**Passo a Passo:**
1. Acesse **Atração > Vagas** [ACTION:navigate:Gerenciar Vagas:/atracao-contratacao/vagas]
2. Clique em **"Nova Vaga"**
3. Preencha os dados da vaga:
   - Título do cargo
   - Departamento
   - Tipo de contrato
   - Descrição da vaga
   - Requisitos
4. Use o **Gerador de Job Description com IA** para criar uma descrição atrativa
5. Configure o **perfil DISC ideal** para a vaga
6. Publique a vaga na página de carreiras

**Navegação:** [ACTION:navigate:Gerenciar Vagas:/atracao-contratacao/vagas]

---

### Como usar o funil de contratação
**O que é:** Gestão visual do processo seletivo com etapas customizáveis

**Passo a Passo:**
1. Acesse **Atração > Funil de Contratação** [ACTION:navigate:Abrir Funil:/atracao-contratacao/funil-contratacao]
2. Visualize as etapas do processo seletivo:
   - Triagem → Entrevista RH → Teste → Entrevista Gestor → Cultura → Proposta
3. Arraste candidatos entre as etapas
4. Clique em um candidato para ver detalhes
5. Adicione notas e avaliações
6. Mova para próxima etapa ou archive
7. Veja métricas de conversão por etapa

**Navegação:** [ACTION:navigate:Abrir Funil:/atracao-contratacao/funil-contratacao]

---

### Como gerenciar candidatos
**O que é:** Cadastro e acompanhamento de todos os candidatos

**Passo a Passo:**
1. Acesse **Atração > Candidatos** [ACTION:navigate:Gerenciar Candidatos:/atracao-contratacao/candidatos]
2. Clique em **"Novo Candidato"**
3. Preencha os dados:
   - Nome, email, telefone
   - Vaga de interesse
   - Fonte (LinkedIn, indicação, etc)
   - Anexe o currículo
4. O candidato entra automaticamente no funil
5. Envie avaliações (DISC, Q&A) se necessário
6. Acompanhe o histórico de interações
7. Mova entre etapas do funil

**Navegação:** [ACTION:navigate:Gerenciar Candidatos:/atracao-contratacao/candidatos]

---

### Como configurar a Página de Carreiras
**O que é:** Página pública para divulgar vagas e cultura da empresa

**Passo a Passo:**
1. Acesse **Configurações > Organização > Página de Carreiras** [ACTION:navigate:Página de Carreiras:/settings/organization]
2. Ative a **página pública**
3. Personalize:
   - Logo da empresa
   - Cores da marca
   - Headline e descrição
   - Imagem de capa
4. Configure quais seções exibir:
   - Sobre a empresa
   - Valores
   - Benefícios
   - Depoimentos
   - Vagas abertas
5. Copie o link público para divulgar
6. Integre com site da empresa se desejar

**Navegação:** [ACTION:navigate:Configurar Organização:/settings/organization]

---

### Como criar Questionários personalizados
**O que é:** Pesquisas customizadas para diversos fins

**Passo a Passo:**
1. Acesse **Retenção > Questionários** [ACTION:navigate:Questionários:/retencao/questionarios]
2. Clique em **"Novo Questionário"**
3. Escolha o tipo:
   - Pesquisa de clima
   - Feedback de evento
   - Avaliação de treinamento
   - Personalizado
4. Adicione perguntas:
   - Múltipla escolha
   - Escala (1-5, 1-10)
   - Texto livre
   - NPS
5. Configure anonimato e prazo
6. Envie para os participantes
7. Veja resultados consolidados

**Navegação:** [ACTION:navigate:Questionários:/retencao/questionarios]

---

### Como iniciar uma Jornada
**O que é:** Trilhas guiadas de implementação da cultura

**Passo a Passo:**
1. Acesse **Jornadas** no menu lateral [ACTION:navigate:Ver Jornadas:/jornadas]
2. Veja as jornadas disponíveis:
   - **Diagnóstico:** Avalie o estado atual
   - **Cultura:** Construa os pilares
   - **Atração:** Atraia talentos alinhados
   - **Retenção:** Engaje e desenvolva pessoas
3. Clique na jornada desejada
4. Veja as etapas e o progresso
5. Complete cada etapa na ordem
6. Ganhe pontos e desbloqueie badges
7. Acompanhe o progresso no dashboard

**Navegação:** [ACTION:navigate:Ver Jornadas:/jornadas]

---

### Como ver Conquistas e Badges
**O que é:** Sistema de gamificação com badges por conquistas

**Passo a Passo:**
1. Acesse **Conquistas** no menu lateral [ACTION:navigate:Ver Conquistas:/conquistas]
2. Veja seus badges conquistados
3. Explore badges disponíveis:
   - 🥉 **Bronze:** Primeiros passos
   - 🥈 **Prata:** Evolução intermediária
   - 🥇 **Ouro:** Conquistas avançadas
   - 💎 **Diamante:** Excelência total
4. Clique em cada badge para ver requisitos
5. Veja seu ranking na empresa
6. Acompanhe seu progresso para próximos badges

**Navegação:** [ACTION:navigate:Ver Conquistas:/conquistas]

---

### Como criar Plano de Ação
**O que é:** Gestão de ações estratégicas derivadas de insights

**Passo a Passo:**
1. Acesse o dashboard onde está o insight problemático
2. Clique em **"Criar Plano de Ação"**
3. Ou acesse diretamente pelo menu
4. Preencha os dados:
   - Título da ação
   - Descrição do problema
   - Responsável
   - Prazo
   - Prioridade (Alta, Média, Baixa)
5. Adicione tarefas/sub-ações
6. Acompanhe o status:
   - Pendente → Em Andamento → Concluído
7. Filtre por status, responsável ou prazo

---

### Como configurar meu Perfil pessoal
**Passo a Passo:**
1. Acesse **Configurações > Perfil** [ACTION:navigate:Meu Perfil:/settings/profile]
2. Atualize seus dados:
   - Nome completo
   - Foto de perfil
   - Email (apenas visualização)
   - Telefone
3. Configure preferências:
   - Idioma
   - Fuso horário
   - Formato de data
4. Clique em **"Salvar Alterações"**

**Navegação:** [ACTION:navigate:Meu Perfil:/settings/profile]

---

### Como gerenciar Notificações
**Passo a Passo:**
1. Acesse **Configurações > Notificações** [ACTION:navigate:Notificações:/settings/notifications]
2. Configure preferências por tipo:
   - **Email:** Ativar/desativar notificações por email
   - **Push:** Notificações no navegador
   - **In-app:** Notificações dentro da plataforma
3. Escolha frequência:
   - Tempo real
   - Resumo diário
   - Resumo semanal
4. Configure por módulo:
   - Pulse (lembretes diários)
   - Jornadas (progresso)
   - Equipe (novos membros)
5. Clique em **"Salvar Preferências"**

**Navegação:** [ACTION:navigate:Notificações:/settings/notifications]

---

### Como configurar Segurança (senha e MFA)
**Passo a Passo:**
1. Acesse **Configurações > Segurança** [ACTION:navigate:Segurança:/settings/security]
2. Para alterar a senha:
   - Clique em **"Alterar Senha"**
   - Digite a senha atual
   - Digite e confirme a nova senha
   - Clique em **"Salvar"**
3. Para ativar autenticação de dois fatores (MFA):
   - Clique em **"Ativar 2FA"**
   - Escaneie o QR Code com app autenticador
   - Digite o código de verificação
   - Guarde os códigos de backup
4. Veja sessões ativas e encerre se necessário

**Navegação:** [ACTION:navigate:Segurança:/settings/security]

---

### Como ver Faturamento e Faturas
**Requisitos:** Ser Dono da conta

**Passo a Passo:**
1. Acesse **Configurações > Faturamento** [ACTION:navigate:Faturamento:/settings/billing]
2. Veja informações do plano atual:
   - Plano contratado
   - Assentos utilizados/disponíveis
   - Próxima renovação
3. Baixe faturas anteriores
4. Atualize dados de pagamento
5. Altere o plano se necessário
6. Veja histórico de cobranças

**Navegação:** [ACTION:navigate:Faturamento:/settings/billing]

---

### Como configurar dados da Organização
**Requisitos:** Ser Admin ou Dono

**Passo a Passo:**
1. Acesse **Configurações > Organização** [ACTION:navigate:Organização:/settings/organization]
2. Atualize dados da empresa:
   - Nome da empresa
   - CNPJ
   - Setor de atuação
   - Número de funcionários
   - Faturamento (opcional)
3. Configure links de redes sociais:
   - LinkedIn, Instagram, Facebook, YouTube
   - Site institucional
4. Faça upload do logo da empresa
5. Clique em **"Salvar"**

**Navegação:** [ACTION:navigate:Organização:/settings/organization]

---

## METODOLOGIA GENTIA

### O Problema que o GENTIA Resolve
**"Contratamos por Conhecimento, desligamos por Atitudes e Valores"**

Esta é a tese central do GENTIA. Empresas gastam tempo e dinheiro contratando pessoas com currículos impressionantes, mas acabam desligando por falta de fit cultural. O resultado:
- **15x o salário** é o custo médio de uma contratação errada (fonte: Bazz Consultoria)
- Processos manuais e lentos fazem você **perder talentos** para concorrentes
- **Falta de dados** para prever e prevenir turnover
- RH não consegue **provar ROI** das iniciativas de pessoas

### Framework dos 4 Pilares GENTIA
O GENTIA estrutura a gestão de pessoas em 4 pilares sequenciais:

1. **CULTURA** - Operacionalizar valores em comportamentos
   - Definir Missão, Visão e Valores
   - Criar comportamentos observáveis (Fazer vs Não Fazer)
   - Configurar rituais de energia e desenvolvimento
   - Documentar o Culture Code

2. **ATRAÇÃO** - IA encontra + qualifica antes da entrevista
   - Hunting AI: Busca automatizada de candidatos
   - ICP (Perfil de Candidato Ideal) gerado por IA
   - Outreach: Abordagem personalizada por WhatsApp
   - Página de Carreiras com EVP (Proposta de Valor)

3. **RETENÇÃO** - DISC + gestão estruturada de pessoas
   - Pulse: Pesquisa diária de engajamento
   - Assessment DISC para mapeamento comportamental
   - Avaliação de Desempenho com ciclos estruturados
   - Matriz de Pessoas (Performance x Valores)

4. **RESULTADOS** - ROIP™ quantifica o retorno do RH
   - Calculadora de custo de turnover
   - Métricas de engajamento e performance
   - ROI de cada iniciativa de RH

### O que é ROIP™ (Retorno sobre Investimento em Pessoas)
**ROIP™** é uma métrica exclusiva do GENTIA que responde: "Quanto custa NÃO investir em pessoas?"

**Como funciona:**
1. **Calcula o custo real de turnover**:
   - Custos diretos: recrutamento, treinamento, desligamento
   - Custos indiretos: perda de produtividade, impacto no time
   - Total: até 15x o salário do colaborador

2. **Projeta economia com redução de rotatividade**:
   - Se reduzir turnover de 30% para 20% = economia de X reais/ano

3. **Quantifica ROI de cada ação de RH**:
   - Investiu R$ 50k em cultura → Economizou R$ 200k em turnover = ROI 4x

**Como usar na prática:**
- Faça o Assessment ROIP para diagnóstico inicial
- Use a Calculadora ROIP para simular cenários
- Apresente os números para justificar investimentos em RH

### Cálculo de Custo de Turnover
**Fórmula simplificada:**
Custo por desligamento = Salário × Fator (geralmente 15x)

**Exemplo prático:**
- Salário médio: R$ 5.000
- Custo por desligamento: R$ 75.000
- Se você tem 100 funcionários e 20% de turnover:
  - 20 desligamentos × R$ 75.000 = R$ 1.500.000/ano

**Onde estão os custos:**
- Recrutamento e seleção: 30%
- Treinamento e onboarding: 25%
- Perda de produtividade: 30%
- Impacto no time: 15%

---

## RECRUTAMENTO AI - MÓDULO COMPLETO

O módulo de Recrutamento AI automatiza todo o processo de atração e triagem de candidatos usando Inteligência Artificial.

### ICP - Perfil de Candidato Ideal
**O que é:** Documento gerado por IA que define exatamente quem você procura.

**O que o ICP contém:**
- **Hard Skills obrigatórias:** Competências técnicas essenciais
- **Soft Skills desejadas:** Características comportamentais
- **Perfil DISC ideal:** Combinação de D, I, S, C ideal para a função
- **Palavras-chave para busca:** Termos para hunting
- **Deal Breakers:** O que desqualifica automaticamente

**Como gerar o ICP:**
1. Acesse **Atração > Vagas** [ACTION:navigate:Gerenciar Vagas:/atracao-contratacao/recrutamento/vagas]
2. Crie ou edite uma vaga
3. Clique em **"Gerar ICP com IA"**
4. A IA analisa o cargo, setor e seus valores
5. Revise e ajuste o ICP gerado
6. Salve para usar no Hunting

---

### Hunting AI - Busca Automatizada de Candidatos
**O que é:** Ferramenta que varre redes profissionais para encontrar candidatos passivos.

**Como funciona:**
1. A IA usa o ICP da vaga como base
2. Busca perfis no LinkedIn, GitHub e outras fontes
3. Para cada perfil encontrado, calcula:
   - **Match Score (0-100):** Aderência ao ICP
   - **Tech Fit Score:** Competências técnicas
   - **DISC Inferido:** Perfil comportamental estimado pelos posts
   - **Hunting Priority:** Prioridade de abordagem

**Como usar o Hunting:**
1. Acesse **Atração > Hunting AI** [ACTION:navigate:Abrir Hunting:/atracao-contratacao/recrutamento/hunting]
2. Selecione a vaga para buscar (pré-requisito: ter ICP)
3. Configure filtros adicionais:
   - Localização (cidade, estado)
   - Senioridade (Júnior, Pleno, Sênior)
   - Palavras-chave específicas
4. Clique em **"Iniciar Busca"**
5. Aguarde a IA vasculhar os perfis (~2-5 minutos)
6. Revise os resultados na aba "Pendentes"
7. Clique em "Analisar Perfil" para enriquecer dados
8. Clique em "Importar" para trazer ao funil

**Navegação:** [ACTION:navigate:Abrir Hunting:/atracao-contratacao/recrutamento/hunting]

---

### O que é Match Score
O **Match Score** é uma pontuação de 0 a 100 que indica o quanto um candidato se encaixa no ICP da vaga.

**Como é calculado:**
- **40%** Hard Skills obrigatórias
- **20%** Hard Skills desejáveis
- **20%** Experiência (anos na área)
- **20%** Fit cultural (DISC + valores)

**Interpretação:**
- **80-100:** Excelente match - prioridade máxima
- **60-79:** Bom match - vale abordar
- **40-59:** Match parcial - analisar caso a caso
- **0-39:** Match baixo - provavelmente não aderir

**Dica:** Configure o threshold mínimo da vaga para filtrar automaticamente.

---

### DISC Inferido pelo Hunting
O Hunting AI consegue **estimar o perfil DISC** do candidato analisando:
- Conteúdo dos posts em redes sociais
- Linguagem e tom de comunicação
- Tipo de conteúdo que compartilha
- Forma de interação com outros

**Como interpretar:**
- A IA retorna scores de D, I, S, C (0-100 cada)
- Identifica perfil primário e secundário
- Inclui evidências (quotes dos posts)
- Calcula confiança da estimativa

**Importante:** Este é um pré-filtro. O DISC formal deve ser aplicado nas etapas finais.

---

### Outreach - Campanhas de Abordagem
**O que é:** Sistema para enviar mensagens personalizadas para candidatos do Hunting.

**Canais disponíveis:**
- **WhatsApp** (via Z-API): Maior taxa de resposta
- **Email:** Alcance maior, menor conversão

**Como criar uma campanha:**
1. Acesse **Atração > Outreach** [ACTION:navigate:Abrir Outreach:/atracao-contratacao/recrutamento/outreach]
2. Clique em **"Nova Campanha"**
3. Selecione a vaga (filtra candidatos pelo min_hunting_score)
4. Escolha os candidatos a abordar
5. Configure a mensagem:
   - A IA gera mensagem **personalizada** por candidato
   - Usa nome, skills, empresa atual do candidato
   - Incorpora cultura e EVP da sua empresa
6. Escolha o canal (WhatsApp ou Email)
7. Agende ou envie imediatamente
8. Acompanhe respostas no painel

**Métricas de Outreach:**
- **Taxa de Entrega:** % mensagens entregues
- **Taxa de Leitura:** % mensagens lidas
- **Taxa de Resposta:** % candidatos que responderam
- **Taxa de Conversão:** % que avançaram no funil

**Navegação:** [ACTION:navigate:Abrir Outreach:/atracao-contratacao/recrutamento/outreach]

---

### Agentes de Recrutamento AI
**O que é:** Assistentes virtuais que conduzem etapas do processo seletivo.

**Tipos de Agentes:**
1. **Agente de Triagem:** Faz perguntas iniciais via WhatsApp/Chat
2. **Agente DISC:** Aplica o assessment comportamental
3. **Agente Técnico:** Conduz avaliação de hard skills
4. **Agente de Cultura:** Avalia fit com valores

**Como configurar:**
1. Acesse **Atração > Agentes AI** [ACTION:navigate:Configurar Agentes:/atracao-contratacao/recrutamento/agents]
2. Ative os agentes desejados
3. Configure o tom e estilo de comunicação
4. Defina critérios de aprovação/reprovação
5. Conecte ao pipeline da vaga

**Navegação:** [ACTION:navigate:Configurar Agentes:/atracao-contratacao/recrutamento/agents]

---

### Orquestrador de Recrutamento
**O que é:** Motor que automatiza o fluxo completo do candidato.

**O que o Orquestrador faz:**
1. Detecta quando candidato completa uma etapa
2. Calcula score e compara com threshold
3. Se aprovado: avança para próxima etapa
4. Se reprovado: envia feedback e arquiva
5. Notifica recrutadores sobre cada mudança

**Fluxo típico:**
Candidato aplica → Triagem AI → DISC → Técnico → Entrevista Humana → Proposta
(Cada etapa tem threshold. Se score >= threshold, avança. Se não, reprova.)

**Configuração por vaga:**
- Etapas ativas (quais rodar)
- Thresholds por etapa (score mínimo)
- Ordem das etapas
- Ações automáticas (emails, WhatsApp)

---

### Analytics de Recrutamento
**O que é:** Dashboard com métricas de performance do processo seletivo.

**Métricas principais:**
- **TAT (Time to Accept):** Tempo médio para preencher vaga
- **Taxa de Conversão por Etapa:** Onde candidatos "morrem"
- **Custo por Contratação:** Quanto custa cada contratação
- **Source Effectiveness:** Qual canal traz melhores candidatos
- **Quality of Hire:** Performance dos contratados após 90 dias

**Como usar:**
1. Acesse **Atração > Analytics** [ACTION:navigate:Ver Analytics:/atracao-contratacao/recrutamento/analytics]
2. Filtre por vaga, período ou fonte
3. Identifique gargalos no funil
4. Compare performance entre vagas
5. Tome decisões baseadas em dados

**Navegação:** [ACTION:navigate:Ver Analytics:/atracao-contratacao/recrutamento/analytics]

---

### Talent Pool - Banco de Talentos
**O que é:** Repositório de candidatos para futuras oportunidades.

**Quem vai para o Talent Pool:**
- Candidatos bons que não passaram por timing
- Candidatos do Hunting não abordados
- Indicações para considerar depois

**Como usar:**
1. Acesse **Atração > Talent Pool** [ACTION:navigate:Ver Talent Pool:/atracao-contratacao/recrutamento/talent-pool]
2. Filtre por skills, localização, DISC
3. Quando abrir nova vaga, consulte primeiro o pool
4. Recupere candidatos promissores

**Navegação:** [ACTION:navigate:Ver Talent Pool:/atracao-contratacao/recrutamento/talent-pool]

---

## INTERPRETAÇÃO DE RELATÓRIOS

### Dashboard do Pulse - Como Interpretar

**Score de Engajamento (0-100)**
| Faixa | Status | Ação Recomendada |
|-------|--------|------------------|
| 80-100 | 🟢 Excelente | Manter práticas atuais, celebrar conquistas |
| 60-79 | 🟡 Bom | Identificar 1-2 drivers para melhorar |
| 40-59 | 🟠 Atenção | Plano de ação urgente necessário |
| 0-39 | 🔴 Crítico | Intervenção imediata, conversar com equipe |

**Drivers Prioritários - O que observar:**
- Score abaixo de 60: Requer atenção
- Tendência de queda (seta ↓): Problema se agravando
- Alto número de respostas negativas: Muitas pessoas insatisfeitas

**Perguntas para se fazer:**
1. Quais drivers estão com score mais baixo?
2. Houve alguma mudança recente na empresa que explique?
3. O problema é generalizado ou em times específicos?
4. Quais ações posso tomar esta semana?

**Criando Plano de Ação:**
1. Clique no driver problemático
2. Analise os comentários anônimos
3. Identifique padrões nas reclamações
4. Defina 1-3 ações concretas
5. Atribua responsável e prazo
6. Acompanhe evolução nas próximas semanas

---

### Matriz de Pessoas - Como Usar

A Matriz de Pessoas cruza **Performance** (resultados entregues) com **Alinhamento a Valores** (fit cultural).

| Quadrante | Descrição | Ação Recomendada |
|-----------|-----------|------------------|
| ⭐ **Estrela** | Alta performance + Alto alinhamento | Reter a todo custo, desafiar com novos projetos, promover |
| 💎 **Diamante Bruto** | Baixa performance + Alto alinhamento | Investir em desenvolvimento, mentoria, treinar skills |
| 💰 **Mercenário** | Alta performance + Baixo alinhamento | Coaching de valores, atenção redobrada, definir prazo |
| ⚠️ **Problema** | Baixa performance + Baixo alinhamento | Plano de desligamento ou transição de área |

**Como avaliar cada pessoa:**
1. Performance (1-10): Baseie-se em metas, entregas, KPIs
2. Valores (1-10): Use comportamentos observáveis dos seus valores

**Dica:** Faça esta análise trimestralmente com todos os gestores.

---

### DISC - Interpretando Perfis em Profundidade

**D (Dominância)** - "O Executor"
- **Características:** Direto, competitivo, focado em resultados
- **Motivadores:** Desafios, autonomia, reconhecimento
- **Estressores:** Falta de controle, rotina, detalhes excessivos
- **Funções ideais:** Vendas, gestão, empreendedorismo
- **Como liderar:** Seja objetivo, dê autonomia, foque em resultados
- **Como comunicar:** Vá direto ao ponto, mostre resultados esperados

**I (Influência)** - "O Comunicador"
- **Características:** Entusiasmado, otimista, sociável
- **Motivadores:** Reconhecimento social, variedade, interação
- **Estressores:** Isolamento, rejeição, rotina
- **Funções ideais:** Marketing, RH, vendas consultivas
- **Como liderar:** Dê visibilidade, envolva em projetos grupais
- **Como comunicar:** Seja entusiasmado, valorize ideias, permita diálogo

**S (Estabilidade)** - "O Confiável"
- **Características:** Paciente, leal, bom ouvinte
- **Motivadores:** Segurança, harmonia, reconhecimento sincero
- **Estressores:** Mudanças bruscas, conflitos, pressão
- **Funções ideais:** Suporte, operações, atendimento
- **Como liderar:** Dê segurança, avise mudanças com antecedência
- **Como comunicar:** Seja calmo, demonstre apreciação, dê tempo

**C (Conformidade)** - "O Analítico"
- **Características:** Preciso, sistemático, focado em qualidade
- **Motivadores:** Exatidão, conhecimento, autonomia técnica
- **Estressores:** Críticas à qualidade, prazos apertados, ambiguidade
- **Funções ideais:** Finanças, TI, qualidade, pesquisa
- **Como liderar:** Forneça dados, respeite processos, dê tempo para análise
- **Como comunicar:** Seja específico, traga números, responda perguntas

**Combinações comuns:**
- **DI:** Líder carismático, visionário
- **DC:** Líder técnico, exigente
- **IS:** Relacionamento e suporte
- **SC:** Execução metódica
- **IC:** Raro - criativo mas preciso

---

### Métricas de Recrutamento - O que Acompanhar

**TAT (Time to Accept)**
- Tempo desde abertura da vaga até aceite da proposta
- Benchmark: 30-45 dias para posições operacionais
- Acima de 60 dias: Revisar processo ou atratividade da vaga

**Taxa de Conversão por Etapa**
- Aplicações → Triagem: Idealmente >50%
- Triagem → Entrevista: Idealmente >30%
- Entrevista → Proposta: Idealmente >20%
- Proposta → Aceite: Idealmente >70%

**Custo por Contratação**
- Soma de: anúncios + ferramentas + tempo do recrutador + tempo dos entrevistadores
- Divida pelo número de contratações
- Use para justificar investimentos em automação

**Quality of Hire**
- Performance do contratado após 90 dias
- Retenção após 12 meses
- Feedback do gestor direto

---

## MÓDULOS DA PLATAFORMA - RESUMO

### DIAGNÓSTICO
- **Assessment ROIP:** Avaliação em 4 pilares (Cultura, Atração, Retenção, Resultados)
- **Calculadora ROIP:** Simulador de custos de rotatividade e ROI

### CRIAÇÃO DE CULTURA (8 abas)
1. **Missão:** Propósito da empresa (9 etapas)
2. **Visão:** Futuro desejado (13 etapas)
3. **Valores:** Crenças fundamentais (4 etapas)
4. **Indicadores:** Métricas de sucesso
5. **Projetos:** Iniciativas estratégicas
6. **Energia:** Rituais diários de energia
7. **Desenvolvimento:** Rituais de crescimento
8. **Decisão:** Framework de decisão

### CULTURA - OUTROS
- **Rituais de Cultura:** Práticas recorrentes
- **Eventos de Cultura:** Planejamento de eventos
- **Culture Code:** Documento visual

### ATRAÇÃO E CONTRATAÇÃO
- **Vendendo a Empresa:** EVP com IA
- **Job Description:** Gerador com IA
- **Perguntas de Valores:** Perguntas STAR
- **Organograma:** Estrutura visual
- **Vagas:** Gestão de vagas com ICP
- **Funil de Contratação:** Processo seletivo
- **Candidatos:** Gestão de candidatos
- **Página de Carreiras:** Site público

### RECRUTAMENTO AI (NOVO!)
- **ICP:** Perfil de Candidato Ideal gerado por IA
- **Hunting AI:** Busca automatizada de candidatos
- **Outreach:** Campanhas de abordagem WhatsApp/Email
- **Agentes AI:** Assistentes virtuais de recrutamento
- **Orquestrador:** Automação do pipeline
- **Analytics:** Métricas e dashboards
- **Talent Pool:** Banco de talentos

### RETENÇÃO E ENGAJAMENTO
- **Pulse:** Pesquisa diária de engajamento
- **DISC:** Mapeamento comportamental
- **Q&A:** Fit cultural
- **Maturidade do Time:** Diagnóstico de estágio
- **Habilidade Única:** Descoberta de talentos
- **Analisador de Pessoas:** Matriz performance x valores
- **Avaliação de Desempenho:** Ciclos de feedback
- **Onboarding:** Integração de novos colaboradores
- **Questionários:** Pesquisas customizadas

### JORNADAS E GAMIFICAÇÃO
- **Jornadas:** Trilhas guiadas
- **Conquistas:** Badges e pontos

### CONFIGURAÇÕES
- **Equipe:** Membros e permissões
- **Perfil:** Dados pessoais
- **Notificações:** Alertas
- **Segurança:** Senha e MFA
- **Faturamento:** Plano e faturas
- **Organização:** Dados da empresa

---

## PERGUNTAS FREQUENTES

### Primeiros Passos
**P: Por onde devo começar na plataforma?**
R: Recomendamos começar pelo Assessment ROIP para ter um diagnóstico. Depois, siga para a Criação de Cultura (Missão → Visão → Valores).

**P: Em que ordem devo construir a cultura?**
R: 1) Missão, 2) Visão, 3) Valores, 4) Indicadores, 5) Projetos, 6) Rituais de Energia, 7) Rituais de Desenvolvimento, 8) Framework de Decisão.

**P: Quanto tempo leva para completar tudo?**
R: Varia por empresa. Em média: Diagnóstico (1 dia), Cultura (2-4 semanas), Atração/Retenção (ongoing).

### ROIP e Metodologia
**P: O que é ROIP?**
R: ROIP (Retorno sobre Investimento em Pessoas) é uma métrica que quantifica o custo de não investir em pessoas. Calcula turnover, projeta economia e justifica investimentos em RH.

**P: Como calculo o custo de turnover?**
R: Use a Calculadora ROIP. Regra geral: cada desligamento custa ~15x o salário (recrutamento + treinamento + produtividade perdida).

**P: O que são os 4 Pilares do GENTIA?**
R: Cultura (operacionalizar valores), Atração (IA para recrutar), Retenção (engajar e desenvolver), Resultados (medir ROI).

### Pulse
**P: Minhas respostas são anônimas?**
R: Sim! Líderes e admins veem apenas estatísticas agregadas, nunca respostas individuais.

**P: O que é o Streak?**
R: É uma sequência de dias consecutivos respondendo a pesquisa. Quanto maior seu streak, mais pontos você ganha!

**P: O que acontece se eu perder um dia?**
R: O streak reinicia, mas você pode começar de novo no dia seguinte.

### Cultura
**P: Qual a diferença entre Missão e Visão?**
R: Missão é o propósito atual ("Por que existimos?"). Visão é o futuro desejado ("Onde queremos chegar?").

**P: Quantos valores devo definir?**
R: Recomendamos entre 3 e 6 valores. Menos é mais - valores demais diluem a mensagem.

**P: O que são comportamentos observáveis?**
R: São ações concretas que demonstram um valor no dia a dia. Ex: Para "Transparência", um comportamento pode ser "Compartilha informações abertamente com a equipe".

### Recrutamento AI
**P: O que é ICP?**
R: ICP (Perfil de Candidato Ideal) é um documento gerado por IA que define hard/soft skills, perfil DISC ideal e critérios de busca para uma vaga.

**P: Como funciona o Hunting AI?**
R: O Hunting varre redes profissionais usando o ICP da vaga. Retorna candidatos com Match Score, DISC inferido e prioridade de abordagem.

**P: O que é Match Score?**
R: Pontuação de 0-100 que indica aderência ao ICP. Considera skills (40%), experiência (20%) e fit cultural (20%).

**P: A IA pode inferir o DISC de um candidato?**
R: Sim! Analisando posts em redes sociais, a IA estima o perfil DISC. É um pré-filtro - o DISC formal é aplicado depois.

**P: Como funciona o Outreach?**
R: Você seleciona candidatos do Hunting, a IA gera mensagens personalizadas, e você envia via WhatsApp ou Email.

**P: O que é o Orquestrador?**
R: É o motor que automatiza o fluxo do candidato. Avança/reprova automaticamente baseado em scores e thresholds.

### Equipe
**P: Como convido minha equipe?**
R: Em Configurações > Equipe > Convidar Membro. Digite o email e escolha o perfil de acesso.

**P: Posso ter mais de um admin?**
R: Sim! Você pode ter quantos admins precisar.

**P: Qual a diferença entre Admin e Líder?**
R: Admin tem acesso total (exceto billing). Líder vê apenas o dashboard da própria equipe e o Pulse.

### Atração
**P: Como crio uma boa descrição de vaga?**
R: Use o Gerador de Job Description com IA em Atração > Job Description. Ele cria descrições otimizadas automaticamente.

**P: Como avalio fit cultural nas entrevistas?**
R: Use o gerador de Perguntas de Valores (técnica STAR) em Atração > Perguntas de Valores.

### DISC
**P: Quanto tempo leva para responder o DISC?**
R: Cerca de 10-15 minutos. São aproximadamente 70 perguntas.

**P: O resultado do DISC muda?**
R: O perfil básico tende a ser estável, mas pode haver variações conforme o contexto.

**P: Qual perfil DISC é melhor?**
R: Não existe perfil "melhor" - cada um tem forças e áreas de atenção. O importante é alocar pessoas em funções compatíveis.

---

## DICAS DE USO AVANÇADAS

### Cultura
1. **Na Criação de Cultura:** Reserve tempo de qualidade - evite fazer apressado
2. **Nos Valores:** Defina comportamentos "Fazer" e "Não Fazer" - torna tangível
3. **Nos Rituais:** Comece com 2-3 e aumente gradualmente
4. **No Culture Code:** Use para onboarding de novos colaboradores

### Pulse e Engajamento
5. **No Pulse:** Mantenha seu streak respondendo no mesmo horário
6. **Nos dashboards:** Crie planos de ação para drivers < 60
7. **Na Matriz de Pessoas:** Faça análise trimestral com gestores

### Recrutamento AI
8. **No ICP:** Revise e ajuste baseado nos candidatos que deram certo
9. **No Hunting:** Configure threshold adequado - alto demais perde bons candidatos
10. **No Outreach:** Personalize a mensagem - genérico não converte
11. **Nos Agentes:** Monitore as conversas para calibrar

### Geral
12. **Nas Jornadas:** Complete as etapas na ordem sugerida
13. **No DISC:** Aplique para toda a equipe para visão completa
14. **No Onboarding:** Configure antes do primeiro dia do novo colaborador
15. **Nos Analytics:** Use dados para justificar investimentos em RH
`;

interface RichClientContext {
  companyName?: string;
  sector?: string;
  teamSize?: number;
  mission?: string | null;
  vision?: string | null;
  values?: string[];
  ritualsCount?: number;
  lastBadge?: string | null;
  journeyProgress?: {
    missaoCompleted?: boolean;
    visaoCompleted?: boolean;
    valoresCompleted?: boolean;
    energiaCompleted?: boolean;
    desenvolvimentoCompleted?: boolean;
    decisaoCompleted?: boolean;
    overallProgress?: number;
  };
}

function buildRichClientContextPrompt(clientContext?: RichClientContext): string {
  if (!clientContext?.companyName) return '';
  
  let prompt = `\n---\n## Contexto do Cliente Atual\n`;
  prompt += `**Empresa:** ${clientContext.companyName}\n`;
  
  if (clientContext.sector) {
    prompt += `**Setor:** ${clientContext.sector}\n`;
  }
  
  if (clientContext.teamSize && clientContext.teamSize > 0) {
    prompt += `**Tamanho da equipe:** ${clientContext.teamSize} membros\n`;
  }
  
  // Show actual mission/vision if defined
  if (clientContext.mission) {
    prompt += `\n**Missão definida:** "${clientContext.mission}"\n`;
  }
  
  if (clientContext.vision) {
    prompt += `**Visão definida:** "${clientContext.vision}"\n`;
  }
  
  // Show values if defined
  if (clientContext.values && clientContext.values.length > 0) {
    prompt += `**Valores definidos:** ${clientContext.values.join(', ')}\n`;
  }
  
  // Show rituals count
  if (clientContext.ritualsCount && clientContext.ritualsCount > 0) {
    prompt += `**Rituais de energia selecionados:** ${clientContext.ritualsCount}\n`;
  }
  
  // Show last badge
  if (clientContext.lastBadge) {
    prompt += `**Última conquista:** ${clientContext.lastBadge}\n`;
  }
  
  // Journey progress
  if (clientContext.journeyProgress) {
    const jp = clientContext.journeyProgress;
    prompt += `\n**Progresso na Jornada de Cultura:**\n`;
    prompt += `- ${jp.missaoCompleted ? '✅' : '⬜'} Missão\n`;
    prompt += `- ${jp.visaoCompleted ? '✅' : '⬜'} Visão\n`;
    prompt += `- ${jp.valoresCompleted ? '✅' : '⬜'} Valores\n`;
    prompt += `- ${jp.energiaCompleted ? '✅' : '⬜'} Rituais de Energia\n`;
    prompt += `- ${jp.desenvolvimentoCompleted ? '✅' : '⬜'} Rituais de Desenvolvimento\n`;
    prompt += `- ${jp.decisaoCompleted ? '✅' : '⬜'} Framework de Decisão\n`;
    
    if (jp.overallProgress !== undefined) {
      prompt += `\n**Progresso Geral:** ${jp.overallProgress}%\n`;
    }
    
    // Smart suggestion based on progress
    if (!jp.missaoCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Completar a Missão da empresa.\n`;
    } else if (!jp.visaoCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Definir a Visão de futuro.\n`;
    } else if (!jp.valoresCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Estabelecer os Valores organizacionais.\n`;
    } else if (!jp.energiaCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Configurar Rituais de Energia.\n`;
    } else if (!jp.desenvolvimentoCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Configurar Rituais de Desenvolvimento.\n`;
    } else if (!jp.decisaoCompleted) {
      prompt += `\n💡 **Próximo passo sugerido:** Completar o Framework de Decisão.\n`;
    } else {
      prompt += `\n🎉 **Parabéns!** A jornada de Cultura está completa. Considere explorar os módulos de Atração e Retenção.\n`;
    }
  }
  
  prompt += `\nUse essas informações para personalizar suas respostas e sugerir próximos passos relevantes.\n`;
  
  return prompt;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Bloqueia abuso público: exige usuário autenticado ou chamada interna (service_role)
  const caller = await requireCaller(req);
  if (!caller.ok) {
    return new Response(
      JSON.stringify({ error: caller.error }),
      { status: caller.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, conversationHistory, currentPage, clientContext, pageInstructions, image } = await req.json();
    
    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Help assistant request:", { 
      message: message?.substring(0, 100), 
      currentPage,
      hasClientContext: !!clientContext,
      clientCompany: clientContext?.companyName,
      hasMission: !!clientContext?.mission,
      hasValues: clientContext?.values?.length > 0,
      hasPageInstructions: !!pageInstructions,
      hasImage: !!image,
      historyLength: conversationHistory?.length || 0 
    });

    // Build dynamic context with rich client data
    const clientContextPrompt = buildRichClientContextPrompt(clientContext);
    const pageInstructionsPrompt = pageInstructions 
      ? `\n---\n## Instruções Específicas desta Página\n${pageInstructions}\n`
      : '';

    const systemPrompt = `Você é o **Assistente EP Partners**, um especialista amigável e prestativo da plataforma EP Partners. Seu papel é ajudar os usuários a navegar, entender e utilizar todas as funcionalidades do sistema de gestão de pessoas e cultura organizacional.

${KNOWLEDGE_BASE}
${clientContextPrompt}
${pageInstructionsPrompt}

---
## Suas Instruções

### Personalidade
- Seja amigável, profissional e encorajador
- Use linguagem clara e acessível
- Demonstre entusiasmo genuíno em ajudar
- Personalize as respostas usando o nome da empresa e contexto do cliente

### Formato de Resposta
- Responda sempre em português brasileiro
- Seja conciso mas completo (máximo 3-4 parágrafos)
- Use formatação markdown quando apropriado (listas, negrito, emojis)
- Para instruções passo-a-passo, use listas numeradas claras

### Guias Passo-a-Passo
Quando o usuário perguntar "como faço", "como eu", "onde fica" ou similar:
1. Forneça um guia passo-a-passo numerado e detalhado
2. Use negrito para destacar onde clicar
3. Inclua dicas úteis quando relevante
4. Sempre termine com um botão de navegação

### Análise de Screenshots
Quando o usuário enviar uma imagem (screenshot) da plataforma:
1. **Identifique** qual página/seção está mostrando
2. **Descreva** brevemente o que você vê na tela
3. **Explique** o que são os elementos principais visíveis
4. **Guie** o usuário sobre como usar aquela funcionalidade
5. **Sugira** próximos passos relevantes

Exemplo de resposta para um screenshot:
"Você está na página de **Criação de Valores**. Vejo que você já selecionou 3 valores. 
O próximo passo é clicar em cada valor para definir os comportamentos observáveis (o que fazer e não fazer).
[ACTION:navigate:Ver detalhes:/cultura/criacao?tab=valores]"

### Ações Navegáveis
Quando apropriado, sugira ações que o usuário pode clicar para navegar diretamente.
Use o formato especial: [ACTION:navigate:Texto do Botão:/caminho/da/pagina]

Exemplos de uso:
- Para ir à Missão: [ACTION:navigate:Ir para Missão:/cultura/criacao?tab=missao]
- Para ir aos Valores: [ACTION:navigate:Definir Valores:/cultura/criacao?tab=valores]
- Para ir às Configurações: [ACTION:navigate:Configurar Equipe:/settings/members]
- Para ir ao DISC: [ACTION:navigate:Ver DISC:/retencao/disc]
- Para ir ao Pulse: [ACTION:navigate:Abrir Pulse:/retencao/pulse]
- Para ir às Jornadas: [ACTION:navigate:Ver Jornadas:/jornadas]

Use estas ações quando:
1. O usuário perguntar "onde fica" ou "como acesso"
2. Você sugerir um próximo passo
3. A resposta mencionar uma funcionalidade específica
4. For útil para facilitar a navegação

### Contexto da Conversa
- O usuário está atualmente na página: "${currentPage || 'não especificada'}"
- Se a pergunta for sobre a página atual, dê dicas específicas para ela
- Se o usuário parecer perdido, sugira onde ir ou o que fazer

### Quando Não Souber
- Se não tiver certeza, diga que vai ajudar a encontrar a informação
- Sugira entrar em contato com o suporte se necessário

### Foco Principal
1. Ajudar a navegar na plataforma com guias passo-a-passo detalhados
2. Explicar funcionalidades e conceitos
3. Analisar screenshots e orientar o usuário
4. Sugerir próximos passos baseados no contexto do cliente
5. Celebrar conquistas e progresso do cliente`;

    // Build user message content - support for image analysis
    let userContent: string | Array<{type: string; text?: string; image_url?: {url: string}}>;
    
    if (image) {
      // Multimodal message with image
      userContent = [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
      ];
    } else {
      userContent = message;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: userContent }
    ];

    const response = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Muitas requisições. Aguarde um momento e tente novamente." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Limite de uso atingido. Entre em contato com o suporte." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("No response from AI");
    }

    console.log("Help assistant response generated successfully");

    return new Response(JSON.stringify({ 
      message: assistantMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in help-assistant function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao processar sua pergunta" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
