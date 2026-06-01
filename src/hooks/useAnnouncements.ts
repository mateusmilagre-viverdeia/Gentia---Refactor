import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

export interface Announcement {
  id: string;
  org_id: string;
  title: string;
  body: string;
  published_at: string;
  published_by: string;
  expires_at: string | null;
  created_at: string;
}

interface CreateAnnouncementData {
  title: string;
  body: string;
  expires_at?: Date | null;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = currentOrganization?.role === 'owner' || currentOrganization?.role === 'admin';

  const fetchAnnouncements = useCallback(async () => {
    if (!currentOrganization) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os comunicados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, toast]);

  const createAnnouncement = useCallback(async (data: CreateAnnouncementData) => {
    if (!user || !currentOrganization || !canManage) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para criar comunicados.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // 1. Create the announcement
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert({
          org_id: currentOrganization.id,
          title: data.title,
          body: data.body,
          published_by: user.id,
          expires_at: data.expires_at?.toISOString() || null,
        })
        .select()
        .single();

      if (announcementError) throw announcementError;

      // 2. Create notification for the org
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          org_id: currentOrganization.id,
          user_id: user.id, // Required field
          type: 'announcement',
          title: data.title,
          message: data.body.substring(0, 200),
          target_url: `/conta/comunicados/${announcement.id}`,
          entity_type: 'announcement',
          entity_id: announcement.id,
          priority: 'normal',
        })
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        // 3. Get all org members and create recipients
        const { data: members, error: membersError } = await supabase
          .from('account_members')
          .select('user_id')
          .eq('account_id', currentOrganization.id);

        if (!membersError && members && members.length > 0) {
          const recipients = members.map(m => ({
            notification_id: notification.id,
            user_id: m.user_id,
          }));

          await supabase
            .from('notification_recipients')
            .insert(recipients);
        }
      }

      // Update local state
      setAnnouncements(prev => [announcement, ...prev]);

      toast({
        title: 'Comunicado publicado',
        description: 'Todos os membros da organização foram notificados.',
      });

      return announcement;
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o comunicado.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, currentOrganization, canManage, toast]);

  const deleteAnnouncement = useCallback(async (announcementId: string) => {
    if (!canManage) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para excluir comunicados.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));

      toast({
        title: 'Comunicado excluído',
        description: 'O comunicado foi removido com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o comunicado.',
        variant: 'destructive',
      });
      return false;
    }
  }, [canManage, toast]);

  const getAnnouncementById = useCallback(async (id: string): Promise<Announcement | null> => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching announcement:', error);
      return null;
    }
  }, []);

  const isExpired = useCallback((announcement: Announcement): boolean => {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    loading,
    canManage,
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    isExpired,
    refetch: fetchAnnouncements,
  };
}
