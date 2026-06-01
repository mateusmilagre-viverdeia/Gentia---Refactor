import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DISCDimension } from '@/types/disc.types';

export interface JobDISCProfile {
  id: string;
  job_id: string;
  primary_profile: DISCDimension;
  secondary_profile: DISCDimension | null;
  min_match_score: number;
  weight_d: number;
  weight_i: number;
  weight_s: number;
  weight_c: number;
  // Advanced mode fields
  use_advanced_mode: boolean;
  target_d: number;
  target_i: number;
  target_s: number;
  target_c: number;
  tolerance: number;
  eliminator_d: number | null;
  eliminator_i: number | null;
  eliminator_s: number | null;
  eliminator_c: number | null;
  created_at: string;
  updated_at: string;
}

export interface JobDISCProfileInput {
  job_id: string;
  primary_profile: DISCDimension;
  secondary_profile?: DISCDimension | null;
  min_match_score?: number;
  weight_d?: number;
  weight_i?: number;
  weight_s?: number;
  weight_c?: number;
  // Advanced mode fields
  use_advanced_mode?: boolean;
  target_d?: number;
  target_i?: number;
  target_s?: number;
  target_c?: number;
  tolerance?: number;
  eliminator_d?: number | null;
  eliminator_i?: number | null;
  eliminator_s?: number | null;
  eliminator_c?: number | null;
}

export function useJobDISCProfile(jobId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch profile for a job
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['job-disc-profile', jobId],
    queryFn: async (): Promise<JobDISCProfile | null> => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from('recruitment_disc_profiles')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (error) throw error;
      return data as JobDISCProfile | null;
    },
    enabled: !!jobId,
  });

  // Create or update profile
  const saveProfile = useMutation({
    mutationFn: async (input: JobDISCProfileInput): Promise<JobDISCProfile> => {
      const profileData = {
        job_id: input.job_id,
        primary_profile: input.primary_profile,
        secondary_profile: input.secondary_profile || null,
        min_match_score: input.min_match_score ?? 70,
        weight_d: input.weight_d ?? 25,
        weight_i: input.weight_i ?? 25,
        weight_s: input.weight_s ?? 25,
        weight_c: input.weight_c ?? 25,
        // Advanced mode fields
        use_advanced_mode: input.use_advanced_mode ?? false,
        target_d: input.target_d ?? 50,
        target_i: input.target_i ?? 50,
        target_s: input.target_s ?? 50,
        target_c: input.target_c ?? 50,
        tolerance: input.tolerance ?? 15,
        eliminator_d: input.eliminator_d ?? null,
        eliminator_i: input.eliminator_i ?? null,
        eliminator_s: input.eliminator_s ?? null,
        eliminator_c: input.eliminator_c ?? null,
      };

      // Check if profile exists
      const { data: existing } = await supabase
        .from('recruitment_disc_profiles')
        .select('id')
        .eq('job_id', input.job_id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('recruitment_disc_profiles')
          .update(profileData)
          .eq('job_id', input.job_id)
          .select()
          .single();
        
        if (error) throw error;
        return data as JobDISCProfile;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('recruitment_disc_profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (error) throw error;
        return data as JobDISCProfile;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-disc-profile', jobId] });
      toast.success('Perfil DISC salvo com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar perfil DISC');
    },
  });

  // Delete profile
  const deleteProfile = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      
      const { error } = await supabase
        .from('recruitment_disc_profiles')
        .delete()
        .eq('job_id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-disc-profile', jobId] });
      toast.success('Perfil DISC removido');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover perfil DISC');
    },
  });

  // Seed profile: INSERT only if no profile exists. Never overwrites.
  const seedProfile = useMutation({
    mutationFn: async (input: JobDISCProfileInput): Promise<JobDISCProfile | null> => {
      // Double-check in DB that no profile exists (avoids race with stale cache)
      const { data: existing } = await supabase
        .from('recruitment_disc_profiles')
        .select('id')
        .eq('job_id', input.job_id)
        .maybeSingle();

      if (existing) {
        console.log('🛡️ seedProfile: profile already exists, skipping insert');
        return null;
      }

      const profileData = {
        job_id: input.job_id,
        primary_profile: input.primary_profile,
        secondary_profile: input.secondary_profile || null,
        min_match_score: input.min_match_score ?? 70,
        weight_d: input.weight_d ?? 25,
        weight_i: input.weight_i ?? 25,
        weight_s: input.weight_s ?? 25,
        weight_c: input.weight_c ?? 25,
        use_advanced_mode: input.use_advanced_mode ?? false,
        target_d: input.target_d ?? 50,
        target_i: input.target_i ?? 50,
        target_s: input.target_s ?? 50,
        target_c: input.target_c ?? 50,
        tolerance: input.tolerance ?? 15,
        eliminator_d: input.eliminator_d ?? null,
        eliminator_i: input.eliminator_i ?? null,
        eliminator_s: input.eliminator_s ?? null,
        eliminator_c: input.eliminator_c ?? null,
      };

      const { data, error } = await supabase
        .from('recruitment_disc_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data as JobDISCProfile;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['job-disc-profile', jobId] });
        toast.success('Perfil DISC herdado do agente');
      }
    },
    onError: (error: any) => {
      console.error('seedProfile error:', error.message);
    },
  });

  return {
    profile,
    isLoading,
    error,
    saveProfile: saveProfile.mutate,
    seedProfile: seedProfile.mutate,
    deleteProfile: deleteProfile.mutate,
    isSaving: saveProfile.isPending,
    isDeleting: deleteProfile.isPending,
  };
}

// Hook to fetch all profiles for multiple jobs
export function useJobsDISCProfiles(jobIds: string[]) {
  return useQuery({
    queryKey: ['jobs-disc-profiles', jobIds],
    queryFn: async (): Promise<Record<string, JobDISCProfile>> => {
      if (!jobIds.length) return {};
      
      const { data, error } = await supabase
        .from('recruitment_disc_profiles')
        .select('*')
        .in('job_id', jobIds);
      
      if (error) throw error;
      
      return (data as JobDISCProfile[]).reduce((acc, profile) => {
        acc[profile.job_id] = profile;
        return acc;
      }, {} as Record<string, JobDISCProfile>);
    },
    enabled: jobIds.length > 0,
  });
}
