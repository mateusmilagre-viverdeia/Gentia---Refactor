import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppViaMeta, isMetaWhatsAppConfigured } from "../_shared/whatsapp-meta.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmitRequest {
  account_id: string;
  cliente_id: string;
  job_id?: string | null;
  event_type: string;
  event_data?: Record<string, unknown>;
}

const VALID_EVENTS = new Set([
  "shortlist_ready",
  "candidate_advanced",
  "candidate_hired",
  "stage_update",
  "sla_warning",
  "feedback_requested",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as EmitRequest;

    if (!body.account_id || !body.cliente_id || !body.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: account_id, cliente_id, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_EVENTS.has(body.event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type: ${body.event_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert activity log (idempotent for shortlist_ready via unique partial index)
    const { data: inserted, error: insertError } = await supabase
      .from("client_portal_activity_log")
      .insert({
        account_id: body.account_id,
        cliente_id: body.cliente_id,
        job_id: body.job_id || null,
        event_type: body.event_type,
        event_data: body.event_data || {},
      })
      .select()
      .maybeSingle();

    if (insertError) {
      // For shortlist_ready, duplicate is OK (idempotent)
      if (body.event_type === "shortlist_ready" && insertError.code === "23505") {
        console.log(`⏭️ Duplicate shortlist_ready for job ${body.job_id} — skipping notification`);
        return new Response(
          JSON.stringify({ success: true, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    // For shortlist_ready: notify primary contact via WhatsApp
    if (body.event_type === "shortlist_ready") {
      try {
        const { data: contact } = await supabase
          .from("clientes_contatos")
          .select("nome, whatsapp, email")
          .eq("cliente_id", body.cliente_id)
          .eq("eh_contato_principal", true)
          .maybeSingle();

        const { data: cliente } = await supabase
          .from("clientes_consultoria")
          .select("razao_social, nome_fantasia")
          .eq("id", body.cliente_id)
          .maybeSingle();

        const { data: portal } = await supabase
          .from("portal_clientes_acesso")
          .select("token_acesso")
          .eq("cliente_id", body.cliente_id)
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const jobTitle = (body.event_data as any)?.job_title || "vaga";
        const clienteName = cliente?.nome_fantasia || cliente?.razao_social || "Cliente";
        const baseUrl = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
        const portalUrl = portal?.token_acesso ? `${baseUrl}/portal/${portal.token_acesso}` : baseUrl;

        if (contact?.whatsapp && isMetaWhatsAppConfigured()) {
          const msg = `Olá ${contact.nome.split(" ")[0]}! 🎯\n\nA shortlist da vaga *${jobTitle}* está pronta para sua avaliação.\n\nAcesse o portal: ${portalUrl}\n\n— Equipe ${clienteName}`;
          await sendWhatsAppViaMeta(contact.whatsapp, msg);
          console.log(`📱 Shortlist WhatsApp sent to ${contact.whatsapp}`);
        }
      } catch (notifyErr) {
        console.error("⚠️ Non-fatal notification error:", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, event_id: inserted?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ portal-activity-emit error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
