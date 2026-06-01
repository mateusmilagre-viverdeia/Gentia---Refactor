import { UseFormReturn } from 'react-hook-form';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon, MessageSquare } from 'lucide-react';
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

interface GeneralPostFieldsProps {
  form: UseFormReturn<any>;
}

export function GeneralPostFields({ form }: GeneralPostFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">
          Post Geral
        </span>
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input placeholder="Título do post" {...field} />
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
            <FormLabel>Conteúdo (opcional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Escreva o conteúdo do post..."
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="media_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL da Imagem (opcional)</FormLabel>
            <FormControl>
              <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
            </FormControl>
            <FormDescription>
              Cole a URL de uma imagem para exibir no post
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
              O post será ocultado após esta data
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
