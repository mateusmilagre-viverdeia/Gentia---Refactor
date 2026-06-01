import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('notify-google-indexing');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Build a JWT for Google Service Account authentication
async function buildGoogleJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signatureB64}`;
}

// Exchange JWT for Google access token
async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await buildGoogleJWT(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate service-to-service auth via service role key
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, action } = await req.json();

    if (!url || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'url and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['URL_UPDATED', 'URL_DELETED'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action must be URL_UPDATED or URL_DELETED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load service account credentials
    const saJson = Deno.env.get('GOOGLE_INDEXING_SERVICE_ACCOUNT');
    if (!saJson) {
      logger.warn('GOOGLE_INDEXING_SERVICE_ACCOUNT not configured, skipping indexing notification');
      return new Response(
        JSON.stringify({ success: false, error: 'Google Indexing not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(saJson);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // Notify Google Indexing API
    const indexingResponse = await fetch(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          type: action,
        }),
      }
    );

    const responseText = await indexingResponse.text();

    if (!indexingResponse.ok) {
      logger.error(`Google Indexing API error: ${indexingResponse.status}`, responseText);
      return new Response(
        JSON.stringify({ success: false, error: `Google Indexing API error: ${indexingResponse.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(responseText);
    logger.info(`Google Indexing notified: ${action} for ${url}`, result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in notify-google-indexing:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
