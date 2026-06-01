import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ValuesSession, SelectedValue } from '@/types/values.types';

export function useValuesSession() {
  const [session, setSession] = useState<ValuesSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('values_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSession(data);
      } else {
        await createSession();
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('values_sessions')
        .insert({ user_id: user.id, stage: 1 })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('values_sessions')
        .update({ stage })
        .eq('id', session.id);

      if (error) throw error;
      setSession({ ...session, stage });
    } catch (error) {
      console.error('Error updating stage:', error);
      throw error;
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('values_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;
      await createSession();
    } catch (error) {
      console.error('Error resetting session:', error);
      throw error;
    }
  };

  const saveSelections = async (phase: number, values: SelectedValue[]) => {
    if (!session) return;

    try {
      // Delete existing selections for this phase
      await supabase
        .from('values_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', phase);

      // Insert new selections
      const selections = values.map((value, index) => ({
        session_id: session.id,
        value_id: value.id,
        phase,
        position: index + 1
      }));

      const { error } = await supabase
        .from('values_selections')
        .insert(selections);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving selections:', error);
      throw error;
    }
  };

  const getSelections = async (phase: number): Promise<SelectedValue[]> => {
    if (!session) return [];

    try {
      const { data, error } = await supabase
        .from('values_selections')
        .select(`
          value_id,
          position,
          values_catalog (
            id,
            label
          )
        `)
        .eq('session_id', session.id)
        .eq('phase', phase)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.values_catalog.id,
        label: item.values_catalog.label
      }));
    } catch (error) {
      console.error('Error getting selections:', error);
      return [];
    }
  };

  return {
    session,
    loading,
    updateStage,
    resetSession,
    saveSelections,
    getSelections,
    createSession
  };
}
