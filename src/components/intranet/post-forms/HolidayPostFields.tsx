import { UseFormReturn } from 'react-hook-form';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calendar as CalendarIconFilled } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface HolidayPostFieldsProps {
  form: UseFormReturn<any>;
}

export function HolidayPostFields({ form }: HolidayPostFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <CalendarIconFilled className="h-5 w-5 text-purple-600" />
        <span className="text-sm text-purple-700 font-medium">
          Post de Feriado
        </span>
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Feriado</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Dia do Trabalhador" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="event_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data do Feriado</FormLabel>
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
                      formatBRT(field.value, "EEEE, dd 'de' MMMM 'de' yyyy")
                    ) : (
                      <span>Selecione a data do feriado</span>
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
              Data em que o feriado será comemorado
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição (opcional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Informações sobre o feriado, horários especiais, etc..."
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
