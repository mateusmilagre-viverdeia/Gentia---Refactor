import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ActionPlan, ActionPlanFormData, STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/types/action-plan.types';
import { formatBRT } from "@/lib/datetime";

const formSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(1000).optional(),
  responsible: z.string().min(2, 'Responsável é obrigatório').max(100),
  status: z.enum(['planejada', 'em_andamento', 'concluida', 'cancelada']),
  deadline: z.date().optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
});

interface ActionPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActionPlanFormData) => Promise<boolean>;
  editingAction?: ActionPlan | null;
}

export function ActionPlanForm({ open, onOpenChange, onSubmit, editingAction }: ActionPlanFormProps) {
  const form = useForm<ActionPlanFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      responsible: '',
      status: 'planejada',
      priority: 'media',
    },
  });

  // Reset form when dialog opens/closes or when editingAction changes
  const resetFormWithValues = () => {
    if (editingAction) {
      form.reset({
        title: editingAction.title,
        description: editingAction.description || '',
        responsible: editingAction.responsible,
        status: editingAction.status,
        deadline: editingAction.deadline ? new Date(editingAction.deadline) : undefined,
        priority: editingAction.priority,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        responsible: '',
        status: 'planejada',
        priority: 'media',
      });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      resetFormWithValues();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (data: ActionPlanFormData) => {
    const success = await onSubmit(data);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingAction ? 'Editar Ação' : 'Adicionar Nova Ação'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da ação" {...field} />
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
                      placeholder="Descreva os detalhes da ação"
                      rows={3}
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
                name="responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
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
                              formatBRT(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Selecionar data</span>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Ação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
