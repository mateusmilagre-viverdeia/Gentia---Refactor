import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Collaborator {
  id: string;
  source: 'employee' | 'account_member';
  full_name: string;
  email: string | null;
  job_title: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  hire_date: string | null;
  department: string | null;
}

export function useIntranetCollaborators() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['intranet-collaborators', accountId],
    queryFn: async (): Promise<Collaborator[]> => {
      if (!accountId) return [];

      const collaborators: Collaborator[] = [];
      const seenEmails = new Set<string>();

      // 1. First, fetch from employees table (priority)
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, email, job_title, avatar_url, birth_date, hire_date, department')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('full_name');

      if (!empError && employees) {
        for (const emp of employees) {
          collaborators.push({
            id: emp.id,
            source: 'employee',
            full_name: emp.full_name,
            email: emp.email,
            job_title: emp.job_title,
            avatar_url: emp.avatar_url,
            birth_date: emp.birth_date,
            hire_date: emp.hire_date,
            department: emp.department,
          });
          if (emp.email) {
            seenEmails.add(emp.email.toLowerCase());
          }
        }
      }

      // 2. Then fetch from account_members + profiles as fallback
      const { data: members, error: memError } = await supabase
        .from('account_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (!memError && members) {
        for (const member of members) {
          const profile = member.profiles as unknown as {
            id: string;
            full_name: string | null;
            email: string | null;
            avatar_url: string | null;
          } | null;
          
          if (!profile) continue;
          
          // Skip if already added from employees (by email)
          if (profile.email && seenEmails.has(profile.email.toLowerCase())) {
            continue;
          }

          collaborators.push({
            id: member.user_id, // Use user_id for account_members
            source: 'account_member',
            full_name: profile.full_name || 'Usuário',
            email: profile.email,
            job_title: null, // Not available in profiles
            avatar_url: profile.avatar_url,
            birth_date: null, // Not available in profiles
            hire_date: null, // Use member.created_at as fallback
            department: null,
          });
          
          if (profile.email) {
            seenEmails.add(profile.email.toLowerCase());
          }
        }
      }

      // Sort by name
      return collaborators.sort((a, b) => 
        a.full_name.localeCompare(b.full_name, 'pt-BR')
      );
    },
    enabled: !!accountId,
  });
}
