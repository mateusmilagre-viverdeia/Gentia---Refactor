import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, MessageCircle } from 'lucide-react';

export interface SequenceStep {
  step_number: number;
  day_offset: number;
  message_template: string;
  channel: string;
}

interface SequenceStepsEditorProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
  disabled?: boolean;
}

const DEFAULT_TEMPLATES: Record<number, string> = {
  1: 'Olá {nome}! Vi seu perfil e achei que você pode ter interesse em uma oportunidade que estamos trabalhando. Posso te contar mais?',
  2: 'Oi {nome}, tudo bem? Só queria confirmar que recebeu minha mensagem anterior. Estamos com uma posição que parece ter bastante a ver com seu perfil. Posso te enviar os detalhes?',
  3: '{nome}, última mensagem sobre isso! Estamos fechando o processo em breve. Se tiver curiosidade sobre o projeto e a empresa, é só responder. De qualquer forma, obrigado pelo tempo!',
};

export function SequenceStepsEditor({ steps, onChange, disabled }: SequenceStepsEditorProps) {
  const addStep = () => {
    const nextNumber = steps.length + 1;
    const prevDayOffset = steps.length > 0 ? steps[steps.length - 1].day_offset : 0;
    const newStep: SequenceStep = {
      step_number: nextNumber,
      day_offset: prevDayOffset + 3,
      message_template: DEFAULT_TEMPLATES[nextNumber] || `Follow-up ${nextNumber}: Olá {nome}, gostaria de retomar o contato...`,
      channel: 'whatsapp',
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      step_number: i + 1,
    }));
    onChange(updated);
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: string | number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const loadDefaults = () => {
    const defaultSteps: SequenceStep[] = [
      { step_number: 1, day_offset: 0, message_template: DEFAULT_TEMPLATES[1], channel: 'whatsapp' },
      { step_number: 2, day_offset: 3, message_template: DEFAULT_TEMPLATES[2], channel: 'whatsapp' },
      { step_number: 3, day_offset: 7, message_template: DEFAULT_TEMPLATES[3], channel: 'whatsapp' },
    ];
    onChange(defaultSteps);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Sequência de Follow-up</Label>
          <p className="text-sm text-muted-foreground">
            Configure os toques automáticos para candidatos que não respondem
          </p>
        </div>
        {steps.length === 0 && (
          <Button variant="outline" size="sm" onClick={loadDefaults} disabled={disabled}>
            Carregar Padrão (3 steps)
          </Button>
        )}
      </div>

      {steps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum step configurado. Adicione steps para ativar follow-up automático.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={loadDefaults} disabled={disabled}>
                Usar Padrão
              </Button>
              <Button size="sm" onClick={addStep} disabled={disabled}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Step
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <Badge variant="outline" className="text-xs">
                      #{step.step_number}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Dia do envio</Label>
                        <Input
                          type="number"
                          min={0}
                          value={step.day_offset}
                          onChange={(e) => updateStep(index, 'day_offset', parseInt(e.target.value) || 0)}
                          className="h-8"
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Canal</Label>
                        <Input
                          value="WhatsApp"
                          disabled
                          className="h-8 bg-muted"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea
                        value={step.message_template}
                        onChange={(e) => updateStep(index, 'message_template', e.target.value)}
                        rows={3}
                        className="text-sm"
                        placeholder="Use {nome} para personalizar..."
                        disabled={disabled}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use {'{nome}'} para o nome do candidato. A IA personalizará automaticamente.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStep(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {steps.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addStep}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Step
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
