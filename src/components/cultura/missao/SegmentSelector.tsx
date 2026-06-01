import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Factory, Briefcase, ShoppingBag } from "lucide-react";

interface SegmentSelectorProps {
  value: 'industry' | 'services' | 'product' | null;
  onChange: (segment: 'industry' | 'services' | 'product') => void;
}

const segments = [
  {
    value: 'industry' as const,
    label: 'Indústria',
    description: 'Produz bens físicos para outras empresas (B2B)',
    icon: Factory,
    examples: 'Metalúrgica, Têxtil, Alimentos, Embalagens'
  },
  {
    value: 'services' as const,
    label: 'Serviços',
    description: 'Oferece serviços para empresas ou pessoas',
    icon: Briefcase,
    examples: 'Consultoria, Saúde, Educação, Tecnologia'
  },
  {
    value: 'product' as const,
    label: 'Produto / Varejo',
    description: 'Vende produtos diretamente ao consumidor final',
    icon: ShoppingBag,
    examples: 'Loja, E-commerce, Restaurante, Farmácia'
  }
];

export function SegmentSelector({ value, onChange }: SegmentSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Antes de continuar...</CardTitle>
        <CardDescription className="text-base">
          Para personalizar a próxima pergunta, precisamos saber o segmento do seu negócio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value || ''}
          onValueChange={(v) => onChange(v as 'industry' | 'services' | 'product')}
          className="space-y-4"
        >
          {segments.map((segment) => {
            const Icon = segment.icon;
            const isSelected = value === segment.value;
            
            return (
              <div key={segment.value}>
                <Label
                  htmlFor={segment.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={segment.value} id={segment.value} className="mt-1" />
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{segment.label}</div>
                      <div className="text-sm text-muted-foreground">{segment.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Ex: {segment.examples}
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
