import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const log = createLogger('suggest-job-description');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestionRequest {
  field: 'mission' | 'indicators' | 'required_skills' | 'desired_skills' | 'behavioral_competencies' | 'development' | 'benefits';
  jobTitle: string;
  responsibilities?: string[];
  area?: string;
  mission?: string;
  indicators?: string[];
  companyMission?: string;
  companyVision?: string;
  sellingCompanyContent?: string;
  existingValues?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication and rate limit
    const rateLimitResult = await checkRateLimit(req, 'suggest-job-description', 100);
    
    if (!rateLimitResult.userId) {
      log.log('❌ suggest-job-description: Unauthorized request');
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      log.log('❌ suggest-job-description: Rate limit exceeded for user', rateLimitResult.userId);
      return rateLimitExceededResponse(corsHeaders);
    }

    log.log(`✅ suggest-job-description: User ${rateLimitResult.userId} authorized`);

    const request: SuggestionRequest = await req.json();
    const { 
      field, 
      jobTitle, 
      responsibilities, 
      area,
      mission,
      indicators,
      companyMission, 
      companyVision, 
      sellingCompanyContent, 
      existingValues 
    } = request;

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    log.log(`Generating suggestion for field: ${field}, job: ${jobTitle}`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (field) {
      case 'mission':
        systemPrompt = `Você é um especialista em RH e descrição de cargos. Sua tarefa é criar uma missão de cargo clara, objetiva e inspiradora.
A missão deve:
- Ter entre 2-4 linhas
- Começar com um verbo de ação
- Explicar o propósito principal do cargo
- Conectar com os objetivos da empresa
- Ser específica e não genérica`;
        userPrompt = `Cargo: ${jobTitle}
${area ? `Área: ${area}` : ''}
${companyMission ? `Missão da empresa: ${companyMission}` : ''}
${companyVision ? `Visão da empresa: ${companyVision}` : ''}
${responsibilities?.length ? `Responsabilidades principais: ${responsibilities.join(', ')}` : ''}

Crie uma missão inspiradora para este cargo:`;
        break;

      case 'indicators':
        systemPrompt = `Você é um especialista em gestão por indicadores e KPIs com 15+ anos de experiência.

## PROCESSO DE ANÁLISE:
1. Analise o TÍTULO para entender o nível hierárquico
2. Use a MISSÃO para entender o que o cargo entrega
3. Examine as RESPONSABILIDADES para identificar métricas mensuráveis

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 5 indicadores (o usuário escolherá os mais relevantes)
- Cada indicador: 3-8 palavras
- Formato: Nome do indicador mensurável
- Devem ser KPIs específicos e quantificáveis
- NÃO usar "%" ou números específicos

## EXEMPLOS REAIS VALIDADOS:
- "Faturamento"
- "Calls de Onboarding Agendadas (sobre vendas no mês)"
- "Taxa de Recompra"
- "Taxa de conversão de leads"
- "NPS do cliente"
- "Tempo médio de atendimento"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["indicador 1", "indicador 2", "indicador 3", "indicador 4", "indicador 5"]`;
        userPrompt = `# CONTEXTO DO CARGO:
- Título: ${jobTitle}
- Área: ${area || 'Não informada'}
- Missão: ${mission || 'Não informada'}
- Responsabilidades: ${responsibilities?.join(', ') || 'Não informadas'}

Baseado nesse contexto, sugira 5 indicadores de desempenho:`;
        break;

      case 'required_skills':
        systemPrompt = `Você é um especialista em RH com 15+ anos de experiência em descrição de cargos.

## PROCESSO DE ANÁLISE (siga em ordem):
1. Identifique o NÍVEL do cargo (Head/Diretor, Gerente, Coordenador, Analista, Assistente)
2. Analise a MISSÃO para entender o propósito principal
3. Revise os INDICADORES para saber o que será cobrado
4. Examine as RESPONSABILIDADES para identificar skills necessários

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 6 sugestões (o usuário escolherá até 3)
- Cada competência: 3-8 palavras
- Formato: "Experiência com/em [área]" ou "[Habilidade] [contexto]"
- APENAS competências técnicas (NÃO comportamentais)
- NÃO incluir: ferramentas específicas (Excel, SAP), idiomas, formação acadêmica
- Ferramentas, idiomas e formação vão para competências DESEJÁVEIS

## EXEMPLOS REAIS VALIDADOS:
- Head Comercial → "Experiência com Gestão de Processos Comerciais"
- Head de CS → "Experiência com Gestão de Clientes e Processos"
- Gerente Operações → "Experiência gerenciando operações e liderando equipes"
- Social Seller → "Habilidade na comunicação e domínio do português"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["competência 1", "competência 2", "competência 3", "competência 4", "competência 5", "competência 6"]`;
        userPrompt = `# CONTEXTO DO CARGO:
- Título: ${jobTitle}
- Área: ${area || 'Não informada'}
- Missão: ${mission || 'Não informada'}
- Indicadores: ${indicators?.join(', ') || 'Não informados'}
- Responsabilidades: ${responsibilities?.join(', ') || 'Não informadas'}

Baseado nesse contexto, sugira 6 competências técnicas OBRIGATÓRIAS:`;
        break;

      case 'desired_skills':
        systemPrompt = `Você é um especialista em RH com 15+ anos de experiência em descrição de cargos.

## PROCESSO DE ANÁLISE:
1. Analise o contexto completo do cargo
2. Identifique diferenciais que agregariam valor
3. Inclua ferramentas, idiomas e formações relevantes

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 6 sugestões (o usuário escolherá até 5)
- Cada competência: 2-6 palavras
- PODE incluir: ferramentas (Excel, SAP, CRM), idiomas, formação, certificações
- São DIFERENCIAIS, não requisitos obrigatórios

## EXEMPLOS REAIS VALIDADOS:
- "Inglês avançado"
- "Excel avançado"
- "Conhecimento em CRM (Hubspot, Pipedrive)"
- "Formação em Administração ou áreas correlatas"
- "Experiência com ferramentas de IA"
- "Certificação PMP"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["competência 1", "competência 2", "competência 3", "competência 4", "competência 5", "competência 6"]`;
        userPrompt = `# CONTEXTO DO CARGO:
- Título: ${jobTitle}
- Área: ${area || 'Não informada'}
- Missão: ${mission || 'Não informada'}
- Responsabilidades: ${responsibilities?.join(', ') || 'Não informadas'}

Baseado nesse contexto, sugira 6 competências técnicas DESEJÁVEIS:`;
        break;

      case 'behavioral_competencies':
        systemPrompt = `Você é um especialista em cultura organizacional e competências comportamentais.

## PROCESSO DE ANÁLISE:
1. Analise o nível do cargo (liderança exige competências diferentes de entrada)
2. Use os valores da empresa como base
3. Conecte com as responsabilidades do cargo

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 6 sugestões (o usuário escolherá até 5)
- Cada competência: 1-4 palavras
- APENAS comportamentais (NÃO técnicas)
- Alinhadas com a cultura da empresa

## EXEMPLOS REAIS VALIDADOS:
- "Data Driven"
- "Hands-on (mão na massa)"
- "Senso de urgência"
- "Liderança"
- "Proatividade"
- "Adaptabilidade"
- "Comunicação assertiva"
- "Orientação a resultados"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["competência 1", "competência 2", "competência 3", "competência 4", "competência 5", "competência 6"]`;
        userPrompt = `# CONTEXTO DO CARGO:
- Título: ${jobTitle}
- Área: ${area || 'Não informada'}
- Responsabilidades: ${responsibilities?.join(', ') || 'Não informadas'}
${existingValues?.length ? `- Valores da empresa: ${existingValues.join(', ')}` : ''}
${sellingCompanyContent ? `- Contexto cultural da empresa:\n${sellingCompanyContent.substring(0, 1500)}` : ''}

Baseado nesse contexto, sugira 6 competências comportamentais:`;
        break;

      case 'development':
        systemPrompt = `Você é um especialista em desenvolvimento de carreira com 15+ anos de experiência.

## OBJETIVO:
Listar o que o profissional vai DESENVOLVER e APRENDER neste cargo.

## CATEGORIAS A COBRIR:
1. Habilidades de liderança/gestão
2. Conhecimentos técnicos/estratégicos  
3. Experiências práticas
4. Competências interpessoais

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 8 sugestões (o usuário escolherá as mais relevantes)
- Cada item: 5-15 palavras
- Começar com verbo no futuro ou substantivo
- Ser específico ao cargo, não genérico

## EXEMPLOS REAIS VALIDADOS:
- "Liderança estratégica e gestão de equipes de alta performance"
- "Tomada de decisão de alto impacto baseada em dados"
- "Conhecimentos aprofundados em ROIP (Retorno sobre Investimento em Pessoas)"
- "Estratégias de crescimento sustentável e escalável"
- "Experiência na condução de transformações organizacionais"
- "Construção e fortalecimento de cultura empresarial"
- "Gestão de stakeholders e relacionamento com investidores"
- "Inovação em modelos de negócio com propósito"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["item 1", "item 2", "item 3", "item 4", "item 5", "item 6", "item 7", "item 8"]`;
        userPrompt = `# CONTEXTO DO CARGO:
- Título: ${jobTitle}
- Área: ${area || 'Não informada'}
- Missão: ${mission || 'Não informada'}
- Responsabilidades: ${responsibilities?.join(', ') || 'Não informadas'}
${sellingCompanyContent ? `- Sobre a empresa:\n${sellingCompanyContent.substring(0, 1000)}` : ''}

Baseado nesse contexto, liste 8 oportunidades de desenvolvimento:`;
        break;

      case 'benefits':
        systemPrompt = `Você é um especialista em employer branding.

## REGRAS OBRIGATÓRIAS:
- Retorne EXATAMENTE 8 benefícios (o usuário escolherá os mais relevantes)
- Cada benefício: emoji + descrição breve (3-6 palavras)
- Misture benefícios tradicionais e diferenciais

## EXEMPLOS REAIS VALIDADOS:
- "🎓 Treinamentos constantes"
- "💰 Comissões atrativas"
- "🏥 Plano de saúde"
- "🏋️ Gympass"
- "🏠 Trabalho remoto/híbrido"
- "📈 Plano de carreira"
- "🎉 Day off no aniversário"
- "💻 Equipamento fornecido"

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
["emoji benefício 1", "emoji benefício 2", ...]`;
        userPrompt = `${sellingCompanyContent ? `Informações sobre a empresa:\n${sellingCompanyContent.substring(0, 2000)}` : 'Empresa não informada'}

Liste 8 benefícios atrativos:`;
        break;
    }

    // Safety: never call the AI gateway with empty prompts (causes Google "contents is not specified")
    const systemLen = (systemPrompt || '').trim().length;
    const userLen = (userPrompt || '').trim().length;

    if (!field || systemLen === 0 || userLen === 0) {
      log.error('❌ Empty prompt or unsupported field', {
        field,
        jobTitle,
        systemLen,
        userLen,
      });

      return new Response(
        JSON.stringify({
          error: 'Campo não suportado ou contexto insuficiente para gerar sugestão.',
          field,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log('🧠 Prompt sizes', { field, systemLen, userLen });

    const response = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: await getConfiguredModel("suggest-job-description", "google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bubble up gateway/provider errors (400 included) so the frontend can show a toast
      return new Response(
        JSON.stringify({
          error: `AI gateway error: ${response.status}`,
          details: errorText.slice(0, 2000),
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Consume AI credits
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: membership } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', rateLimitResult.userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (membership?.account_id) {
      await consumeAICredits({
        supabase,
        accountId: membership.account_id,
        aiData: data,
        model: 'google/gemini-2.5-flash',
        referenceId: null,
        referenceType: 'suggest_job_description',
        description: `Sugestão JD: ${field} para ${jobTitle}`,
        userId: rateLimitResult.userId,
      });
    }

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse content - try JSON first, then fallback to line parsing
    let suggestions: string[] = [];
    if (['indicators', 'required_skills', 'desired_skills', 'behavioral_competencies', 'development', 'benefits'].includes(field)) {
      // Try to parse as JSON first
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback to line parsing
        suggestions = content
          .split('\n')
          .map((line: string) => line.replace(/^[-•*\d.)\s"]+/, '').replace(/[",\]]+$/, '').trim())
          .filter((line: string) => line.length > 0 && line.length < 100);
      }
    }

    log.log(`Generated ${suggestions.length || 1} suggestions for ${field}`);

    return new Response(
      JSON.stringify({ 
        suggestion: content,
        suggestions,
        field 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Error suggesting job description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
