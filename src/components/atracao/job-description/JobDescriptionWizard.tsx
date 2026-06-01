import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2, BookOpen, BarChart3, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { JobDescriptionStep } from './JobDescriptionStep';
import { JobDescriptionReview } from './JobDescriptionReview';
import { BenchmarkPanel } from './BenchmarkPanel';
import { useJobBenchmark } from '@/hooks/useJobBenchmark';
import type { JobDescription, CustomField, JobDescriptionFormData, IdealDiscProfile } from '@/types/job-description.types';
import { JOB_DESCRIPTION_WIZARD_STEPS } from '@/types/job-description.types';
import { toast } from 'sonner';
import { extractBehavioralCompetencies } from '@/lib/extractBehavioralCompetencies';
import { extractBenefits } from '@/lib/extractBenefits';
import { supabase } from '@/integrations/supabase/client';

interface CultureContext {
  mission?: string;
  vision?: string;
  sellingCompanyContent?: string;
  values?: string[];
}

interface SuggestionContext {
  area?: string;
  mission?: string;
  indicators?: string[];
}

interface JobDescriptionWizardProps {
  jobDescription: JobDescription;
  cultureContext: CultureContext;
  onUpdate: (updates: Partial<JobDescription>) => Promise<void>;
  onApprove: () => Promise<void>;
  onBack: () => void;
  getSuggestion: (field: string, jobTitle: string, responsibilities: string[], context?: SuggestionContext) => Promise<any>;
}

export function JobDescriptionWizard({
  jobDescription,
  cultureContext,
  onUpdate,
  onApprove,
  onBack,
  getSuggestion,
}: JobDescriptionWizardProps) {
  const [currentStep, setCurrentStep] = useState(jobDescription.wizard_step);
  const [loading, setLoading] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<string[]>([]);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [generatingFullJd, setGeneratingFullJd] = useState(false);
  const [idealDiscProfile, setIdealDiscProfile] = useState<IdealDiscProfile | null>(
    jobDescription.ideal_disc_profile || null
  );
  
  // Benchmark hook
  const { 
    loading: benchmarkLoading, 
    data: benchmarkData, 
    fetchBenchmark, 
    clearBenchmark,
    hasData: hasBenchmarkData,
  } = useJobBenchmark();
  
  // Local state for editing
  const [formData, setFormData] = useState({
    title: jobDescription.title,
    mission: jobDescription.mission || '',
    indicators: jobDescription.indicators || [],
    responsibilities: jobDescription.responsibilities || [],
    required_skills: jobDescription.required_skills || [],
    desired_skills: jobDescription.desired_skills || [],
    behavioral_competencies: jobDescription.behavioral_competencies || [],
    development: jobDescription.development || [],
    benefits: jobDescription.benefits || [],
    custom_fields: jobDescription.custom_fields || [],
    area: jobDescription.area || '',
  });

  const step = JOB_DESCRIPTION_WIZARD_STEPS[currentStep - 1];
  const progress = (currentStep / JOB_DESCRIPTION_WIZARD_STEPS.length) * 100;
  const isReview = step.field === 'review';
  const isLastContentStep = currentStep === JOB_DESCRIPTION_WIZARD_STEPS.length - 1;

  const handleFieldChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldAdd = (customField: CustomField) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, customField],
    }));
  };

  const handleCustomFieldRemove = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter(f => f.id !== fieldId),
    }));
  };

  const handleSuggest = async (field: string) => {
    setSuggestingField(field);
    setPendingSuggestions([]); // Clear previous suggestions

    // Para competências comportamentais, buscar do "Vendendo a Empresa" sem usar IA
    if (field === 'behavioral_competencies') {
      const extracted = extractBehavioralCompetencies(cultureContext.sellingCompanyContent || '');

      if (extracted.length > 0) {
        // Filtrar itens já adicionados
        const existing = formData.behavioral_competencies || [];
        const newSuggestions = extracted.filter(s => !existing.includes(s));

        if (newSuggestions.length > 0) {
          setPendingSuggestions(newSuggestions);
          toast.success(`${newSuggestions.length} sugestões do "Vendendo a Empresa"!`, {
            description: 'Baseadas na seção "Nosso Santo Vai Bater Se..."',
          });
        } else {
          toast.info('Todas as competências já foram adicionadas.');
        }
      } else {
        toast.warning('Nenhuma competência encontrada', {
          description: 'Complete primeiro a seção "Vendendo a Empresa" para ter sugestões.',
        });
      }

      setSuggestingField(null);
      return;
    }

    // Para benefícios, buscar do "Vendendo a Empresa" sem usar IA
    if (field === 'benefits') {
      const extracted = extractBenefits(cultureContext.sellingCompanyContent || '');

      if (extracted.length > 0) {
        // Filtrar itens já adicionados
        const existing = formData.benefits || [];
        const newSuggestions = extracted.filter(s => !existing.includes(s));

        if (newSuggestions.length > 0) {
          setPendingSuggestions(newSuggestions);
          toast.success(`${newSuggestions.length} benefícios do "Vendendo a Empresa"!`, {
            description: 'Baseados na seção "O Que Você Encontra Aqui"',
          });
        } else {
          toast.info('Todos os benefícios já foram adicionados.');
        }
      } else {
        toast.warning('Nenhum benefício encontrado', {
          description: 'Complete primeiro a seção "Vendendo a Empresa" para ter sugestões.',
        });
      }

      setSuggestingField(null);
      return;
    }
    
    try {
      const result = await getSuggestion(
        field,
        formData.title,
        formData.responsibilities,
        {
          area: formData.area,
          mission: formData.mission,
          indicators: formData.indicators,
        }
      );
      
      if (result) {
        // For text fields (mission only), show as single suggestion
        if (field === 'mission') {
          if (result.suggestion) {
            setPendingSuggestions([result.suggestion]);
            toast.success('Sugestão gerada! Revise antes de aceitar.');
          }
        }
        // For list fields, show multiple suggestions as clickable chips
        else if (result.suggestions?.length > 0) {
          // Filter out suggestions that are already in the list
          const currentItems = formData[field as keyof typeof formData] as string[];
          const newSuggestions = result.suggestions.filter(
            (s: string) => !currentItems.includes(s)
          );
          
          if (newSuggestions.length > 0) {
            setPendingSuggestions(newSuggestions);
            toast.success(`${newSuggestions.length} sugestões disponíveis! Clique para adicionar.`);
          } else {
            toast.info('Todas as sugestões já foram adicionadas.');
          }
        }
      }
    } catch (error) {
      toast.error('Erro ao gerar sugestões');
    } finally {
      setSuggestingField(null);
    }
  };

  const handleAcceptSuggestion = (suggestion: string) => {
    const field = step.field as keyof typeof formData;
    
    // For text fields (mission only), replace the value
    if (field === 'mission') {
      handleFieldChange(field, suggestion);
      setPendingSuggestions([]);
      toast.success('Sugestão aplicada!');
      return;
    }
    
    // For list fields, add to the list
    const currentItems = formData[field] as string[];
    
    // Only check limit if maxItems is defined
    if (step.maxItems !== undefined && currentItems.length >= step.maxItems) {
      toast.warning(`Limite de ${step.maxItems} itens atingido`);
      return;
    }
    
    if (!currentItems.includes(suggestion)) {
      handleFieldChange(field, [...currentItems, suggestion]);
      setPendingSuggestions(prev => prev.filter(s => s !== suggestion));
      toast.success('Item adicionado!');
    }
  };

  const handleDismissSuggestion = (suggestion: string) => {
    setPendingSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleSelectAllSuggestions = (suggestions: string[]) => {
    const field = step.field as keyof typeof formData;
    const currentValue = (formData[field] as string[]) || [];
    
    // Filtrar sugestões que ainda não foram adicionadas
    const newItems = suggestions.filter(s => !currentValue.includes(s));
    
    // Respeitar limite se existir
    const slotsAvailable = step.maxItems ? step.maxItems - currentValue.length : newItems.length;
    const itemsToAdd = newItems.slice(0, slotsAvailable);
    
    if (itemsToAdd.length === 0) {
      toast.info('Todos os itens já foram adicionados');
      return;
    }
    
    // Adicionar todas de uma vez
    handleFieldChange(field, [...currentValue, ...itemsToAdd]);
    
    // Limpar sugestões adicionadas do painel
    setPendingSuggestions(prev => prev.filter(s => !itemsToAdd.includes(s)));
    
    toast.success(`${itemsToAdd.length} itens adicionados!`);
  };

  const handleGenerateFullJd = async () => {
    if (!formData.title || formData.title === 'Novo Cargo') return;

    setGeneratingFullJd(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-full-job-description', {
        body: {
          jobTitle: formData.title,
          area: formData.area,
          cultureContext,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado');

      const updatedFormData = {
        ...formData,
        mission: data.mission || formData.mission,
        indicators: data.indicators || formData.indicators,
        responsibilities: data.responsibilities || formData.responsibilities,
        required_skills: data.required_skills || formData.required_skills,
        desired_skills: data.desired_skills || formData.desired_skills,
        behavioral_competencies: data.behavioral_competencies || formData.behavioral_competencies,
        development: data.development || formData.development,
        benefits: data.benefits || formData.benefits,
      };

      setFormData(updatedFormData);

      if (data.ideal_disc_profile) {
        setIdealDiscProfile(data.ideal_disc_profile);
      }

      // Save and jump to review
      await onUpdate({
        ...updatedFormData,
        ideal_disc_profile: data.ideal_disc_profile || null,
        wizard_step: JOB_DESCRIPTION_WIZARD_STEPS.length,
        status: 'in_progress',
      });

      setCurrentStep(JOB_DESCRIPTION_WIZARD_STEPS.length);
      toast.success('Job Description gerado com IA! Revise antes de aprovar.');
    } catch (error: any) {
      console.error('Error generating full JD:', error);
      toast.error(error?.message || 'Erro ao gerar Job Description com IA');
    } finally {
      setGeneratingFullJd(false);
    }
  };

  const handleNext = async () => {
    // Validate required fields
    if (step.required && step.field !== 'review') {
      const value = formData[step.field as keyof typeof formData];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        toast.warning('Preencha este campo para continuar');
        return;
      }
    }

    setLoading(true);
    setPendingSuggestions([]); // Clear suggestions when moving to next step
    
    try {
      // Save current progress
      await onUpdate({
        ...formData,
        wizard_step: currentStep + 1,
        status: currentStep === 1 ? 'in_progress' : jobDescription.status,
      });
      
      if (currentStep < JOB_DESCRIPTION_WIZARD_STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setPendingSuggestions([]); // Clear suggestions when going back
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onUpdate(formData);
      await onApprove();
      toast.success('Job Description aprovado!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToStep = (stepNumber: number) => {
    setPendingSuggestions([]);
    setCurrentStep(stepNumber);
  };

  const handleFetchBenchmark = async () => {
    setShowBenchmark(true);
    await fetchBenchmark(formData.title, { 
      industry: formData.area || undefined,
    });
  };

  const handleApplyBenchmarkSuggestion = (
    type: 'requirement' | 'benefit' | 'responsibility',
    value: string
  ) => {
    const fieldMap = {
      requirement: 'required_skills',
      benefit: 'benefits',
      responsibility: 'responsibilities',
    };
    const field = fieldMap[type] as keyof typeof formData;
    const currentValues = (formData[field] as string[]) || [];
    
    if (!currentValues.includes(value)) {
      handleFieldChange(field, [...currentValues, value]);
      toast.success(`"${value}" adicionado!`);
    } else {
      toast.info('Item já existe na lista');
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className={`flex-1 max-w-3xl mx-auto py-6 space-y-6 ${showBenchmark && hasBenchmarkData ? 'max-w-2xl' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{formData.title || 'Novo Job Description'}</h1>
            <p className="text-sm text-muted-foreground">
              Etapa {currentStep} de {JOB_DESCRIPTION_WIZARD_STEPS.length}
            </p>
          </div>
          
          {/* Benchmark Toggle */}
          {formData.title && formData.title !== 'Novo Cargo' && (
            <Button
              variant={showBenchmark ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => showBenchmark ? setShowBenchmark(false) : handleFetchBenchmark()}
              disabled={benchmarkLoading}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {benchmarkLoading ? 'Buscando...' : showBenchmark ? 'Ocultar Benchmark' : 'Ver Mercado'}
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{step.title}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step.title}
              {step.aiEnabled && !isReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggest(step.field as string)}
                  disabled={suggestingField === step.field || !formData.title}
                  className="ml-auto"
                >
                  {suggestingField === step.field ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : step.field === 'behavioral_competencies' || step.field === 'benefits' ? (
                    <BookOpen className="h-4 w-4 mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {step.field === 'behavioral_competencies' || step.field === 'benefits' 
                    ? 'Buscar do Vendendo a Empresa' 
                    : 'Sugerir com IA'}
                </Button>
              )}
            </CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isReview ? (
              <JobDescriptionReview
                formData={formData}
                idealDiscProfile={idealDiscProfile}
                onGoToStep={handleGoToStep}
                onFieldChange={handleFieldChange}
                onCustomFieldAdd={handleCustomFieldAdd}
                onCustomFieldRemove={handleCustomFieldRemove}
              />
            ) : (
              <JobDescriptionStep
                step={step}
                value={formData[step.field as keyof typeof formData]}
                onChange={(value) => handleFieldChange(step.field as string, value)}
                pendingSuggestions={pendingSuggestions}
                onAcceptSuggestion={handleAcceptSuggestion}
                onSelectAllSuggestions={handleSelectAllSuggestions}
                onDismissSuggestion={handleDismissSuggestion}
                isLoadingSuggestions={suggestingField === step.field}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {/* AI Generate Full JD Button - shown on step 1 */}
        {currentStep === 1 && formData.title && formData.title !== 'Novo Cargo' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Gerar JD Completo com IA</p>
                  <p className="text-xs text-muted-foreground">
                    Preenche todos os campos automaticamente a partir do nome do cargo
                  </p>
                </div>
                <Button
                  onClick={handleGenerateFullJd}
                  disabled={generatingFullJd || !formData.title || formData.title === 'Novo Cargo'}
                  className="gap-2"
                >
                  {generatingFullJd ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {generatingFullJd ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {isReview ? (
            <Button onClick={handleApprove} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Aprovar Job Description
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={loading || generatingFullJd}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLastContentStep ? 'Revisar' : 'Próxima'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Benchmark Side Panel */}
      {showBenchmark && (
        <div className="w-80 shrink-0 py-6">
          <div className="sticky top-6">
            <BenchmarkPanel
              data={benchmarkData}
              loading={benchmarkLoading}
              onFetchBenchmark={handleFetchBenchmark}
              onApplySuggestion={handleApplyBenchmarkSuggestion}
              onClose={() => setShowBenchmark(false)}
              disabled={!formData.title || formData.title === 'Novo Cargo'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
