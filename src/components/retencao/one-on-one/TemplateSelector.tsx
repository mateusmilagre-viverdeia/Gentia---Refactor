import { MeetingTemplate } from '@/hooks/useOneOnOneMeetings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  templates: MeetingTemplate[];
  selectedId: string | null;
  onSelect: (templateId: string | null) => void;
  isLoading?: boolean;
}

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  isLoading,
}: TemplateSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Modelo de Pauta</Label>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar seleção
          </button>
        )}
      </div>
      
      <RadioGroup
        value={selectedId || ''}
        onValueChange={(value) => onSelect(value || null)}
        className="grid gap-3"
      >
        {templates.map((template) => (
          <Label
            key={template.id}
            htmlFor={template.id}
            className={cn(
              "cursor-pointer rounded-lg border p-4 transition-all hover:border-primary/50",
              selectedId === template.id && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{template.name}</span>
                  {template.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Padrão
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.items?.slice(0, 3).map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                      {item.content.length > 30 
                        ? item.content.substring(0, 30) + '...' 
                        : item.content}
                    </Badge>
                  ))}
                  {template.items && template.items.length > 3 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{template.items.length - 3} itens
                    </Badge>
                  )}
                </div>
              </div>
              {selectedId === template.id && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </Label>
        ))}
      </RadioGroup>
      
      {templates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum modelo disponível.</p>
        </div>
      )}
    </div>
  );
}
