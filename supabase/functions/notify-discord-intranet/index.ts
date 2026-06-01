import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  post_id: string;
  title: string;
  content?: string;
  post_type: string;
  author_name?: string;
  account_name?: string;
}

const postTypeEmojis: Record<string, string> = {
  announcement: '📢',
  birthday: '🎂',
  new_hire: '👋',
  promotion: '🏆',
  holiday: '🎉',
  custom: '📝',
};

const postTypeColors: Record<string, number> = {
  announcement: 0x3b82f6, // blue
  birthday: 0xec4899, // pink
  new_hire: 0x22c55e, // green
  promotion: 0xf59e0b, // amber
  holiday: 0xa855f7, // purple
  custom: 0x6b7280, // gray
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL');
    
    if (!DISCORD_WEBHOOK_URL) {
      console.log('DISCORD_WEBHOOK_URL not configured, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Discord webhook not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotifyPayload = await req.json();
    console.log('Received payload:', payload);

    const emoji = postTypeEmojis[payload.post_type] || '📝';
    const color = postTypeColors[payload.post_type] || 0x6b7280;

    // Create Discord embed
    const embed = {
      title: `${emoji} ${payload.title}`,
      description: payload.content || 'Novo post na intranet',
      color: color,
      fields: [
        {
          name: 'Tipo',
          value: payload.post_type.replace('_', ' ').charAt(0).toUpperCase() + payload.post_type.slice(1).replace('_', ' '),
          inline: true,
        },
      ],
      footer: {
        text: payload.account_name || 'Intranet Corporativa',
      },
      timestamp: new Date().toISOString(),
    };

    if (payload.author_name) {
      embed.fields.push({
        name: 'Publicado por',
        value: payload.author_name,
        inline: true,
      });
    }

    // Send to Discord
    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord webhook error:', errorText);
      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    console.log('Successfully sent notification to Discord');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in notify-discord-intranet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
