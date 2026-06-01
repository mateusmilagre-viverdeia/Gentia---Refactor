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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find shortlist reports created >48h ago whose client primary contact never accessed the portal
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: reports, error: reportsErr } = await supabase
      .from('shortlist_relatorios')
      .select('id, account_id, cliente_id, titulo, token_publico, created_at, visualizacoes')
      .lt('created_at', cutoff)
      .or('visualizacoes.is.null,visualizacoes.eq.0');

    if (reportsErr) throw reportsErr;

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const report of reports || []) {
      try {
        if (!report.cliente_id) { skipped++; continue; }

        // Check account-level notification preference
        const { data: settings } = await supabase
          .from('consultancy_portal_settings')
          .select('notify_reminder_48h, template_reminder_48h, consultancy_name')
          .eq('account_id', report.account_id)
          .maybeSingle();

        if (settings && settings.notify_reminder_48h === false) {
          skipped++;
          continue;
        }

        // Find the client's primary contact
        const { data: contato } = await supabase
          .from('clientes_contatos')
          .select('whatsapp, nome')
          .eq('cliente_id', report.cliente_id)
          .eq('eh_contato_principal', true)
          .maybeSingle();

        if (!contato?.whatsapp) { skipped++; continue; }

        // Verify the contact never accessed the portal
        const { data: acesso } = await supabase
          .from('portal_clientes_acesso')
          .select('ultimo_acesso')
          .eq('cliente_id', report.cliente_id)
          .order('ultimo_acesso', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (acesso?.ultimo_acesso) { skipped++; continue; }

        // Build reminder message
        const reportLink = `${Deno.env.get('PUBLIC_APP_URL') || 'https://gentia.tech'}/relatorio/${report.token_publico}`;
        const template = settings?.template_reminder_48h ||
          `Olá {{nome}}! Notamos que ainda não acessou a shortlist "{{titulo}}". Confira aqui: {{link}}`;
        const message = template
          .replace(/{{nome}}/g, contato.nome || '')
          .replace(/{{titulo}}/g, report.titulo || 'Shortlist')
          .replace(/{{link}}/g, reportLink)
          .replace(/{{consultoria}}/g, settings?.consultancy_name || '');

        // Invoke whatsapp-send
        const { error: waErr } = await supabase.functions.invoke('whatsapp-send', {
          body: { toPhoneE164: contato.whatsapp, message },
        });

        if (waErr) {
          errors.push(`Report ${report.id}: ${waErr.message}`);
        } else {
          sent++;
        }
      } catch (e: any) {
        errors.push(`Report ${report.id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skipped, total: reports?.length || 0, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
