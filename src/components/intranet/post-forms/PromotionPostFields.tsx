import { UseFormReturn } from 'react-hook-form';
import { Trophy } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CollaboratorSelect } from './CollaboratorSelect';
import { type Collaborator } from '@/hooks/useIntranetCollaborators';

interface PromotionPostFieldsProps {
  form: UseFormReturn<any>;
}

export function PromotionPostFields({ form }: PromotionPostFieldsProps) {
  const handleCollaboratorSelect = (collaborator: Collaborator | null) => {
    if (collaborator) {
      // Auto-fill previous job title if available
      if (collaborator.job_title) {
        form.setValue('previous_job_title', collaborator.job_title);
      }
      
      // Suggest title
      form.setValue('title', `🏆 ${collaborator.full_name} foi promovido(a)!`);
      
      // Suggest content if empty
      if (!form.getValues('content')) {
        form.setValue('content', `Temos o prazer de anunciar a promoção de ${collaborator.full_name}! Parabéns por essa conquista merecida! 🎉`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Trophy className="h-5 w-5 text-amber-600" />
        <span className="text-sm text-amber-700 font-medium">
          Post de Promoção
        </span>
      </div>

      <CollaboratorSelect 
        form={form} 
        label="Colaborador Promovido"
        placeholder="Selecione o colaborador"
        onSelect={handleCollaboratorSelect}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="previous_job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo Anterior</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Analista Jr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="new_job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo Cargo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Analista Pleno" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input placeholder="🏆 Promoção!" {...field} />
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
                placeholder="Escreva uma mensagem de parabéns..."
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
