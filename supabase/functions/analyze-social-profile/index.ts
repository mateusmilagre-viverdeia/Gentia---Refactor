import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DISCScores {
  d: number;
  i: number;
  s: number;
  c: number;
  primary: string;
  secondary: string | null;
}

interface DISCEvidence {
  dimension: string;
  score_contribution: number;
  evidence: string;
  quotes: string[];
}

interface TechFitResult {
  score: number;
  skills_matched: string[];
  skills_missing: string[];
  experience_fit: number;
  seniority_match: boolean;
  certifications_found: string[];
}

interface SocialAnalysisResult {
  inferred_disc: DISCScores;
  disc_confidence: number;
  disc_evidence: DISCEvidence[];
  tech_fit: TechFitResult | null;
  hunting_priority: number;
  personality_insights: string[];
  communication_style: string;
}

const DISC_ANALYSIS_PROMPT = `Você é um Psicólogo Organizacional especialista em análise comportamental DISC.

Analise o perfil e as postagens do candidato para ESTIMAR o perfil DISC baseado em:

INDICADORES DE DOMINÂNCIA (D):
- Linguagem assertiva e direta ("fazer", "conquistar", "liderar", "resultado")
- Posts sobre metas alcançadas, vitórias, conquistas
- Tom competitivo e orientado a resultados
- Foco em eficiência e produtividade

INDICADORES DE INFLUÊNCIA (I):
- Uso frequente de emojis e linguagem entusiasmada
- Posts sobre networking, eventos, colaborações
- Tom otimista e motivacional
- Foco em relacionamentos e reconhecimento social

INDICADORES DE ESTABILIDADE (S):
- Linguagem calma, acolhedora, empática
- Posts sobre equipe, família, comunidade
- Tom consistente e paciente
- Foco em harmonia e processos estabelecidos

INDICADORES DE CONFORMIDADE (C):
- Linguagem técnica, precisa, detalhada
- Posts com dados, análises, metodologias
- Tom analítico e estruturado
- Foco em qualidade e padrões

IMPORTANTE:
- Avalie CADA dimensão de 0-100
- Justifique com exemplos ESPECÍFICOS das postagens
- Se houver poucos dados, indique baixa confiança
- Considere o tom geral, frequência de posts e temas recorrentes`;

const TECH_FIT_PROMPT = `Você é um Tech Recruiter expert em avaliação de competências técnicas.

Compare o perfil do candidato com os requisitos técnicos da vaga (ICP).

AVALIE:
1. Skills obrigatórias presentes no perfil (cada skill encontrada = pontos)
2. Skills desejáveis presentes (pontuação parcial)
3. Anos de experiência vs requisito da vaga
4. Nível de senioridade compatível com a vaga
5. Certificações relevantes mencionadas

REGRAS DE PONTUAÇÃO:
- Cada skill obrigatória encontrada: +15 pontos
- Cada skill desejável encontrada: +5 pontos
- Experiência no range: +20 pontos
- Senioridade compatível: +15 pontos
- Certificações relevantes: +5 pontos cada

Máximo: 100 pontos`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      profileData, 
      posts, 
      icpProfile,
      analyzeDisc = true,
      analyzeTechFit = true,
      account_id,
      reference_id,
    } = await req.json();

    const supabase = account_id ? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) : null;

    if (!profileData) {
      return new Response(
        JSON.stringify({ success: false, error: 'profileData é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-social] Starting analysis for:', profileData.name || profileData.fullName || profileData.username);

    let inferredDisc: DISCScores | null = null;
    let discConfidence = 0;
    let discEvidence: DISCEvidence[] = [];
    let personalityInsights: string[] = [];
    let communicationStyle = 'unknown';
    let techFit: TechFitResult | null = null;

    // ============== DISC ANALYSIS ==============
    if (analyzeDisc && posts && posts.length > 0) {
      console.log('[analyze-social] Analyzing DISC from', posts.length, 'posts');

      const postTexts = posts
        .map((p: any) => typeof p === 'string' ? p : (p.text || p.caption || ''))
        .filter((t: string) => t.length > 10)
        .slice(0, 20);

      if (postTexts.length >= 3) {
        try {
          const discResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: await getConfiguredModel("analyze-social-profile", "google/gemini-2.5-flash"),
              messages: [
                { role: 'system', content: DISC_ANALYSIS_PROMPT },
                {
                  role: 'user',
                  content: `PERFIL:
Nome: ${profileData.name || profileData.fullName || 'N/A'}
Título: ${profileData.headline || profileData.title || profileData.bio || 'N/A'}
Resumo: ${profileData.summary || 'N/A'}

POSTAGENS RECENTES (${postTexts.length}):
${postTexts.map((t: string, i: number) => `[${i + 1}] "${t.substring(0, 300)}${t.length > 300 ? '...' : ''}"`).join('\n\n')}

Analise e estime o perfil DISC deste candidato.`
                }
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'analyze_disc_profile',
                    description: 'Analyze DISC profile based on social media posts',
                    parameters: {
                      type: 'object',
                      properties: {
                        d_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Dominance score' },
                        i_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Influence score' },
                        s_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Steadiness score' },
                        c_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Conscientiousness score' },
                        confidence: { type: 'integer', minimum: 0, maximum: 100, description: 'Confidence level in the analysis' },
                        d_evidence: { type: 'string', description: 'Evidence for D score with quote examples' },
                        i_evidence: { type: 'string', description: 'Evidence for I score with quote examples' },
                        s_evidence: { type: 'string', description: 'Evidence for S score with quote examples' },
                        c_evidence: { type: 'string', description: 'Evidence for C score with quote examples' },
                        personality_insights: { type: 'array', items: { type: 'string' }, description: 'Key personality insights' },
                        communication_style: { type: 'string', enum: ['direct', 'enthusiastic', 'calm', 'analytical', 'balanced'], description: 'Primary communication style' }
                      },
                      required: ['d_score', 'i_score', 's_score', 'c_score', 'confidence'],
                      additionalProperties: false
                    }
                  }
                }
              ],
              tool_choice: { type: 'function', function: { name: 'analyze_disc_profile' } }
            }),
          });

          if (discResponse.ok) {
            const discData = await discResponse.json();
            if (supabase && account_id) {
              try {
                await consumeAICredits({
                  supabase, accountId: account_id, aiData: discData,
                  model: 'google/gemini-2.5-flash',
                  referenceType: 'analyze_social_disc',
                  referenceId: reference_id || null,
                  description: 'Análise DISC via perfil social',
                });
              } catch (e) { console.error('[analyze-social] disc billing', e); }
            }
            const toolCall = discData.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall?.function?.arguments) {
              const analysis = JSON.parse(toolCall.function.arguments);
              
              // Determine primary and secondary profiles
              const scores = [
                { dim: 'D', score: analysis.d_score },
                { dim: 'I', score: analysis.i_score },
                { dim: 'S', score: analysis.s_score },
                { dim: 'C', score: analysis.c_score },
              ].sort((a, b) => b.score - a.score);

              inferredDisc = {
                d: analysis.d_score,
                i: analysis.i_score,
                s: analysis.s_score,
                c: analysis.c_score,
                primary: scores[0].dim,
                secondary: scores[1].score >= 50 ? scores[1].dim : null,
              };

              discConfidence = analysis.confidence;
              communicationStyle = analysis.communication_style || 'balanced';
              personalityInsights = analysis.personality_insights || [];

              discEvidence = [
                { dimension: 'D', score_contribution: analysis.d_score, evidence: analysis.d_evidence || '', quotes: [] },
                { dimension: 'I', score_contribution: analysis.i_score, evidence: analysis.i_evidence || '', quotes: [] },
                { dimension: 'S', score_contribution: analysis.s_score, evidence: analysis.s_evidence || '', quotes: [] },
                { dimension: 'C', score_contribution: analysis.c_score, evidence: analysis.c_evidence || '', quotes: [] },
              ];

              console.log('[analyze-social] DISC analysis complete:', inferredDisc.primary, inferredDisc.secondary || '');
            }
          } else {
            console.error('[analyze-social] DISC API error:', await discResponse.text());
          }
        } catch (discError) {
          console.error('[analyze-social] DISC analysis error:', discError);
        }
      } else {
        discConfidence = 0;
        console.log('[analyze-social] Insufficient posts for DISC analysis');
      }
    }

    // ============== TECH FIT ANALYSIS ==============
    if (analyzeTechFit && icpProfile) {
      console.log('[analyze-social] Analyzing tech fit against ICP');

      try {
        const techResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: await getConfiguredModel("analyze-social-profile", "google/gemini-2.5-flash"),
            messages: [
              { role: 'system', content: TECH_FIT_PROMPT },
              {
                role: 'user',
                content: `ICP DA VAGA:
Cargo: ${icpProfile.role || 'N/A'}
Senioridade: ${icpProfile.seniority || 'N/A'}
Skills Obrigatórias: ${icpProfile.mandatory_skills?.join(', ') || 'N/A'}
Skills Desejáveis: ${icpProfile.nice_to_have?.join(', ') || 'N/A'}
Experiência Requerida: ${icpProfile.experience_years_min || 0}-${icpProfile.experience_years_max || 'N/A'} anos

PERFIL DO CANDIDATO:
Nome: ${profileData.name || profileData.fullName || 'N/A'}
Título Atual: ${profileData.headline || profileData.title || 'N/A'}
Skills: ${profileData.skills?.join(', ') || 'N/A'}
Experiência: ${profileData.experience_years || 'N/A'} anos
Experiências: ${JSON.stringify(profileData.experiences?.slice(0, 3) || [])}
Educação: ${JSON.stringify(profileData.education?.slice(0, 2) || [])}

Avalie o fit técnico deste candidato para a vaga.`
              }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'evaluate_tech_fit',
                  description: 'Evaluate technical fit between candidate and job requirements',
                  parameters: {
                    type: 'object',
                    properties: {
                      score: { type: 'integer', minimum: 0, maximum: 100 },
                      skills_matched: { type: 'array', items: { type: 'string' } },
                      skills_missing: { type: 'array', items: { type: 'string' } },
                      experience_fit: { type: 'integer', minimum: 0, maximum: 100 },
                      seniority_match: { type: 'boolean' },
                      certifications_found: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['score', 'skills_matched', 'skills_missing', 'experience_fit', 'seniority_match'],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: 'function', function: { name: 'evaluate_tech_fit' } }
          }),
        });

        if (techResponse.ok) {
          const techData = await techResponse.json();
          if (supabase && account_id) {
            try {
              await consumeAICredits({
                supabase, accountId: account_id, aiData: techData,
                model: 'google/gemini-2.5-flash',
                referenceType: 'analyze_social_techfit',
                referenceId: reference_id || null,
                description: 'Análise de tech fit via perfil social',
              });
            } catch (e) { console.error('[analyze-social] techfit billing', e); }
          }
          const toolCall = techData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            techFit = JSON.parse(toolCall.function.arguments);
            console.log('[analyze-social] Tech fit score:', techFit?.score);
          }
        } else {
          console.error('[analyze-social] Tech fit API error:', await techResponse.text());
        }
      } catch (techError) {
        console.error('[analyze-social] Tech fit analysis error:', techError);
      }
    }

    // ============== CALCULATE HUNTING PRIORITY ==============
    let huntingPriority = 50; // Base score

    if (inferredDisc && icpProfile?.disc_ideal) {
      // Compare inferred DISC with ideal DISC
      const discIdeal = icpProfile.disc_ideal;
      const discDiff = Math.abs(inferredDisc.d - (discIdeal.d || 50)) +
                       Math.abs(inferredDisc.i - (discIdeal.i || 50)) +
                       Math.abs(inferredDisc.s - (discIdeal.s || 50)) +
                       Math.abs(inferredDisc.c - (discIdeal.c || 50));
      
      const discFitScore = Math.max(0, 100 - (discDiff / 4));
      
      if (techFit) {
        // Composite: 40% match_score (from ICP), 35% tech_fit, 25% disc_fit
        huntingPriority = Math.round(
          (techFit.score * 0.35) +
          (discFitScore * 0.25) +
          (discConfidence * 0.1) +
          30 // Base points
        );
      } else {
        huntingPriority = Math.round((discFitScore * 0.4) + (discConfidence * 0.2) + 40);
      }
    } else if (techFit) {
      huntingPriority = Math.round((techFit.score * 0.6) + 40);
    }

    huntingPriority = Math.min(100, Math.max(0, huntingPriority));

    const result: SocialAnalysisResult = {
      inferred_disc: inferredDisc || { d: 50, i: 50, s: 50, c: 50, primary: 'unknown', secondary: null },
      disc_confidence: discConfidence,
      disc_evidence: discEvidence,
      tech_fit: techFit,
      hunting_priority: huntingPriority,
      personality_insights: personalityInsights,
      communication_style: communicationStyle,
    };

    console.log('[analyze-social] Analysis complete. Hunting priority:', huntingPriority);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-social] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
