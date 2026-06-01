import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKeyEnv = Deno.env.get('RESEND_API_KEY')!;

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify EP Partners account membership
    const EP_PARTNERS_ACCOUNT_ID = '67f66f7a-d9a8-455e-8820-ee836cfe7401';
    const { data: isMember } = await supabaseClient.rpc('is_account_member', {
      _user_id: user.id,
      _account_id: EP_PARTNERS_ACCOUNT_ID
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const method = req.method;

    // Helper: get effective Resend credentials (DB overrides env)
    async function getEffectiveResendCreds() {
      const { data: dbConfig } = await supabaseClient
        .from('platform_email_config')
        .select('resend_api_key, resend_endpoint')
        .limit(1)
        .single();

      const effectiveApiKey = dbConfig?.resend_api_key || resendApiKeyEnv;
      const effectiveEndpoint = dbConfig?.resend_endpoint || 'https://api.resend.com/emails';
      return { effectiveApiKey, effectiveEndpoint };
    }

    // GET config
    if (method === 'GET' && action === 'config') {
      const { data, error } = await supabaseClient
        .from('platform_email_config')
        .select('id, from_name, from_email, reply_to, provider, smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password, resend_api_key, resend_endpoint, updated_at')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Never return sensitive fields — only flags/last4
      const config = data ? {
        id: data.id,
        from_name: data.from_name,
        from_email: data.from_email,
        reply_to: data.reply_to,
        provider: data.provider || 'resend',
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_user: data.smtp_user,
        smtp_secure: data.smtp_secure,
        smtp_has_password: !!data.smtp_password,
        resend_endpoint: data.resend_endpoint || 'https://api.resend.com/emails',
        resend_has_custom_key: !!data.resend_api_key,
        resend_key_last4: data.resend_api_key?.slice(-4) || null,
        updated_at: data.updated_at,
      } : null;

      return new Response(JSON.stringify({ config }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT config
    if (method === 'PUT' && action === 'config') {
      const body = await req.json();
      const { from_name, from_email, reply_to, provider, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, resend_api_key, resend_endpoint } = body;

      const { data: existing } = await supabaseClient
        .from('platform_email_config')
        .select('id')
        .limit(1)
        .single();

      const updatePayload: Record<string, unknown> = {
        updated_by: user.id,
      };

      // Only update general fields if provided
      if (from_name !== undefined) updatePayload.from_name = from_name;
      if (from_email !== undefined) updatePayload.from_email = from_email;
      if (reply_to !== undefined) updatePayload.reply_to = reply_to;
      if (provider !== undefined) updatePayload.provider = provider || 'resend';

      // SMTP fields — only update if provider is smtp
      if (provider === 'smtp') {
        if (smtp_host !== undefined) updatePayload.smtp_host = smtp_host;
        if (smtp_port !== undefined) updatePayload.smtp_port = smtp_port;
        if (smtp_user !== undefined) updatePayload.smtp_user = smtp_user;
        if (smtp_secure !== undefined) updatePayload.smtp_secure = smtp_secure;
        if (smtp_password) updatePayload.smtp_password = smtp_password;
      }

      // Resend fields — update only if provided (non-empty)
      if (resend_endpoint) updatePayload.resend_endpoint = resend_endpoint;
      if (resend_api_key) updatePayload.resend_api_key = resend_api_key;

      let result;
      if (existing?.id) {
        result = await supabaseClient
          .from('platform_email_config')
          .update(updatePayload)
          .eq('id', existing.id)
          .select('id, from_name, from_email, reply_to, provider, smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password, resend_api_key, resend_endpoint')
          .single();
      } else {
        result = await supabaseClient
          .from('platform_email_config')
          .insert(updatePayload)
          .select('id, from_name, from_email, reply_to, provider, smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password, resend_api_key, resend_endpoint')
          .single();
      }

      if (result.error) throw result.error;

      const savedConfig = result.data ? {
        ...result.data,
        smtp_has_password: !!result.data.smtp_password,
        smtp_password: undefined,
        resend_has_custom_key: !!result.data.resend_api_key,
        resend_key_last4: result.data.resend_api_key?.slice(-4) || null,
        resend_api_key: undefined,
      } : null;

      return new Response(JSON.stringify({ config: savedConfig }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST test - send test email
    if (method === 'POST' && action === 'test') {
      const body = await req.json();
      const { to_email } = body;

      if (!to_email) {
        return new Response(JSON.stringify({ error: 'Email de destino obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: config } = await supabaseClient
        .from('platform_email_config')
        .select('*')
        .limit(1)
        .single();

      const fromName = config?.from_name || 'Gentia';
      const fromEmail = config?.from_email || 'noreply@resend.ecpmais.com.br';
      const replyTo = config?.reply_to;
      const provider = config?.provider || 'resend';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">✅ Teste de Email Bem-Sucedido</h2>
          <p>Este é um email de teste enviado pela interface administrativa da plataforma Gentia.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 14px;">Configurações utilizadas:</p>
          <ul style="color: #6b7280; font-size: 14px;">
            <li>Provedor: ${provider === 'smtp' ? 'SMTP Clássico' : 'Resend API'}</li>
            <li>Remetente: ${fromName} &lt;${fromEmail}&gt;</li>
            ${replyTo ? `<li>Reply-To: ${replyTo}</li>` : ''}
            <li>Data/Hora: ${new Date().toLocaleString('pt-BR')}</li>
          </ul>
        </div>
      `;

      let emailId: string | undefined;

      if (provider === 'smtp') {
        if (!config?.smtp_host || !config?.smtp_user || !config?.smtp_password) {
          return new Response(JSON.stringify({ error: 'Configurações SMTP incompletas. Configure host, usuário e senha.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const nodemailer = await import('npm:nodemailer@6');
        const transporter = nodemailer.default.createTransport({
          host: config.smtp_host,
          port: config.smtp_port || 587,
          secure: config.smtp_secure ?? true,
          auth: {
            user: config.smtp_user,
            pass: config.smtp_password,
          },
          tls: { rejectUnauthorized: false },
        });

        const mailOptions: Record<string, unknown> = {
          from: `${fromName} <${fromEmail}>`,
          to: to_email,
          subject: 'Teste de Email - Gentia Platform',
          html: htmlBody,
        };
        if (replyTo) mailOptions.replyTo = replyTo;

        const info = await transporter.sendMail(mailOptions);
        emailId = info.messageId;

      } else {
        // Resend API — use effective key (DB overrides env)
        const effectiveApiKey = config?.resend_api_key || resendApiKeyEnv;
        const effectiveEndpoint = config?.resend_endpoint || 'https://api.resend.com/emails';

        const emailPayload: Record<string, unknown> = {
          from: `${fromName} <${fromEmail}>`,
          to: [to_email],
          subject: 'Teste de Email - Gentia Platform',
          html: htmlBody,
        };
        if (replyTo) emailPayload.reply_to = replyTo;

        const resendResponse = await fetch(effectiveEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const resendData = await resendResponse.json();
        if (!resendResponse.ok) {
          return new Response(JSON.stringify({ error: resendData.message || 'Falha ao enviar email' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        emailId = resendData.id;
      }

      // Log the test email
      await supabaseClient.from('recruitment_communications_log').insert({
        channel: 'email',
        recipient: to_email,
        subject: 'Teste de Email - Gentia Platform',
        body: 'Email de teste enviado via painel administrativo',
        status: 'sent',
        provider: provider,
        metadata: { test: true, message_id: emailId },
      });

      return new Response(JSON.stringify({ success: true, id: emailId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET connection info
    if (method === 'GET' && action === 'connection') {
      const { data: config } = await supabaseClient
        .from('platform_email_config')
        .select('provider, smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password, resend_api_key, resend_endpoint')
        .limit(1)
        .single();

      const provider = config?.provider || 'resend';

      if (provider === 'smtp') {
        const host = config?.smtp_host;
        const port = config?.smtp_port || 587;

        let status = 'error';
        let statusMessage = '';

        if (!host) {
          statusMessage = 'Host SMTP não configurado';
        } else {
          try {
            const nodemailer = await import('npm:nodemailer@6');
            const transporter = nodemailer.default.createTransport({
              host,
              port,
              secure: config?.smtp_secure ?? true,
              auth: config?.smtp_password ? {
                user: config.smtp_user,
                pass: config.smtp_password,
              } : undefined,
              tls: { rejectUnauthorized: false },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
            });
            await transporter.verify();
            status = 'connected';
            statusMessage = 'Conexão SMTP estabelecida com sucesso';
          } catch (e) {
            status = 'error';
            statusMessage = e instanceof Error ? e.message : 'Erro ao conectar ao servidor SMTP';
          }
        }

        return new Response(JSON.stringify({
          provider: 'smtp',
          status,
          status_message: statusMessage,
          smtp_host: host,
          smtp_port: port,
          smtp_user: config?.smtp_user,
          smtp_secure: config?.smtp_secure ?? true,
          smtp_has_password: !!config?.smtp_password,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        // Resend — use effective key (DB overrides env)
        const effectiveApiKey = config?.resend_api_key || resendApiKeyEnv;
        const effectiveEndpoint = config?.resend_endpoint || 'https://api.resend.com/emails';
        const hasCustomKey = !!config?.resend_api_key;

        // Masked key display: show last 4 chars only
        const maskedKey = effectiveApiKey
          ? 're_' + '•'.repeat(Math.max(0, effectiveApiKey.replace(/^re_/, '').length - 4)) + effectiveApiKey.slice(-4)
          : null;

        let status = 'error';
        let statusMessage = '';
        let domains: string[] = [];

        try {
          // Real validation: GET /api-keys returns 401 immediately if key is invalid
          const validateResponse = await fetch('https://api.resend.com/api-keys', {
            headers: { 'Authorization': `Bearer ${effectiveApiKey}` },
          });

          if (validateResponse.ok) {
            status = 'connected';
            statusMessage = hasCustomKey ? 'Chave personalizada ativa' : 'Chave padrão ativa';

            // Fetch verified domains separately
            try {
              const domainsResponse = await fetch('https://api.resend.com/domains', {
                headers: { 'Authorization': `Bearer ${effectiveApiKey}` },
              });
              if (domainsResponse.ok) {
                const domainsData = await domainsResponse.json();
                if (Array.isArray(domainsData?.data)) {
                  domains = domainsData.data
                    .filter((d: { status: string }) => d.status === 'verified')
                    .map((d: { name: string }) => d.name);
                }
              }
            } catch (_e) {
              // Domains fetch failed but key is valid — non-critical
            }
          } else {
            const errBody = await validateResponse.json().catch(() => ({}));
            statusMessage = errBody?.message || `Chave inválida (HTTP ${validateResponse.status})`;
            status = 'error';
          }
        } catch (e) {
          status = 'error';
          statusMessage = e instanceof Error ? e.message : 'Erro de rede ao validar chave';
        }

        return new Response(JSON.stringify({
          provider: 'resend',
          endpoint: effectiveEndpoint,
          api_key_masked: maskedKey,
          has_custom_key: hasCustomKey,
          status,
          status_message: statusMessage,
          domains,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET logs
    if (method === 'GET' && action === 'logs') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseClient
        .from('recruitment_communications_log')
        .select('*', { count: 'exact' })
        .eq('channel', 'email')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({ logs: data, total: count, page, limit }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[platform-admin-email] error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
