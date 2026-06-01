import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const log = createLogger('generate-shortlist-report');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  job_id: string;
  candidate_ids?: string[];
  custom_message?: string;
  titulo?: string;
  show_scores?: boolean;
  show_transcripts?: boolean;
  show_contact?: boolean;
  // Compat aliases used by autopilot/internal callers
  jobId?: string;
  accountId?: string;
  autoTriggered?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Service-role bypass for autopilot/internal callers ─────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const isServiceCall = !!bearer && !!serviceKey && bearer === serviceKey;

    let userId: string | null = null;
    if (!isServiceCall) {
      const rateLimitResult = await checkRateLimit(req, 'generate-shortlist-report', 50);
      if (!rateLimitResult.userId) return unauthorizedResponse(corsHeaders);
      if (!rateLimitResult.allowed) return rateLimitExceededResponse(corsHeaders);
      userId = rateLimitResult.userId;
      log.log(`✅ User ${userId} authorized`);
    } else {
      log.log('🔐 Service-role call (autopilot/internal)');
    }

    const request: ReportRequest = await req.json();
    const job_id = request.job_id || request.jobId!;
    const { custom_message, titulo, show_scores = true, show_transcripts = false, show_contact = false, autoTriggered = false } = request;
    let candidate_ids = request.candidate_ids;

    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve account: from JWT membership OR (service call) from job
    let accountId: string;
    if (isServiceCall) {
      const requested = request.accountId;
      const { data: jobAcc } = await supabase
        .from('recruitment_jobs')
        .select('account_id')
        .eq('id', job_id)
        .maybeSingle();
      if (!jobAcc) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      accountId = requested || jobAcc.account_id;
    } else {
      const { data: membership } = await supabase
        .from('account_members')
        .select('account_id')
        .eq('user_id', userId!)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!membership) {
        return new Response(JSON.stringify({ error: 'No active account found' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      accountId = membership.account_id;
    }

    // Get job details
    const { data: job } = await supabase
      .from('recruitment_jobs')
      .select('id, title, location, account_id, cliente_id, job_descriptions(title, area, mission, responsibilities)')
      .eq('id', job_id)
      .eq('account_id', accountId)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Auto-populate candidate_ids: fallback to shortlisted, then top by composite_score
    if (!candidate_ids || candidate_ids.length === 0) {
      const { data: shortlistedApps } = await supabase
        .from('recruitment_applications')
        .select('candidate_id, composite_score')
        .eq('job_id', job_id)
        .eq('status', 'shortlisted')
        .order('composite_score', { ascending: false })
        .limit(20);
      candidate_ids = (shortlistedApps || []).map((a: any) => a.candidate_id).filter(Boolean);

      // Secondary fallback: top scored applications regardless of status
      if (candidate_ids.length === 0) {
        const { data: topApps } = await supabase
          .from('recruitment_applications')
          .select('candidate_id, composite_score')
          .eq('job_id', job_id)
          .not('candidate_id', 'is', null)
          .order('composite_score', { ascending: false, nullsFirst: false })
          .limit(10);
        candidate_ids = (topApps || []).map((a: any) => a.candidate_id).filter(Boolean);
      }
    }

    if (!candidate_ids || candidate_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'candidate_ids are required (or no shortlisted candidates found)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name, slug')
      .eq('id', accountId)
      .single();

    // Get candidates with their scores
    const { data: candidates } = await supabase
      .from('recruitment_candidates')
      .select('id, name, email, phone, linkedin_url')
      .in('id', candidate_ids);

    if (!candidates?.length) {
      return new Response(JSON.stringify({ error: 'No candidates found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get applications with scores
    const { data: applications } = await supabase
      .from('recruitment_applications')
      .select('id, candidate_id, composite_score, cultural_score, disc_score, technical_score, status')
      .eq('job_id', job_id)
      .in('candidate_id', candidate_ids);

    // Get cultural interview results for summaries
    const { data: culturalSessions } = await supabase
      .from('cultural_interview_sessions')
      .select('candidate_id, ai_evaluation, transcript')
      .eq('job_id', job_id)
      .in('candidate_id', candidate_ids)
      .eq('status', 'completed');

    // Build candidate data for AI
    const candidateData = candidates.map(c => {
      const app = applications?.find(a => a.candidate_id === c.id);
      const cultural = culturalSessions?.find(s => s.candidate_id === c.id);
      const evaluation = cultural?.ai_evaluation as any;

      return {
        id: c.id,
        name: c.name,
        email: show_contact ? c.email : undefined,
        phone: show_contact ? c.phone : undefined,
        linkedin_url: show_contact ? c.linkedin_url : undefined,
        composite_score: app?.composite_score || 0,
        cultural_score: app?.cultural_score,
        disc_score: app?.disc_score,
        technical_score: app?.technical_score,
        strengths: evaluation?.strengths || [],
        summary: evaluation?.overall_summary || '',
        transcript_excerpt: show_transcripts ? (cultural?.transcript as string)?.slice(0, 500) : undefined,
      };
    });

    // Sort by composite score
    candidateData.sort((a, b) => b.composite_score - a.composite_score);

    // Generate AI summaries
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jd = (job as any).job_descriptions?.[0] || {};
    const jobContext = `Vaga: ${job.title}\nÁrea: ${jd.area || 'N/A'}\nMissão: ${jd.mission || 'N/A'}`;

    const candidateSummaries = candidateData.map(c => 
      `Candidato: ${c.name}\nScore Composto: ${c.composite_score}%\nCultural: ${c.cultural_score || 'N/A'}%\nDISC: ${c.disc_score || 'N/A'}%\nTécnico: ${c.technical_score || 'N/A'}%\nPontos fortes: ${c.strengths.join(', ') || 'N/A'}\nResumo avaliação: ${c.summary || 'Sem avaliação detalhada'}`
    ).join('\n\n---\n\n');

    const systemPrompt = `Você é um consultor de RH sênior gerando um relatório profissional de shortlist para o cliente final.
Seu objetivo é criar resumos executivos claros e persuasivos sobre cada candidato.
Escreva em português brasileiro, com tom profissional e objetivo.
Use linguagem que destaque as qualidades sem parecer propaganda.`;

    const userPrompt = `Gere um relatório de shortlist profissional.

${jobContext}

Candidatos (ordenados por relevância):

${candidateSummaries}

Para cada candidato, gere:
1. "resumo_profissional": Um resumo executivo de 3-5 linhas descrevendo o perfil, pontos fortes e adequação à vaga
2. "destaque": Uma frase curta (máximo 10 palavras) que resuma o diferencial do candidato

${custom_message ? `\nMensagem personalizada do recrutador para incluir no relatório:\n${custom_message}` : ''}

Também gere uma "mensagem_abertura" de 2-3 frases para o início do relatório, apresentando a shortlist ao cliente.

Responda usando a função report_data.`;

    const model = await getConfiguredModel("generate-shortlist-report", "google/gemini-2.5-flash");

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_data',
            description: 'Structured shortlist report data',
            parameters: {
              type: 'object',
              properties: {
                mensagem_abertura: { type: 'string' },
                candidatos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      candidate_id: { type: 'string' },
                      resumo_profissional: { type: 'string' },
                      destaque: { type: 'string' },
                    },
                    required: ['candidate_id', 'resumo_profissional', 'destaque'],
                  }
                }
              },
              required: ['mensagem_abertura', 'candidatos'],
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_data' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      log.log('AI gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    
    // Consume credits
    await consumeAICredits({
      supabase,
      accountId,
      aiData,
      model,
      referenceId: job_id,
      referenceType: 'shortlist_report',
      description: `Relatório de shortlist: ${job.title}`,
      userId,
    });

    // Parse tool call response
    let reportContent: any = { mensagem_abertura: '', candidatos: [] };
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        reportContent = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      log.log('Failed to parse AI response:', e);
    }

    // Build complete report JSON
    const conteudoJson = {
      mensagem_abertura: custom_message || reportContent.mensagem_abertura,
      empresa: company?.name || 'Empresa',
      vaga: {
        titulo: job.title,
        area: jd.area,
        localizacao: job.location,
      },
      show_scores,
      show_transcripts,
      show_contact,
      candidatos: candidateData.map(c => {
        const aiCandidate = reportContent.candidatos?.find((rc: any) => rc.candidate_id === c.id);
        return {
          id: c.id,
          nome: c.name,
          email: c.email,
          phone: c.phone,
          linkedin_url: c.linkedin_url,
          composite_score: c.composite_score,
          cultural_score: c.cultural_score,
          disc_score: c.disc_score,
          technical_score: c.technical_score,
          strengths: c.strengths,
          resumo_profissional: aiCandidate?.resumo_profissional || c.summary || 'Resumo não disponível',
          destaque: aiCandidate?.destaque || '',
          transcript_excerpt: c.transcript_excerpt,
        };
      }),
      generated_at: new Date().toISOString(),
      origin: autoTriggered ? 'autopilot' : 'manual',
      auto_triggered: !!autoTriggered,
    };

    // Generate public token
    const tokenPublico = crypto.randomUUID().replace(/-/g, '');

    // Save to database
    const { data: report, error: insertError } = await supabase
      .from('shortlist_relatorios')
      .insert({
        account_id: accountId,
        vaga_id: job_id,
        cliente_id: job.cliente_id,
        titulo: titulo || `Shortlist - ${job.title}`,
        conteudo_json: conteudoJson,
        token_publico: tokenPublico,
        visualizacoes: 0,
      })
      .select('id, token_publico')
      .single();

    if (insertError) {
      log.log('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save report' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    log.log(`✅ Report created: ${report.id}, token: ${report.token_publico}`);

    // Emit shortlist_ready event when invoked manually for a job linked to a client
    // (autopilot path already emits this from recruitment-orchestrator)
    if (!autoTriggered && job.cliente_id) {
      try {
        await supabase.functions.invoke("portal-activity-emit", {
          body: {
            account_id: accountId,
            cliente_id: job.cliente_id,
            job_id: job_id,
            event_type: "shortlist_ready",
            event_data: {
              job_title: job.title,
              report_id: report.id,
              token_publico: report.token_publico,
              origin: "manual",
            },
          },
        });
        log.log(`📣 shortlist_ready event emitted for client ${job.cliente_id}`);
      } catch (emitErr) {
        log.log("⚠️ Non-fatal portal-activity-emit error:", emitErr);
      }
    }

    return new Response(JSON.stringify({
      id: report.id,
      token_publico: report.token_publico,
      conteudo_json: conteudoJson,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    log.log('Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
