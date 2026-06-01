import { createClient } from 'npm:@supabase/supabase-js@2';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate via CRON_SECRET header or skip if called from pg_cron (no secret available in env)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const requestSecret = req.headers.get('x-cron-secret');
    // If CRON_SECRET is set, require it. Otherwise allow (for pg_cron calls with anon key)
    if (cronSecret && requestSecret && requestSecret !== cronSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find approaches sent 48+ hours ago with no response
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: pendingFollowups, error: queryErr } = await supabase
      .from('recruitment_hunting_approaches')
      .select(`
        id,
        hunting_result_id,
        channel,
        sent_at,
        message_generated,
        follow_up_count,
        recruitment_hunting_results (
          id,
          source_url,
          extracted_data,
          search_id,
          status,
          recruitment_hunting_searches (
            job_id,
            query,
            account_id
          )
        )
      `)
      .is('response_received_at', null)
      .lt('sent_at', cutoffDate)
      .or('follow_up_count.is.null,follow_up_count.lt.2')
      .eq('status', 'sent')
      .limit(20);

    if (queryErr) {
      console.error('[auto-followup] Query error:', queryErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingFollowups?.length) {
      console.log('[auto-followup] No pending follow-ups');
      return new Response(
        JSON.stringify({ success: true, followups_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auto-followup] Found ${pendingFollowups.length} candidates for follow-up`);

    let sentCount = 0;

    for (const approach of pendingFollowups) {
      const result = (approach as any).recruitment_hunting_results;
      if (!result || result.status === 'rejected' || result.status === 'discarded') continue;

      const candidateName = result.extracted_data?.name || 'candidato';
      const candidateTitle = result.extracted_data?.apollo_data?.title || result.extracted_data?.title || '';
      const followUpNumber = (approach.follow_up_count || 0) + 1;

      // Generate follow-up message
      if (!lovableApiKey) continue;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
                content: 'Você é um consultor de recrutamento que faz follow-up de forma profissional e não invasiva.',
              },
              {
                role: 'user',
                content: `Escreva uma mensagem de follow-up ${followUpNumber === 1 ? 'primeiro' : 'segundo e último'} para o candidato.

Nome: ${candidateName}
Cargo: ${candidateTitle}
Mensagem original enviada: "${approach.message_generated?.substring(0, 200) || 'sobre uma oportunidade profissional'}"

Regras:
- Máximo 3 linhas
- ${followUpNumber === 1 ? 'Tom gentil lembrando da mensagem anterior' : 'Tom de despedida cordial, sem pressão'}
- NÃO use emojis excessivos
- Mencione que está disponível caso tenha interesse

Escreva apenas a mensagem.`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) continue;

        const aiData = await aiResponse.json();
        const followUpMessage = aiData.choices?.[0]?.message?.content?.trim();
        if (!followUpMessage) continue;

        const accountId = result.recruitment_hunting_searches?.account_id;
        if (accountId) {
          await consumeAICredits({
            supabase, accountId, aiData, model: 'google/gemini-2.5-flash-lite',
            referenceType: 'hunting_auto_followup', referenceId: approach.id,
            description: `Follow-up #${followUpNumber} hunting`,
          });
        }

        // Send via WhatsApp if channel is whatsapp and phone is available
        const phone = result.extracted_data?.phone || result.extracted_data?.apollo_data?.phone;
        if (approach.channel === 'whatsapp' && phone) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                provider: 'zapi',
                toPhoneE164: phone,
                message: followUpMessage,
              }),
            });
          } catch (sendErr) {
            console.error(`[auto-followup] Send error for ${approach.id}:`, sendErr);
            continue;
          }
        }

        // Update approach record
        await supabase
          .from('recruitment_hunting_approaches')
          .update({
            follow_up_count: followUpNumber,
            last_follow_up_at: new Date().toISOString(),
            last_follow_up_message: followUpMessage,
          } as any)
          .eq('id', approach.id);

        sentCount++;
        console.log(`[auto-followup] Sent follow-up #${followUpNumber} for approach ${approach.id}`);

        // Small delay between sends
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[auto-followup] Error for approach ${approach.id}:`, err);
      }
    }

    console.log(`[auto-followup] Done: ${sentCount} follow-ups sent`);

    return new Response(
      JSON.stringify({ success: true, followups_sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[auto-followup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
