import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('aggregate-culture-metrics');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === 'ERROR' || step.includes('Error')) {
    log.error(step, details);
  } else {
    log.log(step, details);
  }
};

interface PillarScores {
  [pillar: string]: { sum: number; count: number };
}

interface ValueScores {
  [value: string]: { sum: number; count: number };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date to aggregate (yesterday by default, or from request body)
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } catch {
      targetDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    logStep("Starting culture metrics aggregation", { targetDate });

    // Get all active accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('pulse_schedule_rules')
      .select('account_id')
      .eq('is_active', true);

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    const uniqueAccountIds = [...new Set(accounts?.map(a => a.account_id) || [])];
    logStep("Found accounts", { count: uniqueAccountIds.length });

    let totalMetricsUpdated = 0;

    for (const accountId of uniqueAccountIds) {
      try {
        logStep("Processing account", { accountId });

        // Get culture responses for the target date using the new culture_question_id column
        const { data: responses, error: responsesError } = await supabase
          .from('pulse_responses')
          .select(`
            id,
            respondent_user_id,
            numeric_score,
            question_id,
            culture_question_id,
            date
          `)
          .eq('account_id', accountId)
          .eq('date', targetDate)
          .not('culture_question_id', 'is', null);

        if (responsesError) {
          logStep("Error fetching responses", { accountId, error: responsesError.message });
          continue;
        }

        if (!responses || responses.length === 0) {
          logStep("No culture responses found for date", { accountId, targetDate });
          continue;
        }

        // Get culture question IDs from responses
        const cultureQuestionIds = [...new Set(
          responses.filter(r => r.culture_question_id).map(r => r.culture_question_id)
        )];

        // Get culture question data using id (not question_id)
        const { data: cultureQuestions, error: cultureError } = await supabase
          .from('pulse_culture_questions')
          .select('id, pillar_type, reference_text')
          .in('id', cultureQuestionIds);

        if (cultureError) {
          logStep("Error fetching culture questions", { accountId, error: cultureError.message });
          continue;
        }

        // Create map of id to culture data
        const cultureMap = new Map(
          cultureQuestions?.map(cq => [cq.id, cq]) || []
        );

        // Aggregate scores by pillar and value
        const pillarScores: PillarScores = {};
        const valueScores: ValueScores = {};
        let totalScore = 0;
        let totalCultureResponses = 0;
        const respondentSet = new Set<string>();

        responses.forEach(response => {
          // Use culture_question_id to look up culture data
          const cultureData = cultureMap.get(response.culture_question_id);
          
          if (cultureData && response.numeric_score !== null) {
            // This is a culture response
            totalCultureResponses++;
            totalScore += response.numeric_score;
            if (response.respondent_user_id) {
              respondentSet.add(response.respondent_user_id);
            }

            // Aggregate by pillar
            const pillar = cultureData.pillar_type;
            if (!pillarScores[pillar]) {
              pillarScores[pillar] = { sum: 0, count: 0 };
            }
            pillarScores[pillar].sum += response.numeric_score;
            pillarScores[pillar].count++;

            // Aggregate by value (reference_text)
            const value = cultureData.reference_text;
            if (value) {
              if (!valueScores[value]) {
                valueScores[value] = { sum: 0, count: 0 };
              }
              valueScores[value].sum += response.numeric_score;
              valueScores[value].count++;
            }
          }
        });

        if (totalCultureResponses === 0) {
          logStep("No culture responses found", { accountId, targetDate });
          continue;
        }

        // Calculate averages and format for storage
        const overallScore = totalScore / totalCultureResponses;
        
        const byPillar: Record<string, number> = {};
        Object.entries(pillarScores).forEach(([pillar, data]) => {
          byPillar[pillar] = Math.round((data.sum / data.count) * 10) / 10;
        });

        const byValue: Record<string, number> = {};
        Object.entries(valueScores).forEach(([value, data]) => {
          byValue[value] = Math.round((data.sum / data.count) * 10) / 10;
        });

        logStep("Aggregated culture metrics", {
          accountId,
          overallScore: Math.round(overallScore * 10) / 10,
          pillarCount: Object.keys(byPillar).length,
          valueCount: Object.keys(byValue).length,
          responseCount: totalCultureResponses,
          respondentCount: respondentSet.size,
        });

        // Upsert into pulse_culture_metrics_daily
        const { error: upsertError } = await supabase
          .from('pulse_culture_metrics_daily')
          .upsert({
            account_id: accountId,
            date: targetDate,
            overall_score: Math.round(overallScore * 10) / 10,
            by_pillar: byPillar,
            by_value: byValue,
            response_count: totalCultureResponses,
            respondent_count: respondentSet.size,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'account_id,date',
          });

        if (upsertError) {
          logStep("Error upserting metrics", { accountId, error: upsertError.message });
        } else {
          totalMetricsUpdated++;
        }

      } catch (error) {
        logStep("Error processing account", { accountId, error: String(error) });
      }
    }

    logStep("Completed culture metrics aggregation", {
      metricsUpdated: totalMetricsUpdated,
    });

    return new Response(JSON.stringify({
      success: true,
      metricsUpdated: totalMetricsUpdated,
      date: targetDate,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error in culture metrics aggregation", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
