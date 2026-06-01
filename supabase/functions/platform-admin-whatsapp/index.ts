import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // GET config
    if (method === 'GET' && action === 'config') {
      const { data, error } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('id, phone_number_id, waba_id, is_active, webhook_verify_token, updated_at, updated_by')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT config - salva credenciais (access_token incluído)
    if (method === 'PUT' && action === 'config') {
      const body = await req.json();
      const { phone_number_id, waba_id, access_token, is_active } = body;

      const { data: existing } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('id')
        .limit(1)
        .single();

      const updatePayload: Record<string, unknown> = {
        phone_number_id,
        waba_id,
        is_active: is_active ?? false,
        updated_by: user.id,
      };
      if (access_token && access_token !== '***') {
        updatePayload.access_token = access_token;
      }

      let result;
      if (existing?.id) {
        result = await supabaseClient
          .from('platform_whatsapp_config')
          .update(updatePayload)
          .eq('id', existing.id)
          .select('id, phone_number_id, waba_id, is_active, webhook_verify_token, updated_at')
          .single();
      } else {
        result = await supabaseClient
          .from('platform_whatsapp_config')
          .insert({ ...updatePayload, access_token: access_token || '' })
          .select('id, phone_number_id, waba_id, is_active, webhook_verify_token, updated_at')
          .single();
      }

      if (result.error) throw result.error;
      return new Response(JSON.stringify({ config: result.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST test - testa conexão com Meta API
    if (method === 'POST' && action === 'test') {
      const { data: config } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('phone_number_id, access_token')
        .limit(1)
        .single();

      if (!config?.phone_number_id || !config?.access_token) {
        return new Response(JSON.stringify({ error: 'Configuração incompleta. Salve as credenciais primeiro.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${config.phone_number_id}`,
        {
          headers: { 'Authorization': `Bearer ${config.access_token}` }
        }
      );

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: metaData.error?.message || 'Falha na conexão com Meta API'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        phone_info: {
          display_phone_number: metaData.display_phone_number,
          verified_name: metaData.verified_name,
          quality_rating: metaData.quality_rating,
          status: metaData.account_mode,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET templates - busca templates da Meta API
    if (method === 'GET' && action === 'templates') {
      const { data: config } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('waba_id, access_token')
        .limit(1)
        .single();

      if (!config?.waba_id || !config?.access_token) {
        return new Response(JSON.stringify({ error: 'WABA ID e Access Token necessários para buscar templates.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?limit=100&fields=name,category,language,status,components`,
        {
          headers: { 'Authorization': `Bearer ${config.access_token}` }
        }
      );

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        return new Response(JSON.stringify({
          error: metaData.error?.message || 'Falha ao buscar templates'
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ templates: metaData.data || [], paging: metaData.paging }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST send-test - envia mensagem de teste usando template aprovado
    if (method === 'POST' && action === 'send-test') {
      const body = await req.json();
      const { phone, template_name, template_language, body_params } = body;

      if (!phone || !template_name || !template_language) {
        return new Response(JSON.stringify({ error: 'phone, template_name e template_language são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: config } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('phone_number_id, access_token, is_active')
        .limit(1)
        .single();

      if (!config?.phone_number_id || !config?.access_token) {
        return new Response(JSON.stringify({ error: 'Configuração incompleta. Salve as credenciais primeiro.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const cleanPhone = phone.replace(/\D/g, '');

      // Build template payload with optional components for body params
      const templatePayload: Record<string, unknown> = {
        name: template_name,
        language: { code: template_language },
      };

      if (body_params && Array.isArray(body_params) && body_params.length > 0) {
        templatePayload.components = [
          {
            type: 'body',
            parameters: body_params.map((value: string) => ({
              type: 'text',
              text: value || ' ',
            })),
          },
        ];
      }

      const metaResponse = await fetch(
        `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: templatePayload,
          }),
        }
      );

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: metaData.error?.message || `Erro Meta API (${metaResponse.status})`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const messageId = metaData?.messages?.[0]?.id || null;

      // Log the test message
      try {
        await supabaseClient.from('recruitment_communications_log').insert({
          account_id: EP_PARTNERS_ACCOUNT_ID,
          channel: 'whatsapp',
          message_type: 'test',
          recipient: cleanPhone,
          subject: `Teste: ${template_name}`,
          body: `Template: ${template_name} (${template_language})${body_params?.length ? ' | Params: ' + body_params.join(', ') : ''}`,
          status: 'sent',
          provider: 'meta_cloud_api',
          provider_message_id: messageId,
          metadata: { test: true, template_name, template_language, body_params },
        });
      } catch (logErr) {
        console.warn('Failed to log test message:', logErr);
      }

      return new Response(JSON.stringify({ success: true, message_id: messageId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET workflow-templates - retorna templates configurados para o workflow
    if (method === 'GET' && action === 'workflow-templates') {
      const { data, error } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('template_cultural_name, template_cultural_language, template_disc_name, template_disc_language, template_technical_name, template_technical_language, template_completion_name, template_completion_language, template_rejection_name, template_rejection_language')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return new Response(JSON.stringify({ workflow_templates: data || {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT workflow-templates - salva templates do workflow
    if (method === 'PUT' && action === 'workflow-templates') {
      const body = await req.json();
      const {
        template_cultural_name, template_cultural_language,
        template_disc_name, template_disc_language,
        template_technical_name, template_technical_language,
        template_completion_name, template_completion_language,
        template_rejection_name, template_rejection_language,
      } = body;

      const { data: existing } = await supabaseClient
        .from('platform_whatsapp_config')
        .select('id')
        .limit(1)
        .single();

      if (!existing?.id) {
        return new Response(JSON.stringify({ error: 'Configure as credenciais primeiro.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabaseClient
        .from('platform_whatsapp_config')
        .update({
          template_cultural_name: template_cultural_name || null,
          template_cultural_language: template_cultural_language || 'pt_BR',
          template_disc_name: template_disc_name || null,
          template_disc_language: template_disc_language || 'pt_BR',
          template_technical_name: template_technical_name || null,
          template_technical_language: template_technical_language || 'pt_BR',
          template_completion_name: template_completion_name || null,
          template_completion_language: template_completion_language || 'pt_BR',
          template_rejection_name: template_rejection_name || null,
          template_rejection_language: template_rejection_language || 'pt_BR',
          updated_by: user.id,
        })
        .eq('id', existing.id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET logs - logs globais de WhatsApp
    if (method === 'GET' && action === 'logs') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseClient
        .from('recruitment_communications_log')
        .select('*', { count: 'exact' })
        .eq('channel', 'whatsapp')
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
    console.error('platform-admin-whatsapp error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
