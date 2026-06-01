import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { account_id, user_id, type } = await req.json();

    if (!account_id || !user_id || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: account_id, user_id, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[test-recruitment-notification] Testing ${type} notification for user ${user_id}`);

    // Get user email for email notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (type === 'in_app') {
      // Create a test in-app notification
      const dedupeKey = `test_notification_${user_id}_${Date.now()}`;
      
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          org_id: account_id,
          type: 'recruitment_test',
          title: '🧪 Notificação de Teste',
          message: 'Esta é uma notificação de teste do sistema de recrutamento. Se você está vendo isso, as notificações in-app estão funcionando corretamente!',
          priority: 'normal',
          dedupe_key: dedupeKey,
          target_url: '/atracao-contratacao/recrutamento/configuracoes',
        })
        .select('id')
        .single();

      if (notifError) {
        console.error('[test-recruitment-notification] Error creating notification:', notifError);
        throw notifError;
      }

      // Create recipient
      await supabase.from('notification_recipients').insert({
        notification_id: notification.id,
        user_id: user_id,
      });

      console.log('[test-recruitment-notification] In-app notification created successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notificação de teste criada com sucesso',
          notification_id: notification.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (type === 'email') {
      if (!resendApiKey) {
        console.log('[test-recruitment-notification] RESEND_API_KEY not configured');
        return new Response(
          JSON.stringify({ 
            error: 'Email não configurado. Configure a chave RESEND_API_KEY nas configurações do projeto.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile?.email) {
        return new Response(
          JSON.stringify({ error: 'Email do usuário não encontrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send test email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gentia <noreply@gentia.app>',
          to: [profile.email],
          subject: '🧪 Teste de Notificação - Gentia Recrutamento',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; font-size: 24px;">Teste de Notificação</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Olá ${profile.full_name || 'Recrutador'},
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Esta é uma notificação de teste do módulo de recrutamento da Gentia. 
                Se você está recebendo este email, significa que as notificações por email estão funcionando corretamente!
              </p>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin: 0;">
                  <strong>Horário do teste:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </p>
              </div>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Este é um email automático de teste. Não é necessário responder.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[test-recruitment-notification] Resend error:', errorText);
        throw new Error(`Falha ao enviar email: ${errorText}`);
      }

      const emailResult = await emailResponse.json();
      console.log('[test-recruitment-notification] Test email sent:', emailResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email de teste enviado para ${profile.email}`,
          email_id: emailResult.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Use "in_app" or "email"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-recruitment-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});