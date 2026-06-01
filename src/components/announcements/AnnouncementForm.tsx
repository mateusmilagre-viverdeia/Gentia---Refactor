import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';

import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

const announcementSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres').max(100, 'O título deve ter no máximo 100 caracteres'),
  body: z.string().min(10, 'O conteúdo deve ter pelo menos 10 caracteres').max(2000, 'O conteúdo deve ter no máximo 2000 caracteres'),
  expires_at: z.date().optional().nullable(),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  onSubmit: (data: AnnouncementFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function AnnouncementForm({ onSubmit, isSubmitting }: AnnouncementFormProps) {
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      body: '',
      expires_at: null,
    },
  });

  const handleSubmit = async (data: AnnouncementFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Digite o título do comunicado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Digite o conteúdo do comunicado..."
                  className="min-h-[150px] resize-none"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/2000 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de expiração (opcional)</FormLabel>
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
                      {field.value ? (
                        formatBRT(field.value, "dd 'de' MMMM 'de' yyyy")
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Se definida, o comunicado será marcado como expirado após esta data.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Publicando...' : 'Publicar comunicado'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
