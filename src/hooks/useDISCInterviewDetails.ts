import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DISCDimension } from '@/types/disc.types';

export interface DISCInterviewDetails {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobId: string;
  status: string;
  completedAt: Date | null;
  startedAt: Date | null;
  createdAt: Date;
  // Scores – null when result not yet available
  dScore: number | null;
  iScore: number | null;
  sScore: number | null;
  cScore: number | null;
  dNormalized: number | null;
  iNormalized: number | null;
  sNormalized: number | null;
  cNormalized: number | null;
  primaryProfile: DISCDimension | null;
  secondaryProfile: DISCDimension | null;
  intensity: string | null;
  isBalanced: boolean;
  matchScore: number | null;
  hasResult: boolean;
}

async function fetchDISCInterviewDetails(sessionId: string): Promise<DISCInterviewDetails | null> {
  // Fetch session without nested result (to avoid RLS issues)
  const { data: session, error } = await supabase
    .from('candidate_disc_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    console.error('Error fetching DISC session:', error);
    return null;
  }

  // Fetch full results via RPC to bypass nested RLS
  const { data: fullResults } = await supabase.rpc('get_disc_full_results', {
    p_session_ids: [sessionId]
  });
  const result = fullResults?.[0] ?? null;

  // Fetch candidate info and job info in parallel
  const [candidateRes, profileRes, jobRes] = await Promise.all([
    session.candidate_id
      ? supabase.from('recruitment_candidates').select('id, first_name, last_name, email').eq('id', session.candidate_id).maybeSingle()
      : Promise.resolve({ data: null }),
    session.candidate_profile_id
      ? supabase.from('candidate_profiles').select('id, full_name, user_id').eq('id', session.candidate_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('recruitment_jobs').select('id, title').eq('id', session.job_id).maybeSingle(),
  ]);

  const candidate = candidateRes.data as any;
  const profile = profileRes.data as any;
  const job = jobRes.data as any;

  // Get email from profile's user if available
  let email = candidate?.email || '';
  if (profile?.user_id && !email) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profile.user_id)
      .maybeSingle();
    email = userProfile?.email || '';
  }

  const candidateName = profile?.full_name || 
    (candidate ? `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() : 'Candidato');

  const hasResult = !!result;

  return {
    id: session.id,
    candidateName,
    candidateEmail: email,
    jobTitle: job?.title || 'Vaga',
    jobId: session.job_id,
    status: session.status,
    completedAt: session.completed_at ? new Date(session.completed_at) : null,
    startedAt: session.started_at ? new Date(session.started_at) : null,
    createdAt: new Date(session.created_at),
    hasResult,
    dScore: result?.d_score ?? null,
    iScore: result?.i_score ?? null,
    sScore: result?.s_score ?? null,
    cScore: result?.c_score ?? null,
    dNormalized: result?.d_normalized ?? null,
    iNormalized: result?.i_normalized ?? null,
    sNormalized: result?.s_normalized ?? null,
    cNormalized: result?.c_normalized ?? null,
    primaryProfile: hasResult ? (result.primary_profile as DISCDimension) : null,
    secondaryProfile: hasResult ? (result.secondary_profile as DISCDimension | null) : null,
    intensity: result?.intensity ?? null,
    isBalanced: result?.is_balanced ?? false,
    matchScore: result?.match_score ?? null,
  };
}

export function useDISCInterviewDetails(sessionId: string | null) {
  return useQuery({
    queryKey: ['disc-interview-details', sessionId],
    queryFn: () => fetchDISCInterviewDetails(sessionId!),
    enabled: !!sessionId,
  });
}
