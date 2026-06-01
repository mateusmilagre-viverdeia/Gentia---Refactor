import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { applications, candidates, templateId, customMessage, accountId } = await req.json();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("recruitment_email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", accountId)
      .single();

    const companyName = company?.name || "Nossa Empresa";

    // Process applications or candidates
    const recipients = applications || candidates || [];
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipient of recipients) {
      const email = recipient.candidateEmail;
      const name = recipient.candidateName || "Candidato";
      const jobTitle = recipient.jobTitle || "Vaga";

      if (!email) {
        results.push({ email: "unknown", success: false, error: "No email" });
        continue;
      }

      // Replace template variables
      let subject = template.subject
        .replace(/\{\{candidate_name\}\}/g, name)
        .replace(/\{\{job_title\}\}/g, jobTitle)
        .replace(/\{\{company_name\}\}/g, companyName);

      let body = template.body
        .replace(/\{\{candidate_name\}\}/g, name)
        .replace(/\{\{job_title\}\}/g, jobTitle)
        .replace(/\{\{company_name\}\}/g, companyName);

      if (customMessage) {
        body = body.replace(/\{\{custom_message\}\}/g, customMessage);
      }

      // Log the email (in production, you would send via Resend or similar)
      console.log(`[EMAIL] To: ${email}, Subject: ${subject}`);

      // Log to recruitment_email_log
      await supabase.from("recruitment_email_log").insert({
        account_id: accountId,
        candidate_id: recipient.candidateId || null,
        application_id: recipient.applicationId || null,
        email_type: template.type,
        subject,
        body,
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      // Log to unified recruitment_communications_log (Phase 2B: unificação)
      await supabase.from("recruitment_communications_log").insert({
        account_id: accountId,
        candidate_id: recipient.candidateId || null,
        application_id: recipient.applicationId || null,
        job_id: recipient.jobId || null,
        session_id: null,
        message_type: "rejection",
        channel: "email",
        recipient: email,
        subject,
        body,
        status: "sent",
        provider: null,
        provider_message_id: null,
        error_code: null,
        error_message: null,
        metadata: {
          template_id: templateId,
          template_type: template.type,
        },
      });

      results.push({ email, success: true });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending rejection emails:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
