import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PillarFormProps {
  pillarName: string;
  pillarDescription: string;
  onPrevious?: () => void;
  onNext?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function PillarForm({ 
  pillarName, 
  pillarDescription, 
  onPrevious, 
  onNext,
  isFirst,
  isLast 
}: PillarFormProps) {
  const handleSave = () => {
    console.log(`Salvando dados do pilar: ${pillarName}`);
  };

  const checklistItems = [
    "Este pilar está alinhado à estratégia da empresa",
    "Este pilar foi validado com a liderança",
    "Este pilar está documentado adequadamente",
  ];

  return (
    <div className="space-y-6">
      <div className="bg-accent p-6 rounded-md">
        <h3 className="text-xl font-semibold mb-2">{pillarName}</h3>
        <p className="text-muted-foreground">{pillarDescription}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição oficial da {pillarName}</Label>
          <Textarea 
            id="descricao" 
            placeholder={`Descreva a ${pillarName.toLowerCase()} da sua empresa`}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="objetivos">Objetivos principais relacionados a este pilar</Label>
          <Textarea 
            id="objetivos" 
            placeholder="Liste os principais objetivos"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perguntas">Perguntas orientadoras</Label>
          <Textarea 
            id="perguntas" 
            placeholder="Quais perguntas devemos fazer para desenvolver este pilar?"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exemplos">Exemplos práticos na empresa</Label>
          <Textarea 
            id="exemplos" 
            placeholder="Como este pilar se manifesta no dia a dia da organização?"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações / Notas internas</Label>
          <Textarea 
            id="observacoes" 
            placeholder="Adicione observações relevantes"
            rows={3}
          />
        </div>

        <div className="space-y-3 p-4 bg-accent rounded-md">
          <p className="font-medium text-sm">Checklist de Validação</p>
          {checklistItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox id={`check-${index}`} />
              <label
                htmlFor={`check-${index}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {item}
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <div>
            {!isFirst && (
              <Button variant="outline" onClick={onPrevious}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Pilar anterior
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>
              Salvar rascunho
            </Button>
            {!isLast && (
              <Button onClick={onNext}>
                Próximo pilar
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
