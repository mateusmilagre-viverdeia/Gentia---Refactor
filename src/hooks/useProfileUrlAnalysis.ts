import { useCallback, useState } from 'react';
import { apifyApi, type LinkedInProfile, type InstagramProfileExtended, type SocialAnalysisResult } from '@/lib/api/apify';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AnalysisStage = 'idle' | 'scraping' | 'analyzing' | 'done' | 'error';
export type ProfileSource = 'linkedin' | 'instagram';

export interface ProfileAnalysisResult {
  source: ProfileSource;
  profileUrl: string;
  profile: LinkedInProfile | InstagramProfileExtended;
  posts: string[];
  analysis: SocialAnalysisResult;
  jobId?: string;
  jobTitle?: string;
  overallScore: number;
}

function computeOverallScore(a: SocialAnalysisResult, hasJob: boolean): number {
  const tech = a.tech_fit?.score ?? 0;
  const priority = a.hunting_priority ?? 0;
  // Behavioral confidence-weighted score (0-100)
  const discDom = Math.max(a.inferred_disc.d, a.inferred_disc.i, a.inferred_disc.s, a.inferred_disc.c);
  const behavioral = Math.round((discDom * (a.disc_confidence ?? 0.5)));
  if (hasJob) {
    return Math.round(tech * 0.4 + behavioral * 0.35 + priority * 0.25);
  }
  return Math.round(behavioral * 0.6 + priority * 0.4);
}

export function useProfileUrlAnalysis() {
  const [stage, setStage] = useState<AnalysisStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProfileAnalysisResult | null>(null);

  const reset = useCallback(() => {
    setStage('idle');
    setError(null);
    setResult(null);
  }, []);

  const analyze = useCallback(async (url: string, jobId?: string) => {
    setError(null);
    setResult(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Informe uma URL válida.');
      setStage('error');
      return;
    }
    const isLi = apifyApi.isLinkedInUrl(trimmed);
    const isIg = apifyApi.isInstagramUrl(trimmed);
    if (!isLi && !isIg) {
      setError('URL não reconhecida. Use um link do LinkedIn ou Instagram.');
      setStage('error');
      return;
    }

    try {
      setStage('scraping');

      let posts: string[] = [];
      let profile: any = null;
      let source: ProfileSource = isLi ? 'linkedin' : 'instagram';

      if (isLi) {
        const res = await apifyApi.scrapeLinkedIn(trimmed, true);
        if (!res.success || !res.data) throw new Error(res.error || 'Falha ao extrair perfil do LinkedIn.');
        profile = res.data;
        posts = (res.data.posts || []).map((p) => p.text).filter(Boolean);
      } else {
        const res = await apifyApi.scrapeInstagram(trimmed, 15);
        if (!res.success || !res.data) {
          if (res.isPrivate) throw new Error('Perfil do Instagram é privado.');
          throw new Error(res.error || 'Falha ao extrair perfil do Instagram.');
        }
        profile = res.data;
        posts = res.data.postCaptions || [];
      }

      // Resolve ICP for the job (if any)
      let icpProfile: any = undefined;
      let jobTitle: string | undefined;
      if (jobId) {
        const [{ data: icp }, { data: job }] = await Promise.all([
          supabase.from('job_icps').select('*').eq('job_id', jobId).eq('is_active', true).maybeSingle(),
          supabase.from('recruitment_jobs').select('title').eq('id', jobId).maybeSingle(),
        ]);
        icpProfile = icp || undefined;
        jobTitle = job?.title;
      }

      setStage('analyzing');
      const analysis = await apifyApi.analyzeSocialProfile(profile, posts, icpProfile);
      if (!analysis.success || !analysis.data) {
        throw new Error(analysis.error || 'Falha ao analisar o perfil.');
      }

      const overall = computeOverallScore(analysis.data, !!icpProfile);

      setResult({
        source,
        profileUrl: trimmed,
        profile,
        posts,
        analysis: analysis.data,
        jobId,
        jobTitle,
        overallScore: overall,
      });
      setStage('done');
    } catch (e: any) {
      console.error('[useProfileUrlAnalysis]', e);
      const msg = e?.message || 'Erro inesperado ao analisar o perfil.';
      setError(msg);
      setStage('error');
      toast.error(msg);
    }
  }, []);

  return { stage, error, result, analyze, reset };
}
