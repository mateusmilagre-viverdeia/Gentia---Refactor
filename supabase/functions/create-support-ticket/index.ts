import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SLA times in minutes
const SLA_RESOLUTION: Record<string, number> = {
  urgent: 240, // 4 hours
  high: 1440, // 24 hours
  normal: 4320, // 72 hours
  low: 10080, // 1 week
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { 
      title, 
      description, 
      category = 'general', 
      priority = 'normal',
      conversationContext,
      pageContext,
      accountId 
    } = body;

    if (!title || !accountId) {
      return new Response(
        JSON.stringify({ error: 'Título e conta são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate SLA due date
    const slaDueAt = new Date();
    slaDueAt.setMinutes(slaDueAt.getMinutes() + (SLA_RESOLUTION[priority] || SLA_RESOLUTION.normal));

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        account_id: accountId,
        created_by: user.id,
        title,
        description,
        category,
        priority,
        conversation_context: conversationContext || null,
        page_context: pageContext || null,
        sla_due_at: slaDueAt.toISOString(),
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      throw ticketError;
    }

    console.log('Ticket created:', ticket.id);

    // Get account info
    const { data: account } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', accountId)
      .single();

    // Get creator profile
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const creatorName = creatorProfile 
      ? `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim() || creatorProfile.email
      : user.email;

    // Find recipients for notification:
    // 1. Account owners and admins
    const { data: accountAdmins } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .in('role', ['owner', 'admin']);

    // 2. EP Team (head_cs, super_admin)
    const { data: epTeam } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['head_cs', 'super_admin']);

    // 3. Consultants assigned to this account
    const { data: consultants } = await supabase
      .from('consultant_assignments')
      .select('consultant_id, ep_consultants!inner(user_id)')
      .eq('account_id', accountId)
      .eq('active', true);

    // Collect all recipient user IDs
    const recipientIds = new Set<string>();
    
    accountAdmins?.forEach(a => recipientIds.add(a.user_id));
    epTeam?.forEach(e => recipientIds.add(e.user_id));
    consultants?.forEach(c => {
      const epConsultant = c.ep_consultants as unknown as { user_id: string } | null;
      if (epConsultant?.user_id) {
        recipientIds.add(epConsultant.user_id);
      }
    });

    // Remove the creator from recipients (they don't need notification about their own ticket)
    recipientIds.delete(user.id);

    console.log(`Found ${recipientIds.size} recipients for notification`);

    // Create in-app notification
    if (recipientIds.size > 0) {
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          org_id: accountId,
          type: 'support_ticket',
          title: `Novo Chamado: ${title}`,
          body: `${creatorName} abriu um chamado de suporte${category !== 'general' ? ` (${category})` : ''}`,
          link: `/suporte/chamado/${ticket.id}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (notifError) {
        console.error('Error creating notification:', notifError);
      } else if (notification) {
        // Create notification recipients
        const recipientRecords = Array.from(recipientIds).map(userId => ({
          notification_id: notification.id,
          user_id: userId,
        }));

        const { error: recipientError } = await supabase
          .from('notification_recipients')
          .insert(recipientRecords);

        if (recipientError) {
          console.error('Error creating notification recipients:', recipientError);
        } else {
          console.log(`Created notification for ${recipientRecords.length} recipients`);
        }
      }
    }

    // Send email notifications (optional, via Resend)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && recipientIds.size > 0) {
      // Get recipient emails
      const { data: recipientProfiles } = await supabase
        .from('profiles')
        .select('email')
        .in('id', Array.from(recipientIds))
        .not('email', 'is', null);

      const emails = recipientProfiles?.map(p => p.email).filter(Boolean) || [];

      if (emails.length > 0) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'EP Partners <suporte@ep-partners.com.br>',
              to: emails,
              subject: `[Chamado #${ticket.id.slice(0, 8)}] ${title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Novo Chamado de Suporte</h2>
                  <p><strong>Empresa:</strong> ${account?.name || 'N/A'}</p>
                  <p><strong>Aberto por:</strong> ${creatorName}</p>
                  <p><strong>Prioridade:</strong> ${priority}</p>
                  <p><strong>Categoria:</strong> ${category}</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <h3>${title}</h3>
                  <p>${description || 'Sem descrição'}</p>
                  ${pageContext ? `<p><em>Página: ${pageContext}</em></p>` : ''}
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p>
                    <a href="https://gentia.lovable.app/suporte/chamado/${ticket.id}" 
                       style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                      Ver Chamado
                    </a>
                  </p>
                </div>
              `,
            }),
          });

          if (!emailResponse.ok) {
            console.error('Error sending email:', await emailResponse.text());
          } else {
            console.log(`Email sent to ${emails.length} recipients`);
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket,
        message: 'Chamado criado com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-support-ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
