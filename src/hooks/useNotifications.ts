import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  account_id: string | null;
  org_id: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  target_url: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  archived_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user || !currentOrganization) {
      setNotifications([]);
      setRecipients([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch direct notifications (user_id = current user)
      const { data: directNotifications, error: directError } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},org_id.eq.${currentOrganization.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (directError) throw directError;

      // Fetch notification recipients for this user
      const { data: recipientData, error: recipientError } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null);

      if (recipientError) throw recipientError;

      // Create a map of notification_id -> recipient for easy lookup
      const recipientMap = new Map<string, NotificationRecipient>();
      (recipientData || []).forEach(r => recipientMap.set(r.notification_id, r));

      // Filter and dedupe notifications
      const allNotifications = (directNotifications || []) as Notification[];
      
      // Count unread
      let unread = 0;
      allNotifications.forEach(n => {
        const recipient = recipientMap.get(n.id);
        if (recipient) {
          if (!recipient.read_at) unread++;
        } else {
          if (!n.read_at) unread++;
        }
      });

      setNotifications(allNotifications);
      setRecipients(recipientData || []);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Check if there's a recipient record
      const existingRecipient = recipients.find(r => r.notification_id === notificationId);
      
      if (existingRecipient) {
        // Update recipient record
        await supabase
          .from('notification_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('id', existingRecipient.id);
      } else {
        // Update notification directly
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId)
          .eq('user_id', user.id);
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setRecipients(prev =>
        prev.map(r => r.notification_id === notificationId ? { ...r, read_at: new Date().toISOString() } : r)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user, recipients]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user || !currentOrganization) return;

    try {
      const now = new Date().toISOString();

      // Update all recipient records
      await supabase
        .from('notification_recipients')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      // Update direct notifications
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read_at: now })));
      setRecipients(prev => prev.map(r => ({ ...r, read_at: now })));
      setUnreadCount(0);

      toast({
        title: 'Notificações lidas',
        description: 'Todas as notificações foram marcadas como lidas.',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar as notificações como lidas.',
        variant: 'destructive',
      });
    }
  }, [user, currentOrganization, toast]);

  // Archive notification
  const archiveNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const existingRecipient = recipients.find(r => r.notification_id === notificationId);
      
      if (existingRecipient) {
        await supabase
          .from('notification_recipients')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', existingRecipient.id);
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setRecipients(prev => prev.filter(r => r.notification_id !== notificationId));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  }, [user, recipients]);

  // Check if notification is read
  const isRead = useCallback((notificationId: string): boolean => {
    const recipient = recipients.find(r => r.notification_id === notificationId);
    if (recipient) return !!recipient.read_at;
    const notification = notifications.find(n => n.id === notificationId);
    return !!notification?.read_at;
  }, [notifications, recipients]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !currentOrganization) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Check if notification is relevant to current user/org
          if (newNotification.user_id === user.id || newNotification.org_id === currentOrganization.id) {
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecipient = payload.new as NotificationRecipient;
          setRecipients(prev => [newRecipient, ...prev]);
          if (!newRecipient.read_at) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentOrganization]);

  return {
    notifications,
    recipients,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    isRead,
    refetch: fetchNotifications,
  };
}
