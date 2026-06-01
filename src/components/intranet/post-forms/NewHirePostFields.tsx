import { UseFormReturn } from 'react-hook-form';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon, UserPlus } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CollaboratorSelect } from './CollaboratorSelect';
import { type Collaborator } from '@/hooks/useIntranetCollaborators';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface NewHirePostFieldsProps {
  form: UseFormReturn<any>;
}

export function NewHirePostFields({ form }: NewHirePostFieldsProps) {
  const handleCollaboratorSelect = (collaborator: Collaborator | null) => {
    if (collaborator) {
      // Auto-fill title
      form.setValue('title', `👋 Bem-vindo(a), ${collaborator.full_name}!`);
      
      // Auto-fill job title if available
      if (collaborator.job_title) {
        form.setValue('new_job_title', collaborator.job_title);
      }
      
      // Auto-fill department if available
      if (collaborator.department) {
        form.setValue('department', collaborator.department);
      }
      
      // Auto-fill hire date if available
      if (collaborator.hire_date) {
        form.setValue('event_date', new Date(collaborator.hire_date));
      }
      
      // Suggest content if empty
      if (!form.getValues('content')) {
        form.setValue('content', `Estamos muito felizes em receber ${collaborator.full_name} em nossa equipe! Desejamos muito sucesso nessa nova jornada. 🎉`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <UserPlus className="h-5 w-5 text-green-600" />
        <span className="text-sm text-green-700 font-medium">
          Post de Novo Colaborador
        </span>
      </div>

      <CollaboratorSelect 
        form={form} 
        label="Novo Colaborador"
        placeholder="Selecione o novo colaborador"
        onSelect={handleCollaboratorSelect}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="event_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Admissão</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        formatBRT(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Selecione</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    locale={ptBR}
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
          name="new_job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Analista de RH" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="department"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Departamento (opcional)</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Recursos Humanos" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input placeholder="👋 Bem-vindo(a)!" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mensagem (opcional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Escreva uma mensagem de boas-vindas..."
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
