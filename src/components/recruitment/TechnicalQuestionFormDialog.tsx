import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import type { TechnicalQuestionBankItem, CreateQuestionInput } from '@/hooks/useTechnicalQuestionBank';

const questionSchema = z.object({
  skill_name: z.string().min(1, 'Skill é obrigatória'),
  skill_category: z.string().optional(),
  question_text: z.string().min(10, 'Pergunta muito curta'),
  level: z.coerce.number().min(1).max(3),
  question_type: z.enum(['conceptual', 'practical', 'scenario', 'debugging']),
  followup_if_superficial: z.string().optional(),
  followup_if_excellent: z.string().optional(),
  expected_keywords: z.string().optional(),
  is_mandatory: z.boolean().default(false),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface TechnicalQuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateQuestionInput) => Promise<void>;
  question?: TechnicalQuestionBankItem | null;
  isLoading?: boolean;
}

export function TechnicalQuestionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  question,
  isLoading,
}: TechnicalQuestionFormDialogProps) {
  const isEditing = !!question;

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      skill_name: question?.skill_name || '',
      skill_category: question?.skill_category || '',
      question_text: question?.question_text || '',
      level: question?.level || 1,
      question_type: question?.question_type || 'conceptual',
      followup_if_superficial: question?.followup_if_superficial || '',
      followup_if_excellent: question?.followup_if_excellent || '',
      expected_keywords: question?.expected_keywords?.join(', ') || '',
      is_mandatory: question?.is_mandatory || false,
    },
  });

  const handleSubmit = async (values: QuestionFormValues) => {
    const data: CreateQuestionInput = {
      skill_name: values.skill_name,
      skill_category: values.skill_category,
      question_text: values.question_text,
      level: values.level,
      question_type: values.question_type,
      followup_if_superficial: values.followup_if_superficial,
      followup_if_excellent: values.followup_if_excellent,
      expected_keywords: values.expected_keywords
        ? values.expected_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [],
      is_mandatory: values.is_mandatory,
    };
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  const questionTypes = [
    { value: 'conceptual', label: 'Conceitual', description: 'O que é X? Para que serve?' },
    { value: 'practical', label: 'Prática', description: 'Me dá um exemplo de uso' },
    { value: 'scenario', label: 'Cenário', description: 'Como resolveria situação Y?' },
    { value: 'debugging', label: 'Debugging', description: 'O que está errado neste código?' },
  ];

  const skillCategories = [
    'programming',
    'database',
    'devops',
    'frontend',
    'backend',
    'mobile',
    'data',
    'security',
    'cloud',
    'other',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Pergunta' : 'Nova Pergunta Técnica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os detalhes da pergunta técnica'
              : 'Configure uma nova pergunta para o banco de perguntas técnicas'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Skill Name */}
            <FormField
              control={form.control}
              name="skill_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Python, React, SQL..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Skill Category */}
            <FormField
              control={form.control}
              name="skill_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {skillCategories.map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Level */}
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Dificuldade *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={String(field.value)}
                      className="grid grid-cols-3 gap-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Nível 1<br />
                          <span className="text-xs text-muted-foreground">Conceitual</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="2" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Nível 2<br />
                          <span className="text-xs text-muted-foreground">Aplicação</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                          Nível 3<br />
                          <span className="text-xs text-muted-foreground">Avançado</span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Type */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Pergunta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {questionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {type.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Text */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto da Pergunta *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a pergunta completa que a IA fará ao candidato..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up if Superficial */}
            <FormField
              control={form.control}
              name="followup_if_superficial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up se Resposta Superficial</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pode me dar um exemplo prático?"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Pergunta de aprofundamento se o candidato responder superficialmente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up if Excellent */}
            <FormField
              control={form.control}
              name="followup_if_excellent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up se Resposta Excelente</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: E se você tivesse que escalar isso para milhões de usuários?"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Pergunta avançada para testar domínio profundo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keywords */}
            <FormField
              control={form.control}
              name="expected_keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords Esperadas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="decorator, wrapper, functools, lru_cache"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Termos técnicos esperados na resposta (separados por vírgula)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mandatory */}
            <FormField
              control={form.control}
              name="is_mandatory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Pergunta Obrigatória</FormLabel>
                    <FormDescription>
                      Sempre incluir esta pergunta nas entrevistas técnicas
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Atualizar' : 'Criar Pergunta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
