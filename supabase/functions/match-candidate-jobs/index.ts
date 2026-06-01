import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  candidate_id?: string;
  job_id?: string;
  account_id: string;
  threshold?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      candidate_id, 
      job_id, 
      account_id,
      threshold = 0.6,
      limit = 10
    }: MatchRequest = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'Missing account_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!candidate_id && !job_id) {
      return new Response(JSON.stringify({ error: 'Must provide either candidate_id or job_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match jobs for a candidate
    if (candidate_id) {
      console.log(`Finding matching jobs for candidate ${candidate_id}`);
      
      const { data: matches, error: matchError } = await supabaseClient
        .rpc('match_jobs_for_candidate', {
          p_candidate_id: candidate_id,
          p_account_id: account_id,
          match_threshold: threshold,
          match_count: limit,
        });

      if (matchError) {
        console.error('Match error:', matchError);
        throw new Error(`Match failed: ${matchError.message}`);
      }

      if (!matches || matches.length === 0) {
        return new Response(JSON.stringify({ 
          jobs: [],
          total: 0,
          message: 'No matching jobs found. Ensure candidate has an embedding.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch job details
      const jobIds = matches.map((m: { job_id: string }) => m.job_id);
      const { data: jobs, error: jobsError } = await supabaseClient
        .from('recruitment_jobs')
        .select(`
          id,
          title,
          department,
          location,
          employment_type,
          status,
          created_at
        `)
        .in('id', jobIds)
        .eq('status', 'open'); // Only show open jobs

      if (jobsError) {
        throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
      }

      // Merge with similarity scores
      const jobsWithScores = jobs?.map(job => {
        const matchData = matches.find((m: { job_id: string }) => m.job_id === job.id);
        return {
          ...job,
          similarity_score: matchData?.similarity || 0,
        };
      }).sort((a, b) => b.similarity_score - a.similarity_score) || [];

      return new Response(JSON.stringify({ 
        jobs: jobsWithScores,
        total: jobsWithScores.length,
        candidate_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match candidates for a job
    if (job_id) {
      console.log(`Finding matching candidates for job ${job_id}`);
      
      const { data: matches, error: matchError } = await supabaseClient
        .rpc('match_candidates_for_job', {
          p_job_id: job_id,
          p_account_id: account_id,
          match_threshold: threshold,
          match_count: limit,
        });

      if (matchError) {
        console.error('Match error:', matchError);
        throw new Error(`Match failed: ${matchError.message}`);
      }

      if (!matches || matches.length === 0) {
        return new Response(JSON.stringify({ 
          candidates: [],
          total: 0,
          message: 'No matching candidates found. Ensure job and candidates have embeddings.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch candidate details
      const candidateIds = matches.map((m: { candidate_id: string }) => m.candidate_id);
      const { data: candidates, error: candidatesError } = await supabaseClient
        .from('recruitment_candidates')
        .select(`
          id,
          name,
          email,
          phone,
          source,
          tags,
          created_at,
          recruitment_applications (
            id,
            job_id,
            stage,
            status
          )
        `)
        .in('id', candidateIds);

      if (candidatesError) {
        throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
      }

      // Merge with similarity scores and check if already applied
      const candidatesWithScores = candidates?.map(candidate => {
        const matchData = matches.find((m: { candidate_id: string }) => m.candidate_id === candidate.id);
        const hasApplied = candidate.recruitment_applications?.some(
          (app: { job_id: string }) => app.job_id === job_id
        );
        return {
          ...candidate,
          similarity_score: matchData?.similarity || 0,
          has_applied: hasApplied,
        };
      }).sort((a, b) => b.similarity_score - a.similarity_score) || [];

      return new Response(JSON.stringify({ 
        candidates: candidatesWithScores,
        total: candidatesWithScores.length,
        job_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in match-candidate-jobs:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
