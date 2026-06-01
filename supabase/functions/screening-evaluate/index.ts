import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScreeningAnswer {
  id: string;
  category: string;
  text: string;
  required: boolean;
  answer: boolean;
  passed: boolean;
}

interface ScreeningRequest {
  applicationId: string;
  candidateId: string;
  jobId: string;
  accountId: string;
  questions: ScreeningAnswer[];
  passed: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: ScreeningRequest = await req.json();
    const { applicationId, candidateId, jobId, accountId, questions, passed } = body;

    if (!applicationId || !candidateId || !jobId || !accountId || !questions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Screening evaluate: application=${applicationId}, passed=${passed}`);

    // 1. Save screening results
    const { error: insertError } = await supabase
      .from("recruitment_screening_results")
      .insert({
        application_id: applicationId,
        candidate_id: candidateId,
        job_id: jobId,
        account_id: accountId,
        questions: questions,
        passed,
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error saving screening results:", insertError);
      throw insertError;
    }

    // 2. Log activity
    try {
      await supabase.from("recruitment_activities").insert({
        application_id: applicationId,
        candidate_id: candidateId,
        job_id: jobId,
        account_id: accountId,
        activity_type: "screening_completed",
        description: passed
          ? `Candidato aprovado na triagem inicial (${questions.filter((q: ScreeningAnswer) => q.passed).length}/${questions.length} perguntas corretas)`
          : `Candidato reprovado na triagem inicial`,
        metadata: {
          passed,
          total_questions: questions.length,
          passed_questions: questions.filter((q: ScreeningAnswer) => q.passed).length,
          failed_questions: questions.filter((q: ScreeningAnswer) => !q.passed).map((q: ScreeningAnswer) => q.text),
        },
      });
    } catch (activityErr) {
      console.error("Non-fatal: failed to log activity:", activityErr);
    }

    if (!passed) {
      // 3a. Rejected: update application status and trigger orchestrator rejection
      await supabase
        .from("recruitment_applications")
        .update({
          status: "disqualified",
          evaluated_at: new Date().toISOString(),
          update_source: "screening_evaluate",
        })
        .eq("id", applicationId);

      // Trigger orchestrator for rejection notification
      try {
        const orchestratorUrl = `${supabaseUrl}/functions/v1/recruitment-orchestrator`;
        await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            candidateId,
            jobId,
            accountId,
            completedStepType: "screening",
            sessionId: null,
          }),
        });
      } catch (orchErr) {
        console.error("Non-fatal: orchestrator trigger failed:", orchErr);
      }

      console.log(`❌ Candidate ${candidateId} failed screening for job ${jobId}`);

      return new Response(
        JSON.stringify({ success: true, passed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3b. Passed: trigger orchestrator to advance to next step
    try {
      const orchestratorUrl = `${supabaseUrl}/functions/v1/recruitment-orchestrator`;
      await fetch(orchestratorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          candidateId,
          jobId,
          accountId,
          completedStepType: "screening",
          sessionId: null,
        }),
      });
    } catch (orchErr) {
      console.error("Non-fatal: orchestrator trigger failed:", orchErr);
    }

    console.log(`✅ Candidate ${candidateId} passed screening for job ${jobId}`);

    return new Response(
      JSON.stringify({ success: true, passed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Screening evaluate error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
