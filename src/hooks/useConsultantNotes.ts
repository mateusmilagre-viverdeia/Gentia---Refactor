import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ConsultantNote } from '@/types/consultant.types';

interface UseConsultantNotesReturn {
  notes: ConsultantNote[];
  loading: boolean;
  error: string | null;
  createNote: (content: string, category?: string) => Promise<ConsultantNote | null>;
  updateNote: (id: string, content: string, category?: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  reloadNotes: () => Promise<void>;
}

export function useConsultantNotes(accountId: string | null): UseConsultantNotesReturn {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ConsultantNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!accountId || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data: notesData, error: notesError } = await supabase
        .from('consultant_notes')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Get author profiles separately
      const authorIds = [...new Set((notesData || []).map(n => n.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', authorIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const notesWithAuthors: ConsultantNote[] = (notesData || []).map(note => ({
        ...note,
        author: profilesMap.get(note.author_id) || undefined,
      }));

      setNotes(notesWithAuthors);
    } catch (err) {
      console.error('Error loading consultant notes:', err);
      setError('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [accountId, user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = async (content: string, category: string = 'general'): Promise<ConsultantNote | null> => {
    if (!user || !accountId) return null;

    try {
      const { data, error } = await supabase
        .from('consultant_notes')
        .insert({
          account_id: accountId,
          author_id: user.id,
          content,
          category,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Nota criada');
      await loadNotes();
      return data;
    } catch (err) {
      console.error('Error creating note:', err);
      toast.error('Erro ao criar nota');
      return null;
    }
  };

  const updateNote = async (id: string, content: string, category?: string): Promise<boolean> => {
    try {
      const updateData: Partial<ConsultantNote> = { content };
      if (category) updateData.category = category;

      const { error } = await supabase
        .from('consultant_notes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Nota atualizada');
      await loadNotes();
      return true;
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Erro ao atualizar nota');
      return false;
    }
  };

  const deleteNote = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('consultant_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Nota excluída');
      await loadNotes();
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Erro ao excluir nota');
      return false;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    reloadNotes: loadNotes,
  };
}
