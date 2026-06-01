import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BirthdayMessage {
  id: string;
  account_id: string;
  from_user_id: string;
  to_employee_id: string;
  message: string;
  created_at: string;
  from_user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useBirthdayMessages(employeeId?: string) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['birthday-messages', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('birthday_messages')
        .select('*')
        .eq('to_employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender info
      const userIds = [...new Set(data.map(m => m.from_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map((profiles as any[])?.map(p => [p.id, {
        full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuário',
        avatar_url: null,
      }]) || []);

      return data.map(m => ({
        ...m,
        from_user: profileMap.get(m.from_user_id) || { full_name: 'Usuário', avatar_url: null },
      })) as BirthdayMessage[];
    },
    enabled: !!employeeId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ employeeId, message }: { employeeId: string; message: string }) => {
      if (!accountId || !user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('birthday_messages')
        .insert({
          account_id: accountId,
          from_user_id: user.id,
          to_employee_id: employeeId,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['birthday-messages', variables.employeeId] });
      toast.success('Mensagem de parabéns enviada! 🎉');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage,
  };
}

export function useMonthlyBirthdays() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['monthly-birthdays', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const currentMonth = new Date().getMonth() + 1;
      const monthStr = currentMonth.toString().padStart(2, '0');

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .not('birth_date', 'is', null);

      if (error) throw error;

      // Filter by month on client side (since birth_date is stored as full date)
      const birthdays = data.filter(emp => {
        if (!emp.birth_date) return false;
        const birthMonth = new Date(emp.birth_date).getMonth() + 1;
        return birthMonth === currentMonth;
      });

      // Sort by day of month
      birthdays.sort((a, b) => {
        const dayA = new Date(a.birth_date!).getDate();
        const dayB = new Date(b.birth_date!).getDate();
        return dayA - dayB;
      });

      return birthdays;
    },
    enabled: !!accountId,
  });
}
