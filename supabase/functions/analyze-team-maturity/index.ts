import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('analyze-team-maturity');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  x_position: number;
  y_position: number;
  notes?: string;
  level: string;
  levelLabel: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(req, 'analyze-team-maturity');
    
    if (!rateLimitResult.userId) {
      return unauthorizedResponse(corsHeaders);
    }
    
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(corsHeaders);
    }

    const { mode, points, targetPerson } = await req.json();

    if (!points || points.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma pessoa para analisar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Calculate maturity level for each person
    const getLevel = (x: number, y: number) => {
      if (x < 50 && y < 50) return { level: 'M4', label: 'Adulto' };
      if (x >= 50 && y < 50) return { level: 'M1', label: 'Bebê' };
      if (x < 50 && y >= 50) return { level: 'M3', label: 'Adolescente' };
      return { level: 'M2', label: 'Criança' };
    };

    const enrichedPoints: TeamMember[] = points.map((p: any) => {
      const levelInfo = getLevel(p.x_position, p.y_position);
      return { ...p, level: levelInfo.level, levelLabel: levelInfo.label };
    });

    // Calculate distribution
    const distribution = enrichedPoints.reduce(
      (acc, p) => {
        acc[p.level as keyof typeof acc]++;
        return acc;
      },
      { M1: 0, M2: 0, M3: 0, M4: 0 }
    );

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'individual' && targetPerson) {
      const person = enrichedPoints.find((p) => p.id === targetPerson.id);
      if (!person) {
        return new Response(JSON.stringify({ error: 'Pessoa não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      systemPrompt = `Você é um especialista em Liderança Situacional (modelo de Hersey e Blanchard) e desenvolvimento de equipes.
      
MODELO DE MATURIDADE:
- M1 (Bebê): Alto diretivo + Baixo suporte - Pessoa precisa de instruções claras, passo a passo, supervisão próxima
- M2 (Criança): Alto diretivo + Alto suporte - Pessoa precisa de direção E encorajamento, explicar o "porquê"
- M3 (Adolescente): Baixo diretivo + Alto suporte - Pessoa sabe fazer mas precisa de apoio emocional e confiança
- M4 (Adulto): Baixo diretivo + Baixo suporte - Pessoa autônoma, delegue e desafie

ESTILOS DE LIDERANÇA:
- S1 (Dirigir): Para M1 - Diga O QUE, QUANDO, ONDE e COMO fazer
- S2 (Orientar): Para M2 - Explique decisões, dê oportunidade para esclarecer
- S3 (Apoiar): Para M3 - Facilite e apoie, compartilhe tomada de decisão
- S4 (Delegar): Para M4 - Transfira responsabilidade, monitore de longe

Responda APENAS em JSON válido, sem markdown.`;

      userPrompt = `Analise esta pessoa e forneça recomendações de liderança:

PESSOA:
- Nome: ${person.first_name} ${person.last_name}
- Nível atual: ${person.level} (${person.levelLabel})
- Posição X (Diretivo): ${person.x_position}%
- Posição Y (Suporte): ${person.y_position}%
${person.notes ? `- Observações: ${person.notes}` : ''}

Retorne JSON com esta estrutura:
{
  "personName": "Nome completo",
  "currentLevel": "${person.level}",
  "currentLevelLabel": "${person.levelLabel}",
  "leadershipStyle": {
    "recommended": "S1/S2/S3/S4 - Nome do estilo",
    "description": "Como aplicar este estilo com esta pessoa (2-3 frases)",
    "dos": ["3-4 ações que o líder DEVE fazer"],
    "donts": ["3-4 ações que o líder NÃO deve fazer"]
  },
  "nextLevel": "${person.level === 'M4' ? null : 'próximo nível'}",
  "developmentPath": {
    "goal": "Objetivo de desenvolvimento",
    "actions": ["3-4 ações específicas para desenvolver esta pessoa"],
    "timeframe": "Prazo estimado (ex: 3-6 meses)"
  },
  "risks": ["2-3 riscos de aplicar estilo errado"],
  "strengths": ["2-3 pontos fortes desta pessoa baseado no nível"]
}`;
    } else {
      // Team analysis
      systemPrompt = `Você é um especialista em Liderança Situacional (modelo de Hersey e Blanchard) e desenvolvimento de equipes.

MODELO DE MATURIDADE:
- M1 (Bebê): Alto diretivo + Baixo suporte - Precisa de instruções claras
- M2 (Criança): Alto diretivo + Alto suporte - Precisa de direção e encorajamento
- M3 (Adolescente): Baixo diretivo + Alto suporte - Sabe fazer mas precisa de apoio
- M4 (Adulto): Baixo diretivo + Baixo suporte - Autônomo, delegar e desafiar

TIME IDEAL: Maioria em M3-M4, com processos para desenvolver M1-M2 rapidamente.

Responda APENAS em JSON válido, sem markdown.`;

      const teamList = enrichedPoints
        .map((p) => `- ${p.first_name} ${p.last_name}: ${p.level} (${p.levelLabel})`)
        .join('\n');

      userPrompt = `Analise este time e forneça recomendações macro:

DISTRIBUIÇÃO DO TIME:
- M1 (Bebê): ${distribution.M1} pessoas
- M2 (Criança): ${distribution.M2} pessoas
- M3 (Adolescente): ${distribution.M3} pessoas
- M4 (Adulto): ${distribution.M4} pessoas
- Total: ${enrichedPoints.length} pessoas

MEMBROS:
${teamList}

Retorne JSON com esta estrutura:
{
  "summary": "Resumo geral do time em 2-3 frases",
  "distribution": ${JSON.stringify(distribution)},
  "averageMaturity": "M1/M2/M3/M4 - baseado na predominância",
  "averageMaturityLabel": "Bebê/Criança/Adolescente/Adulto",
  "leadershipRecommendations": [
    {
      "style": "Nome do estilo predominante",
      "description": "Como aplicar no dia-a-dia do time"
    }
  ],
  "gaps": [
    {
      "issue": "Problema identificado",
      "impact": "Impacto no time/empresa",
      "recommendation": "Ação recomendada"
    }
  ],
  "actionPlan": {
    "immediate": ["2-3 ações para fazer esta semana"],
    "shortTerm": ["2-3 ações para os próximos 30 dias"],
    "longTerm": ["2-3 ações para os próximos 3-6 meses"]
  },
  "insights": ["3-4 insights estratégicos sobre o time"]
}`;
    }

    console.log('Calling Lovable AI for team maturity analysis, mode:', mode);

    const response = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Clean markdown if present
    content = content.trim();
    if (content.startsWith('```')) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        content = match[1];
      }
    }

    const analysis = JSON.parse(content);

    console.log('Team maturity analysis completed, mode:', mode);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-team-maturity:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao analisar' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
