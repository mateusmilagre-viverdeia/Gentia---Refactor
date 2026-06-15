import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { sendWhatsAppViaZApi, isZApiConfigured } from '../_shared/whatsapp-zapi.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';
import { sendOutreachEmail } from '../_shared/outreach-email-sender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SequenceStep {
  step_number: number;
  day_offset: number;
  message_template: string;
  channel: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret for automated calls
  const cronSecret = Deno.env.get('CRON_SECRET');
  const requestSecret = req.headers.get('x-cron-secret');
  const isManual = req.headers.get('x-manual-trigger') === 'true';

  if (!isManual && cronSecret && requestSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const lovableApiKey = "direct";

  try {
    // Find conversations that need follow-up
    const now = new Date().toISOString();
    const { data: conversations, error: convError } = await supabase
      .from('recruitment_outreach_conversations')
      .select(`
        *,
        campaign:recruitment_outreach_campaigns(*)
      `)
      .not('next_followup_at', 'is', null)
      .lte('next_followup_at', now)
      .not('status', 'in', '("responded","opted_out","archived","converted")')
      .limit(50);

    if (convError) {
      console.error('[sequence-processor] Error fetching conversations:', convError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch conversations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No follow-ups pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sequence-processor] Processing ${conversations.length} follow-ups`);

    let processed = 0;
    let errors = 0;

    for (const conv of conversations) {
      const campaign = conv.campaign;
      if (!campaign) continue;

      const sequenceSteps: SequenceStep[] = campaign.sequence_steps || [];
      const currentStep = conv.current_step || 0;
      const nextStepIndex = currentStep; // 0-based: step 0 = first follow-up

      if (nextStepIndex >= sequenceSteps.length) {
        // All steps completed, archive
        await supabase
          .from('recruitment_outreach_conversations')
          .update({ status: 'archived', next_followup_at: null })
          .eq('id', conv.id);

        // Log the archival
        await logCommunication(supabase, {
          account_id: conv.account_id,
          candidate_id: conv.candidate_id,
          job_id: campaign.job_id,
          message_type: 'outreach_sequence_end',
          channel: 'system',
          recipient: conv.contact_phone || conv.candidate_id || 'unknown',
          body: `Sequência finalizada após ${sequenceSteps.length} steps sem resposta`,
          status: 'completed',
          metadata: { campaign_id: campaign.id, conversation_id: conv.id, total_steps: sequenceSteps.length },
        });
        continue;
      }

      const step = sequenceSteps[nextStepIndex];
      let messageToSend = step.message_template;

      // Personalize the message using AI if template contains placeholders
      if (lovableApiKey && (messageToSend.includes('{') || messageToSend.includes('personaliz'))) {
        try {
          const personalizePrompt = `Personalize esta mensagem de follow-up para um candidato:

Template: ${step.message_template}
Nome do candidato: ${conv.contact_name}
Step: ${step.step_number} de ${sequenceSteps.length}
Empresa/Vaga: ${campaign.name}

Se o template contém placeholders como {nome}, substitua com os dados do candidato.
Se não, melhore levemente a mensagem mantendo o tom original.
Retorne APENAS o texto da mensagem, sem aspas ou explicações.`;

          const aiResp = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                { role: 'system', content: 'Você é um assistente de recrutamento. Personalize mensagens de follow-up de forma profissional e amigável.' },
                { role: 'user', content: personalizePrompt },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const personalizedMsg = aiData.choices?.[0]?.message?.content?.trim();
            if (personalizedMsg) {
              messageToSend = personalizedMsg;
            }
            // Consume AI credits for follow-up personalization
            await consumeAICredits({
              supabase,
              accountId: conv.account_id,
              aiData,
              model: 'google/gemini-2.5-flash-lite',
              referenceId: conv.id,
              referenceType: 'outreach_followup',
              description: `Follow-up step ${step.step_number} para ${conv.contact_name}`,
              userId: null,
            });
          }
        } catch (aiErr) {
          console.error(`[sequence-processor] AI personalization failed for conv ${conv.id}:`, aiErr);
          // Fall back to template
        }
      }

      // Simple placeholder replacement as fallback
      messageToSend = messageToSend
        .replace(/{nome}/gi, conv.contact_name || '')
        .replace(/{name}/gi, conv.contact_name || '')
        .replace(/{step}/gi, String(step.step_number));

      // Send via WhatsApp (Z-API)
      let sendStatus = 'failed';
      let errorCode: string | null = null;
      let errorMessage: string | null = null;
      let providerMessageId: string | null = null;

      if (step.channel === 'whatsapp' && conv.contact_phone && isZApiConfigured()) {
        try {
          const result = await sendWhatsAppViaZApi({
            toPhoneE164: conv.contact_phone,
            message: messageToSend,
          });
          sendStatus = 'sent';
          providerMessageId = (result.response as any)?.messageId || null;
          processed++;
        } catch (sendErr) {
          sendStatus = 'failed';
          errorMessage = sendErr instanceof Error ? sendErr.message : 'Send failed';
          errorCode = 'WHATSAPP_SEND_ERROR';
          errors++;
          console.error(`[sequence-processor] WhatsApp send failed for conv ${conv.id}:`, sendErr);
        }
      } else if (step.channel === 'email' && conv.contact_email) {
        try {
          // Fetch company name for email template
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', conv.account_id)
            .single();

          const companyName = companyData?.name || 'Recrutamento';
          const emailSubject = `${campaign.name} — Oportunidade para ${conv.contact_name || 'você'}`;

          const emailResult = await sendOutreachEmail({
            supabase,
            to: conv.contact_email,
            candidateName: conv.contact_name || '',
            message: messageToSend,
            subject: emailSubject,
            companyName,
          });

          if (emailResult.ok) {
            sendStatus = 'sent';
            processed++;
          } else {
            sendStatus = 'failed';
            errorMessage = emailResult.error || 'Email send failed';
            errorCode = 'EMAIL_SEND_ERROR';
            errors++;
            console.error(`[sequence-processor] Email send failed for conv ${conv.id}:`, emailResult.error);
          }
        } catch (emailErr) {
          sendStatus = 'failed';
          errorMessage = emailErr instanceof Error ? emailErr.message : 'Email send failed';
          errorCode = 'EMAIL_SEND_ERROR';
          errors++;
          console.error(`[sequence-processor] Email send error for conv ${conv.id}:`, emailErr);
        }
      } else {
        sendStatus = 'skipped';
        if (step.channel === 'whatsapp' && !conv.contact_phone) {
          errorMessage = 'No phone number';
        } else if (step.channel === 'whatsapp' && !isZApiConfigured()) {
          errorMessage = 'Z-API not configured';
        } else if (step.channel === 'email' && !conv.contact_email) {
          errorMessage = 'No email address';
        } else {
          errorMessage = 'Channel not supported';
        }
        errors++;
      }

      // Log the communication
      await logCommunication(supabase, {
        account_id: conv.account_id,
        candidate_id: conv.candidate_id,
        job_id: campaign.job_id,
        message_type: 'outreach_followup',
        channel: step.channel || 'whatsapp',
        recipient: conv.contact_phone || conv.contact_email || 'unknown',
        body: messageToSend,
        status: sendStatus,
        provider: step.channel === 'email' ? 'resend' : 'zapi',
        provider_message_id: providerMessageId,
        error_code: errorCode,
        error_message: errorMessage,
        metadata: {
          campaign_id: campaign.id,
          conversation_id: conv.id,
          step_number: step.step_number,
          day_offset: step.day_offset,
        },
      });

      // Update conversation: advance step and schedule next follow-up
      const nextStep = nextStepIndex + 1;
      let nextFollowupAt: string | null = null;

      if (nextStep < sequenceSteps.length && sendStatus === 'sent') {
        const nextStepDef = sequenceSteps[nextStep];
        const daysDiff = nextStepDef.day_offset - step.day_offset;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + Math.max(daysDiff, 1));
        nextFollowupAt = nextDate.toISOString();
      }

      await supabase
        .from('recruitment_outreach_conversations')
        .update({
          current_step: nextStep,
          next_followup_at: nextFollowupAt,
          ...(sendStatus !== 'sent' ? {} : {}),
        })
        .eq('id', conv.id);

      // Update campaign counters
      if (sendStatus === 'sent') {
        await supabase
          .from('recruitment_outreach_campaigns')
          .update({ contacts_sent: (campaign.contacts_sent || 0) + 1 })
          .eq('id', campaign.id);
      }
    }

    console.log(`[sequence-processor] Done. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: conversations.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sequence-processor] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logCommunication(supabase: any, params: {
  account_id: string;
  candidate_id?: string | null;
  job_id?: string | null;
  message_type: string;
  channel: string;
  recipient: string;
  subject?: string;
  body?: string;
  status: string;
  provider?: string | null;
  provider_message_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from('recruitment_communications_log').insert({
      account_id: params.account_id,
      candidate_id: params.candidate_id || null,
      job_id: params.job_id || null,
      message_type: params.message_type,
      channel: params.channel,
      recipient: params.recipient,
      subject: params.subject || null,
      body: params.body || null,
      status: params.status,
      provider: params.provider || null,
      provider_message_id: params.provider_message_id || null,
      error_code: params.error_code || null,
      error_message: params.error_message || null,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('[sequence-processor] Failed to log communication:', err);
  }
}
