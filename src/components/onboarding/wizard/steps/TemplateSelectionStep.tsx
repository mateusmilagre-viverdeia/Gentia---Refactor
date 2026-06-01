import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingTemplate } from '@/types/onboarding.types';

interface TemplateSelectionStepProps {
  templates: OnboardingTemplate[];
  isLoading: boolean;
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TemplateSelectionStep({
  templates,
  isLoading,
  selectedTemplateId,
  onSelect,
  onBack,
  onNext,
}: TemplateSelectionStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecionar Template</CardTitle>
        <CardDescription>
          Escolha um modelo pré-definido ou comece do zero
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {/* Opção: Criar do zero */}
              <button
                onClick={() => onSelect(null)}
                className={cn(
                  'w-full p-4 rounded-lg border-2 text-left transition-all',
                  selectedTemplateId === null
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-2 rounded-lg',
                    selectedTemplateId === null ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Criar do Zero</h3>
                      {selectedTemplateId === null && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Personalize completamente as fases e tarefas do onboarding
                    </p>
                  </div>
                </div>
              </button>

              {/* Templates disponíveis */}
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                    selectedTemplateId === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'p-2 rounded-lg',
                      selectedTemplateId === template.id ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {selectedTemplateId === template.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {template.default_duration_days} dias
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum template disponível.</p>
                  <p className="text-sm">Crie o onboarding do zero.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>
            Próximo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
