import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus } from "lucide-react";
import type { SurveyTemplate } from "@/types/survey.types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/types/survey.types";

interface TemplateSelectorProps {
  templates: SurveyTemplate[];
  onSelect: (template: SurveyTemplate | null) => void;
  isLoading?: boolean;
}

export function TemplateSelector({ templates, onSelect, isLoading }: TemplateSelectorProps) {
  const publicTemplates = templates.filter((t) => t.is_public);
  const customTemplates = templates.filter((t) => !t.is_public);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Criar Novo Questionário</h2>
        <p className="text-muted-foreground">Escolha um modelo ou comece do zero</p>
      </div>

      <Card
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => onSelect(null)}
      >
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 rounded-lg bg-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Criar do Zero</h3>
            <p className="text-sm text-muted-foreground">Questionário em branco para personalizar</p>
          </div>
        </CardContent>
      </Card>

      {publicTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modelos da Plataforma
          </h3>
          <ScrollArea className="h-[300px]">
            <div className="grid gap-3 pr-4">
              {publicTemplates.map((template) => {
                const icon = template.category
                  ? CATEGORY_ICONS[template.category as keyof typeof CATEGORY_ICONS]
                  : '📋';
                const label = template.category
                  ? CATEGORY_LABELS[template.category as keyof typeof CATEGORY_LABELS]
                  : 'Modelo';

                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onSelect(template)}
                  >
                    <CardContent className="flex items-start gap-4 py-4">
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {customTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Meus Modelos</h3>
          <div className="grid gap-3">
            {customTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelect(template)}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <span className="text-2xl">📋</span>
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
