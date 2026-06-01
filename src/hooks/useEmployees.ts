import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  account_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  birth_date: string | null;
  hire_date: string | null;
  job_title: string | null;
  department: string | null;
  avatar_url: string | null;
  location: string | null;
  linkedin_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  full_name: string;
  email?: string;
  birth_date?: string;
  hire_date?: string;
  job_title?: string;
  department?: string;
  avatar_url?: string;
  location?: string;
  linkedin_url?: string;
  phone?: string;
  profile_id?: string;
}

export function useEmployees() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!accountId,
  });

  const createEmployee = useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!accountId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('employees')
        .insert({
          account_id: accountId,
          ...input,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', accountId] });
      toast.success('Colaborador adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar colaborador: ${error.message}`);
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', accountId] });
      toast.success('Colaborador atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', accountId] });
      toast.success('Colaborador removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover colaborador: ${error.message}`);
    },
  });

  return {
    employees: employeesQuery.data ?? [],
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: employeesQuery.refetch,
  };
}

// Hook para buscar aniversariantes
export function useBirthdays() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['birthdays', accountId],
    queryFn: async () => {
      if (!accountId) return { today: [], thisMonth: [] };
      
      const today = new Date();
      const dayMonth = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .not('birth_date', 'is', null);
      
      if (error) throw error;
      
      const employees = data as Employee[];
      
      const todayBirthdays = employees.filter(emp => {
        if (!emp.birth_date) return false;
        const empDate = emp.birth_date.substring(5); // MM-DD
        return empDate === dayMonth;
      });
      
      const monthBirthdays = employees.filter(emp => {
        if (!emp.birth_date) return false;
        const empMonth = emp.birth_date.substring(5, 7);
        return empMonth === month;
      });
      
      return {
        today: todayBirthdays,
        thisMonth: monthBirthdays,
      };
    },
    enabled: !!accountId,
  });
}

// Hook para buscar novos colaboradores (últimos 30 dias)
export function useNewHires() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['new-hires', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .gte('hire_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('hire_date', { ascending: false });
      
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!accountId,
  });
}
