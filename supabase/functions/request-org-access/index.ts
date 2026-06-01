import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing request-org-access environment variables", {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(supabaseServiceKey),
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { org_id, reason } = await req.json();

    if (!org_id) {
      return new Response(
        JSON.stringify({ error: "org_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('account_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_id', org_id)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "Você já é membro desta organização" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('access_requests')
      .select('id, status')
      .eq('requester_id', user.id)
      .eq('target_org_id', org_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: "Você já possui uma solicitação pendente para esta organização" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const requesterName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuário'
      : 'Usuário';
    const requesterEmail = profile?.email || user.email || '';

    // Get org info for notification
    const { data: org } = await supabase
      .from('companies')
      .select('name')
      .eq('id', org_id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create access request
    const { data: request, error: insertError } = await supabase
      .from('access_requests')
      .insert({
        requester_id: user.id,
        requester_email: requesterEmail,
        requester_name: requesterName,
        target_org_id: org_id,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating request:", insertError);
      throw insertError;
    }

    // Get org admins to notify
    const { data: admins } = await supabase
      .from('account_members')
      .select('user_id, role')
      .eq('account_id', org_id)
      .in('role', ['owner', 'admin', 'admin_rh'])
      .eq('is_active', true);

    // Send notification emails to admins
    if (admins && admins.length > 0) {
      const adminUserIds = admins.map(a => a.user_id);
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', adminUserIds);

      if (adminProfiles) {
        for (const adminProfile of adminProfiles) {
          if (adminProfile.email) {
            try {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  to: adminProfile.email,
                  subject: `Nova solicitação de acesso - ${requesterName}`,
                  html: `
                    <h2>Nova Solicitação de Acesso</h2>
                    <p><strong>${requesterName}</strong> (${requesterEmail}) está solicitando acesso à organização <strong>${org.name}</strong>.</p>
                    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
                    <p>Acesse a plataforma para aprovar ou rejeitar esta solicitação.</p>
                  `,
                },
              });
            } catch (emailError) {
              console.error("Error sending notification email:", emailError);
              // Don't fail the request if email fails
            }
          }
        }
      }
    }

    console.log(`Access request created: ${request.id} for org ${org_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: request.id,
        message: "Solicitação enviada com sucesso. Os administradores serão notificados.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating access request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
