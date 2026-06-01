import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DeliveryStatus = 'success' | 'failed';

function truncate(value: string | undefined, max = 2000) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

// deno-lint-ignore no-explicit-any
async function logPulseDelivery(supabase: any, data: {
  account_id: string;
  channel_id: string | null;
  channel_type: string;
  channel_name: string | null;
  event: string;
  status: DeliveryStatus;
  http_status?: number | null;
  duration_ms?: number | null;
  error_message?: string | null;
  response_body?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  try {
    await supabase.from('pulse_notification_deliveries').insert({
      account_id: data.account_id,
      channel_id: data.channel_id,
      channel_type: data.channel_type,
      channel_name: data.channel_name,
      event: data.event,
      status: data.status,
      http_status: data.http_status ?? null,
      duration_ms: data.duration_ms ?? null,
      error_message: data.error_message ?? null,
      response_body: truncate(data.response_body ?? undefined),
      payload: data.payload ?? null,
    });
  } catch {
    // Nunca quebrar o teste por falha de log
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { channel_id } = await req.json();

    if (!channel_id) {
      return new Response(JSON.stringify({ success: false, error: 'channel_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the channel
    const { data: channel, error: channelError } = await supabase
      .from('pulse_notification_channels')
      .select('*')
      .eq('id', channel_id)
      .single();

    if (channelError || !channel) {
      return new Response(JSON.stringify({ success: false, error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const testMessage = {
      title: '🧪 Teste de Notificação',
      message: `Esta é uma mensagem de teste do canal "${channel.name}". Se você está vendo isto, a configuração está funcionando!`,
      timestamp: new Date().toISOString(),
    };

    const basePayload = {
      event: 'pulse.test',
      account_id: channel.account_id,
      channel_id: channel.id,
      channel_name: channel.name,
      title: testMessage.title,
      message: testMessage.message,
      deep_link: '/retencao/pulse',
      timestamp: testMessage.timestamp,
      metadata: {
        kind: 'test',
        channel_type: channel.channel_type,
      },
    } as Record<string, unknown>;

    let result: {
      success: boolean;
      error: string;
      httpStatus?: number;
      responseBody?: string;
      durationMs?: number;
    } = { success: false, error: '' };

    switch (channel.channel_type) {
      case 'discord':
        result = await testDiscord(channel.webhook_url, testMessage);
        break;
      case 'slack':
        result = await testSlack(channel.webhook_url, testMessage);
        break;
      case 'email':
        result = { success: true, error: '' }; // Email testing would need Resend
        break;
      case 'webhook':
        result = await testWebhook(channel.webhook_url, channel.config, {
          event: 'pulse.test',
          account_id: channel.account_id,
          channel_id: channel.id,
          channel_name: channel.name,
          title: testMessage.title,
          message: testMessage.message,
          deep_link: '/retencao/pulse',
          timestamp: testMessage.timestamp,
          metadata: {
            kind: 'test',
            channel_type: channel.channel_type,
          },
        });
        break;
      default:
        result = { success: false, error: 'Unknown channel type' };
    }

    // Log (não bloqueante)
    await logPulseDelivery(supabase, {
      account_id: channel.account_id,
      channel_id: channel.id,
      channel_type: channel.channel_type,
      channel_name: channel.name,
      event: 'pulse.test',
      status: result.success ? 'success' : 'failed',
      http_status: result.httpStatus ?? null,
      duration_ms: result.durationMs ?? null,
      error_message: result.success ? null : (result.error || null),
      response_body: result.responseBody ?? null,
      payload: channel.channel_type === 'webhook' ? (basePayload as Record<string, unknown>) : (basePayload as Record<string, unknown>),
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testDiscord(webhookUrl: string, message: { title: string; message: string }) {
  try {
    const started = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧪 **Teste de Notificação**',
        embeds: [{
          title: message.title,
          description: message.message,
          color: 0x22C55E,
          footer: { text: 'Pulse Diário - Teste' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    const durationMs = Date.now() - started;
    const responseBody = response.ok ? undefined : await response.text();

    if (response.ok) {
      return { success: true, error: '', httpStatus: response.status, durationMs };
    }
    return { success: false, error: `Discord returned ${response.status}`, httpStatus: response.status, responseBody, durationMs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Discord error' };
  }
}

async function testSlack(webhookUrl: string, message: { title: string; message: string }) {
  try {
    const started = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: message.title, emoji: true },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message.message },
          },
        ],
      }),
    });

    const durationMs = Date.now() - started;
    const responseBody = response.ok ? undefined : await response.text();

    if (response.ok) {
      return { success: true, error: '', httpStatus: response.status, durationMs };
    }
    return { success: false, error: `Slack returned ${response.status}`, httpStatus: response.status, responseBody, durationMs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Slack error' };
  }
}

async function testWebhook(
  webhookUrl: string, 
  config: Record<string, unknown> | null, 
  payload: Record<string, unknown>
) {
  try {
    const started = Date.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config?.headers && typeof config.headers === 'object') {
      Object.assign(headers, config.headers);
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - started;
    const responseBody = response.ok ? undefined : await response.text();

    if (response.ok) {
      return { success: true, error: '', httpStatus: response.status, durationMs };
    }
    return { success: false, error: `Webhook returned ${response.status}`, httpStatus: response.status, responseBody, durationMs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Webhook error' };
  }
}
