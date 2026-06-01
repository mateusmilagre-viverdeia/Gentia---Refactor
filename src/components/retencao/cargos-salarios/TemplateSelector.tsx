import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Rocket, Building, Check } from "lucide-react";
import type { CompensationTemplate, CareerTrack } from "@/types/compensation.types";
import { cn } from "@/lib/utils";

// Templates pré-definidos
export const COMPENSATION_TEMPLATES: CompensationTemplate[] = [
  {
    id: "startup",
    name: "Startup",
    description: "Estrutura enxuta para empresas até 50 pessoas. Poucos cargos, crescimento rápido.",
    company_size: "startup",
    families: [
      { name: "Produto", career_track: "technical" },
      { name: "Comercial", career_track: "technical" },
      { name: "Operações", career_track: "technical" },
    ],
    default_levels: [
      { code: "JR", name: "Júnior", description: "Profissional em desenvolvimento" },
      { code: "PL", name: "Pleno", description: "Profissional autônomo" },
      { code: "SR", name: "Sênior", description: "Referência técnica" },
    ],
    tracks: ["technical"],
  },
  {
    id: "scaleup",
    name: "Scale-up",
    description: "Para empresas de 50 a 200 pessoas. Mais estrutura, trilhas de especialista.",
    company_size: "scaleup",
    families: [
      { name: "Engenharia", career_track: "technical" },
      { name: "Produto", career_track: "technical" },
      { name: "Comercial", career_track: "technical" },
      { name: "Pessoas", career_track: "technical" },
      { name: "Finanças", career_track: "technical" },
    ],
    default_levels: [
      { code: "JR", name: "Júnior", description: "Profissional em desenvolvimento" },
      { code: "PL", name: "Pleno", description: "Profissional autônomo" },
      { code: "SR", name: "Sênior", description: "Referência técnica" },
      { code: "SPEC", name: "Especialista", description: "Autoridade no tema" },
    ],
    tracks: ["technical", "specialist"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Estrutura completa para empresas com mais de 200 pessoas. Múltiplas trilhas.",
    company_size: "enterprise",
    families: [
      { name: "Tecnologia", career_track: "technical" },
      { name: "Produto", career_track: "technical" },
      { name: "Vendas", career_track: "technical" },
      { name: "Marketing", career_track: "technical" },
      { name: "RH", career_track: "technical" },
      { name: "Finanças", career_track: "technical" },
      { name: "Jurídico", career_track: "specialist" },
    ],
    default_levels: [
      { code: "N1", name: "Nível 1", description: "Entrada / Trainee" },
      { code: "N2", name: "Nível 2", description: "Desenvolvimento" },
      { code: "N3", name: "Nível 3", description: "Consolidação" },
      { code: "N4", name: "Nível 4", description: "Referência" },
      { code: "N5", name: "Nível 5", description: "Especialista / Gestor" },
      { code: "N6", name: "Nível 6", description: "Diretor / Principal" },
    ],
    tracks: ["technical", "specialist", "leadership"],
  },
];

const SIZE_ICONS = {
  startup: Rocket,
  scaleup: Building2,
  enterprise: Building,
};

const TRACK_LABELS: Record<CareerTrack, string> = {
  technical: "Técnico",
  specialist: "Especialista",
  leadership: "Liderança",
};

interface TemplateSelectorProps {
  onSelect: (template: CompensationTemplate) => void;
  selectedId?: string;
}

export const TemplateSelector = ({ onSelect, selectedId }: TemplateSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Escolha um Template Inicial</h3>
        <p className="text-sm text-muted-foreground">
          Selecione um template baseado no porte da sua empresa. Você pode customizar tudo depois.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COMPENSATION_TEMPLATES.map((template) => {
          const Icon = SIZE_ICONS[template.company_size];
          const isSelected = selectedId === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => onSelect(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Famílias sugeridas:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.families.slice(0, 4).map((f) => (
                      <Badge key={f.name} variant="secondary" className="text-xs">
                        {f.name}
                      </Badge>
                    ))}
                    {template.families.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.families.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Níveis:</p>
                  <p className="text-sm">{template.default_levels.length} níveis</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Trilhas:</p>
                  <div className="flex gap-1">
                    {template.tracks.map((track) => (
                      <Badge key={track} variant="outline" className="text-xs">
                        {TRACK_LABELS[track]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Button variant="ghost" onClick={() => onSelect(COMPENSATION_TEMPLATES[0])}>
          Começar do zero (sem template)
        </Button>
      </div>
    </div>
  );
};
