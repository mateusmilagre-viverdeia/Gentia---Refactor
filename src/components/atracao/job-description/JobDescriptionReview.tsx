import { useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { CustomField, JobDescriptionFormData, IdealDiscProfile } from '@/types/job-description.types';
import { JOB_DESCRIPTION_WIZARD_STEPS } from '@/types/job-description.types';

interface JobDescriptionReviewProps {
  formData: JobDescriptionFormData;
  idealDiscProfile?: IdealDiscProfile | null;
  onGoToStep: (step: number) => void;
  onFieldChange: (field: string, value: string | string[]) => void;
  onCustomFieldAdd: (field: CustomField) => void;
  onCustomFieldRemove: (fieldId: string) => void;
}

export function JobDescriptionReview({
  formData,
  idealDiscProfile,
  onGoToStep,
  onFieldChange,
  onCustomFieldAdd,
  onCustomFieldRemove,
}: JobDescriptionReviewProps) {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'list'>('text');

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;

    const newField: CustomField = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: newFieldType,
      value: newFieldType === 'list' ? [] : '',
    };

    onCustomFieldAdd(newField);
    setNewFieldName('');
    setNewFieldType('text');
    setShowAddField(false);
  };

  const sections = [
    {
      step: 1,
      title: 'Nome do Cargo',
      field: 'title',
      value: formData.title,
      type: 'text',
    },
    {
      step: 2,
      title: 'Missão do Cargo',
      field: 'mission',
      value: formData.mission,
      type: 'textarea',
    },
    {
      step: 3,
      title: 'Indicadores',
      field: 'indicators',
      value: formData.indicators,
      type: 'list',
    },
    {
      step: 4,
      title: 'Principais Responsabilidades',
      field: 'responsibilities',
      value: formData.responsibilities,
      type: 'list',
    },
    {
      step: 5,
      title: 'Competências Técnicas Obrigatórias',
      field: 'required_skills',
      value: formData.required_skills,
      type: 'list',
    },
    {
      step: 6,
      title: 'Competências Técnicas Desejáveis',
      field: 'desired_skills',
      value: formData.desired_skills,
      type: 'list',
    },
    {
      step: 7,
      title: 'Competências Comportamentais',
      field: 'behavioral_competencies',
      value: formData.behavioral_competencies,
      type: 'list',
    },
    {
      step: 8,
      title: 'O Que Você Vai Desenvolver',
      field: 'development',
      value: formData.development,
      type: 'list',
    },
    {
      step: 9,
      title: 'Benefícios',
      field: 'benefits',
      value: formData.benefits,
      type: 'list',
    },
  ];

  const renderValue = (value: string | string[], type: string) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-muted-foreground italic">Não preenchido</span>;
    }

    if (type === 'list' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge key={index} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap">{value}</p>;
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.field}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {section.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToStep(section.step)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderValue(section.value as string | string[], section.type)}
          </CardContent>
        </Card>
      ))}

      {/* DISC Profile */}
      {idealDiscProfile && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Perfil DISC Ideal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'd', label: 'Dominância (D)', color: 'bg-red-500' },
                { key: 'i', label: 'Influência (I)', color: 'bg-yellow-500' },
                { key: 's', label: 'Estabilidade (S)', color: 'bg-green-500' },
                { key: 'c', label: 'Conformidade (C)', color: 'bg-blue-500' },
              ].map(({ key, label, color }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {idealDiscProfile[key as keyof typeof idealDiscProfile] as number}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all`}
                      style={{
                        width: `${idealDiscProfile[key as keyof typeof idealDiscProfile] as number}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {idealDiscProfile.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {idealDiscProfile.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Fields */}
      {formData.custom_fields.length > 0 && (
        <>
          <div className="border-t pt-4 mt-6">
            <h3 className="font-medium mb-3">Campos Personalizados</h3>
          </div>
          {formData.custom_fields.map((field) => (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {field.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCustomFieldRemove(field.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {field.type === 'list' ? (
                  <div className="flex flex-wrap gap-2">
                    {(field.value as string[]).map((item, index) => (
                      <Badge key={index} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{field.value as string}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Add Custom Field Button */}
      <Button
        variant="outline"
        onClick={() => setShowAddField(true)}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Adicionar Campo Personalizado
      </Button>

      {/* Add Field Dialog */}
      <Dialog open={showAddField} onOpenChange={setShowAddField}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Campo Personalizado</DialogTitle>
            <DialogDescription>
              Crie um campo adicional para este job description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Nome do Campo</Label>
              <Input
                id="field-name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Ex: Requisitos de Viagem"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo do Campo</Label>
              <Select
                value={newFieldType}
                onValueChange={(v) => setNewFieldType(v as 'text' | 'list')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="list">Lista de Itens</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddField(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomField} disabled={!newFieldName.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
