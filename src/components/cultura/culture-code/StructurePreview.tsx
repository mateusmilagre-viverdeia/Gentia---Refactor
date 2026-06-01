import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Sparkles, Pencil } from 'lucide-react';
import type { CultureCodeStructure, StructureSection } from '@/types/culture-code.types';
import { SectionEditModal } from './SectionEditModal';

interface StructurePreviewProps {
  structure: CultureCodeStructure;
  generating: boolean;
  onBack: () => void;
  onGenerateSlides: () => void;
  onUpdateSection?: (sectionId: string, updates: Partial<StructureSection>) => void;
}

export function StructurePreview({ 
  structure, 
  generating,
  onBack, 
  onGenerateSlides,
  onUpdateSection,
}: StructurePreviewProps) {
  const [editingSection, setEditingSection] = useState<StructureSection | null>(null);

  const handleSaveSection = (sectionId: string, updates: Partial<StructureSection>) => {
    onUpdateSection?.(sectionId, updates);
  };

  // Calculate total from sections
  const calculatedTotal = structure.sections.reduce((sum, s) => sum + s.estimatedSlides, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estrutura Proposta pela IA
          </CardTitle>
          <CardDescription>
            Valide e edite a estrutura antes de gerar os slides
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {structure.sections.map((section, index) => (
              <div 
                key={section.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="font-semibold">{section.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {section.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {section.estimatedSlides} slides
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditingSection(section)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total Estimado</span>
              <span className="text-2xl font-bold">{calculatedTotal} slides</span>
            </div>
          </div>

          {structure.notes && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Observações da IA:</p>
              <p className="text-sm text-muted-foreground">{structure.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar e Editar História
        </Button>
        
        <Button onClick={onGenerateSlides} disabled={generating} size="lg">
          {generating ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Gerando Slides...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Slides
            </>
          )}
        </Button>
      </div>

      <SectionEditModal
        section={editingSection}
        open={!!editingSection}
        onOpenChange={(open) => !open && setEditingSection(null)}
        onSave={handleSaveSection}
      />
    </div>
  );
}
