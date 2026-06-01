import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Type for transcript entries with timestamps
export interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  text: string;
  isAgent?: boolean;
  startSeconds?: number;
  endSeconds?: number;
  isEstimated?: boolean;
}

// Type for criterion evaluation from culture_interview_criteria_evaluations
export interface CriterionEvaluation {
  id: string;
  name: string;
  description: string;
  score: number; // 0.0 to 100.0 (percentage)
  passed: boolean;
  weight: 'minor' | 'moderate' | 'important' | 'very_important' | 'critical';
  weightMultiplier: number;
  impactPercentage: number;
  minThreshold: number; // 0.0 to 100.0 (percentage)
  assessment: string;
  questions: {
    number: number;
    question: string;
    answer?: string;
    evidenceQuotes?: string[];
  }[];
  // V2 transparency fields (optional — may be null on legacy rows)
  evidenceCount?: number | null;
  redFlags?: string[] | null;
  confidenceLevel?: 'low' | 'medium' | 'high' | null;
  genericResponseDetected?: boolean;
}

export interface EvaluationMeta {
  legacyScore: number | null;
  legacyRecommendation: string | null;
  evidenceFloorPassed: boolean | null;
  redFlagsCount: number | null;
  avgConfidenceLevel: 'low' | 'medium' | 'high' | null;
  auditTrail: any | null; // jsonb shape from edge function
}

// V2 recommendation values emitted by culture-interview-complete
export type CultureRecommendation =
  | 'RECOMENDADO'
  | 'RECOMENDADO_COM_RESSALVAS'
  | 'NAO_RECOMENDADO'
  | null;

// Full interview details interface
export interface InterviewDetails {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  jobTitle: string;
  jobId: string;
  agentName: string;
  agentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  // 'approved_with_caveats' = V2 RECOMENDADO_COM_RESSALVAS (advances with yellow badge)
  evaluationStatus: 'approved' | 'rejected' | 'pending' | 'approved_with_caveats';
  recommendation: CultureRecommendation;
  overallScore: number;
  duration: number;
  sentAt: Date;
  startedAt: Date;
  completedAt: Date;
  updatedAt: Date;
  transcript: TranscriptEntry[];
  criteria: CriterionEvaluation[];
  matchingAnalysis: string | null;
  audioUrl?: string;
  evaluationMeta?: EvaluationMeta;
}

// Format seconds to MM:SS
function formatSecondsToTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Parse transcript from culture_interview_responses table
function parseTranscriptFromResponses(responses: any[], startedAt?: string): TranscriptEntry[] {
  if (!responses || responses.length === 0) return [];
  
  const transcript: TranscriptEntry[] = [];
  
  // Sort by question_index first, then by start_seconds if available
  const sortedResponses = [...responses].sort((a, b) => {
    if (a.start_seconds != null && b.start_seconds != null) {
      return a.start_seconds - b.start_seconds;
    }
    return (a.question_index || 0) - (b.question_index || 0);
  });
  
  for (const response of sortedResponses) {
    const hasRealTimestamps = response.start_seconds != null;
    
    let questionTimestamp: string;
    let responseTimestamp: string;
    let questionStartSeconds: number | undefined;
    let responseStartSeconds: number | undefined;
    let responseEndSeconds: number | undefined;
    
    if (hasRealTimestamps) {
      questionStartSeconds = response.start_seconds > 5 ? response.start_seconds - 5 : 0;
      responseStartSeconds = response.start_seconds;
      responseEndSeconds = response.end_seconds;
      
      questionTimestamp = formatSecondsToTimestamp(questionStartSeconds);
      responseTimestamp = formatSecondsToTimestamp(responseStartSeconds);
    } else {
      const questionNumber = response.question_index || 0;
      const estimatedMinutes = questionNumber * 2;
      questionTimestamp = formatSecondsToTimestamp(estimatedMinutes * 60);
      responseTimestamp = formatSecondsToTimestamp((estimatedMinutes + 1) * 60);
    }
    
    // Helper: avoid pushing an entry if it duplicates the previous AI/candidate line.
    // The recorder sometimes saves the same ai_question_spoken/ai_comment across
    // consecutive responses (when the AI repeats after an interruption).
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const pushIfNotDuplicate = (entry: TranscriptEntry) => {
      const last = transcript[transcript.length - 1];
      if (last && last.isAgent === entry.isAgent && norm(last.text) === norm(entry.text)) {
        return; // skip duplicate consecutive line from same speaker
      }
      transcript.push(entry);
    };

    const questionText = response.ai_question_spoken || response.question_text;
    if (questionText) {
      pushIfNotDuplicate({
        timestamp: questionTimestamp,
        speaker: 'Agente IA',
        text: questionText,
        isAgent: true,
        startSeconds: questionStartSeconds,
      });
    }

    if (response.candidate_response) {
      pushIfNotDuplicate({
        timestamp: responseTimestamp,
        speaker: 'Candidato',
        text: response.candidate_response,
        isAgent: false,
        startSeconds: responseStartSeconds,
        endSeconds: responseEndSeconds,
      });
    }

    if (response.ai_comment) {
      const commentTimestamp = responseEndSeconds
        ? formatSecondsToTimestamp(responseEndSeconds + 2)
        : responseTimestamp;
      pushIfNotDuplicate({
        timestamp: commentTimestamp,
        speaker: 'Agente IA',
        text: response.ai_comment,
        isAgent: true,
        startSeconds: responseEndSeconds ? responseEndSeconds + 2 : undefined,
      });
    }
  }
  
  return transcript;
}

// Parse transcript from partial_transcript string (fallback)
// Distributes timestamps proportionally across the actual interview duration
// to avoid showing fake times that exceed the audio length.
function parsePartialTranscript(partialTranscript: string, totalDurationSeconds?: number): TranscriptEntry[] {
  if (!partialTranscript || !partialTranscript.trim()) return [];

  // Deduplicate consecutive identical lines (the recorder sometimes duplicates)
  const rawLines = partialTranscript.split('\n').map(l => l.trim()).filter(Boolean);
  const lines: string[] = [];
  for (const line of rawLines) {
    if (lines.length === 0 || lines[lines.length - 1] !== line) {
      lines.push(line);
    }
  }
  if (lines.length === 0) return [];

  const transcript: TranscriptEntry[] = [];
  const safeDuration = totalDurationSeconds && totalDurationSeconds > 0 ? totalDurationSeconds : null;
  const step = safeDuration ? safeDuration / lines.length : null;

  lines.forEach((line, idx) => {
    const isAgent = line.startsWith('Entrevistadora:') || line.startsWith('Agente:') || line.startsWith('AI:');
    const isCandidate = line.startsWith('Candidato:') || line.startsWith('Candidate:');
    const text = (isAgent || isCandidate)
      ? line.replace(/^(Entrevistadora|Agente|AI|Candidato|Candidate):\s*/, '')
      : line;
    if (!text.trim()) return;

    if (step != null) {
      const approxStart = Math.min(Math.round(step * idx), safeDuration! - 1);
      transcript.push({
        timestamp: formatSecondsToTimestamp(approxStart),
        speaker: isCandidate ? 'Candidato' : 'Agente IA',
        text: text.trim(),
        isAgent: !isCandidate,
        startSeconds: approxStart,
        isEstimated: true,
      });
    } else {
      // No duration available — show no timestamp at all
      transcript.push({
        timestamp: '',
        speaker: isCandidate ? 'Candidato' : 'Agente IA',
        text: text.trim(),
        isAgent: !isCandidate,
        isEstimated: true,
      });
    }
  });

  return transcript;
}


const IMPORTANCE_MULTIPLIERS: Record<string, number> = {
  minor: 1,
  moderate: 2,
  important: 3,
  very_important: 4,
  critical: 5,
};

// Parse criteria from culture_interview_criteria_evaluations table (new approach)
function parseCriteriaFromEvaluations(evaluations: any[]): CriterionEvaluation[] {
  if (!evaluations || evaluations.length === 0) return [];
  
  return evaluations.map((ev) => {
    const questionsUsed = Array.isArray(ev.questions_used) ? ev.questions_used : [];

    return {
      id: ev.criterion_id || ev.id,
      name: ev.criterion_name,
      description: ev.justification || '',
      score: ev.score || 0,
      passed: ev.passed_minimum || false,
      weight: (ev.importance as CriterionEvaluation['weight']) || 'moderate',
      weightMultiplier: ev.weight_multiplier || IMPORTANCE_MULTIPLIERS[ev.importance] || 1,
      impactPercentage: ev.impact_percentage || 0,
      minThreshold: ev.minimum_score_percent || 50,
      assessment: ev.justification || '',
      questions: questionsUsed.map((q: any, idx: number) => {
        // Handle both object structures (new and transitional)
        const evidenceQuotes = Array.isArray(q.evidenceQuotes) 
          ? q.evidenceQuotes 
          : Array.isArray(q.evidence_quotes) 
            ? q.evidence_quotes 
            : [];

        return {
          number: q.number ?? idx,
          question: q.question || '',
          answer: q.answer || undefined,
          evidenceQuotes: evidenceQuotes.filter((s: any) => typeof s === 'string' && s.trim()),
        };
      }),
      evidenceCount: ev.evidence_count ?? null,
      redFlags: Array.isArray(ev.red_flags) ? ev.red_flags : (ev.red_flags ? [String(ev.red_flags)] : []),
      confidenceLevel: ev.confidence_level ?? null,
      genericResponseDetected: !!ev.generic_response_detected,
    };
  });
}

// Fallback: Parse criteria from responses (legacy approach)
function parseCriteriaFromResponses(responses: any[]): CriterionEvaluation[] {
  if (!responses || responses.length === 0) return [];
  
  return responses.map((response, index) => ({
    id: response.id,
    name: response.value_label || `Critério ${index + 1}`,
    description: response.question_text || '',
    score: response.ai_comment ? 70 : 50,
    passed: !!response.candidate_response,
    weight: 'moderate' as const,
    weightMultiplier: 1,
    impactPercentage: 100 / responses.length,
    minThreshold: 60,
    assessment: response.ai_comment || '',
    questions: [{
      number: response.question_index,
      question: response.question_text,
      answer: response.candidate_response || undefined,
    }],
  }));
}

async function fetchInterviewDetails(interviewId: string): Promise<InterviewDetails | null> {
  if (!interviewId) return null;
  
  // Fetch session with candidate_profile
  const { data: session, error: sessionError } = await (supabase as any)
    .from("culture_interview_sessions")
    .select(`
      *,
      candidate_profile:candidate_profiles(id, full_name, user_id)
    `)
    .eq("id", interviewId)
    .maybeSingle();
  
  if (sessionError || !session) {
    console.error("Error fetching interview session:", sessionError);
    return null;
  }
  
  // Fetch job title
  let jobTitle = "Vaga";
  if (session.job_id) {
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("title")
      .eq("id", session.job_id)
      .maybeSingle();
    jobTitle = job?.title || "Vaga";
  }
  
  // Fetch agent name
  let agentName = "Agente IA";
  if (session.agent_id) {
    const { data: agent } = await supabase
      .from("recruitment_agents")
      .select("name")
      .eq("id", session.agent_id)
      .maybeSingle();
    agentName = agent?.name || "Agente IA";
  }
  
  // Fetch candidate info
  let candidateEmail = "";
  let candidateName = (session.candidate_profile as any)?.full_name || "Candidato";
  
  if (session.candidate_id) {
    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("email, first_name, last_name")
      .eq("id", session.candidate_id)
      .maybeSingle();
    candidateEmail = candidate?.email || "";
    if (!candidateName || candidateName === "Candidato") {
      const fullName = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ");
      candidateName = fullName || "Candidato";
    }
  }
  
  // Fetch responses for transcript
  const { data: responses } = await (supabase as any)
    .from("culture_interview_responses")
    .select("*")
    .eq("session_id", interviewId)
    .order("question_index", { ascending: true });
  
  // Fetch criteria evaluations from the NEW table
  const { data: criteriaEvaluations } = await (supabase as any)
    .from("culture_interview_criteria_evaluations")
    .select("*")
    .eq("session_id", interviewId)
    .order("created_at", { ascending: true });
  
  // Generate fresh signed URL for audio playback (stored audio_url may be expired)
  let resolvedAudioUrl: string | undefined = session.audio_url || undefined;
  if (session.audio_storage_path) {
    const { data: signed } = await supabase.storage
      .from("culture-interview-audio")
      .createSignedUrl(session.audio_storage_path, 60 * 60);
    if (signed?.signedUrl) {
      resolvedAudioUrl = signed.signedUrl;
    }
  }

  // Compute interview duration up front so the fallback can distribute timestamps
  let computedDuration = session.duration_seconds || 0;
  if (session.started_at && session.completed_at) {
    const startTime = new Date(session.started_at).getTime();
    const endTime = new Date(session.completed_at).getTime();
    const elapsed = Math.round((endTime - startTime) / 1000);
    if (elapsed > 30 && elapsed < 7200) computedDuration = elapsed;
  }

  // Parse transcript from responses
  let transcript = parseTranscriptFromResponses(responses || [], session.started_at);

  // Fallback: if no structured responses, try partial_transcript
  if (transcript.length === 0 && session.partial_transcript) {
    transcript = parsePartialTranscript(session.partial_transcript, computedDuration);
  }
  
  // Parse criteria from evaluations table (preferred) or responses (fallback)
  let criteria: CriterionEvaluation[];
  if (criteriaEvaluations && criteriaEvaluations.length > 0) {
    criteria = parseCriteriaFromEvaluations(criteriaEvaluations);
  } else {
    criteria = parseCriteriaFromResponses(responses || []);
  }
  
  // V2 source of truth: read recommendation field (gravado por culture-interview-complete)
  // Fallback to legacy score-based mapping if recommendation is null (legacy rows pre-V2)
  const matchingScore = session.matching_score || 0;
  const recommendation = (session.recommendation as CultureRecommendation) || null;

  let evaluationStatus: InterviewDetails['evaluationStatus'] = 'pending';
  if (session.status === 'completed') {
    if (recommendation === 'RECOMENDADO') {
      evaluationStatus = 'approved';
    } else if (recommendation === 'RECOMENDADO_COM_RESSALVAS') {
      evaluationStatus = 'approved_with_caveats';
    } else if (recommendation === 'NAO_RECOMENDADO') {
      evaluationStatus = 'rejected';
    } else {
      // Legacy fallback when no recommendation persisted
      evaluationStatus = matchingScore >= 75 ? 'approved' : matchingScore >= 50 ? 'pending' : 'rejected';
    }
  }

  const duration = computedDuration;

  return {
    id: session.id,
    candidateName,
    candidateEmail,
    candidateId: session.candidate_id || "",
    jobTitle,
    jobId: session.job_id,
    agentName,
    agentId: session.agent_id || "",
    status: session.status as any,
    evaluationStatus,
    recommendation,
    overallScore: matchingScore,
    duration,
    sentAt: new Date(session.email_sent_at || session.created_at),
    startedAt: new Date(session.started_at || session.created_at),
    completedAt: new Date(session.completed_at || session.created_at),
    updatedAt: new Date(session.updated_at),
    transcript,
    criteria,
    matchingAnalysis: session.matching_analysis,
    audioUrl: resolvedAudioUrl,
    evaluationMeta: {
      legacyScore: session.legacy_score ?? null,
      legacyRecommendation: session.legacy_recommendation ?? null,
      evidenceFloorPassed: session.evidence_floor_passed ?? null,
      redFlagsCount: session.red_flags_count ?? null,
      avgConfidenceLevel: session.avg_confidence_level ?? null,
      auditTrail: session.evaluation_audit_trail ?? null,
    },
  };
}

export function useInterviewDetails(interviewId: string | null) {
  return useQuery({
    queryKey: ["interview-details", interviewId],
    queryFn: () => fetchInterviewDetails(interviewId!),
    enabled: !!interviewId,
    staleTime: 30000,
  });
}
