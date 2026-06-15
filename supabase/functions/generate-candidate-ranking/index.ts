import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { checkRateLimit, unauthorizedResponse, rateLimitExceededResponse } from '../_shared/rate-limit.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResult = await checkRateLimit(req, 'generate-candidate-ranking', 50);
  if (!rateLimitResult.userId) return unauthorizedResponse(corsHeaders);
  if (!rateLimitResult.allowed) return rateLimitExceededResponse(corsHeaders);

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = "direct";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job info
    const { data: job } = await supabase
      .from('recruitment_jobs')
      .select('id, title, account_id')
      .eq('id', job_id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gather all sessions and scores
    const [cultureRes, discRes, techRes, appsRes, icpRes, performanceRes] = await Promise.all([
      supabase
        .from('culture_interview_sessions')
        .select('candidate_id, status, matching_score, candidate:candidate_profiles(id, full_name)')
        .eq('job_id', job_id)
        .eq('status', 'completed'),
      supabase
        .from('candidate_disc_sessions')
        .select('candidate_id, status, candidate_disc_results(match_score), candidate:candidate_profiles!candidate_disc_sessions_candidate_profile_id_fkey(id, full_name)')
        .eq('job_id', job_id)
        .eq('status', 'completed'),
      supabase
        .from('technical_interview_sessions')
        .select('candidate_id, candidate_profile_id, status, overall_score')
        .eq('job_id', job_id)
        .eq('status', 'completed'),
      supabase
        .from('recruitment_applications')
        .select('id, candidate_id, status, candidate:recruitment_candidates(id, name, email)')
        .eq('job_id', job_id)
        .not('status', 'in', '("rejected","desqualificado")'),
      supabase
        .from('job_icps')
        .select('learned_patterns, approved_candidates_count')
        .eq('job_id', job_id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('hire_performance_reviews')
        .select('candidate_id, performance_score, retention_status')
        .eq('job_id', job_id),
    ]);

    const cultureSessions = cultureRes.data || [];
    const discSessions = discRes.data || [];
    const techSessions = techRes.data || [];
    const applications = appsRes.data || [];
    const icp = icpRes.data;
    const performanceReviews = performanceRes.data || [];

    // Build candidate score map
    interface CandidateScores {
      candidate_id: string;
      candidate_name: string;
      application_id: string | null;
      cultural_score: number | null;
      disc_score: number | null;
      technical_score: number | null;
    }

    const scoreMap = new Map<string, CandidateScores>();

    for (const s of cultureSessions as any[]) {
      if (!s.candidate_id) continue;
      if (!scoreMap.has(s.candidate_id)) {
        scoreMap.set(s.candidate_id, {
          candidate_id: s.candidate_id,
          candidate_name: s.candidate?.full_name || 'Candidato',
          application_id: null,
          cultural_score: null,
          disc_score: null,
          technical_score: null,
        });
      }
      scoreMap.get(s.candidate_id)!.cultural_score = s.matching_score;
      if (s.candidate?.full_name) scoreMap.get(s.candidate_id)!.candidate_name = s.candidate.full_name;
    }

    for (const s of discSessions as any[]) {
      if (!s.candidate_id) continue;
      if (!scoreMap.has(s.candidate_id)) {
        scoreMap.set(s.candidate_id, {
          candidate_id: s.candidate_id,
          candidate_name: s.candidate?.full_name || 'Candidato',
          application_id: null,
          cultural_score: null,
          disc_score: null,
          technical_score: null,
        });
      }
      const matchScore = s.candidate_disc_results?.[0]?.match_score ?? s.candidate_disc_results?.match_score ?? null;
      scoreMap.get(s.candidate_id)!.disc_score = matchScore;
      if (s.candidate?.full_name) scoreMap.get(s.candidate_id)!.candidate_name = s.candidate.full_name;
    }

    // Map profile IDs to candidate IDs
    const profileToCandidateMap = new Map<string, string>();
    for (const [cid, entry] of scoreMap.entries()) {
      // Need to get profile ID from culture/disc sessions
    }

    for (const s of techSessions as any[]) {
      let cid = s.candidate_id;
      if (!cid && s.candidate_profile_id) {
        cid = profileToCandidateMap.get(s.candidate_profile_id) || null;
      }
      if (!cid) continue;
      if (!scoreMap.has(cid)) {
        scoreMap.set(cid, {
          candidate_id: cid,
          candidate_name: 'Candidato',
          application_id: null,
          cultural_score: null,
          disc_score: null,
          technical_score: null,
        });
      }
      scoreMap.get(cid)!.technical_score = s.overall_score;
    }

    // Map application IDs and names
    for (const app of applications as any[]) {
      const cid = app.candidate?.id;
      if (cid && scoreMap.has(cid)) {
        scoreMap.get(cid)!.application_id = app.id;
        if (app.candidate?.name) scoreMap.get(cid)!.candidate_name = app.candidate.name;
      }
    }

    // Filter only candidates with at least one completed evaluation
    const candidatesWithScores = Array.from(scoreMap.values()).filter(
      c => c.cultural_score !== null || c.disc_score !== null || c.technical_score !== null
    );

    if (candidatesWithScores.length === 0) {
      return new Response(JSON.stringify({
        candidates: [],
        generated_at: new Date().toISOString(),
        job_title: job.title,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate composite score (cultural 50%, DISC 25%, technical 25%)
    const WEIGHTS = { cultural: 0.50, disc: 0.25, technical: 0.25 };

    const rankedCandidates = candidatesWithScores.map(c => {
      const scores: number[] = [];
      const weights: number[] = [];

      if (c.cultural_score !== null) { scores.push(c.cultural_score); weights.push(WEIGHTS.cultural); }
      if (c.disc_score !== null) { scores.push(c.disc_score); weights.push(WEIGHTS.disc); }
      if (c.technical_score !== null) { scores.push(c.technical_score); weights.push(WEIGHTS.technical); }

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const composite = totalWeight > 0
        ? Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight)
        : 0;

      // Calculate success probability from performance data
      let successProbability: number | null = null;
      if (performanceReviews.length > 0) {
        const avgPerformance = performanceReviews.reduce((sum: number, r: any) => sum + r.performance_score, 0) / performanceReviews.length;
        const retentionRate = performanceReviews.filter((r: any) => r.retention_status === 'active').length / performanceReviews.length;
        // Simple heuristic: composite score correlation with avg performance
        successProbability = Math.min(100, Math.round((composite / 100) * (avgPerformance / 10) * retentionRate * 100));
      }

      // Identify strengths
      const strengths: string[] = [];
      if (c.cultural_score !== null && c.cultural_score >= 80) strengths.push('Fit cultural forte');
      if (c.disc_score !== null && c.disc_score >= 80) strengths.push('DISC alinhado');
      if (c.technical_score !== null && c.technical_score >= 80) strengths.push('Técnico excelente');
      if (c.cultural_score !== null && c.disc_score !== null && c.technical_score !== null) strengths.push('Perfil completo');

      return {
        candidate_id: c.candidate_id,
        candidate_name: c.candidate_name,
        application_id: c.application_id,
        composite_score: composite,
        cultural_score: c.cultural_score,
        disc_score: c.disc_score,
        technical_score: c.technical_score,
        success_probability: successProbability,
        strengths,
        rank_justification: '', // Will be filled by AI
      };
    });

    // Sort by composite score descending
    rankedCandidates.sort((a, b) => b.composite_score - a.composite_score);

    // Generate AI justifications for top candidates if API key available
    if (lovableApiKey && rankedCandidates.length > 0) {
      const topCandidates = rankedCandidates.slice(0, 10);
      const icpContext = icp?.learned_patterns
        ? `\nPadrões aprendidos do ICP (baseados em ${icp.approved_candidates_count || 0} aprovados): ${JSON.stringify(icp.learned_patterns)}`
        : '';

      const prompt = `Você é um especialista em recrutamento. Analise o ranking abaixo de candidatos para a vaga "${job.title}" e gere uma justificativa CURTA (1-2 frases) para cada posição no ranking.${icpContext}

Candidatos (do melhor para o pior):
${topCandidates.map((c, i) => `${i + 1}. ${c.candidate_name} — Score: ${c.composite_score} (Cultural: ${c.cultural_score ?? 'N/A'}, DISC: ${c.disc_score ?? 'N/A'}, Técnico: ${c.technical_score ?? 'N/A'})${c.success_probability !== null ? ` | Prob. Sucesso: ${c.success_probability}%` : ''}`).join('\n')}

Responda APENAS com um JSON array de strings, uma justificativa por candidato na mesma ordem:
["justificativa do #1", "justificativa do #2", ...]`;

      try {
        const aiResponse = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'Responda apenas com JSON válido.' },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          const cleanedContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          const justifications: string[] = JSON.parse(cleanedContent);
          topCandidates.forEach((c, i) => {
            if (justifications[i]) c.rank_justification = justifications[i];
          });

          // Consume credits
          if (job.account_id) {
            await consumeAICredits({
              supabase,
              accountId: job.account_id,
              aiData,
              model: 'google/gemini-2.5-flash-lite',
              referenceId: job_id,
              referenceType: 'candidate_ranking',
              description: `Ranking de candidatos - ${job.title}`,
              userId: rateLimitResult.userId,
            });
          }
        }
      } catch (aiErr) {
        console.error('[generate-candidate-ranking] AI justification error:', aiErr);
        // Fallback: generate simple justifications
        topCandidates.forEach((c, i) => {
          c.rank_justification = `Posição #${i + 1} com score composto de ${c.composite_score}%. ${c.strengths.join(', ') || 'Avaliação parcial.'}`;
        });
      }
    } else {
      rankedCandidates.forEach((c, i) => {
        c.rank_justification = `Score composto: ${c.composite_score}%. ${c.strengths.join(', ') || ''}`;
      });
    }

    return new Response(JSON.stringify({
      candidates: rankedCandidates,
      generated_at: new Date().toISOString(),
      job_title: job.title,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[generate-candidate-ranking] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
