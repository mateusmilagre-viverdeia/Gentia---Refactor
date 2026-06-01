import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, MapPin, Clock, DollarSign } from "lucide-react";
import { useJobDescriptionToRecruitment } from "@/hooks/useJobDescriptionToRecruitment";
import type { JobDescription } from "@/types/job-description.types";

interface CreateRecruitmentJobDialogProps {
  open: boolean;
  onClose: () => void;
  jobDescription: JobDescription;
}

const employmentTypes = [
  { value: "full-time", label: "Tempo Integral" },
  { value: "part-time", label: "Meio Período" },
  { value: "contract", label: "Contrato" },
  { value: "internship", label: "Estágio" },
  { value: "freelance", label: "Freelancer" },
];

const locations = [
  "Remoto",
  "Híbrido",
  "Presencial - São Paulo",
  "Presencial - Rio de Janeiro",
  "Presencial - Belo Horizonte",
  "Presencial - Curitiba",
  "Presencial - Porto Alegre",
];

export function CreateRecruitmentJobDialog({
  open,
  onClose,
  jobDescription,
}: CreateRecruitmentJobDialogProps) {
  const navigate = useNavigate();
  const { createJobFromJD } = useJobDescriptionToRecruitment();

  // Pre-fill from job description
  const [title, setTitle] = useState(jobDescription.title);
  const [description, setDescription] = useState(
    jobDescription.mission || ""
  );
  const [department, setDepartment] = useState(jobDescription.area || "");
  const [location, setLocation] = useState("Remoto");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [redirectAfterCreate, setRedirectAfterCreate] = useState(true);

  const handleSubmit = async () => {
    const result = await createJobFromJD.mutateAsync({
      jobDescriptionId: jobDescription.id,
      title,
      description: buildFullDescription(),
      department,
      location,
      employmentType,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      status: "draft",
    });

    onClose();

    if (redirectAfterCreate && result?.id) {
      navigate(`/atracao-contratacao/recrutamento/jobs/${result.id}`);
    }
  };

  const buildFullDescription = () => {
    let desc = description;

    if (jobDescription.responsibilities?.length) {
      desc += "\n\n## Responsabilidades\n" + 
        jobDescription.responsibilities.map(r => `- ${r}`).join("\n");
    }

    if (jobDescription.required_skills?.length) {
      desc += "\n\n## Requisitos\n" + 
        jobDescription.required_skills.map(s => `- ${s}`).join("\n");
    }

    if (jobDescription.desired_skills?.length) {
      desc += "\n\n## Desejável\n" + 
        jobDescription.desired_skills.map(s => `- ${s}`).join("\n");
    }

    if (jobDescription.benefits?.length) {
      desc += "\n\n## Benefícios\n" + 
        jobDescription.benefits.map(b => `- ${b}`).join("\n");
    }

    return desc;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Criar Vaga de Recrutamento
          </DialogTitle>
          <DialogDescription>
            Criar uma vaga de recrutamento a partir do job description "{jobDescription.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Vaga</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desenvolvedor Full Stack Sênior"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição/Missão</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a vaga..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Responsabilidades, requisitos e benefícios do JD serão adicionados automaticamente
            </p>
          </div>

          {/* Department & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento/Área</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Tecnologia"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Localização
              </Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment Type & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tipo de Contratação
              </Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Faixa Salarial (R$)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Mínimo"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Máximo"
                />
              </div>
            </div>
          </div>

          {/* Preview of what will be included */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm">Dados do Job Description incluídos:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {jobDescription.responsibilities?.length ? (
                <p>✓ {jobDescription.responsibilities.length} responsabilidades</p>
              ) : null}
              {jobDescription.required_skills?.length ? (
                <p>✓ {jobDescription.required_skills.length} requisitos obrigatórios</p>
              ) : null}
              {jobDescription.desired_skills?.length ? (
                <p>✓ {jobDescription.desired_skills.length} requisitos desejáveis</p>
              ) : null}
              {jobDescription.benefits?.length ? (
                <p>✓ {jobDescription.benefits.length} benefícios</p>
              ) : null}
              {jobDescription.behavioral_competencies?.length ? (
                <p>✓ {jobDescription.behavioral_competencies.length} competências comportamentais</p>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || createJobFromJD.isPending}
          >
            {createJobFromJD.isPending ? "Criando..." : "Criar Vaga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
