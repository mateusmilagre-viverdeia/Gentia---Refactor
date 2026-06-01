import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecurrenceFrequency } from '@/hooks/useOneOnOneMeetings';
import { RefreshCw } from 'lucide-react';

interface RecurrenceFormProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  frequency: RecurrenceFrequency;
  onFrequencyChange: (frequency: RecurrenceFrequency) => void;
  dayOfWeek: number | null;
  onDayOfWeekChange: (day: number | null) => void;
  preferredTime: string;
  onPreferredTimeChange: (time: string) => void;
}

const frequencyLabels: Record<RecurrenceFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export function RecurrenceForm({
  enabled,
  onEnabledChange,
  frequency,
  onFrequencyChange,
  dayOfWeek,
  onDayOfWeekChange,
  preferredTime,
  onPreferredTimeChange,
}: RecurrenceFormProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Recorrência</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
        <CardDescription>
          Configure reuniões automáticas recorrentes
        </CardDescription>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => onFrequencyChange(v as RecurrenceFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Dia preferido</Label>
              <Select 
                value={dayOfWeek?.toString() || ''} 
                onValueChange={(v) => onDayOfWeekChange(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Horário preferido</Label>
            <Input
              type="time"
              value={preferredTime}
              onChange={(e) => onPreferredTimeChange(e.target.value)}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            As reuniões serão criadas automaticamente de acordo com a configuração.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
