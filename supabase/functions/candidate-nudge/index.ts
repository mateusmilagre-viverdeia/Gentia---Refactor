import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppViaMeta, isMetaWhatsAppConfigured } from "../_shared/whatsapp-meta.ts";
import { sendEmailViaResend } from "../_shared/resend-email.ts";
import { getConfiguredModel } from "../_shared/ai-model-config.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: accept either cron secret or JWT
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (cronSecret !== expectedSecret && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const staleDays = body.stale_days || 3;
    const dryRun = body.dry_run || false;

    console.log(`🔔 Nudge check: candidates pending > ${staleDays} days (dry_run=${dryRun})`);

    // Find applications with pending stages (not completed, not rejected)
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    const { data: staleApplications, error: queryError } = await supabase
      .from('recruitment_applications')
      .select(`
        id, candidate_id, job_id, stage, status, updated_at, account_id,
        recruitment_candidates!inner(id, name, email, phone),
        recruitment_jobs!inner(id, title, status)
      `)
      .in('status', ['in_progress', 'new', 'applied'])
      .lt('updated_at', staleDate.toISOString())
      .eq('recruitment_jobs.status', 'published')
      .limit(100);

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    if (!staleApplications || staleApplications.length === 0) {
      console.log('✅ No stale applications found');
      return new Response(JSON.stringify({ success: true, nudged: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which candidates have already been nudged recently (within 3 days)
    const candidateIds = staleApplications.map((a: any) => a.candidate_id);
    const recentNudgeDate = new Date();
    recentNudgeDate.setDate(recentNudgeDate.getDate() - 3);

    const { data: recentNudges } = await supabase
      .from('candidate_nudge_log')
      .select('candidate_id, job_id')
      .in('candidate_id', candidateIds)
      .gt('sent_at', recentNudgeDate.toISOString());

    const recentNudgeSet = new Set(
      (recentNudges || []).map((n: any) => `${n.candidate_id}_${n.job_id}`)
    );

    const toNudge = staleApplications.filter(
      (a: any) => !recentNudgeSet.has(`${a.candidate_id}_${a.job_id}`)
    );

    console.log(`📋 ${toNudge.length} candidates to nudge (${staleApplications.length} stale, ${recentNudgeSet.size} recently nudged)`);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dry_run: true,
        would_nudge: toNudge.length,
        candidates: toNudge.map((a: any) => ({
          name: (a.recruitment_candidates as any)?.name,
          job: (a.recruitment_jobs as any)?.title,
          stage: a.stage,
          days_stale: Math.floor((Date.now() - new Date(a.updated_at).getTime()) / 86400000),
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate personalized nudge messages and send
    const LOVABLE_API_KEY = "direct";
    const model = await getConfiguredModel('candidate_nudge', 'google/gemini-3-flash-preview');
    let nudgedCount = 0;

    for (const app of toNudge.slice(0, 20)) { // max 20 per run
      const candidate = app.recruitment_candidates as any;
      const job = app.recruitment_jobs as any;
      const candidateName = candidate?.name?.split(' ')[0] || 'Candidato';
      const jobTitle = job?.title || 'a vaga';

      let message = `Olá, ${candidateName}! Notamos que você ainda não concluiu a próxima etapa do processo seletivo para *${jobTitle}*. Acesse sua área do candidato para continuar. Estamos torcendo por você! 🚀`;

      // Try AI-personalized message
      if (LOVABLE_API_KEY) {
        try {
          const aiResp = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'Você gera mensagens curtas e amigáveis de lembrete para candidatos em processos seletivos. Máximo 300 caracteres. Tom empático e encorajador. Use emoji com moderação. Inclua o nome do candidato e da vaga.',
                },
                {
                  role: 'user',
                  content: `Gere uma mensagem de lembrete para ${candidateName}, vaga: ${jobTitle}, etapa pendente: ${app.stage}, dias sem atividade: ${Math.floor((Date.now() - new Date(app.updated_at).getTime()) / 86400000)}`,
                },
              ],
              temperature: 0.7,
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const aiMessage = aiData.choices?.[0]?.message?.content;
            if (aiMessage && aiMessage.length > 10) {
              message = aiMessage;
            }
            await consumeAICredits({
              supabase, accountId: app.account_id, aiData, model,
              referenceType: 'candidate_nudge', referenceId: app.id,
              description: `Nudge candidato ${candidateName}`,
            });
          }
        } catch (e) {
          console.warn('AI nudge generation failed, using default:', e);
        }
      }

      // Send via WhatsApp
      const phone = candidate?.phone;
      if (phone) {
        const whatsappConfigured = await isMetaWhatsAppConfigured(supabase);
        if (whatsappConfigured) {
          const result = await sendWhatsAppViaMeta({ supabase, toPhone: phone, message });
          if (result.success) {
            console.log(`📱 Nudge sent to ${candidateName} via WhatsApp`);
          }
        }
      }

      // Send via email as fallback/complement
      const email = candidate?.email;
      if (email) {
        try {
          await sendEmailViaResend({
            supabase,
            to: email,
            subject: `Lembrete: Continue seu processo seletivo para ${jobTitle}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#6366f1;">Olá, ${candidateName}!</h2>
              <p>${message.replace(/\*/g, '<strong>').replace(/\n/g, '<br>')}</p>
              <p style="color:#64748b;font-size:12px;">Processo gerenciado por Gent.IA</p>
            </div>`,
          });
        } catch (e) {
          console.warn('Email nudge failed:', e);
        }
      }

      // Log the nudge
      await supabase.from('candidate_nudge_log').insert({
        account_id: app.account_id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        application_id: app.id,
        nudge_type: 'pending_stage_reminder',
        channel: phone ? 'whatsapp' : 'email',
        metadata: { stage: app.stage, message_preview: message.slice(0, 100) },
      });

      nudgedCount++;
    }

    console.log(`✅ Nudged ${nudgedCount} candidates`);

    return new Response(JSON.stringify({ success: true, nudged: nudgedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in candidate-nudge:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
