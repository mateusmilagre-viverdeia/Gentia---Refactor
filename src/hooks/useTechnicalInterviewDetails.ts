import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TechnicalSkillEvaluation {
  skill: string;
  skillType: 'required' | 'desired';
  score: number;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  justification: string;
  evidence: string[];
  maxLevelReached?: number | null;
  maxLevelPassed?: number | null;
  ceilingDetected?: boolean | null;
  ceilingSignal?: string | null;
  seniorityAssessed?: 'junior' | 'pleno' | 'senior' | 'specialist' | null;
  evidenceCount?: number | null;
  scenarioHandled?: boolean | null;
  keywordCoverage?: number | null;
}

export interface TechnicalInterviewDetails {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  jobTitle: string;
  jobId: string;
  agentName: string;
  agentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  recommendation: 'recommended' | 'conditional' | 'not_recommended' | null;
  duration: number;
  startedAt: Date;
  completedAt: Date;
  overallScore: number;
  evaluationSummary: string;
  skillScores: Record<string, number>;
  skillLevels: Record<string, string>;
  strengths: string[];
  gaps: string[];
  transcript: string;
  audioUrl: string | null;
  responses: TechnicalSkillEvaluation[];
  jobContext: {
    title: string;
    mission: string;
    requiredSkills: string[];
    desiredSkills: string[];
  } | null;
  isPartial: boolean;
  completedNaturally: boolean | null;
  abandonedReason: string | null;
  audioStatus: string | null;
  evaluationVersion?: string | null;
  evaluationAuditTrail?: any | null;
  seniorityTarget?: 'junior' | 'pleno' | 'senior' | 'specialist' | null;
}

async function fetchTechnicalInterviewDetails(sessionId: string): Promise<TechnicalInterviewDetails | null> {
  // Fetch session with related data
  const { data: session, error } = await supabase
    .from('technical_interview_sessions')
    .select(`
      *,
      candidate:recruitment_candidates(id, first_name, last_name, email),
      job:recruitment_jobs(id, title),
      agent:recruitment_agents(id, name)
    `)
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    console.error('Error fetching technical interview:', error);
    return null;
  }

  // Fetch responses and candidate profile in parallel
  const [responsesRes, profileRes] = await Promise.all([
    supabase
      .from('technical_interview_responses')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_index', { ascending: true })
      .order('created_at', { ascending: true }),
    (session as any).candidate_profile_id
      ? supabase.from('candidate_profiles').select('id, full_name, user_id').eq('id', (session as any).candidate_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const responses = responsesRes.data;
  const profile = profileRes.data as any;

  // Parse skill evaluations from responses
  const skillEvaluations: TechnicalSkillEvaluation[] = (responses || []).map((r: any) => ({
    skill: r.skill_name,
    skillType: r.skill_type || 'required',
    score: r.score || 0,
    level: getLevelFromScore(r.score || 0),
    justification: r.ai_analysis || '',
    evidence: r.candidate_response ? [r.candidate_response] : [],
    maxLevelReached: r.max_level_reached ?? null,
    maxLevelPassed: r.max_level_passed ?? null,
    ceilingDetected: r.ceiling_detected ?? null,
    ceilingSignal: r.ceiling_signal ?? null,
    seniorityAssessed: r.seniority_assessed ?? null,
    evidenceCount: r.evidence_count ?? null,
    scenarioHandled: r.scenario_handled ?? null,
    keywordCoverage: r.keyword_coverage ?? null,
  }));

  // Get candidate data - handle both JSON and relation formats
  const candidateData = session.candidate as any;
  const jobData = session.job as any;
  const agentData = session.agent as any;
  const jobContext = session.job_description_context as any;

  const candidateName = profile?.full_name ||
    (candidateData ? `${candidateData.first_name || ''} ${candidateData.last_name || ''}`.trim() : '') ||
    'Candidato';

  // Generate fresh signed URL for audio playback (stored audio_url may be expired)
  let resolvedAudioUrl: string | null = session.audio_url ?? null;
  const storagePath = (session as any).audio_storage_path as string | null | undefined;
  if (storagePath) {
    const { data: signed } = await supabase.storage
      .from('technical-interview-audio')
      .createSignedUrl(storagePath, 60 * 60);
    if (signed?.signedUrl) {
      resolvedAudioUrl = signed.signedUrl;
    }
  }

  return {
    id: session.id,
    candidateName,
    candidateEmail: candidateData?.email || '',
    candidateId: session.candidate_id || '',
    jobTitle: jobData?.title || jobContext?.title || 'Vaga',
    jobId: session.job_id,
    agentName: agentData?.name || 'Agente',
    agentId: session.agent_id || '',
    status: session.status as any,
    recommendation: session.recommendation as any,
    duration: session.duration_seconds || 0,
    startedAt: new Date(session.started_at || session.created_at),
    completedAt: new Date(session.completed_at || session.updated_at),
    overallScore: session.overall_score || 0,
    evaluationSummary: session.evaluation_summary || '',
    skillScores: (session.skill_scores as Record<string, number>) || {},
    skillLevels: (session.skill_levels as Record<string, string>) || {},
    strengths: (session.strengths as string[]) || [],
    gaps: (session.gaps as string[]) || [],
    transcript: session.transcript || '',
    audioUrl: resolvedAudioUrl,
    responses: skillEvaluations,
    jobContext: jobContext ? {
      title: jobContext.title || '',
      mission: jobContext.mission || '',
      requiredSkills: jobContext.requiredSkills || [],
      desiredSkills: jobContext.desiredSkills || [],
    } : null,
    isPartial: (session as any).is_partial_evaluation === true,
    completedNaturally: (session as any).completed_naturally ?? null,
    abandonedReason: (session as any).abandoned_reason ?? null,
    audioStatus: (session as any).audio_status ?? null,
    evaluationVersion: (session as any).evaluation_version ?? null,
    evaluationAuditTrail: (session as any).evaluation_audit_trail ?? null,
    seniorityTarget: (session as any).seniority_target ?? null,
  };
}

function getLevelFromScore(score: number): 'basic' | 'intermediate' | 'advanced' | 'expert' {
  if (score >= 90) return 'expert';
  if (score >= 70) return 'advanced';
  if (score >= 40) return 'intermediate';
  return 'basic';
}

export function useTechnicalInterviewDetails(sessionId: string | null) {
  return useQuery({
    queryKey: ['technical-interview-details', sessionId],
    queryFn: () => fetchTechnicalInterviewDetails(sessionId!),
    enabled: !!sessionId,
  });
}
