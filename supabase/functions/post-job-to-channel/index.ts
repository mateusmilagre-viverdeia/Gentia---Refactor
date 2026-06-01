import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest, verifyAccountAccess, forbiddenResponse, unauthorizedResponse } from "../_shared/auth-helpers.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('post-job-to-channel');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getPublicBaseUrl(req?: Request): string {
  const fromEnv = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL');
  const fromOrigin = req?.headers.get('origin');
  return (fromEnv || fromOrigin || 'https://gentia.lovable.app').replace(/\/$/, '');
}

interface PostJobRequest {
  jobId: string;
  channelName: string;
}

interface PostJobResult {
  success: boolean;
  externalId?: string;
  message?: string;
  error?: string;
}

// Get LinkedIn access token using client credentials (2-legged OAuth)
async function getLinkedInAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('LinkedIn token error:', errorText);
    throw new Error(`Falha ao obter token LinkedIn: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Post job to LinkedIn via Simple Job Postings API
async function postToLinkedIn(
  job: Record<string, any>,
  credentials: Record<string, any>,
  company: Record<string, any>,
  publicBaseUrl: string
): Promise<PostJobResult> {
  try {
    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;
    const organizationUrn = credentials.organization_id;

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Credenciais LinkedIn incompletas (client_id ou client_secret)' };
    }

    if (!organizationUrn || !organizationUrn.startsWith('urn:li:organization:')) {
      return { success: false, error: 'Organization URN inválido. Use o formato: urn:li:organization:XXXXX' };
    }

    // Get access token
    const accessToken = await getLinkedInAccessToken(clientId, clientSecret);

    // Build job description HTML
    const description = job.description || job.title;
    const applyUrl = `${publicBaseUrl}/vagas/${job.id}`;

    // Build LinkedIn payload
    const payload = {
      externalJobPostingId: job.id,
      title: job.title,
      description: {
        text: description,
      },
      integrationContext: `urn:li:organization:${organizationUrn.replace('urn:li:organization:', '')}`,
      jobPostingOperationType: 'CREATE',
      listingType: 'BASIC',
      listedAt: Date.now(),
      applyMethod: {
        'com.linkedin.jobs.ExternalApplyMethod': {
          applyUrl: applyUrl,
        },
      },
      ...(job.location && {
        location: job.location,
      }),
    };

    logger.info('Posting to LinkedIn:', JSON.stringify(payload, null, 2));

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
      logger.error('LinkedIn API error:', response.status, responseText);
      
      if (response.status === 401 || response.status === 403) {
        return { 
          success: false, 
          error: 'Credenciais LinkedIn inválidas ou sem permissão. Verifique se sua parceria ATS foi aprovada.' 
        };
      }
      
      return { 
        success: false, 
        error: `Erro LinkedIn (${response.status}): ${responseText.substring(0, 200)}` 
      };
    }

    logger.info('LinkedIn posting success:', responseText);

    return {
      success: true,
      externalId: job.id, // LinkedIn uses externalJobPostingId as reference
      message: 'Vaga publicada no LinkedIn com sucesso!',
    };
  } catch (error) {
    logger.error('LinkedIn posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao publicar no LinkedIn',
    };
  }
}

// Get Indeed access token via OAuth2 Client Credentials
async function getIndeedAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://apis.indeed.com/oauth/v2/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Indeed token error:', errorText);
    throw new Error(`Falha ao obter token Indeed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Post job to Indeed via GraphQL API
async function postToIndeed(
  job: Record<string, any>,
  credentials: Record<string, any>,
  company: Record<string, any>,
  publicBaseUrl: string
): Promise<PostJobResult> {
  try {
    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;
    const sourceName = credentials.organization_id;

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Credenciais Indeed incompletas (client_id ou client_secret)' };
    }

    if (!sourceName) {
      return { success: false, error: 'Source Name (Organization ID) é obrigatório para o Indeed' };
    }

    // Get access token
    const accessToken = await getIndeedAccessToken(clientId, clientSecret);

    const applyUrl = `${publicBaseUrl}/vagas/${job.id}`;
    const description = job.description || job.title;

    // Build Indeed GraphQL mutation
    const mutation = `
      mutation CreateSourcedJobPostings($input: CreateSourcedJobPostingsInput!) {
        createSourcedJobPostings(input: $input) {
          results {
            sourcedPostingId
            jobPostingId
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
        postings: [
          {
            jobPostingId: job.id,
            title: job.title,
            description: description,
            url: applyUrl,
            sourceName: sourceName,
            ...(job.location && { location: job.location }),
            ...(company?.name && { companyName: company.name }),
          },
        ],
      },
    };

    logger.info('Posting to Indeed:', JSON.stringify(variables, null, 2));

    const response = await fetch('https://apis.indeed.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      logger.error('Indeed API error:', response.status, JSON.stringify(responseData));
      return { 
        success: false, 
        error: `Erro Indeed (${response.status}): ${JSON.stringify(responseData).substring(0, 200)}` 
      };
    }

    // Check for GraphQL errors
    if (responseData.errors?.length > 0) {
      const errorMsg = responseData.errors.map((e: any) => e.message).join('; ');
      logger.error('Indeed GraphQL errors:', errorMsg);
      return { success: false, error: `Erro Indeed: ${errorMsg}` };
    }

    const result = responseData.data?.createSourcedJobPostings?.results?.[0];

    if (!result) {
      return { success: false, error: 'Resposta inesperada da API do Indeed' };
    }

    if (result.errors?.length > 0) {
      const errorMsg = result.errors.map((e: any) => e.message).join('; ');
      return { success: false, error: `Erro Indeed: ${errorMsg}` };
    }

    logger.info('Indeed posting success:', result.sourcedPostingId);

    return {
      success: true,
      externalId: result.sourcedPostingId,
      message: 'Vaga publicada no Indeed com sucesso!',
    };
  } catch (error) {
    logger.error('Indeed posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao publicar no Indeed',
    };
  }
}

// Get Vagas.com.br access token via OAuth2 Client Credentials
async function getVagasComAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://apigateway.vagas.com.br/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Vagas.com.br token error:', errorText);
    throw new Error(`Falha ao obter token Vagas.com.br: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Post job to Vagas.com.br via REST API
async function postToVagasCom(
  job: Record<string, any>,
  credentials: Record<string, any>,
  company: Record<string, any>,
  publicBaseUrl: string
): Promise<PostJobResult> {
  try {
    const clientId = credentials.client_id;
    const clientSecret = credentials.client_secret_encrypted;
    const empresaId = credentials.organization_id;

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Credenciais Vagas.com.br incompletas (client_id ou client_secret)' };
    }

    const accessToken = await getVagasComAccessToken(clientId, clientSecret);
    const description = job.description || job.title;
    const applyUrl = `${publicBaseUrl}/vagas/${job.id}`;

    // Build Vagas.com.br payload with required fields
    const payload: Record<string, any> = {
      cargo: job.title,
      descricao_do_anuncio: `${description}\n\nCandidate-se: ${applyUrl}`,
      // Default IDs - can be customized per account in the future
      area_de_atuacao_id: 1,
      nivel_hierarquico_id: 3, // Pleno
      local_de_trabalho_id: 1, // São Paulo
      tipo_de_contratacao_id: 1, // CLT
    };

    if (empresaId) {
      payload.empresa_id = empresaId;
    }

    logger.info('Posting to Vagas.com.br:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://apigateway.vagas.com.br/vagas', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('Vagas.com.br API error:', response.status, responseText);
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Credenciais Vagas.com.br inválidas ou sem permissão.' };
      }
      
      return { success: false, error: `Erro Vagas.com.br (${response.status}): ${responseText.substring(0, 200)}` };
    }

    let externalId: string | undefined;
    try {
      const responseData = JSON.parse(responseText);
      externalId = responseData.id?.toString() || responseData.vaga_id?.toString();
    } catch {
      // Response might not be JSON
    }

    logger.info('Vagas.com.br posting success:', externalId);

    return {
      success: true,
      externalId: externalId,
      message: 'Vaga publicada no Vagas.com.br com sucesso!',
    };
  } catch (error) {
    logger.error('Vagas.com.br posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao publicar no Vagas.com.br',
    };
  }
}

// Build SOAP XML envelope for InfoJobs
function buildInfoJobsSoapEnvelope(action: string, body: string, wsseUsername: string, wssePassword: string): string {
  const nonce = btoa(crypto.randomUUID());
  const created = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://ws.infojobs.net/">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                   xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${wsseUsername}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${wssePassword}</wsse:Password>
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
}

// Get InfoJobs access token via SOAP getAccessToken
async function getInfoJobsAccessToken(
  appUsername: string,
  appPassword: string,
  userEmail: string,
  userPassword: string
): Promise<string> {
  const body = `
    <appUsername>${appUsername}</appUsername>
    <appPassword>${appPassword}</appPassword>
    <userEmail>${userEmail}</userEmail>
    <userPassword>${userPassword}</userPassword>
  `;

  const envelope = buildInfoJobsSoapEnvelope('getAccessToken', body, appUsername, appPassword);

  const response = await fetch('https://api.infojobs.net/soap/WSAccessTokenService', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'getAccessToken',
    },
    body: envelope,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('InfoJobs token error:', errorText);
    throw new Error(`Falha ao obter token InfoJobs: ${response.status}`);
  }

  const responseText = await response.text();
  // Extract accessToken from SOAP response
  const tokenMatch = responseText.match(/<accessToken>([^<]+)<\/accessToken>/);
  if (!tokenMatch) {
    logger.error('InfoJobs: Could not extract token from response:', responseText.substring(0, 500));
    throw new Error('Não foi possível extrair o token InfoJobs da resposta');
  }

  return tokenMatch[1];
}

// Post job to InfoJobs via SOAP createOffer
async function postToInfoJobs(
  job: Record<string, any>,
  credentials: Record<string, any>,
  company: Record<string, any>,
  publicBaseUrl: string
): Promise<PostJobResult> {
  try {
    const appUsername = credentials.client_id; // APP_USERNAME
    const appPassword = credentials.client_secret_encrypted; // APP_PASSWORD
    const userEmail = credentials.organization_id; // user email for InfoJobs

    if (!appUsername || !appPassword) {
      return { success: false, error: 'Credenciais InfoJobs incompletas (client_id ou client_secret)' };
    }

    if (!userEmail) {
      return { success: false, error: 'E-mail do usuário InfoJobs é obrigatório (Organization ID)' };
    }

    // For InfoJobs, we need a user password too - stored in metadata or use appPassword as fallback
    const userPassword = appPassword;

    const accessToken = await getInfoJobsAccessToken(appUsername, appPassword, userEmail, userPassword);

    const description = job.description || job.title;
    const applyUrl = `${publicBaseUrl}/vagas/${job.id}`;

    // Build createOffer SOAP body with default IDs for Brazil
    const offerBody = `
      <accessToken>${accessToken}</accessToken>
      <offer>
        <jobTitle>${escapeXml(job.title)}</jobTitle>
        <jobDescription>${escapeXml(description + '\n\nCandidate-se: ' + applyUrl)}</jobDescription>
        <jobReference>${job.id}</jobReference>
        <countryId>17</countryId>
        <contractTypeId>10</contractTypeId>
        <workdayId>1</workdayId>
        <experienceMinId>1</experienceMinId>
        <educationLevelId>1</educationLevelId>
      </offer>
    `;

    const envelope = buildInfoJobsSoapEnvelope('createOffer', offerBody, appUsername, appPassword);

    logger.info('Posting to InfoJobs via SOAP');

    const response = await fetch('https://api.infojobs.net/soap/WSOfferV3Service', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'createOffer',
      },
      body: envelope,
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error('InfoJobs API error:', response.status, responseText.substring(0, 500));
      return { success: false, error: `Erro InfoJobs (${response.status}): ${responseText.substring(0, 200)}` };
    }

    // Extract offerId from SOAP response
    const offerIdMatch = responseText.match(/<offerId>([^<]+)<\/offerId>/);
    const externalId = offerIdMatch ? offerIdMatch[1] : undefined;

    logger.info('InfoJobs posting success:', externalId);

    return {
      success: true,
      externalId: externalId,
      message: 'Vaga publicada no InfoJobs com sucesso!',
    };
  } catch (error) {
    logger.error('InfoJobs posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao publicar no InfoJobs',
    };
  }
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

    const body: PostJobRequest = await req.json();
    const publicBaseUrl = getPublicBaseUrl(req);
    const { jobId, channelName } = body;

    if (!jobId || !channelName) {
      return new Response(
        JSON.stringify({ success: false, error: 'jobId e channelName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job with account info
    const { data: job, error: jobError } = await supabase
      .from('recruitment_jobs')
      .select(`
        *,
        companies:account_id (
          id,
          name,
          website,
          linkedin
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify access
    const hasAccess = await verifyAccountAccess(supabase, user.id, job.account_id);
    if (!hasAccess) {
      return forbiddenResponse(corsHeaders);
    }


    const { data: channelConfig } = await supabase
      .from('job_distribution_channels')
      .select('is_enabled, channel_type')
      .eq('account_id', job.account_id)
      .eq('channel_name', channelName)
      .maybeSingle();

    if (!channelConfig?.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Canal desabilitado para esta conta. Habilite o canal antes de publicar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingLog } = await supabase
      .from('job_distribution_logs')
      .select('status, external_posting_id')
      .eq('job_id', jobId)
      .eq('channel_name', channelName)
      .maybeSingle();

    if (existingLog?.status === 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta vaga já está publicada neste canal.', externalId: existingLog.external_posting_id || undefined }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('job_distribution_logs')
      .upsert({
        job_id: jobId,
        channel_name: channelName,
        status: 'pending',
        error_message: null,
        metadata: { requested_by: user.id, requested_at: new Date().toISOString() },
      }, { onConflict: 'job_id,channel_name' });

    // Fetch credentials for this channel
    const { data: credentials, error: credError } = await supabase
      .from('job_distribution_credentials')
      .select('*')
      .eq('account_id', job.account_id)
      .eq('channel_name', channelName)
      .eq('status', 'active')
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais não configuradas ou inativas para este canal' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post based on channel
    let result: PostJobResult;
    
    switch (channelName) {
      case 'linkedin_api':
        result = await postToLinkedIn(job, credentials, job.companies, publicBaseUrl);
        break;
      case 'indeed_api':
        result = await postToIndeed(job, credentials, job.companies, publicBaseUrl);
        break;
      case 'vagas_com':
        result = await postToVagasCom(job, credentials, job.companies, publicBaseUrl);
        break;
      case 'infojobs_api':
        result = await postToInfoJobs(job, credentials, job.companies, publicBaseUrl);
        break;
      default:
        result = {
          success: false,
          error: `Canal ${channelName} não suportado para publicação direta`,
        };
    }

    // Log the result
    await supabase
      .from('job_distribution_logs')
      .upsert({
        job_id: jobId,
        channel_name: channelName,
        status: result.success ? 'active' : 'error',
        distributed_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
        external_posting_id: result.externalId || null,
        metadata: {
          external_id: result.externalId,
          posted_by: user.id,
          posted_at: new Date().toISOString(),
          recommendation: result.success ? 'Publicado com sucesso' : 'Revise credenciais, parceria e campos obrigatórios da vaga',
        },
      }, {
        onConflict: 'job_id,channel_name',
      });

    // Fire-and-forget Google Indexing notification on successful publish
    if (result.success) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        fetch(`${supabaseUrl}/functions/v1/notify-google-indexing`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `${publicBaseUrl}/vagas/${jobId}`, action: 'URL_UPDATED' }),
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
