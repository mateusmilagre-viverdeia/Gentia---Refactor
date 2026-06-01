import { UseFormReturn } from 'react-hook-form';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Megaphone, Bell } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface AnnouncementPostFieldsProps {
  form: UseFormReturn<any>;
}

export function AnnouncementPostFields({ form }: AnnouncementPostFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Megaphone className="h-5 w-5 text-blue-600" />
        <span className="text-sm text-blue-700 font-medium">
          Comunicado Oficial
        </span>
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título do Comunicado</FormLabel>
            <FormControl>
              <Input placeholder="Título do comunicado" {...field} />
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
            <FormLabel>Conteúdo</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Escreva o conteúdo do comunicado..."
                rows={5}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expires_at"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data de Expiração (opcional)</FormLabel>
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
                      formatBRT(new Date(field.value), "dd/MM/yyyy")
                    ) : (
                      <span>Sem data de expiração</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription>
              O comunicado será ocultado após esta data
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="requires_confirmation"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-0.5">
                <FormLabel className="text-amber-900">Requer confirmação de leitura</FormLabel>
                <FormDescription className="text-amber-700">
                  Um pop-up será exibido para cada usuário confirmar que leu
                </FormDescription>
              </div>
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
    </div>
  );
}
