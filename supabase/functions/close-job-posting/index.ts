import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from "../_shared/auth-helpers.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('close-job-posting');

function getPublicBaseUrl(req?: Request): string {
  const fromEnv = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL');
  const fromOrigin = req?.headers.get('origin');
  return (fromEnv || fromOrigin || 'https://gentia.lovable.app').replace(/\/$/, '');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CloseJobRequest {
  jobId: string;
  channelName: string;
}

interface CloseJobResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Close job on LinkedIn
async function closeLinkedIn(
  jobId: string,
  credentials: Record<string, any>,
  externalPostingId: string | null
): Promise<CloseJobResult> {
  try {
    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;

    // Get access token
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('LinkedIn token error:', errorText);
      return { success: false, error: 'Falha ao autenticar com LinkedIn' };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Close the job posting
    const payload = {
      externalJobPostingId: externalPostingId || jobId,
      jobPostingOperationType: 'CLOSE',
    };

    const response = await fetch('https://api.linkedin.com/rest/simpleJobPostings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('LinkedIn close error:', response.status, responseText);
      return { success: false, error: `Erro ao fechar vaga no LinkedIn: ${response.status}` };
    }

    return { success: true, message: 'Vaga fechada no LinkedIn com sucesso' };
  } catch (error) {
    logger.error('LinkedIn close error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao fechar vaga no LinkedIn' };
  }
}

// Close/expire job on Indeed
async function closeIndeed(
  jobId: string,
  credentials: Record<string, any>,
  externalPostingId: string | null
): Promise<CloseJobResult> {
  try {
    if (!externalPostingId) {
      return { success: false, error: 'ID externo não encontrado para expirar no Indeed' };
    }

    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;

    // Get access token
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch('https://apis.indeed.com/oauth/v2/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Indeed token error:', errorText);
      return { success: false, error: 'Falha ao autenticar com Indeed' };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Expire the job
    const mutation = `
      mutation ExpireSourcedJobs($input: ExpireSourcedJobsBySourcedPostingIdInput!) {
        expireSourcedJobsBySourcedPostingId(input: $input) {
          results {
            sourcedPostingId
            status
            errors {
              message
              code
            }
          }
        }
      }
    `;

    const variables = {
      input: {
        sourcedPostingIds: [externalPostingId],
      },
    };

    const response = await fetch('https://apis.indeed.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const responseData = await response.json();

    if (responseData.errors?.length > 0) {
      const errorMsg = responseData.errors.map((e: any) => e.message).join('; ');
      return { success: false, error: `Erro Indeed: ${errorMsg}` };
    }

    return { success: true, message: 'Vaga expirada no Indeed com sucesso' };
  } catch (error) {
    logger.error('Indeed close error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao fechar vaga no Indeed' };
  }
}

// Close job on Vagas.com.br
async function closeVagasCom(
  jobId: string,
  credentials: Record<string, any>,
  externalPostingId: string | null
): Promise<CloseJobResult> {
  try {
    if (!externalPostingId) {
      return { success: false, error: 'ID externo não encontrado para remover no Vagas.com.br' };
    }

    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    // Get access token
    const tokenResponse = await fetch('https://apigateway.vagas.com.br/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Vagas.com.br token error:', errorText);
      return { success: false, error: 'Falha ao autenticar com Vagas.com.br' };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // DELETE the job posting
    const response = await fetch(`https://apigateway.vagas.com.br/vagas/${externalPostingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('Vagas.com.br close error:', response.status, responseText);
      return { success: false, error: `Erro ao fechar vaga no Vagas.com.br: ${response.status}` };
    }

    return { success: true, message: 'Vaga removida do Vagas.com.br com sucesso' };
  } catch (error) {
    logger.error('Vagas.com.br close error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao fechar vaga no Vagas.com.br' };
  }
}

// Close job on InfoJobs via SOAP eraseOffer
async function closeInfoJobs(
  jobId: string,
  credentials: Record<string, any>,
  externalPostingId: string | null
): Promise<CloseJobResult> {
  try {
    if (!externalPostingId) {
      return { success: false, error: 'ID externo não encontrado para remover no InfoJobs' };
    }

    const appUsername = credentials.client_id;
    const appPassword = credentials.client_secret_encrypted;
    const userEmail = credentials.organization_id;
    const userPassword = appPassword;

    // Get access token
    const tokenBody = `
      <appUsername>${appUsername}</appUsername>
      <appPassword>${appPassword}</appPassword>
      <userEmail>${userEmail}</userEmail>
      <userPassword>${userPassword}</userPassword>
    `;

    const nonce = btoa(crypto.randomUUID());
    const created = new Date().toISOString();

    const buildEnvelope = (action: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://ws.infojobs.net/">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                   xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${appUsername}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${appPassword}</wsse:Password>
        <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</wsse:Nonce>
        <wsu:Created>${created}</wsu:Created>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ws:${action}>
      ${body}
    </ws:${action}>
  </soapenv:Body>
</soapenv:Envelope>`;

    // Get access token first
    const tokenEnvelope = buildEnvelope('getAccessToken', tokenBody);
    const tokenResponse = await fetch('https://api.infojobs.net/soap/WSAccessTokenService', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'getAccessToken' },
      body: tokenEnvelope,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('InfoJobs token error:', errorText);
      return { success: false, error: 'Falha ao autenticar com InfoJobs' };
    }

    const tokenResponseText = await tokenResponse.text();
    const tokenMatch = tokenResponseText.match(/<accessToken>([^<]+)<\/accessToken>/);
    if (!tokenMatch) {
      return { success: false, error: 'Não foi possível obter token InfoJobs' };
    }
    const accessToken = tokenMatch[1];

    // Erase the offer
    const eraseBody = `
      <accessToken>${accessToken}</accessToken>
      <offerId>${externalPostingId}</offerId>
    `;
    const eraseEnvelope = buildEnvelope('eraseOffer', eraseBody);

    const response = await fetch('https://api.infojobs.net/soap/WSOfferV3Service', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'eraseOffer' },
      body: eraseEnvelope,
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('InfoJobs erase error:', response.status, responseText.substring(0, 500));
      return { success: false, error: `Erro ao fechar vaga no InfoJobs: ${response.status}` };
    }

    return { success: true, message: 'Vaga removida do InfoJobs com sucesso' };
  } catch (error) {
    logger.error('InfoJobs close error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao fechar vaga no InfoJobs' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.context) {
      return unauthorizedResponse(corsHeaders, authResult.error);
    }

    const { user, supabase } = authResult.context;

    const body: CloseJobRequest = await req.json();
    const publicBaseUrl = getPublicBaseUrl(req);
    const { jobId, channelName } = body;

    if (!jobId || !channelName) {
      return new Response(
        JSON.stringify({ success: false, error: 'jobId e channelName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job to verify access
    const { data: job, error: jobError } = await supabase
      .from('recruitment_jobs')
      .select('id, account_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasAccess = await verifyAccountAccess(supabase, user.id, job.account_id);
    if (!hasAccess) {
      return forbiddenResponse(corsHeaders);
    }

    // Get existing log to find external_posting_id
    const { data: log } = await supabase
      .from('job_distribution_logs')
      .select('external_posting_id, status')
      .eq('job_id', jobId)
      .eq('channel_name', channelName)
      .single();

    if (!log || log.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Vaga não está publicada neste canal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get credentials
    const { data: credentials } = await supabase
      .from('job_distribution_credentials')
      .select('*')
      .eq('account_id', job.account_id)
      .eq('channel_name', channelName)
      .eq('status', 'active')
      .single();

    if (!credentials) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais não encontradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: CloseJobResult;

    switch (channelName) {
      case 'linkedin_api':
        result = await closeLinkedIn(jobId, credentials, log.external_posting_id);
        break;
      case 'indeed_api':
        result = await closeIndeed(jobId, credentials, log.external_posting_id);
        break;
      case 'vagas_com':
        result = await closeVagasCom(jobId, credentials, log.external_posting_id);
        break;
      case 'infojobs_api':
        result = await closeInfoJobs(jobId, credentials, log.external_posting_id);
        break;
      default:
        result = { success: false, error: `Canal ${channelName} não suportado` };
    }

    // Update log
    if (result.success) {
      await supabase
        .from('job_distribution_logs')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
          metadata: {
            closed_by: user.id,
            closed_at: new Date().toISOString(),
          },
        })
        .eq('job_id', jobId)
        .eq('channel_name', channelName);
    }

    // Fire-and-forget Google Indexing notification on successful close
    if (result.success) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        fetch(`${supabaseUrl}/functions/v1/notify-google-indexing`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `${publicBaseUrl}/vagas/${jobId}`, action: 'URL_DELETED' }),
        }).catch(e => logger.warn('Google Indexing notification failed:', e));
      } catch {}
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
