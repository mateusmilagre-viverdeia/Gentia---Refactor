import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useValidateSurveyToken, useSubmitExitSurvey } from '@/hooks/useExitSurvey';
import { EXIT_REASONS } from '@/types/offboarding.types';

// Helper to get label from reason value
const getReasonLabel = (value: string): string => {
  const reason = EXIT_REASONS.find(r => r.value === value);
  return reason?.label || value;
};

interface SurveyResponses {
  primary_exit_reason: string;
  secondary_reasons: string[];
  avoidability_score: number;
  recommend_score: number;
  leadership_score: number;
  growth_score: number;
  workload_score: number;
  compensation_score: number;
  additional_comments: string;
}

export default function ExitSurveyPublic() {
  const { token } = useParams<{ token: string }>();
  
  
  const { data: tokenData, isLoading: validating, error: validationError } = useValidateSurveyToken(token);
  const { mutateAsync: submitSurvey, isPending: submitting } = useSubmitExitSurvey();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<SurveyResponses>({
    primary_exit_reason: '',
    secondary_reasons: [],
    avoidability_score: 5,
    recommend_score: 5,
    leadership_score: 3,
    growth_score: 3,
    workload_score: 3,
    compensation_score: 3,
    additional_comments: '',
  });

  const totalSteps = 5;

  const handleChange = <K extends keyof SurveyResponses>(field: K, value: SurveyResponses[K]) => {
    setResponses(prev => ({ ...prev, [field]: value }));
  };

  const toggleSecondaryReason = (reason: string) => {
    setResponses(prev => {
      const current = prev.secondary_reasons;
      if (current.includes(reason)) {
        return { ...prev, secondary_reasons: current.filter(r => r !== reason) };
      }
      if (current.length >= 2) {
        toast.error('Selecione no máximo 2 motivos secundários');
        return prev;
      }
      return { ...prev, secondary_reasons: [...current, reason] };
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!responses.primary_exit_reason;
      case 1:
        return true; // Secondary reasons are optional
      case 2:
        return true; // Scores have defaults
      case 3:
        return true; // Scores have defaults
      case 4:
        return true; // Comments are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!token || !tokenData) return;

    try {
      await submitSurvey({
        token,
        caseId: tokenData.case.id,
        responses,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Erro ao enviar pesquisa. Tente novamente.');
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (validationError || !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Link Inválido ou Expirado</h1>
            <p className="text-muted-foreground">
              Este link de pesquisa não é mais válido. Por favor, solicite um novo link ao RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Obrigado pelo seu feedback!</h1>
            <p className="text-muted-foreground">
              Suas respostas foram registradas com sucesso. Agradecemos sua contribuição para melhorarmos continuamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Pesquisa de Desligamento</h1>
          <p className="text-muted-foreground mt-2">
            Suas respostas são confidenciais e nos ajudam a melhorar
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Etapa {currentStep + 1} de {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Questions */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 0: Primary Exit Reason */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <Label className="text-lg">Qual foi o principal motivo da sua saída?</Label>
                <RadioGroup
                  value={responses.primary_exit_reason}
                  onValueChange={(value) => handleChange('primary_exit_reason', value)}
                  className="space-y-3"
                >
                {EXIT_REASONS.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="flex-1 cursor-pointer">{reason.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 1: Secondary Reasons */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label className="text-lg">Quais outros fatores influenciaram sua decisão? (opcional, máx. 2)</Label>
                <div className="space-y-3">
                {EXIT_REASONS.filter(r => r.value !== responses.primary_exit_reason).map((reason) => (
                    <div 
                      key={reason.value} 
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`secondary-${reason.value}`}
                        checked={responses.secondary_reasons.includes(reason.value)}
                        onCheckedChange={() => toggleSecondaryReason(reason.value)}
                      />
                      <Label htmlFor={`secondary-${reason.value}`} className="flex-1 cursor-pointer">{reason.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Avoidability & Recommend */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-lg">
                    Em uma escala de 0 a 10, o quanto sua saída poderia ter sido evitada pela empresa?
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={[responses.avoidability_score]}
                      onValueChange={([value]) => handleChange('avoidability_score', value)}
                      min={0}
                      max={10}
                      step={1}
                      className="my-6"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0 - Não poderia</span>
                      <span className="font-semibold text-foreground">{responses.avoidability_score}</span>
                      <span>10 - Definitivamente poderia</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg">
                    Qual a probabilidade de você recomendar a empresa como lugar para trabalhar?
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={[responses.recommend_score]}
                      onValueChange={([value]) => handleChange('recommend_score', value)}
                      min={0}
                      max={10}
                      step={1}
                      className="my-6"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0 - Não recomendaria</span>
                      <span className="font-semibold text-foreground">{responses.recommend_score}</span>
                      <span>10 - Recomendaria muito</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Rating Scales */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Label className="text-lg">Como você avalia os seguintes aspectos? (1 a 5)</Label>
                
                {[
                  { key: 'leadership_score' as const, label: 'Sua liderança direta' },
                  { key: 'growth_score' as const, label: 'Oportunidades de crescimento' },
                  { key: 'workload_score' as const, label: 'Carga de trabalho' },
                  { key: 'compensation_score' as const, label: 'Remuneração e benefícios' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{label}</span>
                      <span className="text-sm font-semibold">{responses[key]}/5</span>
                    </div>
                    <Slider
                      value={[responses[key]]}
                      onValueChange={([value]) => handleChange(key, value)}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Additional Comments */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Label className="text-lg">Gostaria de compartilhar algo mais? (opcional)</Label>
                <Textarea
                  value={responses.additional_comments}
                  onChange={(e) => handleChange('additional_comments', e.target.value)}
                  placeholder="Suas sugestões, críticas ou elogios são muito bem-vindos..."
                  rows={6}
                  maxLength={800}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {responses.additional_comments.length}/800 caracteres
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Voltar
              </Button>
              
              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Respostas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
