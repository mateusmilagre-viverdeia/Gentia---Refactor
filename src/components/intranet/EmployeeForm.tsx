import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEmployees, type Employee } from '@/hooks/useEmployees';
import { formatBRT } from "@/lib/datetime";

const formSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  job_title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  linkedin_url: z.string().url('URL inválida').optional().or(z.literal('')),
  phone: z.string().optional(),
  birth_date: z.date().optional(),
  hire_date: z.date().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEmployee?: Employee | null;
}

export function EmployeeForm({ open, onOpenChange, editEmployee }: EmployeeFormProps) {
  const { createEmployee, updateEmployee } = useEmployees();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      job_title: '',
      department: '',
      location: '',
      linkedin_url: '',
      phone: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (editEmployee) {
      form.reset({
        full_name: editEmployee.full_name,
        email: editEmployee.email || '',
        job_title: editEmployee.job_title || '',
        department: editEmployee.department || '',
        location: editEmployee.location || '',
        linkedin_url: editEmployee.linkedin_url || '',
        phone: editEmployee.phone || '',
        birth_date: editEmployee.birth_date ? new Date(editEmployee.birth_date) : undefined,
        hire_date: editEmployee.hire_date ? new Date(editEmployee.hire_date) : undefined,
        is_active: editEmployee.is_active ?? true,
      });
    } else {
      form.reset({
        full_name: '',
        email: '',
        job_title: '',
        department: '',
        location: '',
        linkedin_url: '',
        phone: '',
        is_active: true,
      });
    }
  }, [editEmployee, form]);

  const onSubmit = async (values: FormValues) => {
    const data = {
      full_name: values.full_name,
      email: values.email || null,
      job_title: values.job_title || null,
      department: values.department || null,
      location: values.location || null,
      linkedin_url: values.linkedin_url || null,
      phone: values.phone || null,
      birth_date: values.birth_date?.toISOString().split('T')[0] || null,
      hire_date: values.hire_date?.toISOString().split('T')[0] || null,
      is_active: values.is_active,
    };

    if (editEmployee) {
      await updateEmployee.mutateAsync({ id: editEmployee.id, ...data });
    } else {
      await createEmployee.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Analista" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input placeholder="RH" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo - SP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Aniversário</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? formatBRT(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Admissão</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? formatBRT(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Colaborador ativo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editEmployee ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
