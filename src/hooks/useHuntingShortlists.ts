import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Shortlist {
  id: string;
  account_id: string;
  job_id: string | null;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface ShortlistItem {
  id: string;
  shortlist_id: string;
  hunting_result_id: string;
  position: number;
  notes: string | null;
  added_by: string | null;
  created_at: string;
}

export function useHuntingShortlists(jobId?: string) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchShortlists = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('recruitment_shortlists')
        .select('*, recruitment_shortlist_items(count)')
        .eq('account_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        ...s,
        items_count: s.recruitment_shortlist_items?.[0]?.count || 0,
      }));
      setShortlists(mapped);
    } catch (error) {
      console.error('Error fetching shortlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, jobId]);

  const createShortlist = useCallback(async (name: string, description?: string) => {
    if (!currentOrganization?.id) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('recruitment_shortlists')
        .insert({
          account_id: currentOrganization.id,
          job_id: jobId || null,
          name,
          description: description || null,
          created_by: session?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Shortlist criada', description: `"${name}" criada com sucesso` });
      await fetchShortlists();
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [currentOrganization?.id, jobId, toast, fetchShortlists]);

  const addToShortlist = useCallback(async (shortlistId: string, resultIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const items = resultIds.map((id, idx) => ({
        shortlist_id: shortlistId,
        hunting_result_id: id,
        position: idx,
        added_by: session?.user?.id || null,
      }));

      const { error } = await supabase
        .from('recruitment_shortlist_items')
        .upsert(items, { onConflict: 'shortlist_id,hunting_result_id' });

      if (error) throw error;

      // Update status of added results
      await supabase
        .from('recruitment_hunting_results')
        .update({ status: 'shortlisted' } as any)
        .in('id', resultIds);

      toast({ title: 'Adicionado à shortlist', description: `${resultIds.length} candidato(s) adicionado(s)` });
      await fetchShortlists();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }, [toast, fetchShortlists]);

  const removeFromShortlist = useCallback(async (shortlistId: string, resultIds: string[]) => {
    try {
      const { error } = await supabase
        .from('recruitment_shortlist_items')
        .delete()
        .eq('shortlist_id', shortlistId)
        .in('hunting_result_id', resultIds);

      if (error) throw error;
      toast({ title: 'Removido da shortlist' });
      await fetchShortlists();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }, [toast, fetchShortlists]);

  const deleteShortlist = useCallback(async (shortlistId: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_shortlists')
        .delete()
        .eq('id', shortlistId);

      if (error) throw error;
      toast({ title: 'Shortlist removida' });
      await fetchShortlists();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }, [toast, fetchShortlists]);

  return {
    shortlists,
    isLoading,
    fetchShortlists,
    createShortlist,
    addToShortlist,
    removeFromShortlist,
    deleteShortlist,
  };
}
