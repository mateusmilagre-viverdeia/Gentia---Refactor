import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { request_id, action, role = 'member' } = await req.json();

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: "request_id and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the access request
    const { data: request, error: requestError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Solicitação não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: "Esta solicitação já foi processada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin of the org
    const { data: membership } = await supabase
      .from('account_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', request.target_org_id)
      .in('role', ['owner', 'admin', 'admin_rh'])
      .eq('is_active', true)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para gerenciar esta solicitação" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org info
    const { data: org } = await supabase
      .from('companies')
      .select('name')
      .eq('id', request.target_org_id)
      .single();

    if (action === 'approve') {
      // Check if user is already a member (edge case)
      const { data: existingMember } = await supabase
        .from('account_members')
        .select('id')
        .eq('user_id', request.requester_id)
        .eq('account_id', request.target_org_id)
        .maybeSingle();

      if (existingMember) {
        // Just update the request status
        await supabase
          .from('access_requests')
          .update({
            status: 'approved',
            handled_by: user.id,
            handled_at: new Date().toISOString(),
          })
          .eq('id', request_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Usuário já era membro da organização" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('account_members')
        .insert({
          account_id: request.target_org_id,
          user_id: request.requester_id,
          role: role,
          is_active: true,
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        throw memberError;
      }

      // Update requester's profile account_id
      await supabase
        .from('profiles')
        .update({ account_id: request.target_org_id })
        .eq('id', request.requester_id);

      // Update request status
      await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          handled_by: user.id,
          handled_at: new Date().toISOString(),
        })
        .eq('id', request_id);

      // Send approval email
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: request.requester_email,
            subject: `Seu acesso foi aprovado - ${org?.name || 'Organização'}`,
            html: `
              <h2>Acesso Aprovado!</h2>
              <p>Sua solicitação de acesso à organização <strong>${org?.name || 'a organização'}</strong> foi aprovada.</p>
              <p>Você já pode acessar a plataforma e colaborar com a equipe.</p>
              <p><a href="${Deno.env.get('SITE_URL') || 'https://gentia.lovable.app'}">Acessar a plataforma</a></p>
            `,
          },
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }

      console.log(`Access request ${request_id} approved, user added with role ${role}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${request.requester_name} foi adicionado(a) à organização como ${role}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Reject
      await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          handled_by: user.id,
          handled_at: new Date().toISOString(),
        })
        .eq('id', request_id);

      // Send rejection email
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: request.requester_email,
            subject: `Sobre sua solicitação de acesso - ${org?.name || 'Organização'}`,
            html: `
              <h2>Solicitação de Acesso</h2>
              <p>Infelizmente sua solicitação de acesso à organização <strong>${org?.name || 'a organização'}</strong> não foi aprovada neste momento.</p>
              <p>Se você acredita que isso foi um engano, entre em contato diretamente com os administradores da organização.</p>
            `,
          },
        });
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }

      console.log(`Access request ${request_id} rejected`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Solicitação rejeitada",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error handling access request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
