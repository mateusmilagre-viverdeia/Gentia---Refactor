import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResult = await checkRateLimit(req, 'generate-success-prediction', 50);
  if (!rateLimitResult.userId) return unauthorizedResponse(corsHeaders);
  if (!rateLimitResult.allowed) return rateLimitExceededResponse(corsHeaders);

  try {
    const { candidate_id, job_id, account_id } = await req.json();
    if (!candidate_id || !job_id || !account_id) {
      return new Response(JSON.stringify({ error: 'candidate_id, job_id e account_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get candidate's interview scores
    const [cultureRes, discRes, techRes] = await Promise.all([
      supabase
        .from('culture_interview_sessions')
        .select('matching_score')
        .eq('candidate_id', candidate_id)
        .eq('job_id', job_id)
        .eq('status', 'completed')
        .maybeSingle(),
      supabase
        .from('candidate_disc_sessions')
        .select('candidate_disc_results(match_score)')
        .eq('candidate_id', candidate_id)
        .eq('job_id', job_id)
        .eq('status', 'completed')
        .maybeSingle(),
      supabase
        .from('technical_interview_sessions')
        .select('overall_score')
        .eq('candidate_id', candidate_id)
        .eq('job_id', job_id)
        .eq('status', 'completed')
        .maybeSingle(),
    ]);

    const candidateScores = {
      cultural: cultureRes.data?.matching_score ?? null,
      disc: (discRes.data as any)?.candidate_disc_results?.[0]?.match_score ?? (discRes.data as any)?.candidate_disc_results?.match_score ?? null,
      technical: techRes.data?.overall_score ?? null,
    };

    // Get all performance reviews for this account to build the prediction model
    const { data: allReviews } = await supabase
      .from('hire_performance_reviews')
      .select(`
        candidate_id, performance_score, retention_status, review_period, job_id
      `)
      .eq('account_id', account_id);

    if (!allReviews || allReviews.length === 0) {
      return new Response(JSON.stringify({
        success_probability: null,
        confidence: 'low',
        message: 'Ainda não há dados de performance suficientes para gerar previsão.',
        factors: [],
        data_points: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get interview scores for all reviewed candidates
    const reviewedCandidateIds = [...new Set(allReviews.map(r => r.candidate_id))];
    const reviewedJobIds = [...new Set(allReviews.map(r => r.job_id))];

    const [reviewedCulture, reviewedDisc, reviewedTech] = await Promise.all([
      supabase
        .from('culture_interview_sessions')
        .select('candidate_id, matching_score, job_id')
        .in('candidate_id', reviewedCandidateIds)
        .in('job_id', reviewedJobIds)
        .eq('status', 'completed'),
      supabase
        .from('candidate_disc_sessions')
        .select('candidate_id, candidate_disc_results(match_score), job_id')
        .in('candidate_id', reviewedCandidateIds)
        .in('job_id', reviewedJobIds)
        .eq('status', 'completed'),
      supabase
        .from('technical_interview_sessions')
        .select('candidate_id, overall_score, job_id')
        .in('candidate_id', reviewedCandidateIds)
        .in('job_id', reviewedJobIds)
        .eq('status', 'completed'),
    ]);

    // Build correlation data
    interface DataPoint {
      cultural: number | null;
      disc: number | null;
      technical: number | null;
      performance: number;
      retained: boolean;
    }

    const dataPoints: DataPoint[] = [];
    
    for (const review of allReviews) {
      const cultural = (reviewedCulture.data || []).find(
        (s: any) => s.candidate_id === review.candidate_id && s.job_id === review.job_id
      );
      const disc = (reviewedDisc.data || []).find(
        (s: any) => s.candidate_id === review.candidate_id && s.job_id === review.job_id
      );
      const tech = (reviewedTech.data || []).find(
        (s: any) => s.candidate_id === review.candidate_id && s.job_id === review.job_id
      );

      dataPoints.push({
        cultural: (cultural as any)?.matching_score ?? null,
        disc: (disc as any)?.candidate_disc_results?.[0]?.match_score ?? (disc as any)?.candidate_disc_results?.match_score ?? null,
        technical: (tech as any)?.overall_score ?? null,
        performance: review.performance_score,
        retained: review.retention_status === 'active',
      });
    }

    if (dataPoints.length < 3) {
      return new Response(JSON.stringify({
        success_probability: null,
        confidence: 'low',
        message: `Apenas ${dataPoints.length} avaliação(ões) de performance disponível(is). São necessárias pelo menos 3.`,
        factors: [],
        data_points: dataPoints.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Simple prediction: weighted similarity to high performers
    const highPerformers = dataPoints.filter(d => d.performance >= 7);
    const lowPerformers = dataPoints.filter(d => d.performance < 5);

    const factors: Array<{ factor: string; impact: string; detail: string }> = [];
    let probabilityScore = 50; // base

    // Cultural correlation
    if (candidateScores.cultural !== null) {
      const avgHighCultural = highPerformers.filter(d => d.cultural !== null).reduce((sum, d) => sum + d.cultural!, 0) / Math.max(1, highPerformers.filter(d => d.cultural !== null).length);
      const avgLowCultural = lowPerformers.filter(d => d.cultural !== null).reduce((sum, d) => sum + d.cultural!, 0) / Math.max(1, lowPerformers.filter(d => d.cultural !== null).length) || 0;
      
      if (avgHighCultural > 0) {
        const closeness = 1 - Math.abs(candidateScores.cultural - avgHighCultural) / 100;
        probabilityScore += closeness * 20;
        factors.push({
          factor: 'Cultural',
          impact: candidateScores.cultural >= avgHighCultural ? 'positive' : 'neutral',
          detail: `Score ${candidateScores.cultural}% vs média de alta performance ${Math.round(avgHighCultural)}%`,
        });
      }
    }

    // DISC correlation
    if (candidateScores.disc !== null) {
      const avgHighDisc = highPerformers.filter(d => d.disc !== null).reduce((sum, d) => sum + d.disc!, 0) / Math.max(1, highPerformers.filter(d => d.disc !== null).length);
      
      if (avgHighDisc > 0) {
        const closeness = 1 - Math.abs(candidateScores.disc - avgHighDisc) / 100;
        probabilityScore += closeness * 15;
        factors.push({
          factor: 'DISC',
          impact: candidateScores.disc >= avgHighDisc ? 'positive' : 'neutral',
          detail: `Score ${candidateScores.disc}% vs média de alta performance ${Math.round(avgHighDisc)}%`,
        });
      }
    }

    // Technical correlation
    if (candidateScores.technical !== null) {
      const avgHighTech = highPerformers.filter(d => d.technical !== null).reduce((sum, d) => sum + d.technical!, 0) / Math.max(1, highPerformers.filter(d => d.technical !== null).length);
      
      if (avgHighTech > 0) {
        const closeness = 1 - Math.abs(candidateScores.technical - avgHighTech) / 100;
        probabilityScore += closeness * 25;
        factors.push({
          factor: 'Técnico',
          impact: candidateScores.technical >= avgHighTech ? 'positive' : 'neutral',
          detail: `Score ${candidateScores.technical}% vs média de alta performance ${Math.round(avgHighTech)}%`,
        });
      }
    }

    // Retention factor
    const retentionRate = dataPoints.filter(d => d.retained).length / dataPoints.length;
    factors.push({
      factor: 'Retenção histórica',
      impact: retentionRate >= 0.7 ? 'positive' : retentionRate >= 0.5 ? 'neutral' : 'negative',
      detail: `${Math.round(retentionRate * 100)}% de retenção entre contratados avaliados`,
    });

    const finalProbability = Math.min(100, Math.max(0, Math.round(probabilityScore)));
    const confidence = dataPoints.length >= 10 ? 'high' : dataPoints.length >= 5 ? 'medium' : 'low';

    return new Response(JSON.stringify({
      success_probability: finalProbability,
      confidence,
      message: null,
      factors,
      data_points: dataPoints.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[generate-success-prediction] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
