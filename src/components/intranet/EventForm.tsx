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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOrgEvents, type OrgEvent, type EventType } from '@/hooks/useOrgEvents';
import { formatBRT } from "@/lib/datetime";

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'holiday', label: 'Feriado' },
  { value: 'company_event', label: 'Evento Corporativo' },
  { value: 'training', label: 'Treinamento' },
  { value: 'celebration', label: 'Celebração' },
];

const recurrenceRules = [
  { value: 'none', label: 'Não repete' },
  { value: 'YEARLY', label: 'Anualmente' },
  { value: 'MONTHLY', label: 'Mensalmente' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  event_type: z.string().min(1, 'Tipo é obrigatório'),
  event_date: z.date({ required_error: 'Data é obrigatória' }),
  recurrence_rule: z.string().optional(),
  is_recurring: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: OrgEvent | null;
  defaultDate?: Date | null;
}

export function EventForm({ open, onOpenChange, editEvent, defaultDate }: EventFormProps) {
  const { createEvent, updateEvent } = useOrgEvents();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: 'company_event',
      is_recurring: false,
      recurrence_rule: 'none',
    },
  });

  useEffect(() => {
    if (editEvent) {
      form.reset({
        title: editEvent.title,
        description: editEvent.description || '',
        event_type: editEvent.event_type,
        event_date: new Date(editEvent.event_date),
        is_recurring: editEvent.is_recurring ?? false,
        recurrence_rule: editEvent.recurrence_rule || 'none',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        event_type: 'company_event',
        event_date: defaultDate || undefined,
        is_recurring: false,
        recurrence_rule: 'none',
      });
    }
  }, [editEvent, defaultDate, form]);

  const isRecurring = form.watch('is_recurring');

  const onSubmit = async (values: FormValues) => {
    const data = {
      title: values.title,
      description: values.description || null,
      event_type: values.event_type as EventType,
      event_date: values.event_date.toISOString().split('T')[0],
      is_recurring: values.is_recurring,
      recurrence_rule: values.is_recurring && values.recurrence_rule !== 'none' ? values.recurrence_rule : null,
    };

    if (editEvent) {
      await updateEvent.mutateAsync({ id: editEvent.id, ...data });
    } else {
      await createEvent.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const isSubmitting = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editEvent ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Confraternização de fim de ano" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes do evento..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
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
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Evento recorrente</FormLabel>
                    <FormDescription>
                      Repetir este evento automaticamente
                    </FormDescription>
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

            {isRecurring && (
              <FormField
                control={form.control}
                name="recurrence_rule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recurrenceRules.map(rule => (
                          <SelectItem key={rule.value} value={rule.value}>
                            {rule.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {editEvent ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
