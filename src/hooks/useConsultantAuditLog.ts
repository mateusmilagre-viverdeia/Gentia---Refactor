import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction = 
  | 'view_project'
  | 'view_checkpoints'
  | 'view_notes'
  | 'view_culture'
  | 'create_checkpoint'
  | 'update_checkpoint'
  | 'delete_checkpoint'
  | 'create_action'
  | 'update_action'
  | 'delete_action'
  | 'create_note'
  | 'update_note'
  | 'delete_note'
  | 'export_data';

export type ResourceType = 
  | 'project'
  | 'checkpoint'
  | 'checkpoint_action'
  | 'consultant_note'
  | 'culture_pillar'
  | 'report';

interface AuditLogParams {
  accountId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Json;
}

export function useConsultantAuditLog() {
  const { user } = useAuth();

  const logAccess = useCallback(async ({
    accountId,
    action,
    resourceType,
    resourceId,
    metadata = {}
  }: AuditLogParams): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('log_consultant_access', {
        p_account_id: accountId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId || null,
        p_metadata: metadata as Json
      });

      if (error) {
        console.error('Error logging consultant access:', error);
        return null;
      }

      return data as string | null;
    } catch (err) {
      console.error('Error in logAccess:', err);
      return null;
    }
  }, [user]);

  return { logAccess };
}
