import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts'
import { RESEND_DEFAULT_FROM_EMAIL } from '../_shared/resend-email.ts'

const log = createLogger('send-survey-reminder');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { surveyId, userId, invitationId } = await req.json();

    if (!surveyId || !userId) {
      return new Response(
        JSON.stringify({ error: 'surveyId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get survey details
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, end_date, account_id')
      .eq('id', surveyId)
      .single();

    if (surveyError || !survey) {
      log.error('Survey not found', { error: surveyError });
      return new Response(
        JSON.stringify({ error: 'Survey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      log.error('Profile not found', { error: profileError });
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if reminder was sent recently (throttle: 1 per day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentReminder, error: reminderCheckError } = await supabase
      .from('survey_invitations')
      .select('id, reminder_sent_at')
      .eq('survey_id', surveyId)
      .eq('user_id', userId)
      .gte('reminder_sent_at', oneDayAgo.toISOString())
      .maybeSingle();

    if (recentReminder) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Reminder already sent within the last 24 hours' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', survey.account_id)
      .single();

    const companyName = company?.name || 'sua empresa';
    const userName = profile.first_name || 'Colaborador';

    // Build survey response URL
    const surveyUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/retencao/questionarios/responder/${surveyId}`;

    // Send email if Resend API key is configured
    if (resendApiKey && profile.email) {
      try {
        const endDateFormatted = survey.end_date 
          ? new Date(survey.end_date).toLocaleDateString('pt-BR')
          : 'em breve';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Lembrete: Questionário Pendente</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Olá, <strong>${userName}</strong>!</p>
              
              <p style="font-size: 16px;">Este é um lembrete amigável sobre o questionário <strong>"${survey.title}"</strong> de ${companyName}.</p>
              
              <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>📅 Prazo:</strong> ${endDateFormatted}
                </p>
              </div>
              
              <p style="font-size: 16px;">Sua opinião é muito importante para nós. Reserve alguns minutos para responder.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${surveyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Responder Agora
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Se você já respondeu, por favor desconsidere este email.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>Enviado automaticamente por Gentia</p>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
            to: profile.email,
            subject: `⏰ Lembrete: Questionário "${survey.title}" aguarda sua resposta`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          log.error('Resend API error', { error: errorText });
          // Don't fail the whole request, just log the error
        } else {
          log.log('Reminder email sent', { email: profile.email });
        }
      } catch (emailError) {
        log.error('Error sending email', { error: emailError });
        // Don't fail the whole request
      }
    }

    // Update invitation with reminder_sent_at
    // First get current reminder count
    const { data: currentInvitation } = await supabase
      .from('survey_invitations')
      .select('reminder_count')
      .eq('survey_id', surveyId)
      .eq('user_id', userId)
      .single();

    const currentCount = (currentInvitation?.reminder_count as number) || 0;

    const { error: updateError } = await supabase
      .from('survey_invitations')
      .update({ 
        reminder_sent_at: new Date().toISOString(),
        reminder_count: currentCount + 1
      })
      .eq('survey_id', surveyId)
      .eq('user_id', userId);

    if (updateError) {
      log.error('Error updating invitation', { error: updateError });
    }

    // Create notification for user
    await supabase.from('notifications').insert({
      user_id: userId,
      account_id: survey.account_id,
      title: 'Lembrete de Questionário',
      body: `Você tem um questionário pendente: "${survey.title}"`,
      type: 'reminder',
      data: { survey_id: surveyId },
    });

    log.log('Reminder sent successfully', { surveyId, userId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reminder sent successfully',
        emailSent: !!resendApiKey && !!profile.email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    log.error('Error in send-survey-reminder', { error });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
