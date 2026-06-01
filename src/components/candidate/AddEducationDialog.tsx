import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Education {
  course_name: string;
  degree_type: string;
}

interface AddEducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (education: Education) => void;
}

export function AddEducationDialog({ open, onOpenChange, onAdd }: AddEducationDialogProps) {
  const [education, setEducation] = useState<Education>({
    course_name: "",
    degree_type: "",
  });

  const handleSubmit = () => {
    if (!education.course_name || !education.degree_type) return;
    onAdd(education);
    setEducation({ course_name: "", degree_type: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Formação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da formação *</Label>
            <Input
              value={education.course_name}
              onChange={(e) => setEducation({ ...education, course_name: e.target.value })}
              placeholder="Ex: Engenharia de Software"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de graduação *</Label>
            <Select
              value={education.degree_type}
              onValueChange={(value) => setEducation({ ...education, degree_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Técnico">Técnico</SelectItem>
                <SelectItem value="Tecnólogo">Tecnólogo</SelectItem>
                <SelectItem value="Bacharelado">Bacharelado</SelectItem>
                <SelectItem value="Licenciatura">Licenciatura</SelectItem>
                <SelectItem value="Pós-graduação">Pós-graduação</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
                <SelectItem value="Mestrado">Mestrado</SelectItem>
                <SelectItem value="Doutorado">Doutorado</SelectItem>
                <SelectItem value="Curso Livre">Curso Livre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!education.course_name || !education.degree_type}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
