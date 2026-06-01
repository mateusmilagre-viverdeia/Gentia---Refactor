import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Gift, 
  Sparkles, 
  Loader2,
  Plus,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProposals, ProposalTemplate, ProposalBenefit } from '@/hooks/useProposals';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

const proposalSchema = z.object({
  template_id: z.string().min(1, 'Selecione um template'),
  salary_offered: z.number().min(1, 'Informe o salário'),
  currency: z.string().default('BRL'),
  start_date: z.string().min(1, 'Informe a data de início'),
  valid_until: z.string().optional(),
  hiring_manager_name: z.string().optional(),
  additional_notes: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface GenerateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  accountId: string;
  onSuccess?: (proposalId: string) => void;
}

const COMMON_BENEFITS = [
  { name: 'Vale Refeição', value: '' },
  { name: 'Vale Alimentação', value: '' },
  { name: 'Vale Transporte', value: '' },
  { name: 'Plano de Saúde', value: '' },
  { name: 'Plano Odontológico', value: '' },
  { name: 'Seguro de Vida', value: '' },
  { name: 'Gympass', value: '' },
  { name: 'Home Office', value: '' },
  { name: 'Auxílio Educação', value: '' },
  { name: 'PLR', value: '' },
];

export function GenerateProposalDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  jobTitle,
  accountId,
  onSuccess,
}: GenerateProposalDialogProps) {
  const [step, setStep] = useState<'form' | 'benefits' | 'preview'>('form');
  const [benefits, setBenefits] = useState<ProposalBenefit[]>([]);
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [newClause, setNewClause] = useState('');

  const { templates, isLoadingTemplates, generateProposal, isGenerating } = useProposals({ accountId });

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      currency: 'BRL',
      start_date: formatBRT(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      valid_until: formatBRT(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    },
  });

  // Set default template
  useEffect(() => {
    if (templates && templates.length > 0 && !form.getValues('template_id')) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      form.setValue('template_id', defaultTemplate.id);
    }
  }, [templates, form]);

  const handleToggleBenefit = (benefit: ProposalBenefit) => {
    const exists = benefits.find(b => b.name === benefit.name);
    if (exists) {
      setBenefits(benefits.filter(b => b.name !== benefit.name));
    } else {
      setBenefits([...benefits, benefit]);
    }
  };

  const handleUpdateBenefitValue = (name: string, value: string) => {
    setBenefits(benefits.map(b => 
      b.name === name ? { ...b, value } : b
    ));
  };

  const handleAddClause = () => {
    if (newClause.trim()) {
      setCustomClauses([...customClauses, newClause.trim()]);
      setNewClause('');
    }
  };

  const handleRemoveClause = (index: number) => {
    setCustomClauses(customClauses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: ProposalFormData) => {
    try {
      const proposal = await generateProposal({
        application_id: applicationId,
        template_id: data.template_id,
        account_id: accountId,
        salary_offered: data.salary_offered,
        currency: data.currency,
        start_date: data.start_date,
        benefits: benefits.filter(b => b.name),
        custom_clauses: customClauses,
        additional_notes: data.additional_notes,
        valid_until: data.valid_until,
        hiring_manager_name: data.hiring_manager_name,
      });

      onSuccess?.(proposal.id);
      onOpenChange(false);
      
      // Reset form
      setStep('form');
      setBenefits([]);
      setCustomClauses([]);
      form.reset();
    } catch (error) {
      console.error('Error generating proposal:', error);
    }
  };

  const selectedTemplate = templates?.find(t => t.id === form.watch('template_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Proposta
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {candidateName} • {jobTitle}
          </p>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {(['form', 'benefits', 'preview'] as const).map((s, index) => (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => setStep(s)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                  step === s 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                {s === 'form' ? 'Dados' : s === 'benefits' ? 'Benefícios' : 'Finalizar'}
              </button>
              {index < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        <Separator />

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Step 1: Basic data */}
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select
                  value={form.watch('template_id')}
                  onValueChange={(value) => form.setValue('template_id', value)}
                  disabled={isLoadingTemplates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs">Padrão</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.template_id && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.template_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Salário
                  </Label>
                  <Input
                    type="number"
                    placeholder="5000"
                    {...form.register('salary_offered', { valueAsNumber: true })}
                  />
                  {form.formState.errors.salary_offered && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.salary_offered.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Moeda</Label>
                  <Select
                    value={form.watch('currency')}
                    onValueChange={(value) => form.setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Data de Início
                  </Label>
                  <Input
                    type="date"
                    {...form.register('start_date')}
                  />
                  {form.formState.errors.start_date && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.start_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Válido Até</Label>
                  <Input
                    type="date"
                    {...form.register('valid_until')}
                  />
                </div>
              </div>

              <div>
                <Label>Nome do Gestor (assinatura)</Label>
                <Input
                  placeholder="Nome do gestor ou 'Equipe de RH'"
                  {...form.register('hiring_manager_name')}
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep('benefits')}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Benefits */}
          {step === 'benefits' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-1 mb-3">
                  <Gift className="h-4 w-4" />
                  Benefícios
                </Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_BENEFITS.map((benefit) => {
                    const isSelected = benefits.some(b => b.name === benefit.name);
                    return (
                      <button
                        key={benefit.name}
                        type="button"
                        onClick={() => handleToggleBenefit(benefit)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary'
                        )}
                      >
                        {benefit.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {benefits.length > 0 && (
                <div className="space-y-2">
                  <Label>Valores dos benefícios (opcional)</Label>
                  {benefits.map((benefit) => (
                    <div key={benefit.name} className="flex items-center gap-2">
                      <span className="text-sm w-32 truncate">{benefit.name}</span>
                      <Input
                        placeholder="Ex: R$ 800/mês"
                        value={benefit.value || ''}
                        onChange={(e) => handleUpdateBenefitValue(benefit.name, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div>
                <Label>Cláusulas Adicionais</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Ex: Bônus de contratação de R$ 5.000"
                    value={newClause}
                    onChange={(e) => setNewClause(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClause())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddClause}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {customClauses.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {customClauses.map((clause, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded"
                      >
                        <span className="flex-1">{clause}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClause(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('form')}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button type="button" onClick={() => setStep('preview')}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Generate */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Resumo da Proposta</h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Candidato:</span>
                    <span className="ml-2 font-medium">{candidateName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vaga:</span>
                    <span className="ml-2 font-medium">{jobTitle}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Salário:</span>
                    <span className="ml-2 font-medium">
                      {form.watch('currency')} {form.watch('salary_offered')?.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Início:</span>
                    <span className="ml-2 font-medium">
                      {form.watch('start_date') && formatBRT(new Date(form.watch('start_date') + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>

                {benefits.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Benefícios:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {benefits.map((b) => (
                        <Badge key={b.name} variant="secondary">
                          {b.name}
                          {b.value && `: ${b.value}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {customClauses.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Cláusulas:</span>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {customClauses.map((clause, i) => (
                        <li key={i}>{clause}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTemplate && (
                  <div>
                    <span className="text-sm text-muted-foreground">Template:</span>
                    <span className="ml-2 text-sm">{selectedTemplate.name}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Observações Adicionais</Label>
                <Textarea
                  placeholder="Notas que serão incluídas na proposta..."
                  {...form.register('additional_notes')}
                  rows={3}
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Geração com IA</p>
                  <p className="text-muted-foreground">
                    A proposta será personalizada automaticamente usando inteligência artificial
                    para criar uma carta profissional e acolhedora.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('benefits')}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Proposta
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
