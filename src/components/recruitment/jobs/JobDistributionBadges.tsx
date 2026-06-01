import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Linkedin, Rss } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JobDistributionBadgesProps {
  jobId: string;
  accountId?: string;
  isPublic?: boolean;
}

interface State {
  linkedin: boolean;
  indeed: boolean;
  googleJobs: boolean;
}

/**
 * Small inline badges showing which distribution channels are active for a job.
 * Google Jobs is always on for public jobs; LinkedIn from job_publishing_logs;
 * Indeed from indeed_feed_config.is_active for the account.
 */
export function JobDistributionBadges({ jobId, accountId, isPublic = true }: JobDistributionBadgesProps) {
  const [state, setState] = useState<State>({ linkedin: false, indeed: false, googleJobs: isPublic });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logsRes = await supabase
        .from('job_distribution_logs')
        .select('channel_name, status')
        .eq('job_id', jobId)
        .in('status', ['active', 'pending']);
      let indeedActive = false;
      if (accountId) {
        const cfgRes = await supabase
          .from('indeed_feed_config')
          .select('is_active')
          .eq('account_id', accountId)
          .maybeSingle();
        indeedActive = Boolean((cfgRes.data as any)?.is_active);
      }
      if (cancelled) return;
      const logs = (logsRes.data ?? []) as any[];
      const linkedin = logs.some((l) => l.channel_name === 'linkedin');
      setState({ linkedin, indeed: indeedActive, googleJobs: isPublic });
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, accountId, isPublic]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {state.googleJobs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Google Jobs</TooltipContent>
          </Tooltip>
        )}
        {state.linkedin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
            </TooltipTrigger>
            <TooltipContent>LinkedIn</TooltipContent>
          </Tooltip>
        )}
        {state.indeed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Rss className="h-3.5 w-3.5 text-[#2164F4]" />
            </TooltipTrigger>
            <TooltipContent>Indeed (feed XML)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
