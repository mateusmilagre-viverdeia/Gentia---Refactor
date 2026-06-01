import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Cake } from 'lucide-react';
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
import { useIntranetCollaborators, type Collaborator } from '@/hooks/useIntranetCollaborators';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface BirthdayPostFieldsProps {
  form: UseFormReturn<any>;
}

export function BirthdayPostFields({ form }: BirthdayPostFieldsProps) {
  const { data: collaborators } = useIntranetCollaborators();

  const handleCollaboratorSelect = (collaborator: Collaborator | null) => {
    if (collaborator) {
      // Auto-fill title
      const firstName = collaborator.full_name.split(' ')[0];
      form.setValue('title', `🎂 Feliz Aniversário, ${firstName}!`);
      
      // Auto-fill birth date if available
      if (collaborator.birth_date) {
        form.setValue('event_date', new Date(collaborator.birth_date));
      }
      
      // Suggest content if empty
      if (!form.getValues('content')) {
        form.setValue('content', `Hoje é um dia especial! Desejamos a ${collaborator.full_name} um dia repleto de alegrias, saúde e realizações. 🎉`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-pink-50 border border-pink-200 rounded-lg">
        <Cake className="h-5 w-5 text-pink-600" />
        <span className="text-sm text-pink-700 font-medium">
          Post de Aniversário
        </span>
      </div>

      <CollaboratorSelect 
        form={form} 
        label="Aniversariante"
        placeholder="Selecione o aniversariante"
        onSelect={handleCollaboratorSelect}
      />

      <FormField
        control={form.control}
        name="event_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data do Aniversário</FormLabel>
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
                      formatBRT(field.value, "dd 'de' MMMM")
                    ) : (
                      <span>Selecione a data</span>
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
            <FormDescription>
              Data de nascimento do colaborador
            </FormDescription>
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
              <Input placeholder="🎂 Feliz Aniversário!" {...field} />
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
                placeholder="Escreva uma mensagem especial..."
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
