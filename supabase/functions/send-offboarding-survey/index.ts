import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RESEND_NOTIFICATIONS_FROM_EMAIL } from "../_shared/resend-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOffboardingSurveyRequest {
  case_id: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-OFFBOARDING-SURVEY] ${step}${detailsStr}`);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id }: SendOffboardingSurveyRequest = await req.json();
    logStep("Processing survey email request", { case_id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch case details
    const { data: caseData, error: caseError } = await supabase
      .from('offboarding_cases')
      .select('*')
      .eq('id', case_id)
      .single();

    if (caseError || !caseData) {
      logStep("Case not found", { error: caseError?.message });
      throw new Error('Caso de offboarding não encontrado');
    }

    if (!caseData.employee_email) {
      logStep("Employee email not found");
      throw new Error('E-mail do colaborador não cadastrado');
    }

    // Fetch survey token
    const { data: tokenData, error: tokenError } = await supabase
      .from('offboarding_survey_tokens')
      .select('*')
      .eq('case_id', case_id)
      .single();

    if (tokenError || !tokenData) {
      logStep("Token not found", { error: tokenError?.message });
      throw new Error('Token da pesquisa não encontrado');
    }

    // Fetch company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', caseData.account_id)
      .single();

    const companyName = company?.name || 'a empresa';
    const surveyUrl = `${Deno.env.get("SITE_URL") || "https://gentia.lovable.app"}/offboarding/pesquisa/${tokenData.token}`;
    const lastDay = new Date(caseData.last_day).toLocaleDateString('pt-BR');

    logStep("Sending email", { to: caseData.employee_email, surveyUrl });

    // Send email
    const emailResponse = await resend.emails.send({
      from: `Gentia <${RESEND_NOTIFICATIONS_FROM_EMAIL}>`,
      to: [caseData.employee_email],
      subject: `Pesquisa de Desligamento - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
              Pesquisa de Desligamento
            </h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Olá ${caseData.employee_name},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Como parte do processo de desligamento em ${companyName}, gostaríamos de convidá-lo(a) 
              a responder uma breve pesquisa sobre sua experiência conosco.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Suas respostas são <strong>confidenciais</strong> e nos ajudarão a melhorar continuamente 
              nosso ambiente de trabalho.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              A pesquisa leva aproximadamente <strong>5-8 minutos</strong> para ser concluída.
            </p>
            
            <div style="margin: 32px 0; text-align: center;">
              <a href="${surveyUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;
                        font-weight: 600; font-size: 16px;">
                Responder Pesquisa
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Este link é válido até 7 dias após seu último dia de trabalho (${lastDay}).
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="color: #9ca3af; font-size: 12px;">
              Se você não reconhece este e-mail ou acredita que recebeu por engano, 
              por favor desconsidere esta mensagem.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Update case with survey_sent_at
    await supabase
      .from('offboarding_cases')
      .update({ 
        survey_status: 'sent',
        survey_sent_at: new Date().toISOString() 
      })
      .eq('id', case_id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error sending survey email", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
