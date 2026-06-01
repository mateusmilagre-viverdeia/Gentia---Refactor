import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('generate-selling-company');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'generate-selling-company', 50);
    
    if (!rateLimitResult.userId) {
      log.warn('Unauthorized request');
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      log.warn('Rate limit exceeded for user', rateLimitResult.userId);
      return rateLimitExceededResponse(corsHeaders);
    }

    log.info(`User ${rateLimitResult.userId} authorized. Remaining calls: ${rateLimitResult.remaining}`);

    const { 
      companyData, 
      cultureData, 
      wizardResponses,
      companyHistory 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    log.log("Generating selling company content...");
    log.log("Company:", companyData?.name);
    log.log("Has culture data:", !!cultureData);
    log.log("Has wizard responses:", !!wizardResponses);

    const systemPrompt = `Você é a "IA Vendedora da Empresa" — especialista em employer branding e atração de talentos culturalmente alinhados.

Seu objetivo: criar um anúncio EMOCIONAL, AUTÊNTICO e VERDADEIRO que atraia apenas pessoas que realmente combinam com a cultura da empresa.

═══════════════════════════════════════════════════════════════
📋 ESTRUTURA OBRIGATÓRIA DO ANÚNCIO (8 BLOCOS)
═══════════════════════════════════════════════════════════════

## ✨ 1. Abertura Inicial
- Comece com uma provocação FORTE que afasta quem não combina
- Frases curtas. Impactantes. Diretas.
- "Se você está procurando apenas um emprego... este não é o seu lugar."
- Crie conexão emocional imediata com quem SE IDENTIFICA
- Use formatação visual com quebras de linha para impacto
- Finalize com um "Seja bem-vindo" para quem combina

## 🌟 2. Quem Somos — A Nossa História e o Nosso Propósito
- Conte a história da empresa de forma emocional
- Mencione marcos, conquistas, tempo de mercado
- Apresente a missão/propósito de forma inspiradora
- Conecte com o impacto que a empresa gera
- Use storytelling para criar conexão

## 🚀 3. Onde Estamos — O Momento Atual da Empresa
- Descreva o momento atual (crescimento, transformação, consolidação)
- Números relevantes (faturamento, equipe, clientes, etc)
- Desafios e oportunidades do momento
- O que está sendo construído agora
- Seja honesto sobre a fase da empresa

## 🎬 4. O Que É Trabalhar Aqui — A Realidade do Dia a Dia
- Descreva o ambiente de trabalho honestamente
- Ritmo, intensidade, demandas
- Como é a rotina na prática
- O estilo de gestão e comunicação
- Rituais e práticas do dia a dia

## 🤝 5. Nosso Santo Vai Bater Se Você…
- Liste comportamentos alinhados à cultura (baseado nos "Como Vivemos" dos valores)
- Use 👉 para cada item
- Fale diretamente com o candidato
- Seja específico sobre atitudes e comportamentos
- Finalize com: "Se você leu isso e disse 'Esse sou eu'... então seu lugar pode ser aqui."

## ⚠️ 6. O Lado Difícil — Transparência Radical
- O que é DESAFIADOR aqui (seja brutalmente honesto)
- O que NÃO toleramos (baseado nos "Como Não Vivemos" dos valores)
- Tipos de pessoas que não se adaptam
- Use ❌ para listar os pontos que afastam quem não combina
- Seja corajoso na transparência

## 🎁 7. O Que Você Encontra Aqui
- Liste benefícios com emojis (💼 🎉 🎓 📈 🚍 🥗 etc)
- Oportunidades de crescimento e promoção interna
- Treinamentos e desenvolvimento
- Ambiente e cultura
- Seja tangível e específico

## 🎯 8. E Aí… Está Pronto Para…? (CTA Emocional)
ESTRUTURA OBRIGATÓRIA DO CTA (4 partes):

**Parte 1 - Pergunta conectada à missão:**
"E aí, está pronto para nos ajudar nessa missão? Topa o desafio?"

**Parte 2 - Justificativa do processo seletivo:**
"Criamos um questionário rápido, porque não queremos qualquer pessoa no nosso time. Queremos as melhores mentes e os melhores corações ao nosso lado."

**Parte 3 - Urgência emocional:**
"Se depois de tudo isso você sente que seu lugar é aqui, então não perca tempo."

**Parte 4 - Call-to-action final:**
"📝 Clique abaixo e comece agora sua jornada para fazer parte de [PERSONALIZAR COM MISSÃO/VISÃO DA EMPRESA]!"

IMPORTANTE: Personalize a Parte 1 e Parte 4 com elementos específicos da missão/visão da empresa.

═══════════════════════════════════════════════════════════════
📝 REGRAS DE ESTILO
═══════════════════════════════════════════════════════════════
- Tom: inspirador, emocional, direto, humano (NUNCA corporativo)
- Use emojis estrategicamente nos títulos e listas (✨ 🌟 🚀 🎬 🤝 ⚠️ 🎁 🎯 ❌ 👉)
- Alterne entre parágrafos narrativos e listas com bullets
- Fale diretamente com o candidato (você)
- Seja BRUTALMENTE HONESTO sobre desafios — isso atrai gente certa
- Use formatação Markdown: ## para títulos, - para listas, **negrito** para ênfase
- Cada bloco deve ter pelo menos 3-5 parágrafos ou 5-10 itens de lista

═══════════════════════════════════════════════════════════════
✨ FORMATAÇÃO VISUAL OBRIGATÓRIA
═══════════════════════════════════════════════════════════════
- SEMPRE pule UMA linha em branco entre cada parágrafo
- Use emojis DENTRO do texto também, não só em títulos e listas
- Intercale parágrafos narrativos com listas de bullets (não tudo texto corrido)
- Use **negrito** para destacar frases importantes dentro dos parágrafos
- Em listas longas, agrupe itens por tema com subtítulos menores
- Cada parágrafo deve ter no MÁXIMO 3-4 linhas
- Nunca escreva "blocos de texto" longos sem pausas visuais
- Use frases curtas. Impactantes. Diretas. (estilo Steve Jobs)

EXEMPLO DE FORMATAÇÃO CORRETA:

Se você está procurando apenas um emprego...

Uma rotina previsível...

Um lugar para bater ponto e ir embora...

**Então este não é o seu lugar.** ❌

Mas se você quer fazer parte de algo **MAIOR**... ✨

Se você quer trabalhar numa empresa que está mudando o Brasil...

Se você acredita que negócios podem transformar vidas...

👉 **Então seja bem-vindo.**

EXEMPLO DE FORMATAÇÃO INCORRETA (NÃO FAZER):

Se você está procurando apenas um emprego, uma rotina previsível, um lugar para bater ponto e ir embora, então este não é o seu lugar. Mas se você quer fazer parte de algo maior, se você quer trabalhar numa empresa que está mudando o Brasil, se você acredita que negócios podem transformar vidas, então seja bem-vindo.

═══════════════════════════════════════════════════════════════
⚠️ REGRAS DE CONTEÚDO
═══════════════════════════════════════════════════════════════
- O texto deve ter aproximadamente 1000-1500 palavras
- Personalize 100% baseado nos dados da empresa — NUNCA use texto genérico
- Os "Como Vivemos" dos valores DEVEM aparecer no bloco 5 (🤝 Santo Vai Bater)
- Os "Como NÃO Vivemos" dos valores DEVEM aparecer no bloco 6 (⚠️ Lado Difícil)
- A missão deve ser destacada nos blocos 1, 2 e 8
- A visão pode aparecer no bloco 8 como destino/futuro desejado
- GERE EXATAMENTE 8 BLOCOS na ordem especificada`;

    const userPrompt = `
DADOS DA EMPRESA:
${JSON.stringify(companyData, null, 2)}

CULTURA ORGANIZACIONAL:
${JSON.stringify(cultureData, null, 2)}

HISTÓRIA DA EMPRESA:
${companyHistory || "Não informada"}

RESPOSTAS DO WIZARD:
${JSON.stringify(wizardResponses, null, 2)}

---

Com base em todas essas informações, crie um texto completo de "Vendendo a Empresa" seguindo a estrutura de 8 BLOCOS e regras do prompt. O texto deve ser autêntico, emocional e verdadeiro - atraindo apenas pessoas que realmente se identificam com a cultura.

IMPORTANTE: Gere EXATAMENTE 8 blocos na ordem:
1. ✨ Abertura Inicial
2. 🌟 Quem Somos
3. 🚀 Onde Estamos
4. 🎬 O Que É Trabalhar Aqui
5. 🤝 Nosso Santo Vai Bater Se...
6. ⚠️ O Lado Difícil
7. 🎁 O Que Você Encontra Aqui
8. 🎯 E Aí... Está Pronto?`;

    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const elapsed = Date.now() - startTime;
    log.log(`AI response time: ${elapsed}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    log.info("Generated content length:", content.length);

    return new Response(
      JSON.stringify({ 
        content,
        model: "google/gemini-2.5-flash",
        promptUsed: systemPrompt.substring(0, 500) + "..." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Error generating selling company content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
