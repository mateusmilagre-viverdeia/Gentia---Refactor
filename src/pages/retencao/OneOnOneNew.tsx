import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Users2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useOneOnOneMeetings, RecurrenceFrequency } from '@/hooks/useOneOnOneMeetings';
import {
  CollaboratorSelector,
  TemplateSelector,
  RecurrenceForm,
} from '@/components/retencao/one-on-one';
import { formatBRT } from "@/lib/datetime";

const formSchema = z.object({
  collaborator_id: z.string().min(1, 'Selecione um colaborador'),
  date: z.date({ required_error: 'Selecione a data da reunião' }),
  time: z.string().min(1, 'Selecione o horário'),
  duration_minutes: z.number().min(15).max(120),
  template_id: z.string().nullable().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function OneOnOneNew() {
  const navigate = useNavigate();
  const { templates, isLoadingTemplates, createMeeting, isCreating } = useOneOnOneMeetings();
  
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number | null>(null);
  const [recurrencePreferredTime, setRecurrencePreferredTime] = useState('10:00');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      collaborator_id: '',
      time: '10:00',
      duration_minutes: 30,
      template_id: null,
      notes: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    const scheduledAt = new Date(values.date);
    const [hours, minutes] = values.time.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    try {
      const meeting = await createMeeting({
        collaborator_id: values.collaborator_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: values.duration_minutes,
        template_id: values.template_id || null,
        notes: values.notes,
        recurrence: recurrenceEnabled ? {
          frequency: recurrenceFrequency,
          day_of_week: recurrenceDayOfWeek ?? undefined,
          preferred_time: recurrencePreferredTime,
        } : undefined,
      });
      
      navigate(`/retencao/reunioes-1-1/${meeting.id}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/retencao/reunioes-1-1')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Reunião 1:1</h1>
          <p className="text-muted-foreground">
            Agende uma reunião individual com um colaborador
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Colaborador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Participante
              </CardTitle>
              <CardDescription>
                Selecione o colaborador para a reunião
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CollaboratorSelector form={form} />
            </CardContent>
          </Card>

          {/* Data e Hora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Data e Horário
              </CardTitle>
              <CardDescription>
                Quando a reunião será realizada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Data</FormLabel>
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
                                formatBRT(field.value, "PPP")
                              ) : (
                                <span>Selecione...</span>
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
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select 
                      value={field.value.toString()} 
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[180px]">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h 30min</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Recorrência */}
          <RecurrenceForm
            enabled={recurrenceEnabled}
            onEnabledChange={setRecurrenceEnabled}
            frequency={recurrenceFrequency}
            onFrequencyChange={setRecurrenceFrequency}
            dayOfWeek={recurrenceDayOfWeek}
            onDayOfWeekChange={setRecurrenceDayOfWeek}
            preferredTime={recurrencePreferredTime}
            onPreferredTimeChange={setRecurrencePreferredTime}
          />

          {/* Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modelo de Pauta</CardTitle>
              <CardDescription>
                Escolha um modelo para começar com uma pauta estruturada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TemplateSelector
                        templates={templates}
                        selectedId={field.value || null}
                        onSelect={field.onChange}
                        isLoading={isLoadingTemplates}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas Iniciais</CardTitle>
              <CardDescription>
                Adicione observações ou contexto para a reunião (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Acompanhamento após projeto X, feedback sobre entrega..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/retencao/reunioes-1-1')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar Reunião
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
