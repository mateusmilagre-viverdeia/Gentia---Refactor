import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  isSystemStage?: boolean;
}

// System stages that are always present
const SYSTEM_STAGES_START: PipelineStage[] = [
  { id: 'applied', name: 'Aplicado', color: 'bg-blue-500', icon: 'Inbox', position: 0, isSystemStage: true },
];

const SYSTEM_STAGES_END: PipelineStage[] = [
  { id: 'hired', name: 'Contratado', color: 'bg-green-600', icon: 'UserCheck', position: 998, isSystemStage: true },
  { id: 'desqualificado', name: 'Desqualificado', color: 'bg-rose-600', icon: 'UserX', position: 999, isSystemStage: true },
];

// Default stages when no funnel is configured
// Follows: Aplicado → Fit Cultural → DISC → Fit Técnico → Avaliação Final → Referências → Proposta → Contratado → Desqualificado
const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'applied', name: 'Aplicado', color: 'bg-blue-500', icon: 'Inbox', position: 0, isSystemStage: true },
  { id: 'cultural', name: 'Fit Cultural', color: 'bg-purple-500', icon: 'Heart', position: 1 },
  { id: 'disc', name: 'Fit Comportamental (DISC)', color: 'bg-indigo-500', icon: 'Brain', position: 2 },
  { id: 'technical', name: 'Fit Técnico', color: 'bg-cyan-500', icon: 'Code', position: 3 },
  { id: 'evaluation', name: 'Avaliação Final', color: 'bg-amber-500', icon: 'ClipboardCheck', position: 4 },
  { id: 'references', name: 'Referências', color: 'bg-teal-500', icon: 'Users', position: 5 },
  { id: 'offer', name: 'Proposta', color: 'bg-emerald-500', icon: 'FileCheck', position: 6 },
  { id: 'hired', name: 'Contratado', color: 'bg-green-600', icon: 'UserCheck', position: 7, isSystemStage: true },
  { id: 'desqualificado', name: 'Desqualificado', color: 'bg-rose-600', icon: 'UserX', position: 8, isSystemStage: true },
];

// Color map for converting stored colors to Tailwind classes
const COLOR_MAP: Record<string, string> = {
  'blue': 'bg-blue-500',
  'purple': 'bg-purple-500',
  'amber': 'bg-amber-500',
  'orange': 'bg-orange-500',
  'cyan': 'bg-cyan-500',
  'green': 'bg-green-500',
  'emerald': 'bg-emerald-500',
  'red': 'bg-red-500',
  'pink': 'bg-pink-500',
  'indigo': 'bg-indigo-500',
  'teal': 'bg-teal-500',
  'yellow': 'bg-yellow-500',
};

function getColorClass(color: string | null, position: number): string {
  if (color && COLOR_MAP[color]) {
    return COLOR_MAP[color];
  }
  // Default colors based on position
  const defaultColors = ['bg-purple-500', 'bg-amber-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-pink-500', 'bg-indigo-500'];
  return defaultColors[position % defaultColors.length];
}

/**
 * Hook to fetch pipeline stages for a specific job
 * If the job has a funnel_id, fetch stages from that funnel
 * Otherwise, return default stages
 */
export function useJobPipeline(jobId?: string) {

  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job-funnel', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('recruitment_jobs')
        .select('id, funnel_id')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const { data: funnelStages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['funnel-stages', job?.funnel_id],
    queryFn: async () => {
      if (!job?.funnel_id) return [];
      const { data, error } = await supabase
        .from('hiring_funnel_stages')
        .select('*')
        .eq('funnel_id', job.funnel_id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!job?.funnel_id,
  });

  // Build final pipeline stages
  const stages: PipelineStage[] = (() => {
    // If no funnel configured, return default stages
    if (!job?.funnel_id || funnelStages.length === 0) {
      return DEFAULT_PIPELINE_STAGES;
    }

    // Map funnel stages to pipeline stages
    const customStages: PipelineStage[] = funnelStages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      color: getColorClass(stage.color, index),
      icon: stage.icon,
      position: stage.position,
    }));

    // Combine: Applied + Custom Stages + Hired/Rejected
    return [
      ...SYSTEM_STAGES_START,
      ...customStages,
      ...SYSTEM_STAGES_END,
    ];
  })();

  return {
    stages,
    isLoading: isLoadingJob || isLoadingStages,
    hasFunnel: !!job?.funnel_id,
    funnelId: job?.funnel_id,
  };
}

/**
 * Hook to fetch the default funnel for the current organization
 */
export function useDefaultFunnel() {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ['default-funnel', currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return null;
      const { data, error } = await supabase
        .from('hiring_funnels')
        .select('id, name, is_default')
        .eq('account_id', currentAccount.id)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });
}

/**
 * Hook to fetch all funnels for the current organization (for selectors)
 */
export function useFunnelOptions() {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ['funnel-options', currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from('hiring_funnels')
        .select('id, name, is_default')
        .eq('account_id', currentAccount.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAccount?.id,
  });
}

/**
 * Helper to map old hardcoded status to stage_id
 */
export function mapStatusToStageId(status: string, stages: PipelineStage[]): string | null {
  // For system stages, return the status as-is
  if (['applied', 'hired', 'rejected'].includes(status)) {
    return status;
  }

  // Try to find a stage with matching name
  const normalizedStatus = status.toLowerCase();
  const matchingStage = stages.find(s => 
    s.name.toLowerCase() === normalizedStatus ||
    s.id === status
  );

  return matchingStage?.id || null;
}

/**
 * Helper to get stage name from status/stage_id
 */
export function getStageName(statusOrStageId: string, stages: PipelineStage[]): string {
  const stage = stages.find(s => s.id === statusOrStageId);
  if (stage) return stage.name;

  // Fallback for old status values
  const statusMap: Record<string, string> = {
    applied: 'Aplicado',
    screening: 'Triagem',
    interview: 'Entrevista',
    evaluation: 'Avaliação',
    offer: 'Proposta',
    hired: 'Contratado',
    rejected: 'Rejeitado',
  };

  return statusMap[statusOrStageId] || statusOrStageId;
}
